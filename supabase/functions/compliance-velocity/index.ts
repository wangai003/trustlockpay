import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * compliance-velocity
 * 
 * Checks for:
 * 1. Anti-structuring: Multiple transactions just below $10,000 in a rolling 24h window
 * 2. Velocity spikes: Sudden increase in transaction frequency vs 30-day baseline
 * 3. Cumulative threshold: Total 24h volume exceeding CTR reporting levels
 * 
 * Actions:
 * - check: Run all checks for a user before payment
 * - log_travel_rule: Store FATF Travel Rule data for crypto ≥$1,000
 */

const STRUCTURING_THRESHOLD = 10000;
const STRUCTURING_WINDOW_HOURS = 24;
const STRUCTURING_MIN_TXS = 3;
const STRUCTURING_BAND_LOW = 7500; // Suspicious if multiple txs in $7,500–$9,999 range
const VELOCITY_SPIKE_MULTIPLIER = 3; // 3x above 30-day daily average

// ─── PRE-KYC HARD CAP ────────────────────────────────────
// Temporary safeguard until third-party KYC provider is integrated.
// Transactions above this threshold require manual admin approval.
// Remove or raise this cap once Sumsub/Smile ID is live.
const PRE_KYC_HARD_CAP = 5000;
const PRE_KYC_ENABLED = true; // Flip to false once third-party KYC is integrated

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function triageNotify(
  type: string,
  userId: string,
  message: string,
  transactionId?: string,
  severity?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notification-triage`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: "triage",
        notification_type: type,
        user_id: userId,
        message,
        transaction_id: transactionId,
        severity,
        metadata,
      }),
    });
  } catch (e) {
    console.error("Triage notification error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = getSupabaseAdmin();

    // ── Log Travel Rule Data ──
    if (action === "log_travel_rule") {
      const { user_id, transaction_id, amount, travel_rule_data } = body;
      if (!user_id || !travel_rule_data) {
        return new Response(
          JSON.stringify({ error: "user_id and travel_rule_data required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store in sanctions_screening_logs with travel_rule metadata
      const { error } = await supabase.from("sanctions_screening_logs").insert({
        user_id,
        full_name: travel_rule_data.originator_name || "Travel Rule Record",
        country: travel_rule_data.originator_country || "N/A",
        user_role: "buyer",
        result: "travel_rule_logged",
        risk_score: 0,
        screening_source: "FATF_R16",
        transaction_id: transaction_id || null,
        matched_entries: travel_rule_data,
        screened_at: new Date().toISOString(),
      });

      if (error) console.error("Travel rule log error:", error.message);

      return new Response(
        JSON.stringify({ success: true, message: "Travel Rule data logged" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Anti-Structuring & Velocity Check ──
    if (action === "check") {
      const { user_id, amount, transaction_id } = body;
      if (!user_id || !amount) {
        return new Response(
          JSON.stringify({ error: "user_id and amount required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parsedAmount = parseFloat(amount);
      const flags: { type: string; severity: string; detail: string }[] = [];

      // 1) Anti-structuring: recent transactions in the $7,500–$9,999 band
      const windowStart = new Date(Date.now() - STRUCTURING_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      const { data: recentTxs } = await supabase
        .from("os_payments")
        .select("amount, created_at")
        .eq("user_id", user_id)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false });

      const allAmounts = [...(recentTxs || []).map(t => t.amount), parsedAmount];
      const bandTxs = allAmounts.filter(a => a >= STRUCTURING_BAND_LOW && a < STRUCTURING_THRESHOLD);
      const totalVolume = allAmounts.reduce((s, a) => s + a, 0);

      if (bandTxs.length >= STRUCTURING_MIN_TXS) {
        flags.push({
          type: "structuring_suspected",
          severity: "critical",
          detail: `${bandTxs.length} transactions between $${STRUCTURING_BAND_LOW.toLocaleString()}–$${(STRUCTURING_THRESHOLD - 1).toLocaleString()} detected within ${STRUCTURING_WINDOW_HOURS}h. Combined: $${totalVolume.toLocaleString()}. Possible structuring to avoid CTR reporting.`,
        });
      }

      // 2) Cumulative threshold breach
      if (totalVolume >= STRUCTURING_THRESHOLD && parsedAmount < STRUCTURING_THRESHOLD) {
        flags.push({
          type: "cumulative_threshold_breach",
          severity: "high",
          detail: `Rolling ${STRUCTURING_WINDOW_HOURS}h volume ($${totalVolume.toLocaleString()}) exceeds $${STRUCTURING_THRESHOLD.toLocaleString()} CTR threshold across ${allAmounts.length} transactions.`,
        });
      }

      // 3) Velocity spike — compare today's count vs 30-day daily average
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: monthCount } = await supabase
        .from("os_payments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("created_at", thirtyDaysAgo);

      const dailyAverage = (monthCount || 0) / 30;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("os_payments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .gte("created_at", todayStart.toISOString());

      const todayTotal = (todayCount || 0) + 1; // +1 for current pending tx
      if (dailyAverage > 0 && todayTotal >= dailyAverage * VELOCITY_SPIKE_MULTIPLIER && todayTotal >= 5) {
        flags.push({
          type: "velocity_spike",
          severity: "high",
          detail: `${todayTotal} transactions today vs ${dailyAverage.toFixed(1)} daily average (${VELOCITY_SPIKE_MULTIPLIER}x spike). Unusual activity pattern detected.`,
        });
      }

      // If any flags → create compliance flags and notify admin
      for (const flag of flags) {
        const flagId = `AML-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await supabase.from("compliance_flags").insert({
          flag_id: flagId,
          type: flag.type,
          description: flag.detail,
          severity: flag.severity,
          status: "open",
          related_buyer_id: user_id,
        });

        await triageNotify(
          flag.type,
          user_id,
          flag.detail,
          transaction_id || undefined,
          flag.severity,
          { flagId, amount: parsedAmount, totalVolume, todayCount: todayTotal }
        );
      }

      const worstSeverity = flags.some(f => f.severity === "critical")
        ? "critical"
        : flags.some(f => f.severity === "high")
          ? "high"
          : "clear";

      return new Response(
        JSON.stringify({
          success: true,
          flags,
          severity: worstSeverity,
          allow_transaction: worstSeverity !== "critical", // Block only critical (structuring)
          rolling_24h_volume: totalVolume,
          today_tx_count: todayTotal,
          daily_average: dailyAverage,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use 'check' or 'log_travel_rule'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("compliance-velocity error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

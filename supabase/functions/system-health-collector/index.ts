// System Health Collector — cron-driven sampler that records metrics
// into `system_health_metrics`. Critical breaches auto-create bug reports.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const samples: any[] = [];

  // 1. Unresolved bug backlog
  try {
    const { count: openBugs } = await supa
      .from("bug_reports")
      .select("*", { count: "exact", head: true })
      .is("resolved_at", null);
    samples.push(await record(supa, "open_bugs", "Open bug reports", openBugs ?? 0, null, 25, 75));
  } catch (e) { samples.push({ key: "open_bugs", error: String(e) }); }

  // 2. Critical unacknowledged bugs (>15min)
  try {
    const { count: staleCritical } = await supa
      .from("bug_reports")
      .select("*", { count: "exact", head: true })
      .eq("severity", "critical")
      .is("resolved_at", null)
      .is("acknowledged_at", null)
      .lt("created_at", new Date(Date.now() - 15 * 60_000).toISOString());
    samples.push(await record(supa, "stale_critical", "Stale critical bugs (>15m)", staleCritical ?? 0, null, 1, 3));
  } catch (e) { samples.push({ key: "stale_critical", error: String(e) }); }

  // 3. Gas treasury balance (if ledger exists)
  try {
    const { data: gas } = await supa
      .from("gas_reserve_ledger")
      .select("balance_after_usd")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const bal = Number(gas?.balance_after_usd ?? 0);
    samples.push(await record(supa, "gas_treasury_usd", "Gas treasury balance (USD)",
      // Higher = better, so we record "shortfall" against thresholds inverted:
      // store balance as numeric for display; mark critical if < 50, warn if < 200
      bal, null,
      bal < 200 ? 200 : null, bal < 50 ? 50 : null,
      { balance: bal }));
  } catch (e) { samples.push({ key: "gas_treasury_usd", error: String(e) }); }

  // 4. Transactions stuck in compliance/kyc hold (>24h)
  try {
    const { count: stuckTx } = await supa
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .in("status", ["compliance_hold", "kyc_hold", "compliance_review"])
      .lt("updated_at", new Date(Date.now() - 24 * 3600_000).toISOString());
    samples.push(await record(supa, "stuck_holds", "Tx stuck on hold (>24h)", stuckTx ?? 0, null, 5, 20));
  } catch (e) { samples.push({ key: "stuck_holds", error: String(e) }); }

  // 5. Pending payouts older than 48h
  try {
    const { count: stalePayouts } = await supa
      .from("payout_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 48 * 3600_000).toISOString());
    samples.push(await record(supa, "stale_payouts", "Stale pending payouts (>48h)", stalePayouts ?? 0, null, 3, 10));
  } catch (e) { samples.push({ key: "stale_payouts", error: String(e) }); }

  // 6. Disputes without arbitrator assigned (>72h since opened)
  try {
    const { count: unassignedDisputes } = await supa
      .from("disputes")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .is("arbitrator_id", null)
      .lt("created_at", new Date(Date.now() - 72 * 3600_000).toISOString());
    samples.push(await record(supa, "unassigned_disputes", "Unassigned disputes (>72h)", unassignedDisputes ?? 0, null, 1, 5));
  } catch (e) { samples.push({ key: "unassigned_disputes", error: String(e) }); }

  return new Response(JSON.stringify({ ok: true, samples }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function record(
  supa: any, key: string, label: string,
  numeric: number | null, text: string | null,
  warn: number | null, critical: number | null,
  context: Record<string, unknown> = {}
) {
  const { data, error } = await supa.rpc("record_health_metric", {
    _key: key, _label: label,
    _value_numeric: numeric, _value_text: text,
    _threshold_warn: warn, _threshold_critical: critical,
    _context: context,
  });
  return { key, value: numeric ?? text, id: data, error: error?.message };
}

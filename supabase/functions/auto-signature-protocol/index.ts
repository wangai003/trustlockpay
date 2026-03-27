import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_THRESHOLDS: Record<string, { orders: number; tx: number }> = {
  starter: { orders: 5, tx: 5 },
  growth: { orders: 25, tx: 30 },
  scale: { orders: 100, tx: 150 },
  enterprise: { orders: 500, tx: 1000 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { vendor_id, transaction_id, order_amount, industry, buyer_name } = body;

    if (!vendor_id || !transaction_id) {
      return new Response(
        JSON.stringify({ error: "vendor_id and transaction_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Check active consent
    const { data: consent } = await supabase
      .from("vendor_consent_records")
      .select("id, typed_name, auto_accept_enabled, plan_id")
      .eq("vendor_id", vendor_id)
      .eq("is_active", true)
      .eq("consent_type", "auto_signature")
      .maybeSingle();

    if (!consent) {
      return new Response(
        JSON.stringify({ auto_signed: false, reason: "no_consent", route: "manual" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get vendor plan
    const { data: planRow } = await supabase
      .from("vendor_plans")
      .select("plan_id")
      .eq("vendor_id", vendor_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planId = planRow?.plan_id || consent.plan_id || "starter";
    const threshold = PLAN_THRESHOLDS[planId] || PLAN_THRESHOLDS.starter;

    // 3. Query last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: txCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor_id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { count: orderCount } = await supabase
      .from("order_carbon_copies")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendor_id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const totalTx = txCount || 0;
    const totalOrders = orderCount || 0;
    const avgTxPerDay = totalTx / 30;
    const avgOrdersPerDay = totalOrders / 30;

    // 4. Get transaction details for contract record
    const { data: txData } = await supabase
      .from("transactions")
      .select("tx_id, order_number, buyer_id, vendor_name")
      .eq("id", transaction_id)
      .maybeSingle();

    const meetsThreshold =
      avgOrdersPerDay >= threshold.orders * 0.5 || avgTxPerDay >= threshold.tx * 0.5;

    if (meetsThreshold && consent.auto_accept_enabled) {
      // AUTO-SIGN
      const { data: contract, error: insertErr } = await supabase
        .from("pre_order_contracts")
        .insert({
          transaction_id,
          order_number: txData?.order_number?.toString() || null,
          buyer_id: txData?.buyer_id || null,
          vendor_id,
          industry: industry || null,
          order_amount: order_amount || 0,
          buyer_typed_name: null,
          vendor_typed_name: "AUTO-SIGNED by TrustLock Protocol",
          is_vendor_auto_signed: true,
          vendor_signed_at: new Date().toISOString(),
          contract_terms_version: "1.0",
          industry_addendum: industry || null,
          status: "buyer_signed",
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({
          auto_signed: true,
          contract_id: contract.id,
          plan: planId,
          volume: { avg_orders_per_day: Math.round(avgOrdersPerDay * 10) / 10, avg_tx_per_day: Math.round(avgTxPerDay * 10) / 10 },
          threshold_met: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MANUAL ROUTE
    const { data: contract, error: insertErr } = await supabase
      .from("pre_order_contracts")
      .insert({
        transaction_id,
        order_number: txData?.order_number?.toString() || null,
        buyer_id: txData?.buyer_id || null,
        vendor_id,
        industry: industry || null,
        order_amount: order_amount || 0,
        buyer_typed_name: null,
        vendor_typed_name: null,
        is_vendor_auto_signed: false,
        contract_terms_version: "1.0",
        industry_addendum: industry || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    // Notify vendor
    await supabase.from("notifications").insert({
      user_id: vendor_id,
      title: "New order requires manual signature",
      message: `Order from ${buyer_name || "a buyer"} for $${Number(order_amount || 0).toLocaleString()} needs your signature. Your current volume qualifies for the manual work log.`,
      type: "action_required",
      related_entity_type: "pre_order_contract",
      related_entity_id: contract.id,
    });

    return new Response(
      JSON.stringify({
        auto_signed: false,
        reason: "low_volume",
        route: "work_log",
        contract_id: contract.id,
        plan: planId,
        volume: { avg_orders_per_day: Math.round(avgOrdersPerDay * 10) / 10, avg_tx_per_day: Math.round(avgTxPerDay * 10) / 10 },
        threshold: { required_pct: "50%", plan_orders: threshold.orders, plan_tx: threshold.tx },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auto-signature protocol error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

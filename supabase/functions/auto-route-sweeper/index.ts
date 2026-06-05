// Auto-route sweeper: finds confirmed crypto checkout sessions whose
// transactions have NOT yet been routed from the Transaction Wallet to
// the Escrow Wallet, and triggers wallet-routing-bridge for each.
//
// Safe to call repeatedly: wallet-routing-bridge already de-dupes on its
// own (locked → settles only once; settlement_completed_at gates re-runs).
//
// Auth: no JWT required (pg_cron calls this with anon key). Internal calls
// to wallet-routing-bridge use SUPABASE_SERVICE_ROLE_KEY from env.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // Optional: override via body for one-off targeted sweep
  let targetTxId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      targetTxId = body?.transactionId || null;
    } catch { /* ignore */ }
  }

  // Find confirmed crypto sessions whose linked transaction hasn't settled
  let query = supabase
    .from("checkout_sessions")
    .select("id, transaction_id, payment_method, amount, payment_proof, session_data")
    .eq("status", "confirmed")
    .not("transaction_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (targetTxId) query = query.eq("transaction_id", targetTxId);

  const { data: sessions, error: sErr } = await query;
  if (sErr) return json({ error: sErr.message }, 500);

  const candidates = (sessions || []).filter((s: any) => {
    const pm = String(s.payment_method || "");
    return pm.toLowerCase().startsWith("crypto") || pm === "direct";
  });

  if (candidates.length === 0) {
    return json({ success: true, scanned: 0, routed: 0, message: "No confirmed crypto sessions found." });
  }

  const txIds = Array.from(new Set(candidates.map((s: any) => s.transaction_id)));
  const { data: txs, error: tErr } = await supabase
    .from("transactions")
    .select("id, status, settlement_completed_at, amount")
    .in("id", txIds);
  if (tErr) return json({ error: tErr.message }, 500);

  const txById = new Map((txs || []).map((t: any) => [t.id, t]));
  const ROUTEABLE = new Set(["locked", "pending", "shipped", "delivered"]);

  const results: any[] = [];
  for (const s of candidates) {
    const tx: any = txById.get(s.transaction_id);
    if (!tx) { results.push({ session: s.id, skipped: "tx_not_found" }); continue; }
    if (tx.settlement_completed_at) { results.push({ session: s.id, skipped: "already_settled" }); continue; }
    if (!ROUTEABLE.has(tx.status)) { results.push({ session: s.id, skipped: `status_${tx.status}` }); continue; }

    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/wallet-routing-bridge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          action: "route_inbound",
          transactionId: s.transaction_id,
          processor: "direct",
          paymentMethod: s.payment_method || "crypto",
          verifiedAmount: Number(tx.amount) || Number(s.amount) || undefined,
          network: s.payment_proof?.network || "polygon",
          isTestnet: false,
          source: "auto_route_sweeper",
        }),
      });
      const text = await r.text();
      let parsed: any = text; try { parsed = JSON.parse(text); } catch { /* keep text */ }
      results.push({ session: s.id, transactionId: s.transaction_id, status: r.status, response: parsed });
    } catch (err: any) {
      results.push({ session: s.id, transactionId: s.transaction_id, error: err?.message || String(err) });
    }
  }

  const routed = results.filter(r => r.status && r.status >= 200 && r.status < 300).length;
  return json({ success: true, scanned: candidates.length, routed, results });
});

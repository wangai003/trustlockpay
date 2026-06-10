// Guided Testnet — bot responder cron.
// Progresses bot-side actions on demo transactions so the human can
// observe the full mainnet workflow without a real counterparty.
// Skips any (user, role) pair where paired_mode = true.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TRANSITIONS: Record<string, { next: string; milestone?: string }> = {
  // Buyer-bot funds vendor's pending escrow
  negotiating: { next: "escrowed", milestone: "in_progress" },
  // Vendor-bot marks fulfillment after buyer funds it
  shipped: { next: "delivered", milestone: "complete" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Pull paired_mode flags so we skip them
  const { data: paired } = await admin
    .from("testnet_onboarding")
    .select("user_id, role")
    .eq("paired_mode", true);
  const pairedSet = new Set((paired ?? []).map((p) => `${p.user_id}:${p.role}`));

  // Find demo transactions with at least 30s in their current state
  const cutoff = new Date(Date.now() - 30_000).toISOString();
  const { data: txs, error } = await admin
    .from("transactions")
    .select("id, buyer_id, vendor_id, status, milestone_status, updated_at")
    .eq("is_testnet_demo", true)
    .in("status", Object.keys(TRANSITIONS))
    .lt("updated_at", cutoff)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let advanced = 0;
  for (const tx of txs ?? []) {
    const humanKeyVendor = `${tx.vendor_id}:vendor`;
    const humanKeyBuyer = `${tx.buyer_id}:buyer`;
    if (pairedSet.has(humanKeyVendor) || pairedSet.has(humanKeyBuyer)) continue;

    const next = TRANSITIONS[tx.status];
    if (!next) continue;

    const patch: Record<string, unknown> = {
      status: next.next,
      updated_at: new Date().toISOString(),
    };
    if (next.milestone) patch.milestone_status = next.milestone;
    if (next.next === "delivered") patch.delivered_date = new Date().toISOString();

    const { error: upErr } = await admin
      .from("transactions")
      .update(patch)
      .eq("id", tx.id);
    if (!upErr) advanced += 1;
  }

  return new Response(JSON.stringify({ advanced, scanned: txs?.length ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

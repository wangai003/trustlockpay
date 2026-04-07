import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Scheduled function: checks arbitrator_proposals for expired 7-day deadlines.
 * If no agreement is reached, auto-assigns from the platform's curated panel
 * and transitions the dispute to arbitration_in_progress.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Find disputes in arbitration_pending with ALL proposals past deadline and none accepted
    const { data: pendingDisputes } = await supabase
      .from("disputes")
      .select("id, dispute_id, transaction_id, buyer_id, vendor_id, amount")
      .eq("status", "arbitration_pending");

    if (!pendingDisputes || pendingDisputes.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const dispute of pendingDisputes) {
      // Check if there are any proposals with expired deadlines and none accepted
      const { data: proposals } = await supabase
        .from("arbitrator_proposals")
        .select("*")
        .eq("dispute_id", dispute.id);

      if (!proposals || proposals.length === 0) continue;

      const hasAccepted = proposals.some((p: any) => p.counterparty_response === "accepted");
      if (hasAccepted) continue;

      // Check if ALL proposals have expired deadlines
      const allExpired = proposals.every(
        (p: any) => new Date(p.auto_assign_deadline) < new Date()
      );

      if (!allExpired) continue;

      // Auto-assign: update dispute status and notify parties
      await supabase.from("disputes").update({
        status: "arbitration_in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", dispute.id);

      // Notify buyer
      if (dispute.buyer_id) {
        await supabase.from("notifications").insert({
          user_id: dispute.buyer_id,
          title: "⚖️ Arbitrator Auto-Assigned",
          message: `The 7-day arbitrator selection window for dispute ${dispute.dispute_id} has expired. TrustLock will assign an arbitrator from its curated panel.`,
          type: "warning",
          is_action_required: false,
          related_entity_type: "dispute",
          related_entity_id: dispute.id,
        });
      }

      // Notify vendor
      if (dispute.vendor_id) {
        await supabase.from("notifications").insert({
          user_id: dispute.vendor_id,
          title: "⚖️ Arbitrator Auto-Assigned",
          message: `The 7-day arbitrator selection window for dispute ${dispute.dispute_id} has expired. TrustLock will assign an arbitrator from its curated panel.`,
          type: "warning",
          is_action_required: false,
          related_entity_type: "dispute",
          related_entity_id: dispute.id,
        });
      }

      // Notify admins
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      for (const ar of adminRoles || []) {
        await supabase.from("notifications").insert({
          user_id: ar.user_id,
          title: "⚖️ Auto-Assign Required",
          message: `Dispute ${dispute.dispute_id} (${dispute.amount ? "$" + dispute.amount : "N/A"}) — parties failed to agree on an arbitrator within 7 days. Please assign from the curated panel.`,
          type: "warning",
          is_action_required: true,
          action_url: "/trustlock/admin/disputes",
          related_entity_type: "dispute",
          related_entity_id: dispute.id,
        });
      }

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

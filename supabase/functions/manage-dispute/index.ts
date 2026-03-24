import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, disputeId, txId, reason, description, resolution } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      case "file_dispute": {
        const newDisputeId = `DSP-${String(Date.now()).slice(-3)}`;
        const { data, error } = await supabase
          .from("disputes")
          .insert({
            dispute_id: newDisputeId,
            tx_id: txId,
            reason,
            description,
            status: "under_review",
            priority: "medium",
          })
          .select()
          .single();
        if (error) throw error;

        // Update transaction if exists
        if (txId) {
          await supabase.from("transactions").update({ status: "disputed", updated_at: new Date().toISOString() }).eq("tx_id", txId);
        }

        result = data;
        break;
      }

      case "review_dispute": {
        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "ai_reviewing",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "resolve_dispute": {
        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "resolved",
            resolution: resolution || "Resolved by admin",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "escalate_dispute": {
        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "escalated",
            priority: "critical",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    const { action, txId, tracking, reason } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      case "add_tracking": {
        const { data, error } = await supabase
          .from("transactions")
          .update({ tracking, status: "shipped", shipped_date: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("tx_id", txId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "confirm_delivery": {
        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "released",
            delivered_date: new Date().toISOString(),
            released_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("tx_id", txId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "reject_orders": {
        const txIds: string[] = body.txIds || [];
        const { data, error } = await supabase
          .from("transactions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .in("tx_id", txIds)
          .select();
        if (error) throw error;
        result = data;
        break;
      }

      case "flag_review": {
        const txIds: string[] = body.txIds || [];
        const { data, error } = await supabase
          .from("transactions")
          .update({ status: "disputed", updated_at: new Date().toISOString() })
          .in("tx_id", txIds)
          .select();
        if (error) throw error;
        result = data;
        break;
      }

      case "open_dispute": {
        // Create a dispute from a transaction
        const txData = await supabase.from("transactions").select("*").eq("tx_id", txId).single();
        if (txData.error) throw txData.error;

        const disputeId = `DSP-${String(Date.now()).slice(-3)}`;
        const { data, error } = await supabase
          .from("disputes")
          .insert({
            dispute_id: disputeId,
            tx_id: txId,
            buyer_name: txData.data.buyer_name,
            vendor_name: txData.data.vendor_name,
            amount: txData.data.amount,
            reason: reason || "Dispute filed by buyer",
            status: "pending",
            priority: "medium",
          })
          .select()
          .single();
        if (error) throw error;

        // Update transaction status
        await supabase.from("transactions").update({ status: "disputed", updated_at: new Date().toISOString() }).eq("tx_id", txId);

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

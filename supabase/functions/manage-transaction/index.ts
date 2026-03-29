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
    const { action, txId, tracking, reason, description } = body;

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

      case "mark_delivered": {
        const { data, error } = await supabase
          .from("transactions")
          .update({
            status: "delivered",
            delivered_date: new Date().toISOString(),
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

        // Fetch all transactions being rejected
        const { data: txRows, error: fetchErr } = await supabase
          .from("transactions")
          .select("*")
          .in("tx_id", txIds);
        if (fetchErr) throw fetchErr;

        // Estimated gas cost in USD for on-chain refund (Polygon avg ~$0.01-0.05)
        // In production this is fetched from gas oracle; using conservative estimate
        const ESTIMATED_GAS_USD = 0.05;

        const refundResults = [];

        for (const tx of (txRows || [])) {
          const gasDeduction = Math.min(ESTIMATED_GAS_USD, tx.amount * 0.005); // cap at 0.5% of principal
          const refundAmount = Math.round((tx.amount - gasDeduction) * 100) / 100;

          // Update transaction status with refund metadata
          await supabase
            .from("transactions")
            .update({
              status: "vendor_rejected",
              updated_at: new Date().toISOString(),
            })
            .eq("tx_id", tx.tx_id);

          // Archive refund receipt in protection_documents
          await supabase.from("protection_documents").insert({
            document_type: "vendor_rejection_refund",
            title: `Vendor Rejection Refund Receipt — ${tx.tx_id}`,
            transaction_id: tx.id,
            user_id: tx.buyer_id,
            role: "buyer",
            industry: tx.industry,
            retention_years: 7,
            metadata: {
              auto_generated: true,
              trigger: "vendor_reject_orders",
              original_amount: tx.amount,
              gas_deducted: gasDeduction,
              refund_amount: refundAmount,
              vendor_id: tx.vendor_id,
              buyer_id: tx.buyer_id,
              buyer_name: tx.buyer_name || "Unknown",
              vendor_name: tx.vendor_name || "Unknown",
              tx_id: tx.tx_id,
              reason: "Vendor rejected order — 100% principal refund minus network gas fee",
              rejected_at: new Date().toISOString(),
            },
          });

          // Notify buyer of refund
          if (tx.buyer_id) {
            await supabase.from("notifications").insert({
              user_id: tx.buyer_id,
              title: "Order Rejected — Refund Initiated",
              message: `The vendor declined order #${tx.order_number || tx.tx_id}. A refund of $${refundAmount.toFixed(2)} has been initiated (network gas fee of $${gasDeduction.toFixed(2)} deducted from escrow per protocol). No cancellation fee applies for vendor-initiated rejections.`,
              type: "warning",
              related_entity_type: "transaction",
              related_entity_id: tx.id,
            });
          }

          // Notify vendor confirmation
          if (tx.vendor_id) {
            await supabase.from("notifications").insert({
              user_id: tx.vendor_id,
              title: "Order Rejected",
              message: `You rejected order #${tx.order_number || tx.tx_id}. The buyer's funds ($${refundAmount.toFixed(2)}) are being returned. Gas fee of $${gasDeduction.toFixed(2)} was deducted from escrow.`,
              type: "info",
              related_entity_type: "transaction",
              related_entity_id: tx.id,
            });
          }

          // Record in vendor_rejections for analytics
          await supabase.from("vendor_rejections").insert({
            transaction_id: tx.id,
            tx_id: tx.tx_id,
            vendor_id: tx.vendor_id,
            buyer_id: tx.buyer_id,
            vendor_name: tx.vendor_name || "Unknown",
            buyer_name: tx.buyer_name || "Unknown",
            original_amount: tx.amount,
            gas_deducted: gasDeduction,
            refund_amount: refundAmount,
            industry: tx.industry,
            rejection_reason: reason || "Vendor declined order",
            refund_status: "initiated",
          });

          refundResults.push({
            tx_id: tx.tx_id,
            original_amount: tx.amount,
            gas_deducted: gasDeduction,
            refund_amount: refundAmount,
          });
        }

        result = refundResults;
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
            description: description || null,
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Blockchain Anchor Helper ─────────────────────────────
async function anchorProof(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  recordType: string,
  eventData: Record<string, unknown>
) {
  try {
    // SHA-256 hash
    const canonical = JSON.stringify(eventData, Object.keys(eventData).sort());
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // txRef from transactionId
    const txData = encoder.encode(transactionId);
    let txRef = "0x";
    for (let i = 0; i < 32; i++) {
      const byte = txData[i % txData.length] ^ (i * 37);
      txRef += (byte & 0xff).toString(16).padStart(2, "0");
    }

    // Get prev hash
    const { data: lastRecord } = await supabase
      .from("blockchain_proofs")
      .select("content_hash")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    const prevHash = lastRecord?.content_hash || "0x" + "0".repeat(64);

    await supabase.from("blockchain_proofs").insert({
      content_hash: contentHash,
      prev_hash: prevHash,
      record_type: recordType,
      tx_ref: txRef,
      transaction_id: transactionId,
      event_data: eventData,
      chain_status: "queued",
    });

    console.log(`[anchor] ${recordType} for tx ${transactionId.slice(0, 8)}... → ${contentHash.slice(0, 16)}...`);
  } catch (err) {
    // Non-blocking — anchoring failure must never break the transaction flow
    console.error("[anchor] Failed to anchor proof:", err);
  }
}

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

        // Anchor: shipping milestone
        await anchorProof(supabase, data.id, "milestone", {
          event: "shipping_confirmed",
          tx_id: txId,
          tracking_number: tracking,
          status: "shipped",
          shipped_date: data.shipped_date,
          order_number: data.order_number,
        });
        break;
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

        // Anchor: delivery milestone
        await anchorProof(supabase, data.id, "milestone", {
          event: "delivery_confirmed",
          tx_id: txId,
          status: "delivered",
          delivered_date: data.delivered_date,
          order_number: data.order_number,
        });
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

        // Anchor: delivery milestone
        await anchorProof(supabase, data.id, "milestone", {
          event: "mark_delivered",
          tx_id: txId,
          status: "delivered",
          delivered_date: data.delivered_date,
          order_number: data.order_number,
        });
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

          // Anchor: rejection record
          await anchorProof(supabase, tx.id, "rejection", {
            event: "vendor_rejection",
            tx_id: tx.tx_id,
            order_number: tx.order_number,
            original_amount: tx.amount,
            gas_deducted: gasDeduction,
            refund_amount: refundAmount,
            rejection_reason: reason || "Vendor declined order",
            rejected_at: new Date().toISOString(),
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

        // Anchor: dispute filed
        await anchorProof(supabase, txData.data.id, "dispute_ruling", {
          event: "dispute_opened",
          dispute_id: disputeId,
          tx_id: txId,
          reason: reason || "Dispute filed by buyer",
          amount: txData.data.amount,
          buyer_name: txData.data.buyer_name,
          vendor_name: txData.data.vendor_name,
          filed_at: new Date().toISOString(),
        });
        break;
      }

      case "unfreeze_transaction": {
        // Admin lifts compliance hold after review
        const restoreStatus = body.restore_status || "locked";
        const resolutionNote = body.resolution_note;
        if (!txId || !resolutionNote) throw new Error("txId and resolution_note are required");

        const validStatuses = ["locked", "shipped", "delivered", "pending"];
        if (!validStatuses.includes(restoreStatus)) throw new Error(`Invalid restore_status. Must be one of: ${validStatuses.join(", ")}`);

        // Fetch the frozen transaction
        const { data: frozenTx, error: fErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("tx_id", txId)
          .single();
        if (fErr || !frozenTx) throw new Error("Transaction not found");
        if (!["compliance_hold", "compliance_review"].includes(frozenTx.status)) {
          throw new Error(`Transaction is not frozen (current status: ${frozenTx.status})`);
        }

        // Restore status
        const { data: unfrozen, error: uErr } = await supabase
          .from("transactions")
          .update({ status: restoreStatus, updated_at: new Date().toISOString() })
          .eq("tx_id", txId)
          .select()
          .single();
        if (uErr) throw uErr;

        // Close related compliance flags
        await supabase
          .from("compliance_flags")
          .update({ status: "resolved" })
          .or(`related_buyer_id.eq.${frozenTx.buyer_id},related_vendor_id.eq.${frozenTx.vendor_id}`)
          .in("status", ["open"]);

        // Archive resolution document
        await supabase.from("protection_documents").insert({
          document_type: "compliance_hold_resolution",
          title: `Compliance Hold Lifted — ${txId}`,
          transaction_id: frozenTx.id,
          user_id: frozenTx.vendor_id,
          role: "admin",
          industry: frozenTx.industry,
          retention_years: 7,
          metadata: {
            auto_generated: true,
            trigger: "admin_unfreeze",
            previous_status: frozenTx.status,
            restored_status: restoreStatus,
            resolution_note: resolutionNote,
            unfrozen_at: new Date().toISOString(),
          },
        });

        // Notify buyer
        if (frozenTx.buyer_id) {
          await supabase.from("notifications").insert({
            user_id: frozenTx.buyer_id,
            title: "Compliance Hold Lifted",
            message: `The compliance hold on order #${frozenTx.order_number || txId} has been resolved. Your transaction has been restored to "${restoreStatus}" status.`,
            type: "info",
            related_entity_type: "transaction",
            related_entity_id: frozenTx.id,
          });
        }

        // Notify vendor
        if (frozenTx.vendor_id) {
          await supabase.from("notifications").insert({
            user_id: frozenTx.vendor_id,
            title: "Compliance Hold Lifted",
            message: `The compliance hold on order #${frozenTx.order_number || txId} has been resolved. Transaction restored to "${restoreStatus}".`,
            type: "info",
            related_entity_type: "transaction",
            related_entity_id: frozenTx.id,
          });
        }

        // Anchor: compliance hold lifted
        await anchorProof(supabase, frozenTx.id, "milestone", {
          event: "compliance_hold_lifted",
          tx_id: txId,
          previous_status: frozenTx.status,
          restored_status: restoreStatus,
          resolution_note: resolutionNote,
          order_number: frozenTx.order_number,
          unfrozen_at: new Date().toISOString(),
        });

        result = unfrozen;
        break;
      }

      case "compliance_reject_refund": {
        // Admin rejects compliance-held transaction and refunds buyer
        const rejectionNote = body.rejection_note;
        if (!txId || !rejectionNote) throw new Error("txId and rejection_note are required");

        const { data: heldTx, error: hErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("tx_id", txId)
          .single();
        if (hErr || !heldTx) throw new Error("Transaction not found");
        if (!["compliance_hold", "compliance_review", "blocked"].includes(heldTx.status)) {
          throw new Error(`Transaction is not in a compliance hold state (current: ${heldTx.status})`);
        }

        // Update to refunded
        const { data: refundedTx, error: rErr } = await supabase
          .from("transactions")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("tx_id", txId)
          .select()
          .single();
        if (rErr) throw rErr;

        // Close compliance flags
        await supabase
          .from("compliance_flags")
          .update({ status: "confirmed" })
          .or(`related_buyer_id.eq.${heldTx.buyer_id},related_vendor_id.eq.${heldTx.vendor_id}`)
          .in("status", ["open"]);

        // Archive rejection document
        await supabase.from("protection_documents").insert({
          document_type: "compliance_rejection_refund",
          title: `Compliance Rejection & Refund — ${txId}`,
          transaction_id: heldTx.id,
          user_id: heldTx.buyer_id,
          role: "admin",
          industry: heldTx.industry,
          retention_years: 7,
          metadata: {
            auto_generated: true,
            trigger: "admin_compliance_reject",
            rejection_note: rejectionNote,
            original_amount: heldTx.amount,
            refund_amount: heldTx.amount,
            buyer_id: heldTx.buyer_id,
            vendor_id: heldTx.vendor_id,
            rejected_at: new Date().toISOString(),
          },
        });

        // Notify buyer of full refund
        if (heldTx.buyer_id) {
          await supabase.from("notifications").insert({
            user_id: heldTx.buyer_id,
            title: "Transaction Rejected — Full Refund Initiated",
            message: `Order #${heldTx.order_number || txId} has been rejected following a compliance review. A full refund of $${Number(heldTx.amount).toFixed(2)} has been initiated to your original payment method.`,
            type: "warning",
            related_entity_type: "transaction",
            related_entity_id: heldTx.id,
          });
        }

        // Notify vendor
        if (heldTx.vendor_id) {
          await supabase.from("notifications").insert({
            user_id: heldTx.vendor_id,
            title: "Transaction Rejected by Compliance",
            message: `Order #${heldTx.order_number || txId} has been rejected following compliance review. The buyer has been refunded in full. Reason: ${rejectionNote}`,
            type: "warning",
            related_entity_type: "transaction",
            related_entity_id: heldTx.id,
          });
        }

        // Anchor: compliance rejection + refund
        await anchorProof(supabase, heldTx.id, "dispute_ruling", {
          event: "compliance_reject_refund",
          tx_id: txId,
          rejection_note: rejectionNote,
          original_amount: heldTx.amount,
          refund_amount: heldTx.amount,
          buyer_id: heldTx.buyer_id,
          vendor_id: heldTx.vendor_id,
          order_number: heldTx.order_number,
          rejected_at: new Date().toISOString(),
        });

        result = refundedTx;
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

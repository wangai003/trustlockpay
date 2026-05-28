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
    const canonical = JSON.stringify(eventData, Object.keys(eventData).sort());
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const txData = encoder.encode(transactionId);
    let txRef = "0x";
    for (let i = 0; i < 32; i++) {
      const byte = txData[i % txData.length] ^ (i * 37);
      txRef += (byte & 0xff).toString(16).padStart(2, "0");
    }

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
    console.error("[anchor] Failed to anchor proof:", err);
  }
}

function generateToken(len = 48): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (const b of arr) out += chars[b % chars.length];
  return out;
}

// ─── Helper: Execute the correct payout based on ruling type ──────
async function executeDisputeResolution(
  supabase: any,
  transactionId: string,
  ruling: string | null,
  _resolution: string | null,
  disputeId: string,
  splitPercentage?: number,
) {
  const fnUrl = Deno.env.get("SUPABASE_URL")!;
  const srvKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${srvKey}`,
  };

  try {
    switch (ruling) {
      case "vendor_release": {
        // 100% release to vendor via escrow-manager
        await fetch(`${fnUrl}/functions/v1/manage-transaction`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "release_funds", txId: null, transactionId }),
        });
        // Update transaction status
        await supabase
          .from("transactions")
          .update({ status: "released", released_date: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", transactionId);
        break;
      }
      case "full_refund": {
        // 100% refund to buyer — mark transaction refunded
        await supabase
          .from("transactions")
          .update({ status: "refunded", updated_at: new Date().toISOString() })
          .eq("id", transactionId);

        // Archive refund receipt
        const { data: tx } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
        if (tx) {
          await supabase.from("protection_documents").insert({
            document_type: "dispute_refund_receipt",
            title: `Dispute Refund Receipt — ${disputeId}`,
            transaction_id: transactionId,
            user_id: tx.buyer_id,
            role: "buyer",
            industry: tx.industry,
            retention_years: 7,
            metadata: {
              auto_generated: true,
              trigger: "dispute_resolution",
              dispute_id: disputeId,
              ruling: "full_refund",
              refund_amount: tx.amount,
              buyer_id: tx.buyer_id,
              vendor_id: tx.vendor_id,
            },
          });
        }
        break;
      }
      case "partial_refund": {
        // Split payout — splitPercentage% to buyer, rest to vendor
        const { data: tx } = await supabase.from("transactions").select("*").eq("id", transactionId).single();
        if (tx && splitPercentage) {
          const buyerAmount = Math.round(tx.amount * (splitPercentage / 100) * 100) / 100;
          const vendorAmount = Math.round((tx.amount - buyerAmount) * 100) / 100;

          await supabase
            .from("transactions")
            .update({ status: "split_resolved", updated_at: new Date().toISOString() })
            .eq("id", transactionId);

          // Archive split receipt
          await supabase.from("protection_documents").insert({
            document_type: "dispute_split_receipt",
            title: `Dispute Split Resolution — ${disputeId}`,
            transaction_id: transactionId,
            user_id: tx.buyer_id,
            role: "admin",
            industry: tx.industry,
            retention_years: 7,
            metadata: {
              auto_generated: true,
              trigger: "dispute_resolution",
              dispute_id: disputeId,
              ruling: "partial_refund",
              split_percentage: splitPercentage,
              buyer_amount: buyerAmount,
              vendor_amount: vendorAmount,
              original_amount: tx.amount,
            },
          });
        }
        break;
      }
      case "dismiss":
        // Funds remain held — no payout action
        break;
      default:
        break;
    }
  } catch (_) { /* best-effort payout execution */ }
}

// ─── Helper: Notify both dispute parties ──────
async function notifyDisputeParties(supabase: any, dispute: any, message: string) {
  for (const userId of [dispute.buyer_id, dispute.vendor_id].filter(Boolean)) {
    await supabase.from("notifications").insert({
      user_id: userId,
      title: "Dispute Resolution",
      message,
      type: "info",
      related_entity_type: "dispute",
      related_entity_id: dispute.id,
    });
  }
}

async function verifyCaller(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return "__service_role__";
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await anon.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callerId = await verifyCaller(req);
    if (!callerId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, disputeId, txId, reason, description, resolution } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authorization: caller must be a transaction party or admin.
    if (callerId !== "__service_role__") {
      const { data: adminRole } = await supabase
        .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
      const isAdmin = !!adminRole;
      const adminOnly = ["review_dispute", "resolve_dispute", "escalate_to_arbitration"];
      if (adminOnly.includes(action) && !isAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Admin role required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // For tx-bound actions, ensure caller is a party.
      const relTxId = txId;
      if (relTxId && !isAdmin) {
        const { data: txRow } = await supabase
          .from("transactions").select("buyer_id, vendor_id").eq("tx_id", relTxId).maybeSingle();
        const isParty = txRow && (txRow.buyer_id === callerId || txRow.vendor_id === callerId);
        if (!isParty) {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    let result;

    switch (action) {
      case "file_dispute": {
        const newDisputeId = `DSP-${String(Date.now()).slice(-3)}`;

        // Check if transaction >= $10,000 for auto-arbitration suggestion
        let amount = 0;
        if (txId) {
          const { data: txData } = await supabase
            .from("transactions")
            .select("amount")
            .eq("tx_id", txId)
            .single();
          amount = txData?.amount || 0;
        }

        const { data, error } = await supabase
          .from("disputes")
          .insert({
            dispute_id: newDisputeId,
            tx_id: txId,
            reason,
            description,
            status: "under_review",
            priority: amount >= 10000 ? "critical" : "medium",
            arbitration_fee: 0,
          })
          .select()
          .single();
        if (error) throw error;

        if (txId) {
          await supabase
            .from("transactions")
            .update({ status: "disputed", updated_at: new Date().toISOString() })
            .eq("tx_id", txId);
        }

        // If >= $10k, notify admin suggesting arbitration
        if (amount >= 10000) {
          try {
            const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/notification-triage";
            await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: "triage",
                notification_type: "dispute_high_value",
                severity: "critical",
                transaction_id: txId,
                user_id: "system",
                message: `High-value dispute ${newDisputeId} opened for $${amount.toLocaleString()}. Arbitration recommended.`,
                metadata: { dispute_id: newDisputeId, amount, arbitration_suggested: true },
              }),
            });
          } catch (_) { /* best-effort */ }
        }

        result = data;

        // Anchor: dispute filed
        if (txId) {
          const { data: txForAnchor } = await supabase.from("transactions").select("id").eq("tx_id", txId).single();
          if (txForAnchor) {
            await anchorProof(supabase, txForAnchor.id, "dispute_ruling", {
              event: "dispute_filed",
              dispute_id: newDisputeId,
              tx_id: txId,
              reason: reason || "Dispute filed",
              amount,
              priority: amount >= 10000 ? "critical" : "medium",
              filed_at: new Date().toISOString(),
            });
          }
        }
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

      // ─── Arbitration Actions ─────────────────────────────────

      case "escalate_to_arbitration": {
        // Fetch dispute + transaction to validate $10k threshold
        const { data: dispute, error: dErr } = await supabase
          .from("disputes")
          .select("*, transactions:transaction_id(*)")
          .eq("dispute_id", disputeId)
          .single();
        if (dErr) throw dErr;

        const txAmount = dispute.amount || dispute.transactions?.amount || 0;
        if (txAmount < 10000) {
          throw new Error("Arbitration is only available for disputes on transactions >= $10,000");
        }

        // Tiered flat fee: $500/$1500/$3000/$5000
        const arbFee = txAmount >= 1_000_000 ? 5000
          : txAmount >= 250_000 ? 3000
          : txAmount >= 50_000 ? 1500
          : 500;

        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "arbitration_pending",
            priority: "critical",
            arbitration_fee: arbFee,
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;

        // Create placeholder observer for arbitrator
        if (dispute.transaction_id) {
          await supabase.from("transaction_observers").insert({
            transaction_id: dispute.transaction_id,
            observer_email: "arbitration@trustlock.io",
            observer_name: "Pending Arbitrator",
            observer_role: "arbitrator",
            permissions: ["view", "sign", "comment"],
            access_token: generateToken(),
          });
        }

        // Notify admin
        try {
          const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/notification-triage";
          await fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              action: "triage",
              notification_type: "arbitration_requested",
              severity: "critical",
              transaction_id: dispute.tx_id,
              user_id: "system",
              message: `Arbitration requested for dispute ${disputeId}. Amount: $${txAmount.toLocaleString()}. Fee: $${arbFee}`,
              metadata: { dispute_id: disputeId, arbitration_fee: arbFee },
            }),
          });
        } catch (_) { /* best-effort */ }

        // Cross-department routing: Disputes → Finance for fee collection
        try {
          await supabase.rpc("route_department_alert", {
            _source_dept: "disputes",
            _target_dept: "finance",
            _alert_type: "arbitration_fee",
            _title: "Arbitration Fee Collection Required",
            _message: `Dispute ${disputeId} escalated to arbitration. Fee: $${arbFee}. Verify OS Pay collection before arbitrator assignment.`,
            _priority: "high",
            _entity_type: "dispute",
            _entity_id: disputeId,
            _admin_id: null,
          });
          // Also notify Executive for critical oversight
          await supabase.rpc("route_department_alert", {
            _source_dept: "disputes",
            _target_dept: "executive",
            _alert_type: "dispute_escalation",
            _title: "🚨 Dispute Escalated to Arbitration",
            _message: `Dispute ${disputeId} ($${txAmount.toLocaleString()}) requires arbitrator. Executive oversight recommended.`,
            _priority: "critical",
            _entity_type: "dispute",
            _entity_id: disputeId,
            _admin_id: null,
          });
        } catch (_) { /* best-effort */ }

        result = data;
        break;
      }

      case "assign_arbitrator": {
        const { arbitratorName, arbitratorEmail } = body;
        if (!arbitratorName || !arbitratorEmail) {
          throw new Error("arbitratorName and arbitratorEmail are required");
        }

        const { data: dispute, error: dErr } = await supabase
          .from("disputes")
          .select("*")
          .eq("dispute_id", disputeId)
          .single();
        if (dErr) throw dErr;

        const accessToken = generateToken();

        // Update or insert the observer record
        if (dispute.transaction_id) {
          // Remove placeholder
          await supabase
            .from("transaction_observers")
            .delete()
            .eq("transaction_id", dispute.transaction_id)
            .eq("observer_role", "arbitrator")
            .eq("observer_name", "Pending Arbitrator");

          await supabase.from("transaction_observers").insert({
            transaction_id: dispute.transaction_id,
            observer_email: arbitratorEmail,
            observer_name: arbitratorName,
            observer_role: "arbitrator",
            permissions: ["view", "sign", "upload", "comment"],
            access_token: accessToken,
            invite_accepted: false,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          });
        }

        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "arbitration_in_progress",
            arbitrator_id: accessToken, // store reference
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;

        // Notify both parties
        try {
          const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/notification-triage";
          for (const userId of [dispute.buyer_id, dispute.vendor_id].filter(Boolean)) {
            await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: "triage",
                notification_type: "arbitrator_assigned",
                severity: "high",
                transaction_id: dispute.tx_id,
                user_id: userId,
                message: `Arbitrator ${arbitratorName} has been assigned to dispute ${disputeId}.`,
                metadata: { dispute_id: disputeId, arbitrator_name: arbitratorName },
              }),
            });
          }
        } catch (_) { /* best-effort */ }

        result = { ...data, access_link: `/audit?token=${accessToken}&role=arbitrator` };
        break;
      }

      case "submit_ruling": {
        const { ruling, splitPercentage } = body;
        const validRulings = ["full_refund", "partial_refund", "vendor_release", "dismiss"];
        if (!validRulings.includes(ruling)) {
          throw new Error(`Invalid ruling. Must be one of: ${validRulings.join(", ")}`);
        }

        let resolutionText = "";
        switch (ruling) {
          case "full_refund":
            resolutionText = "Arbitrator ruled: Full refund to buyer";
            break;
          case "partial_refund":
            resolutionText = `Arbitrator ruled: Partial refund — ${splitPercentage || 50}% to buyer, ${100 - (splitPercentage || 50)}% to vendor`;
            break;
          case "vendor_release":
            resolutionText = "Arbitrator ruled: Full release to vendor";
            break;
          case "dismiss":
            resolutionText = "Arbitrator ruled: Dispute dismissed — funds held pending further review";
            break;
        }

        const { data, error } = await supabase
          .from("disputes")
          .update({
            status: "ruling_issued",
            arbitration_ruling: ruling,
            resolution: resolutionText,
            ruling_accepted_buyer: false,
            ruling_accepted_vendor: false,
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;

        // Generate acknowledgement form for the ruling
        try {
          if (data.transaction_id) {
            const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/acknowledgement-form";
            await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: "generate",
                transaction_id: data.transaction_id,
                form_type: "milestone_signoff",
                title: `Arbitration Ruling — ${disputeId}`,
              }),
            });
          }
        } catch (_) { /* best-effort */ }

        // Notify both parties
        try {
          const fnUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/notification-triage";
          for (const userId of [data.buyer_id, data.vendor_id].filter(Boolean)) {
            await fetch(fnUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                action: "triage",
                notification_type: "arbitration_ruling",
                severity: "critical",
                transaction_id: data.tx_id,
                user_id: userId,
                message: `Arbitration ruling issued for ${disputeId}: ${resolutionText}. You have 7 days to accept.`,
                metadata: { dispute_id: disputeId, ruling, split_percentage: splitPercentage },
              }),
            });
          }
        } catch (_) { /* best-effort */ }

        // Anchor: dispute ruling issued
        if (data.transaction_id) {
          await anchorProof(supabase, data.transaction_id, "dispute_ruling", {
            event: "arbitration_ruling_issued",
            dispute_id: disputeId,
            ruling,
            resolution_text: resolutionText,
            split_percentage: splitPercentage || null,
            amount: data.amount,
            ruled_at: new Date().toISOString(),
          });
        }

        result = data;
        break;
      }

      case "accept_ruling": {
        const { party } = body; // "buyer" or "vendor"
        if (!["buyer", "vendor"].includes(party)) {
          throw new Error("party must be 'buyer' or 'vendor'");
        }

        const updateField = party === "buyer" ? "ruling_accepted_buyer" : "ruling_accepted_vendor";
        const { data, error } = await supabase
          .from("disputes")
          .update({
            [updateField]: true,
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId)
          .select()
          .single();
        if (error) throw error;

        // If both accepted, resolve and trigger the correct payout action
        if (data.ruling_accepted_buyer && data.ruling_accepted_vendor) {
          await supabase
            .from("disputes")
            .update({ status: "resolved", updated_at: new Date().toISOString() })
            .eq("dispute_id", disputeId);

          if (data.transaction_id) {
            await executeDisputeResolution(supabase, data.transaction_id, data.arbitration_ruling, data.resolution, data.dispute_id);
          }
        }

        result = data;
        break;
      }

      // ─── Direct Admin Resolution (non-arbitration) ──────────
      case "resolve_vendor_wins": {
        // 100% release to vendor
        const { data: dispute, error: dErr } = await supabase
          .from("disputes")
          .select("*")
          .eq("dispute_id", disputeId)
          .single();
        if (dErr) throw dErr;

        await supabase
          .from("disputes")
          .update({
            status: "resolved",
            resolution: "Admin ruling: Full release to vendor — vendor wins",
            arbitration_ruling: "vendor_release",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId);

        if (dispute.transaction_id) {
          await executeDisputeResolution(supabase, dispute.transaction_id, "vendor_release", null, disputeId);

          // Anchor: dispute resolved - vendor wins
          await anchorProof(supabase, dispute.transaction_id, "dispute_ruling", {
            event: "dispute_resolved",
            dispute_id: disputeId,
            ruling: "vendor_release",
            resolution: "Admin ruling: Full release to vendor",
            amount: dispute.amount,
            resolved_at: new Date().toISOString(),
          });
        }

        // Notify both parties
        await notifyDisputeParties(supabase, dispute, `Dispute ${disputeId} resolved in vendor's favor. Funds will be released to ${dispute.vendor_name || "the vendor"}.`);

        result = { ...dispute, status: "resolved", resolution: "vendor_wins" };
        break;
      }

      case "resolve_buyer_wins": {
        // 100% refund to buyer
        const { data: dispute, error: dErr } = await supabase
          .from("disputes")
          .select("*")
          .eq("dispute_id", disputeId)
          .single();
        if (dErr) throw dErr;

        await supabase
          .from("disputes")
          .update({
            status: "resolved",
            resolution: "Admin ruling: Full refund to buyer — buyer wins",
            arbitration_ruling: "full_refund",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId);

        if (dispute.transaction_id) {
          await executeDisputeResolution(supabase, dispute.transaction_id, "full_refund", null, disputeId);

          // Anchor: dispute resolved - buyer wins
          await anchorProof(supabase, dispute.transaction_id, "dispute_ruling", {
            event: "dispute_resolved",
            dispute_id: disputeId,
            ruling: "full_refund",
            resolution: "Admin ruling: Full refund to buyer",
            amount: dispute.amount,
            resolved_at: new Date().toISOString(),
          });
        }

        await notifyDisputeParties(supabase, dispute, `Dispute ${disputeId} resolved in buyer's favor. A full refund will be initiated for ${dispute.buyer_name || "the buyer"}.`);

        result = { ...dispute, status: "resolved", resolution: "buyer_wins" };
        break;
      }

      case "resolve_compromise": {
        // Split payout — buyer gets splitPercentage%, vendor gets the rest
        const { splitPercentage } = body;
        if (!splitPercentage || splitPercentage < 1 || splitPercentage > 99) {
          throw new Error("splitPercentage must be between 1 and 99");
        }

        const { data: dispute, error: dErr } = await supabase
          .from("disputes")
          .select("*")
          .eq("dispute_id", disputeId)
          .single();
        if (dErr) throw dErr;

        const vendorPct = 100 - splitPercentage;
        const resText = `Admin ruling: Compromise — ${splitPercentage}% to buyer, ${vendorPct}% to vendor`;

        await supabase
          .from("disputes")
          .update({
            status: "resolved",
            resolution: resText,
            arbitration_ruling: "partial_refund",
            updated_at: new Date().toISOString(),
          })
          .eq("dispute_id", disputeId);

        if (dispute.transaction_id) {
          await executeDisputeResolution(supabase, dispute.transaction_id, "partial_refund", resText, disputeId, splitPercentage);

          // Anchor: dispute resolved - compromise
          await anchorProof(supabase, dispute.transaction_id, "dispute_ruling", {
            event: "dispute_resolved",
            dispute_id: disputeId,
            ruling: "partial_refund",
            resolution: resText,
            split_percentage: splitPercentage,
            amount: dispute.amount,
            resolved_at: new Date().toISOString(),
          });
        }

        await notifyDisputeParties(supabase, dispute, `Dispute ${disputeId} resolved via compromise: ${splitPercentage}% refunded to buyer, ${vendorPct}% released to vendor.`);

        result = { ...dispute, status: "resolved", resolution: resText };
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

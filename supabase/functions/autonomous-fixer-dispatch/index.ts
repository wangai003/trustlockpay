// Autonomous Fixer Dispatch
// Receives dispatched tickets and runs preset-specific diagnostics.
// Free-form tickets are queued (status remains 'dispatched') for owner review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DispatchBody {
  ticket_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticket_id } = (await req.json()) as DispatchBody;
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ticket, error: tErr } = await supabase
      .from("autonomous_fixer_tickets")
      .select("*, transaction:transactions(*)")
      .eq("id", ticket_id)
      .maybeSingle();

    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only act on preset shortcuts; free-form tickets stay dispatched for owner review
    if (ticket.ticket_type !== "preset" || !ticket.preset_key) {
      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          message: "Free-form ticket queued for autonomous agent review.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tx = (ticket as any).transaction;
    const actions: any[] = [];
    let outcome = "no_action_needed";
    let diagnosis = "";
    let agentResponse = "";

    switch (ticket.preset_key) {
      case "stuck_escrow": {
        if (!tx) {
          outcome = "blocked";
          diagnosis = "Transaction record missing.";
          break;
        }
        const ageHours = (Date.now() - new Date(tx.created_at).getTime()) / 3.6e6;
        if (tx.status === "locked" && ageHours > 24) {
          diagnosis = `Escrow locked for ${ageHours.toFixed(1)}h. State is valid; awaiting buyer release or auto-release window.`;
          outcome = "no_action_needed";
        } else if (tx.status === "stuck" || tx.status === "failed") {
          outcome = "requires_executive";
          diagnosis = `Tx in ${tx.status} state — needs code-level intervention.`;
        } else {
          diagnosis = `Tx is in ${tx.status} state — not actually stuck. No fix required.`;
        }
        break;
      }
      case "anchoring_failure": {
        const { data: proofs } = await supabase
          .from("blockchain_proofs")
          .select("*")
          .eq("transaction_id", tx?.id)
          .order("created_at", { ascending: false })
          .limit(5);
        const failed = (proofs ?? []).filter((p: any) => p.status === "failed").length;
        if (failed > 0) {
          // Re-queue for next anchoring cron run by marking as pending
          await supabase
            .from("blockchain_proofs")
            .update({ status: "pending", retry_count: 0 })
            .eq("transaction_id", tx?.id)
            .eq("status", "failed");
          actions.push({ action: "requeue_anchoring", count: failed });
          outcome = "fixed";
          diagnosis = `Re-queued ${failed} failed anchor(s) for next cron run.`;
        } else {
          outcome = "no_action_needed";
          diagnosis = "No failed anchoring proofs found for this transaction.";
        }
        break;
      }
      case "failed_payout": {
        const { data: payouts } = await supabase
          .from("payout_requests")
          .select("*")
          .eq("transaction_id", tx?.id)
          .order("created_at", { ascending: false })
          .limit(3);
        const stuck = (payouts ?? []).find((p: any) =>
          ["failed", "pending"].includes(p.status) &&
          (Date.now() - new Date(p.created_at).getTime()) / 3.6e6 > 48
        );
        if (stuck) {
          outcome = "requires_executive";
          diagnosis = `Payout ${stuck.id} stalled in ${stuck.status} for >48h. Requires manual Executive review.`;
        } else {
          outcome = "no_action_needed";
          diagnosis = "No stalled payouts detected. Customer may be reading status incorrectly.";
        }
        break;
      }
      case "kyc_stuck": {
        const { data: kyc } = await supabase
          .from("kyc_queue")
          .select("*")
          .or(`vendor_id.eq.${tx?.vendor_id},vendor_id.eq.${tx?.buyer_id}`)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (kyc && (kyc as any).status === "pending") {
          const days = (Date.now() - new Date((kyc as any).submitted_at).getTime()) / 8.64e7;
          if (days > 3) {
            outcome = "requires_executive";
            diagnosis = `KYC pending ${days.toFixed(1)} days. Compliance team manual review required.`;
          } else {
            outcome = "no_action_needed";
            diagnosis = `KYC submitted ${days.toFixed(1)} days ago — within standard SLA.`;
          }
        } else {
          outcome = "no_action_needed";
          diagnosis = "No pending KYC for parties on this transaction.";
        }
        break;
      }
      case "notification_retry": {
        // Re-create notification for the buyer/vendor
        if (tx) {
          await supabase.from("notifications").insert({
            user_id: tx.buyer_id,
            title: "Order Status Update",
            message: `Refreshed status for order ${tx.tx_id}: ${tx.status}`,
            type: "info",
            related_entity_type: "transaction",
            related_entity_id: tx.id,
          });
          actions.push({ action: "notification_resent" });
          outcome = "fixed";
          diagnosis = "Status notification re-sent to buyer.";
        }
        break;
      }
      case "stale_transaction": {
        if (tx) {
          await supabase
            .from("transactions")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", tx.id);
          actions.push({ action: "touched_updated_at" });
          outcome = "fixed";
          diagnosis = "Transaction record refreshed; downstream listeners will re-sync.";
        }
        break;
      }
      default:
        outcome = "requires_executive";
        diagnosis = `Unknown preset_key: ${ticket.preset_key}. Escalating.`;
    }

    agentResponse =
      outcome === "fixed"
        ? `Autonomous agent diagnosed and resolved: ${diagnosis}`
        : outcome === "no_action_needed"
        ? `Autonomous agent diagnosis: ${diagnosis} No action required.`
        : `Autonomous agent could not safely resolve: ${diagnosis}`;

    const { error: resErr } = await supabase.rpc("resolve_autonomous_fixer_ticket", {
      _ticket_id: ticket_id,
      _outcome: outcome,
      _diagnosis: diagnosis,
      _agent_response: agentResponse,
      _actions: actions,
    });

    if (resErr) {
      return new Response(JSON.stringify({ error: resErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, outcome, diagnosis, actions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

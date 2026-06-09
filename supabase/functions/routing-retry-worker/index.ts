// deno-lint-ignore-file no-explicit-any
// Event-driven routing retry worker.
// No cron sweeper — retries are user/admin-triggered or fired by Postgres
// triggers when an unblocking condition (wallet saved, KYC approved, processor
// configured, etc.) occurs for a transaction with a queued failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BRIDGE_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/wallet-routing-bridge`;

async function callBridge(payload: Record<string, unknown>) {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && (data as any).success !== false, data, status: res.status };
}

async function notifyUser(
  sb: ReturnType<typeof getSupabase>,
  row: any,
  title: string,
  message: string,
  type: "success" | "warning" | "info" | "error" = "info",
) {
  if (!row.recipient_user_id) return;
  await sb.from("notifications").insert({
    user_id: row.recipient_user_id,
    title,
    message,
    type,
    related_entity_type: "routing_retry",
    related_entity_id: row.id,
  });
}

// ─── Cross-department alerting ──
// Finance owns payment flow; Compliance owns KYC/sanctions blockers;
// Operations owns transaction state. We fan out to all relevant departments
// so the right team sees the retry queue activity in their inbox.
function departmentsForRow(row: any): { source: string; targets: string[] } {
  const reason = String(row.failure_reason || "").toLowerCase();
  const targets = new Set<string>(["finance"]); // finance always sees money movement
  if (reason.includes("kyc") || reason.includes("sanction") || reason.includes("aml")) {
    targets.add("compliance");
  }
  if (row.surface === "admin_os_pay" || row.action?.includes("refund") || row.action?.includes("release")) {
    targets.add("operations");
  }
  return { source: "finance", targets: Array.from(targets) };
}

async function notifyDepartments(
  sb: ReturnType<typeof getSupabase>,
  row: any,
  kind: "manual_required" | "retry_failed" | "retry_succeeded",
) {
  const { source, targets } = departmentsForRow(row);
  const amount = `$${Number(row.amount_principal || 0).toFixed(2)}`;
  const meta = `action=${row.action} surface=${row.surface} tx=${row.transaction_id ?? "n/a"}`;

  const titleMap: Record<string, string> = {
    manual_required: "Routing Retry — Manual Resolution Required",
    retry_failed: "Routing Retry Failed — Awaiting Unblock",
    retry_succeeded: "Routing Retry Succeeded",
  };
  const messageMap: Record<string, string> = {
    manual_required: `Retry queue entry exhausted attempts for ${amount}. Reason: ${row.failure_reason || "unknown"}. ${meta}.`,
    retry_failed: `Retry attempt #${row.attempt_count} failed for ${amount}. Reason: ${row.failure_reason || "unknown"}. Will fire again when blocker clears. ${meta}.`,
    retry_succeeded: `Funds of ${amount} routed successfully on retry. Queue entry cleared. ${meta}.`,
  };
  const priority = kind === "manual_required" ? "critical" : kind === "retry_failed" ? "high" : "normal";

  for (const target of targets) {
    await sb.from("admin_cross_department_alerts").insert({
      source_department: source,
      target_department: target,
      alert_type: `routing_retry_${kind}`,
      title: titleMap[kind],
      message: messageMap[kind],
      priority,
      status: kind === "retry_succeeded" ? "completed" : "pending",
      related_entity_type: "routing_retry",
      related_entity_id: row.id,
      dependency_chain: { transaction_id: row.transaction_id, milestone_id: row.milestone_id, action: row.action, surface: row.surface },
    });
  }
}

async function processRow(sb: ReturnType<typeof getSupabase>, row: any) {
  await sb.from("routing_retry_queue").update({
    status: "retrying",
    last_attempted_at: new Date().toISOString(),
  }).eq("id", row.id);

  // Fee-safe replay
  const feeTaken = Number(row.amount_fee_already_taken || 0) > 0;
  let payload: Record<string, unknown>;
  if (feeTaken && row.recipient_address && row.amount_principal > 0) {
    payload = {
      action: "route_principal_only",
      transactionId: row.transaction_id,
      destination: row.recipient_address,
      amount: Number(row.amount_principal),
      retryId: row.id,
    };
  } else {
    payload = { ...(row.original_payload || {}) };
    if (!payload.action) payload.action = row.action;
    if (!payload.transactionId && row.transaction_id) payload.transactionId = row.transaction_id;
  }

  const { ok, data, status } = await callBridge(payload);
  const nextAttempt = (row.attempt_count || 0) + 1;

  if (ok) {
    // Success → remove the queue entry entirely (no lingering rows)
    await sb.from("routing_retry_queue").delete().eq("id", row.id);

    await notifyUser(sb, row,
      "Payment Routed Successfully",
      `Your ${String(row.action).replace(/_/g, " ")} for $${Number(row.amount_principal).toFixed(2)} completed. No additional fees were charged.`,
      "success");
    await notifyDepartments(sb, { ...row, attempt_count: nextAttempt }, "retry_succeeded");
    return { id: row.id, ok: true, cleared: true };
  }

  // Failure path — back to awaiting_update; next event will retrigger us
  const reachedMax = nextAttempt >= (row.max_attempts || 10);
  await sb.from("routing_retry_queue").update({
    status: reachedMax ? "manual_required" : "awaiting_update",
    attempt_count: nextAttempt,
    failure_reason: (data as any)?.error || `HTTP ${status}`,
    failure_details: { last_response: data, http_status: status },
  }).eq("id", row.id);

  await notifyUser(sb, row,
    reachedMax ? "Payment Needs Manual Review" : "Payment Retry Pending",
    reachedMax
      ? `We've tried ${nextAttempt} times to route $${Number(row.amount_principal).toFixed(2)}. An admin has been alerted. No funds were lost — they remain safely held.`
      : `Retry could not complete (${(data as any)?.error || "unknown"}). It will fire again automatically once the blocker is resolved (e.g. wallet saved, KYC approved).`,
    reachedMax ? "error" : "warning");

  await notifyDepartments(sb, { ...row, attempt_count: nextAttempt }, reachedMax ? "manual_required" : "retry_failed");
  return { id: row.id, ok: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = getSupabase();
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = (body as any).action || "retry_now";

  // ─── enqueue: called by bridge / payout-router / refund-router on failure ──
  if (action === "enqueue") {
    const { data, error } = await sb.from("routing_retry_queue").insert({
      transaction_id: (body as any).transactionId ?? null,
      milestone_id: (body as any).milestoneId ?? null,
      surface: (body as any).surface ?? "admin_os_pay",
      action: (body as any).bridgeAction,
      recipient_user_id: (body as any).recipientUserId ?? null,
      recipient_role: (body as any).recipientRole ?? null,
      recipient_address: (body as any).recipientAddress ?? null,
      recipient_chain: (body as any).recipientChain ?? "polygon",
      recipient_method: (body as any).recipientMethod ?? null,
      amount_principal: Number((body as any).amountPrincipal ?? 0),
      amount_fee_already_taken: Number((body as any).amountFeeAlreadyTaken ?? 0),
      fee_phase: (body as any).feePhase ?? "none",
      original_payload: (body as any).payload ?? {},
      failure_reason: (body as any).reason ?? "unknown",
      failure_code: (body as any).code ?? null,
      status: "awaiting_update",
    }).select().single();
    if (error) return json({ error: error.message }, 500);
    await notifyDepartments(sb, data, "retry_failed");
    return json({ success: true, retryId: data.id });
  }

  // ─── retry_unblocked: invoked by Postgres trigger (pg_notify) when a row's blocker clears ──
  if (action === "retry_unblocked") {
    const { retryId } = body as any;
    const { data: row } = await sb.from("routing_retry_queue").select("*").eq("id", retryId).single();
    if (!row || row.status === "completed" || row.status === "abandoned") {
      return json({ success: true, skipped: true });
    }
    return json({ success: true, ...(await processRow(sb, row)) });
  }

  // ─── retry_now: explicit user/admin click ──
  if (action === "retry_now") {
    const { retryId } = body as any;
    if (!retryId) return json({ error: "retryId required" }, 400);
    const { data: row } = await sb.from("routing_retry_queue").select("*").eq("id", retryId).single();
    if (!row) return json({ error: "not found" }, 404);
    if (row.status === "completed") return json({ success: true, alreadyCompleted: true });
    return json({ success: true, ...(await processRow(sb, row)) });
  }

  // ─── abandon: admin marks unrecoverable ──
  if (action === "abandon") {
    const { retryId, reason } = body as any;
    await sb.from("routing_retry_queue").update({
      status: "abandoned",
      resolved_at: new Date().toISOString(),
      failure_reason: reason || "manually abandoned",
    }).eq("id", retryId);
    return json({ success: true });
  }

  return json({ error: "unknown action" }, 400);
});

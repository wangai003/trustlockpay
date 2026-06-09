// deno-lint-ignore-file no-explicit-any
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

function backoffMs(attempt: number): number {
  const m = Math.min(2 ** attempt, 1440); // minutes, cap at 24h
  return m * 60_000;
}

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

async function processRow(sb: ReturnType<typeof getSupabase>, row: any) {
  await sb.from("routing_retry_queue").update({
    status: "retrying",
    last_attempted_at: new Date().toISOString(),
  }).eq("id", row.id);

  // Decide retry payload
  const feeTaken = Number(row.amount_fee_already_taken || 0) > 0;
  let payload: Record<string, unknown>;
  if (feeTaken && row.recipient_address && row.amount_principal > 0) {
    // Fee-safe replay — never re-deducts the 1%
    payload = {
      action: "route_principal_only",
      transactionId: row.transaction_id,
      destination: row.recipient_address,
      amount: Number(row.amount_principal),
      retryId: row.id,
    };
  } else {
    // Replay original payload as-is
    payload = { ...(row.original_payload || {}) };
    if (!payload.action) payload.action = row.action;
    if (!payload.transactionId && row.transaction_id) payload.transactionId = row.transaction_id;
  }

  const { ok, data, status } = await callBridge(payload);
  const nextAttempt = (row.attempt_count || 0) + 1;

  if (ok) {
    await sb.from("routing_retry_queue").update({
      status: "completed",
      attempt_count: nextAttempt,
      resolved_at: new Date().toISOString(),
      failure_details: { last_response: data },
    }).eq("id", row.id);

    await notifyUser(sb, row,
      "✅ Payment Retried Successfully",
      `Your ${String(row.action).replace(/_/g, " ")} for $${Number(row.amount_principal).toFixed(2)} completed on retry. No additional fees were charged.`,
      "success");
    return { id: row.id, ok: true };
  }

  // Failure path
  const reachedMax = nextAttempt >= (row.max_attempts || 10);
  await sb.from("routing_retry_queue").update({
    status: reachedMax ? "manual_required" : "awaiting_update",
    attempt_count: nextAttempt,
    next_retry_at: new Date(Date.now() + backoffMs(nextAttempt)).toISOString(),
    failure_reason: (data as any)?.error || `HTTP ${status}`,
    failure_details: { last_response: data, http_status: status },
  }).eq("id", row.id);

  await notifyUser(sb, row,
    reachedMax ? "⚠️ Payment Needs Manual Review" : "⏳ Payment Retry Pending",
    reachedMax
      ? `We've tried ${nextAttempt} times to route $${Number(row.amount_principal).toFixed(2)}. An admin has been alerted to resolve this manually. No funds were lost — they remain safely held.`
      : `Retry ${nextAttempt} could not complete (${(data as any)?.error || "unknown"}). We'll automatically try again, or you can fix the blocker (e.g. save a payout wallet).`,
    reachedMax ? "error" : "warning");

  if (reachedMax) {
    const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin").limit(5);
    for (const a of admins || []) {
      await sb.from("notifications").insert({
        user_id: a.user_id,
        title: "📋 Routing Retry — Manual Required",
        message: `Retry queue entry ${row.id} for tx ${row.transaction_id} exhausted ${nextAttempt} attempts. Action: ${row.action}.`,
        type: "warning",
        is_action_required: true,
        related_entity_type: "routing_retry",
        related_entity_id: row.id,
      });
    }
  }
  return { id: row.id, ok: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = getSupabase();
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const action = (body as any).action || "sweep";

  // ─── enqueue: callable by other edge functions ──
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
      status: "queued",
    }).select().single();
    if (error) return json({ error: error.message }, 500);
    return json({ success: true, retryId: data.id });
  }

  // ─── retry_now: admin/user-triggered immediate retry ──
  if (action === "retry_now") {
    const { retryId } = body as any;
    if (!retryId) return json({ error: "retryId required" }, 400);
    const { data: row } = await sb.from("routing_retry_queue").select("*").eq("id", retryId).single();
    if (!row) return json({ error: "not found" }, 404);
    if (row.status === "completed") return json({ success: true, alreadyCompleted: true });
    const result = await processRow(sb, row);
    return json({ success: true, ...result });
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

  // ─── sweep (default, cron-driven) ──
  const { data: rows } = await sb
    .from("routing_retry_queue")
    .select("*")
    .in("status", ["queued", "awaiting_update"])
    .lte("next_retry_at", new Date().toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(25);

  const results: any[] = [];
  for (const row of rows || []) {
    try {
      results.push(await processRow(sb, row));
    } catch (e) {
      results.push({ id: row.id, ok: false, error: (e as Error).message });
    }
  }
  return json({ success: true, processed: results.length, results });
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Priority Rules ────────────────────────────────────────
type Priority = "critical" | "high" | "medium" | "low";

interface TriageInput {
  notification_type: string;
  severity?: string;
  transaction_id?: string;
  user_id: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

function assignPriority(input: TriageInput): Priority {
  const { notification_type, severity, metadata } = input;
  const amount = Number(metadata?.amount ?? 0);

  // ── Critical ──
  if (notification_type === "sanctions_block") return "critical";
  if (notification_type === "sanctions_flag" && severity === "critical") return "critical";
  if (notification_type === "escrow_release_failure") return "critical";
  if (notification_type === "fraud_alert") return "critical";
  if (notification_type === "dispute_opened" && amount > 10000) return "critical";
  if (severity === "critical") return "critical";

  // ── High ──
  if (notification_type === "dispute_opened") return "high";
  if (notification_type === "milestone_payment_release") return "high";
  if (notification_type === "kyc_rejection") return "high";
  if (notification_type === "auto_release_countdown") return "high";
  if (notification_type === "sanctions_flag") return "high";
  if (notification_type === "compliance_flag") return "high";
  if (notification_type === "transaction_blocked") return "high";
  if (severity === "high") return "high";

  // ── Medium ──
  if (notification_type === "milestone_completed") return "medium";
  if (notification_type === "document_uploaded") return "medium";
  if (notification_type === "observer_signed") return "medium";
  if (notification_type === "payout_processed") return "medium";
  if (notification_type === "escrow_locked") return "medium";
  if (notification_type === "escrow_released") return "medium";
  if (notification_type === "kyc_approved") return "medium";
  if (notification_type === "observer_added") return "medium";
  if (severity === "medium") return "medium";

  // ── Low ──
  return "low";
}

function buildTitle(notificationType: string, metadata?: Record<string, unknown>): string {
  const titles: Record<string, string> = {
    sanctions_block: "🚨 Sanctions Block",
    sanctions_flag: "⚠️ Sanctions Flag — Review Required",
    escrow_release_failure: "🚨 Escrow Release Failed",
    fraud_alert: "🚨 Fraud Alert",
    dispute_opened: "⚠️ Dispute Opened",
    milestone_payment_release: "💰 Milestone Payment Released",
    kyc_rejection: "❌ KYC Rejected",
    auto_release_countdown: "⏱️ Auto-Release Countdown Started",
    milestone_completed: "✅ Milestone Completed",
    document_uploaded: "📄 Document Uploaded",
    observer_signed: "✍️ Observer Signed",
    payout_processed: "💸 Payout Processed",
    escrow_locked: "🔒 Escrow Locked",
    escrow_released: "🔓 Escrow Released",
    kyc_approved: "✅ KYC Approved",
    observer_added: "👁️ Observer Added",
    login: "🔐 Login Detected",
    settings_changed: "⚙️ Settings Updated",
    profile_updated: "👤 Profile Updated",
    compliance_flag: "⚠️ Compliance Flag",
    transaction_blocked: "🚫 Transaction Blocked",
  };
  return titles[notificationType] ?? `Notification: ${notificationType}`;
}

// ─── Helpers ───────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Action: Triage & Create ───────────────────────────────
async function triageAndCreate(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const {
    notification_type, severity, transaction_id,
    user_id, message, metadata,
  } = body as unknown as TriageInput & { notification_type: string };

  if (!user_id || !notification_type) {
    return errorResponse("user_id and notification_type are required", 400);
  }

  const priority = assignPriority({
    notification_type: String(notification_type),
    severity: severity ? String(severity) : undefined,
    transaction_id: transaction_id ? String(transaction_id) : undefined,
    user_id: String(user_id),
    message: message ? String(message) : undefined,
    metadata: (metadata as Record<string, unknown>) ?? {},
  });

  const title = buildTitle(String(notification_type), metadata as Record<string, unknown>);
  const notifMessage = message
    ? String(message)
    : `${title} — Priority: ${priority.toUpperCase()}`;

  // Insert user notification
  const { data: notification, error: insErr } = await supabase
    .from("notifications")
    .insert({
      user_id: String(user_id),
      title,
      message: notifMessage,
      type: priority,
      related_entity_type: String(notification_type),
      related_entity_id: transaction_id ? String(transaction_id) : null,
    })
    .select()
    .single();

  if (insErr) return errorResponse(insErr.message, 500);

  // For critical/high: also notify all admins
  if (priority === "critical" || priority === "high") {
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const adminNotifs = admins
        .filter((a: { user_id: string }) => a.user_id !== String(user_id))
        .map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: `[ADMIN] ${title}`,
          message: `${notifMessage} | User: ${user_id}`,
          type: priority,
          related_entity_type: String(notification_type),
          related_entity_id: transaction_id ? String(transaction_id) : null,
        }));

      if (adminNotifs.length > 0) {
        await supabase.from("notifications").insert(adminNotifs);
      }
    }
  }

  return jsonResponse({
    success: true,
    notification,
    priority,
    admin_notified: priority === "critical" || priority === "high",
  });
}

// ─── Action: Get Triaged ───────────────────────────────────
async function getTriaged(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { user_id, include_read } = body;

  if (!user_id) return errorResponse("user_id is required", 400);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", String(user_id))
    .order("created_at", { ascending: false })
    .limit(200);

  if (!include_read) {
    query = query.eq("is_read", false);
  }

  const { data: notifications, error } = await query;
  if (error) return errorResponse(error.message, 500);

  // Group by priority (stored in `type` field)
  const grouped: Record<string, unknown[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    other: [],
  };

  const counts: Record<string, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    other: 0,
  };

  for (const n of notifications ?? []) {
    const bucket = grouped[n.type] ? n.type : "other";
    grouped[bucket].push(n);
    counts[bucket]++;
  }

  return jsonResponse({
    success: true,
    grouped,
    counts,
    total: notifications?.length ?? 0,
  });
}

// ─── Action: Bulk Dismiss ──────────────────────────────────
async function bulkDismiss(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { user_id, priority, notification_ids } = body;

  if (!user_id) return errorResponse("user_id is required", 400);

  if (notification_ids && Array.isArray(notification_ids)) {
    // Dismiss specific notifications
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", String(user_id))
      .in("id", notification_ids.map(String));

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ success: true, dismissed: notification_ids.length });
  }

  if (priority) {
    // Dismiss all notifications of a given priority level
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", String(user_id))
      .eq("type", String(priority))
      .eq("is_read", false)
      .select("id");

    if (error) return errorResponse(error.message, 500);
    return jsonResponse({ success: true, dismissed: data?.length ?? 0 });
  }

  return errorResponse("Either priority or notification_ids is required", 400);
}

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "triage":
        return await triageAndCreate(body);
      case "get_triaged":
        return await getTriaged(body);
      case "bulk_dismiss":
        return await bulkDismiss(body);
      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: triage, get_triaged, bulk_dismiss`,
          400
        );
    }
  } catch (err) {
    console.error("notification-triage error:", err);
    return errorResponse("Internal server error", 500);
  }
});

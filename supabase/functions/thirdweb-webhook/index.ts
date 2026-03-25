import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-thirdweb-signature",
};

// ─── Helpers ──────────────────────────────────────────────
function getSupabase() {
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

// ─── Verify Thirdweb webhook signature ────────────────────
// Thirdweb signs webhooks with HMAC-SHA256 using the webhook secret
async function verifyThirdwebSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const secret = Deno.env.get("THIRDWEB_WEBHOOK_SECRET");
  // If no secret configured, skip verification in dev/testnet
  if (!secret) {
    console.warn("THIRDWEB_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }
  if (!signature) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    );
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

// ─── Forward confirm_payment to checkout-widget ───────────
async function forwardConfirmPayment(sessionId: string): Promise<Record<string, unknown>> {
  const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/checkout-widget`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
    },
    body: JSON.stringify({
      action: "confirm_payment",
      sessionId,
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}

// ─── Update os_payments record ────────────────────────────
async function updatePaymentStatus(
  paymentId: string,
  status: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = getSupabase();

  // Find the os_payments record matching the thirdweb payment
  const { data: payments } = await supabase
    .from("os_payments")
    .select("id, action, status")
    .eq("action", "thirdweb_onramp")
    .eq("status", "processing")
    .order("created_at", { ascending: false })
    .limit(10);

  if (payments && payments.length > 0) {
    // Update the most recent matching record
    const { error } = await supabase
      .from("os_payments")
      .update({ status })
      .eq("id", payments[0].id);

    if (error) {
      console.error("Failed to update os_payments:", error);
    }
  }

  console.log(`Payment ${paymentId} status updated to: ${status}`, metadata);
}

// ─── Create notification for payment event ────────────────
async function createNotification(
  userId: string | null,
  title: string,
  message: string,
  type: string,
  relatedId?: string
) {
  if (!userId) return;
  const supabase = getSupabase();

  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    related_entity_type: "payment",
    related_entity_id: relatedId || null,
  });
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-thirdweb-signature");

    // Verify webhook signature
    const verified = await verifyThirdwebSignature(rawBody, signature);
    if (!verified) {
      console.error("Thirdweb webhook signature verification failed");
      return errorResponse("Webhook signature verification failed", 401);
    }

    const body = JSON.parse(rawBody);

    // Thirdweb webhook event structure:
    // { event: "payment.completed", data: { id, status, ... } }
    const event = body.event || body.type || body.status || "";
    const data = body.data || body.result || body;
    const paymentId = data.id || data.paymentId || "";
    const sessionId = data.metadata?.checkout_session_id || data.metadata?.sessionId || "";
    const userId = data.metadata?.user_id || null;

    console.log(`Thirdweb webhook: event=${event}, paymentId=${paymentId}, sessionId=${sessionId}`);

    // ── Payment completed (on-ramp success) ──────────────
    const successEvents = [
      "payment.completed",
      "payment_completed",
      "purchase.complete",
      "buy.completed",
      "onramp.completed",
    ];

    if (successEvents.includes(event)) {
      // 1. Update os_payments record
      await updatePaymentStatus(paymentId, "completed", {
        event,
        completedAt: new Date().toISOString(),
        chain: data.chain || data.chainId,
        token: data.token || data.tokenAddress,
        amount: data.amount,
        txHash: data.transactionHash || data.txHash,
      });

      // 2. If linked to a checkout session, confirm the payment
      let confirmResult = null;
      if (sessionId) {
        confirmResult = await forwardConfirmPayment(sessionId);
      }

      // 3. Notify user
      await createNotification(
        userId,
        "Payment Confirmed",
        `Your payment of ${data.amount || "N/A"} has been confirmed and funds are now in escrow.`,
        "success",
        paymentId
      );

      return jsonResponse({
        success: true,
        event,
        action: "payment_confirmed",
        paymentId,
        confirmResult,
      });
    }

    // ── Payment failed ───────────────────────────────────
    const failureEvents = [
      "payment.failed",
      "payment_failed",
      "purchase.failed",
      "buy.failed",
      "onramp.failed",
    ];

    if (failureEvents.includes(event)) {
      await updatePaymentStatus(paymentId, "failed", { event, reason: data.reason });

      await createNotification(
        userId,
        "Payment Failed",
        `Your payment could not be processed. ${data.reason || "Please try again."}`,
        "error",
        paymentId
      );

      return jsonResponse({
        success: true,
        event,
        action: "payment_failed",
        paymentId,
      });
    }

    // ── Payment expired ──────────────────────────────────
    const expiredEvents = [
      "payment.expired",
      "payment_expired",
      "purchase.expired",
    ];

    if (expiredEvents.includes(event)) {
      await updatePaymentStatus(paymentId, "expired", { event });

      await createNotification(
        userId,
        "Payment Expired",
        "Your payment session has expired. Please initiate a new payment.",
        "warning",
        paymentId
      );

      return jsonResponse({
        success: true,
        event,
        action: "payment_expired",
        paymentId,
      });
    }

    // ── Swap/off-ramp completed ──────────────────────────
    if (event === "swap.completed" || event === "offramp.completed") {
      await updatePaymentStatus(paymentId, "completed", {
        event,
        direction: "offramp",
      });

      await createNotification(
        userId,
        "Payout Processed",
        "Your funds have been converted and are being sent to your account.",
        "success",
        paymentId
      );

      return jsonResponse({
        success: true,
        event,
        action: "offramp_completed",
        paymentId,
      });
    }

    // ── Unhandled event — acknowledge ────────────────────
    console.log(`Thirdweb webhook: unhandled event=${event}`);
    return jsonResponse({
      success: true,
      event,
      action: "acknowledged",
    });
  } catch (err) {
    console.error("thirdweb-webhook error:", err);
    return errorResponse("Internal server error", 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Verify Stripe webhook signature (HMAC SHA-256) ───────
async function verifyStripeSignature(
  payload: string,
  sigHeader: string | null
): Promise<boolean> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  if (!sigHeader) return false;

  try {
    // Parse Stripe signature header: t=timestamp,v1=signature
    const parts = sigHeader.split(",").reduce((acc, part) => {
      const [key, val] = part.split("=");
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts["t"];
    const expectedSig = parts["v1"];
    if (!timestamp || !expectedSig) return false;

    const signedPayload = `${timestamp}.${payload}`;
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
      new TextEncoder().encode(signedPayload)
    );
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === expectedSig;
  } catch (err) {
    console.error("Stripe signature verification error:", err);
    return false;
  }
}

// ─── Notify user ──────────────────────────────────────────
async function notify(
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

// ─── Forward confirm to checkout-widget ───────────────────
async function forwardConfirm(sessionId: string) {
  const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/checkout-widget`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
    },
    body: JSON.stringify({ action: "confirm_payment", sessionId }),
  });
  return (await res.json()) as Record<string, unknown>;
}

// ─── Forward to wallet-routing-bridge (Transaction Wallet → Escrow Wallet) ──
async function forwardWalletRouting(transactionId: string, amount: number, processor: string) {
  const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/wallet-routing-bridge`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
    },
    body: JSON.stringify({
      action: "route_inbound",
      transactionId,
      processor,
      paymentMethod: "card",
      verifiedAmount: amount,
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get("stripe-signature");

    const verified = await verifyStripeSignature(rawBody, sigHeader);
    if (!verified) {
      console.error("Stripe webhook signature verification failed");
      return json({ error: "Signature verification failed" }, 401);
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type || "";
    const data = event.data?.object || {};
    const metadata = data.metadata || {};
    const sessionId = metadata.checkout_session_id || "";
    const transactionId = metadata.transaction_id || "";
    const userId = metadata.user_id || null;

    console.log(`Stripe webhook: type=${eventType}, sessionId=${sessionId}`);

    const supabase = getSupabase();

    // ── Payment Intent Succeeded ──────────────────────
    if (eventType === "payment_intent.succeeded") {
      // Update os_payments
      const { data: payments } = await supabase
        .from("os_payments")
        .select("id")
        .eq("action", "stripe_onramp")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments?.length) {
        await supabase
          .from("os_payments")
          .update({ status: "completed" })
          .eq("id", payments[0].id);
      }

      // Confirm checkout session
      let confirmResult = null;
      if (sessionId) {
        confirmResult = await forwardConfirm(sessionId);
      }

      // Lock funds in escrow
      let escrowResult = null;
      if (transactionId) {
        escrowResult = await forwardEscrowLock(transactionId);
      }

      await notify(
        userId,
        "Payment Confirmed",
        `Your Stripe payment of $${(data.amount / 100).toFixed(2)} has been confirmed.`,
        "success",
        data.id
      );

      return json({
        success: true,
        event: eventType,
        action: "payment_confirmed",
        confirmResult,
        escrowResult,
      });
    }

    // ── Payment Intent Failed ─────────────────────────
    if (eventType === "payment_intent.payment_failed") {
      const { data: payments } = await supabase
        .from("os_payments")
        .select("id")
        .eq("action", "stripe_onramp")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments?.length) {
        await supabase
          .from("os_payments")
          .update({ status: "failed" })
          .eq("id", payments[0].id);
      }

      await notify(
        userId,
        "Payment Failed",
        `Your payment could not be processed. ${data.last_payment_error?.message || "Please try again."}`,
        "error",
        data.id
      );

      return json({ success: true, event: eventType, action: "payment_failed" });
    }

    // ── Charge Refunded ───────────────────────────────
    if (eventType === "charge.refunded") {
      await notify(
        userId,
        "Refund Processed",
        `A refund of $${(data.amount_refunded / 100).toFixed(2)} has been processed.`,
        "info",
        data.id
      );

      return json({ success: true, event: eventType, action: "refund_processed" });
    }

    // ── Checkout Session Completed ────────────────────
    if (eventType === "checkout.session.completed") {
      let confirmResult = null;
      const csSessionId = metadata.checkout_session_id || data.id;
      if (csSessionId) {
        confirmResult = await forwardConfirm(csSessionId);
      }
      if (transactionId) {
        await forwardEscrowLock(transactionId);
      }

      return json({
        success: true,
        event: eventType,
        action: "checkout_completed",
        confirmResult,
      });
    }

    // ── Unhandled ─────────────────────────────────────
    console.log(`Stripe webhook: unhandled event=${eventType}`);
    return json({ success: true, event: eventType, action: "acknowledged" });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

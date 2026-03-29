import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cc-webhook-signature",
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

// ─── Verify Coinbase Commerce webhook signature ───────────
async function verifyCoinbaseSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  const secret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("COINBASE_WEBHOOK_SECRET not set — skipping verification");
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
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === signature;
  } catch (err) {
    console.error("Coinbase signature verification error:", err);
    return false;
  }
}

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

async function forwardWalletRouting(transactionId: string, amount: number) {
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
      processor: "coinbase",
      paymentMethod: "crypto",
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
    const signature = req.headers.get("x-cc-webhook-signature");

    const verified = await verifyCoinbaseSignature(rawBody, signature);
    if (!verified) {
      return json({ error: "Signature verification failed" }, 401);
    }

    const body = JSON.parse(rawBody);
    const event = body.event || {};
    const eventType = event.type || "";
    const data = event.data || {};
    const metadata = data.metadata || {};
    const sessionId = metadata.checkout_session_id || "";
    const transactionId = metadata.transaction_id || "";
    const userId = metadata.user_id || null;
    const chargeId = data.id || data.code || "";

    console.log(`Coinbase webhook: type=${eventType}, chargeId=${chargeId}`);

    const supabase = getSupabase();

    // ── Charge Confirmed ──────────────────────────────
    if (eventType === "charge:confirmed") {
      const { data: payments } = await supabase
        .from("os_payments")
        .select("id")
        .eq("action", "coinbase_onramp")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments?.length) {
        await supabase
          .from("os_payments")
          .update({ status: "completed" })
          .eq("id", payments[0].id);
      }

      let confirmResult = null;
      if (sessionId) confirmResult = await forwardConfirm(sessionId);
      if (transactionId) await forwardEscrowLock(transactionId);

      const amount = data.pricing?.local?.amount || data.pricing?.settlement?.amount || "N/A";
      await notify(
        userId,
        "Crypto Payment Confirmed",
        `Your Coinbase payment of $${amount} has been confirmed and funds are in escrow.`,
        "success",
        chargeId
      );

      return json({
        success: true,
        event: eventType,
        action: "payment_confirmed",
        chargeId,
        confirmResult,
      });
    }

    // ── Charge Failed ─────────────────────────────────
    if (eventType === "charge:failed") {
      const { data: payments } = await supabase
        .from("os_payments")
        .select("id")
        .eq("action", "coinbase_onramp")
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
        "Your Coinbase payment could not be completed. Please try again.",
        "error",
        chargeId
      );

      return json({ success: true, event: eventType, action: "payment_failed" });
    }

    // ── Charge Pending ────────────────────────────────
    if (eventType === "charge:pending") {
      await notify(
        userId,
        "Payment Pending",
        "Your crypto payment has been detected and is awaiting network confirmation.",
        "info",
        chargeId
      );

      return json({ success: true, event: eventType, action: "payment_pending" });
    }

    // ── Charge Expired ────────────────────────────────
    if (eventType === "charge:expired" || eventType === "charge:canceled") {
      const { data: payments } = await supabase
        .from("os_payments")
        .select("id")
        .eq("action", "coinbase_onramp")
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(5);

      if (payments?.length) {
        await supabase
          .from("os_payments")
          .update({ status: "expired" })
          .eq("id", payments[0].id);
      }

      await notify(
        userId,
        "Payment Expired",
        "Your payment session has expired. Please start a new payment.",
        "warning",
        chargeId
      );

      return json({ success: true, event: eventType, action: "payment_expired" });
    }

    console.log(`Coinbase webhook: unhandled event=${eventType}`);
    return json({ success: true, event: eventType, action: "acknowledged" });
  } catch (err) {
    console.error("coinbase-webhook error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

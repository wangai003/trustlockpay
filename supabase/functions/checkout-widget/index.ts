import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature",
};

// ─── In-memory session store (production: use Redis/DB) ────
const sessions = new Map<string, CheckoutSession>();

interface TaxLineResult {
  type: string;
  label: string;
  rate: number;
  amount: number;
  source: string;
}

interface CheckoutSession {
  sessionId: string;
  vendorId: string;
  amount: number;
  fee: number;
  total: number;
  item: string;
  buyerEmail: string;
  buyerName: string;
  buyerLocation: string;
  paymentMethod: string;
  processor: ProcessorResult;
  walletAddresses: { transaction: string; escrow: string };
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  vendorName: string;
  taxBreakdown: TaxLineResult[];
  taxTotal: number;
  escrowFee: number;
  platformFee: number;
  processorFee: number;
}

interface ProcessorResult {
  processorId: string;
  processorName: string;
  feeRate: number;
  supportsFiat: boolean;
  supportsCrypto: boolean;
  onRamp: boolean;
  offRamp: boolean;
}

// ─── Helpers ───────────────────────────────────────────────
function generateSessionId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = () => Deno.env.get("SUPABASE_ANON_KEY")!;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

const AZIX_TRANSACTION_WALLET = "0x7A3b...F92d";
const AZIX_ESCROW_WALLET = "0x4E1c...A83b";

// ─── Fee calculation (mirrors feeEngine) ───────────────────
function calculateCheckoutFees(amount: number, processorFeeRate: number, isCrypto: boolean) {
  const trustlockRate = isCrypto ? 1.0 : 1.5;
  const escrowRate = 0.5;
  const gasEstimate = 0.02;

  const trustlockFee = round(amount * (trustlockRate / 100));
  const processorFee = isCrypto ? 0 : round(amount * (processorFeeRate / 100));
  const escrowFee = round(amount * (escrowRate / 100));
  const totalFees = round(trustlockFee + processorFee + escrowFee + gasEstimate);

  return {
    trustlockFee,
    processorFee,
    escrowFee,
    gasFee: gasEstimate,
    totalFees,
    netAmount: round(amount - totalFees),
  };
}

// ─── Call internal edge function ───────────────────────────
async function callEdgeFunction(fnName: string, body: Record<string, unknown>): Promise<unknown> {
  const url = `${SUPABASE_URL()}/functions/v1/${fnName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY()}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Stripe signature verification ─────────────────────────
async function verifyStripeSignature(payload: string, sigHeader: string): Promise<boolean> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return false;

  try {
    const parts = sigHeader.split(",").reduce((acc: Record<string, string>, part: string) => {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === signature;
  } catch {
    return false;
  }
}

// ─── Action: Initiate Checkout ─────────────────────────────
async function initiateCheckout(params: Record<string, unknown>): Promise<Response> {
  const { vendorId, amount, item, buyerEmail, buyerName, buyerLocation, paymentMethod } = params;

  if (!vendorId || !amount || !item || !buyerEmail || !buyerName || !paymentMethod) {
    return errorResponse("vendorId, amount, item, buyerEmail, buyerName, and paymentMethod are required", 400);
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) return errorResponse("Amount must be positive", 400);

  const supabase = getSupabase();

  // Look up vendor
  const { data: vendor } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", String(vendorId))
    .single();

  const vendorName = vendor?.full_name || "Vendor";

  // Determine crypto vs fiat
  const isCrypto = paymentMethod === "crypto";
  const country = String(buyerLocation || "US");

  // Call select-processor (now returns limits)
  const processor = (await callEdgeFunction("select-processor", {
    country,
    isCrypto,
    kyc_tier: params.kyc_tier || "basic",
  })) as ProcessorResult & { limits?: Record<string, unknown> };

  // ── Enforce processor transaction limits ──
  const procLimits = processor.limits as { minPerTx?: number; maxPerTx?: number } | undefined;
  if (procLimits) {
    if (procLimits.minPerTx && numAmount < procLimits.minPerTx) {
      return errorResponse(
        `Amount $${numAmount} is below the minimum of $${procLimits.minPerTx} for ${processor.processorName}`,
        400
      );
    }
    if (procLimits.maxPerTx && numAmount > procLimits.maxPerTx) {
      return errorResponse(
        `Amount $${numAmount.toLocaleString()} exceeds the per-transaction limit of $${(procLimits.maxPerTx as number).toLocaleString()} for ${processor.processorName} at your verification level. Upgrade KYC to increase limits.`,
        403
      );
    }
  }

  // ── AML threshold logging ──
  const amlFlags: string[] = [];
  if (isCrypto && numAmount >= 1000) amlFlags.push("FATF Travel Rule (crypto ≥$1,000)");
  if (numAmount >= 3000) amlFlags.push("Enhanced Due Diligence (≥$3,000)");
  if (numAmount >= 10000) amlFlags.push("CTR Reporting (≥$10,000)");

  if (amlFlags.length > 0) {
    for (const flag of amlFlags) {
      await supabase.from("compliance_flags").insert({
        flag_id: `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: flag.split(" ")[0] || "checkout_aml",
        description: `Checkout initiation: ${flag} — Amount: $${numAmount.toLocaleString()}, Buyer: ${buyerName}`,
        severity: numAmount >= 10000 ? "high" : "medium",
        status: "open",
        related_vendor_id: String(vendorId),
      });
    }
  }

  // Calculate fees
  const fees = calculateCheckoutFees(numAmount, processor.feeRate, isCrypto);

  // Call auto-signature-protocol before creating session
  let contractResult: Record<string, unknown> = {};
  try {
    contractResult = (await callEdgeFunction("auto-signature-protocol", {
      vendor_id: String(vendorId),
      transaction_id: `checkout_${Date.now()}`,
      order_amount: numAmount,
      industry: params.industry || null,
      buyer_name: String(buyerName),
    })) as Record<string, unknown>;
  } catch {
    // Non-blocking — proceed without contract
  }

  // Create session
  const sessionId = generateSessionId();
  const session: CheckoutSession = {
    sessionId,
    vendorId: String(vendorId),
    amount: numAmount,
    fee: fees.totalFees,
    total: round(numAmount + fees.totalFees),
    item: String(item),
    buyerEmail: String(buyerEmail),
    buyerName: String(buyerName),
    buyerLocation: country,
    paymentMethod: String(paymentMethod),
    processor,
    walletAddresses: { transaction: AZIX_TRANSACTION_WALLET, escrow: AZIX_ESCROW_WALLET },
    status: "pending",
    createdAt: new Date().toISOString(),
    vendorName,
  };

  sessions.set(sessionId, session);

  // Auto-expire after 30 minutes
  setTimeout(() => {
    const s = sessions.get(sessionId);
    if (s && s.status === "pending") sessions.delete(sessionId);
  }, 30 * 60 * 1000);

  // ── Crypto verification protocol ──
  const cryptoVerification = isCrypto ? {
    required: true,
    testAmount: 1.00,
    network: "Polygon (MATIC)",
    chainId: 137,
    token: "USDC",
    tokenContract: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    receivingWallet: AZIX_TRANSACTION_WALLET,
    owner: "Azix",
    supportEmail: "support@azix.world",
    instructions: [
      "Send exactly $1.00 in USDC on Polygon to the receiving wallet.",
      "Email support@azix.world with your name, sending wallet address, and TxID.",
      "Wait for Azix confirmation before sending the remaining balance.",
      "Only send USDC on Polygon network — other networks will result in loss.",
    ],
  } : null;

  // ── Notify admin of crypto checkout initiation ──
  if (isCrypto) {
    await supabase.from("notifications").insert({
      user_id: String(vendorId),
      type: "crypto_checkout",
      title: `Crypto Checkout Initiated — $${numAmount.toLocaleString()}`,
      message: `Buyer ${buyerName} (${buyerEmail}) initiated a crypto payment of $${numAmount.toLocaleString()} for "${item}". Verification protocol active — awaiting $1 test transaction confirmation via support@azix.world.`,
      related_entity_type: "checkout_session",
      related_entity_id: sessionId,
    });
  }

  return jsonResponse({
    success: true,
    checkoutSession: {
      sessionId,
      amount: numAmount,
      fee: fees.totalFees,
      total: session.total,
      processor: {
        id: processor.processorId,
        name: processor.processorName,
        feeRate: processor.feeRate,
      },
      feeBreakdown: fees,
      walletAddresses: session.walletAddresses,
      vendorName,
      item,
      contract: contractResult.contract_id ? {
        contractId: contractResult.contract_id,
        autoSigned: contractResult.auto_signed || false,
        route: contractResult.route || null,
      } : null,
      cryptoVerification,
    },
  });
}

// ─── Action: Confirm Payment ───────────────────────────────
async function confirmPayment(params: Record<string, unknown>): Promise<Response> {
  const { sessionId, paymentProof } = params;
  if (!sessionId) return errorResponse("sessionId is required", 400);

  const session = sessions.get(String(sessionId));
  if (!session) return errorResponse("Session not found or expired", 404);
  if (session.status === "confirmed") return errorResponse("Payment already confirmed", 400);

  // Create transaction via escrow-manager lock_funds
  const lockResult = (await callEdgeFunction("escrow-manager", {
    action: "lock_funds",
    vendor_id: session.vendorId,
    buyer_id: null, // Guest buyer — no account
    amount: session.amount,
    item: session.item,
    buyer_name: session.buyerName,
    vendor_name: session.vendorName,
    buyer_location: session.buyerLocation,
    processor: session.processor.processorId,
    payment_type: session.paymentMethod === "crypto" ? "checkout_crypto" : "checkout_fiat",
  })) as Record<string, unknown>;

  if (!lockResult.success) {
    return errorResponse(String(lockResult.error || "Failed to lock funds"), 500);
  }

  // Mark session confirmed
  session.status = "confirmed";

  const tx = lockResult.transaction as Record<string, unknown>;

  return jsonResponse({
    success: true,
    transaction: tx,
    confirmationCode: lockResult.confirmationCode,
    orderNumber: tx?.tx_id,
    paymentProof: paymentProof || null,
  });
}

// ─── Action: Handle Webhook ────────────────────────────────
async function handleWebhook(req: Request, body: Record<string, unknown>): Promise<Response> {
  const rawBody = JSON.stringify(body);

  // Detect webhook source
  const stripeSignature = req.headers.get("stripe-signature");
  const coinbaseSignature = req.headers.get("x-cc-webhook-signature");
  const yellowCardSignature = req.headers.get("x-yellowcard-signature");

  let source = "unknown";
  let verified = false;
  let eventType = "";
  let sessionId = "";

  // ─ Stripe webhook
  if (stripeSignature) {
    source = "stripe";
    verified = await verifyStripeSignature(rawBody, stripeSignature);
    eventType = String(body.type || "");
    const obj = body.data as Record<string, unknown> | undefined;
    const objInner = obj?.object as Record<string, unknown> | undefined;
    sessionId = String(objInner?.metadata?.checkout_session_id || "");
  }

  // ─ Coinbase webhook
  if (coinbaseSignature) {
    source = "coinbase";
    const secret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
    if (secret) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
        const expected = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        verified = expected === coinbaseSignature;
      } catch {
        verified = false;
      }
    }
    const evt = body.event as Record<string, unknown> | undefined;
    eventType = String(evt?.type || body.type || "");
    const data = evt?.data as Record<string, unknown> | undefined;
    const metadata = data?.metadata as Record<string, unknown> | undefined;
    sessionId = String(metadata?.checkout_session_id || "");
  }

  // ─ Yellow Card webhook
  if (yellowCardSignature) {
    source = "yellow_card";
    // Yellow Card uses API secret for HMAC
    const secret = Deno.env.get("YELLOW_CARD_API_SECRET");
    if (secret) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
        const expected = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        verified = expected === yellowCardSignature;
      } catch {
        verified = false;
      }
    }
    eventType = String(body.event || body.status || "");
    const meta = body.metadata as Record<string, unknown> | undefined;
    sessionId = String(meta?.checkout_session_id || "");
  }

  if (!verified) {
    console.error(`Webhook verification failed for ${source}`);
    return errorResponse("Webhook signature verification failed", 401);
  }

  console.log(`Webhook received: source=${source}, event=${eventType}, session=${sessionId}`);

  // Handle payment success events
  const successEvents = [
    "payment_intent.succeeded",   // Stripe
    "charge:confirmed",           // Coinbase
    "charge.completed",           // Coinbase alt
    "payment.completed",          // Yellow Card
    "payment_successful",         // Yellow Card alt
  ];

  if (successEvents.includes(eventType) && sessionId) {
    const result = await confirmPayment({ sessionId });
    const resultBody = await result.json();
    return jsonResponse({
      success: true,
      source,
      eventType,
      confirmation: resultBody,
    });
  }

  // Handle failure events
  const failureEvents = [
    "payment_intent.payment_failed", // Stripe
    "charge:failed",                  // Coinbase
    "payment.failed",                 // Yellow Card
  ];

  if (failureEvents.includes(eventType) && sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
      session.status = "failed";
      sessions.delete(sessionId);
    }
    return jsonResponse({ success: true, source, eventType, action: "session_cleaned" });
  }

  // Acknowledge unhandled events
  return jsonResponse({ success: true, source, eventType, action: "ignored" });
}

// ─── Action: Get Vendor Config ─────────────────────────────
async function getVendorConfig(params: Record<string, unknown>): Promise<Response> {
  const { vendorId } = params;
  if (!vendorId) return errorResponse("vendorId is required", 400);

  const supabase = getSupabase();

  // Get vendor profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", String(vendorId))
    .single();

  // Get vendor settings
  const { data: settings } = await supabase
    .from("vendor_settings")
    .select("pay_enabled, payout_tier")
    .eq("vendor_id", String(vendorId))
    .single();

  // Get active plan
  const { data: plan } = await supabase
    .from("vendor_plans")
    .select("plan_id, is_trial, expires_at")
    .eq("vendor_id", String(vendorId))
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const planTier = plan?.plan_id || "basic";
  const isEnabled = settings?.pay_enabled !== false;

  // Plan order limits
  const planLimits: Record<string, number> = {
    basic: 50,
    starter: 200,
    growth: 1000,
    enterprise: -1, // unlimited
  };

  const monthlyLimit = planLimits[planTier] ?? 50;

  // Count this month's orders
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("vendor_id", String(vendorId))
    .gte("created_at", startOfMonth.toISOString());

  const used = count || 0;
  const remaining = monthlyLimit === -1 ? -1 : Math.max(0, monthlyLimit - used);

  return jsonResponse({
    success: true,
    enabled: isEnabled,
    planTier,
    isTrial: plan?.is_trial || false,
    expiresAt: plan?.expires_at || null,
    monthlyLimit: monthlyLimit === -1 ? "unlimited" : monthlyLimit,
    usedThisMonth: used,
    remainingOrders: remaining === -1 ? "unlimited" : remaining,
    vendorName: profile?.full_name || "Vendor",
  });
}

// ─── Response Helpers ──────────────────────────────────────
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

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case "initiate_checkout":
        return await initiateCheckout(params);
      case "confirm_payment":
        return await confirmPayment(params);
      case "handle_webhook":
        return await handleWebhook(req, body);
      case "get_vendor_config":
        return await getVendorConfig(params);
      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: initiate_checkout, confirm_payment, handle_webhook, get_vendor_config`,
          400
        );
    }
  } catch (err) {
    console.error("checkout-widget error:", err);
    return errorResponse("Internal server error", 500);
  }
});

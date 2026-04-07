import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, stripe-signature",
};

// ─── Session persistence via checkout_sessions table ───────
// REMOVED: const sessions = new Map<string, CheckoutSession>();
// Sessions are now persisted to the checkout_sessions database table to survive cold starts.

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
  // No gasFee field — gas is paid in MATIC by TrustLock Relayer (gasless)
  orderType: "simple" | "milestone" | "hybrid";
  industry?: string;
  feeBreakdownJson: Record<string, unknown>;
  marketplaceMetadata?: Record<string, unknown> | null;
  buyerEntityType?: string;
  buyerCompanyName?: string;
  bankTransferDetails?: {
    bankName?: string;
    region?: string;
    processor?: string;
    accountFields?: Record<string, string>;
  } | null;
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

function generateConfirmationCode(): string {
  return `TL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
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

const AZIX_TRANSACTION_WALLET = Deno.env.get("AZIX_TRANSACTION_WALLET") || "0x7A3b1234567890abcdef1234567890abcdefF92d";
const AZIX_ESCROW_WALLET = Deno.env.get("AZIX_ESCROW_WALLET") || "0x4E1c1234567890abcdef1234567890abcdefA83b";

// ─── Auto-Processor Selection (cost-optimized) ────────────
// Priority: direct (crypto, 0%) → thirdweb (1.0%) → coinbase/transak (1.5%) → yellow_card (2.0%) → stripe (2.9%)
interface ProcessorOption {
  id: string;
  name: string;
  feeRate: number;
  supportsCrypto: boolean;
  supportsFiat: boolean;
  onRamp: boolean;
  offRamp: boolean;
  regions: string[];
}

const PROCESSOR_REGISTRY: ProcessorOption[] = [
  { id: "direct", name: "Direct (On-chain)", feeRate: 0, supportsCrypto: true, supportsFiat: false, onRamp: false, offRamp: false, regions: ["global"] },
  { id: "thirdweb", name: "Thirdweb", feeRate: 1.0, supportsCrypto: true, supportsFiat: true, onRamp: true, offRamp: false, regions: ["global"] },
  { id: "coinbase", name: "Coinbase", feeRate: 1.5, supportsCrypto: true, supportsFiat: true, onRamp: true, offRamp: true, regions: ["US", "EU", "UK", "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt", "Uganda", "Tanzania", "Rwanda", "global"] },
  { id: "transak", name: "Transak", feeRate: 1.5, supportsCrypto: true, supportsFiat: true, onRamp: true, offRamp: true, regions: ["US", "EU", "UK", "IN", "BR", "MX", "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt", "global"] },
  { id: "yellow_card", name: "Yellow Card", feeRate: 2.0, supportsCrypto: true, supportsFiat: true, onRamp: true, offRamp: true, regions: ["Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt", "Uganda", "Tanzania", "Rwanda", "Botswana", "Senegal"] },
  { id: "stripe", name: "Stripe", feeRate: 2.9, supportsCrypto: false, supportsFiat: true, onRamp: true, offRamp: false, regions: ["US", "EU", "UK", "CA", "AU", "JP", "SG", "HK", "NZ", "global"] },
];

function selectCheapestProcessor(country: string, isCrypto: boolean): ProcessorResult {
  for (const proc of PROCESSOR_REGISTRY) {
    if (isCrypto && !proc.supportsCrypto) continue;
    if (!isCrypto && !proc.supportsFiat) continue;
    // Direct only for crypto
    if (proc.id === "direct" && !isCrypto) continue;
    // Region check
    const regionMatch = proc.regions.includes(country) || proc.regions.includes("global");
    if (!regionMatch) continue;

    return {
      processorId: proc.id,
      processorName: proc.name,
      feeRate: proc.feeRate,
      supportsFiat: proc.supportsFiat,
      supportsCrypto: proc.supportsCrypto,
      onRamp: proc.onRamp,
      offRamp: proc.offRamp,
    };
  }
  // Fallback to stripe
  return {
    processorId: "stripe",
    processorName: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    onRamp: true,
    offRamp: false,
  };
}

// ─── Fee Routing (Corrected Model) ────────────────────────
// At checkout:
//   1. Processor takes their cut (before funds reach TrustLock)
//   2. ALL remaining funds → Transaction Fee Wallet
//   3. Transaction Fee Wallet keeps: 0.5% TrustLock transaction fee + taxes
//   4. Transaction Fee Wallet routes principal → Escrow Wallet
//      (principal has 1% escrow service fee baked in — extracted at release)
//   The 0.5% is TrustLock's upfront transaction fee (NOT an escrow deposit)
function calculateCheckoutFees(amount: number, processorFeeRate: number, isCrypto: boolean, taxTotal: number = 0) {
  // TrustLock transaction fee: always 0.5% (same for fiat and crypto)
  const trustlockFee = round(amount * (0.5 / 100));

  // Processor fee: 0 for direct crypto, else processor rate
  const processorFee = isCrypto && processorFeeRate === 0 ? 0 : round(amount * (processorFeeRate / 100));

  // Combined "Transaction Fee" shown on invoice = processor + TrustLock 0.5%
  const combinedTransactionFee = round(trustlockFee + processorFee);

  // No escrow deposit — the 0.5% is TrustLock's transaction fee, NOT an escrow deposit
  // No gas fee — MATIC gas paid by TrustLock Relayer Wallet (gasless meta-transactions)

  const totalFees = combinedTransactionFee;
  const totalBuyerCharge = round(amount + totalFees + taxTotal);

  // Build lockFunds calldata for smart contract
  const lockFundsCalldata = {
    function: "lockFunds",
    params: {
      amount: Math.round(amount * 1e6), // USDC 6 decimals
      platformFee: Math.round(trustlockFee * 1e6),
      escrowDeposit: 0, // No escrow deposit
      processorFee: Math.round(processorFee * 1e6),
    },
  };

  return {
    platformFee: trustlockFee,       // 0.5% TrustLock transaction fee
    trustlockFee,
    processorFee,
    escrowDeposit: 0,                // DEPRECATED — no escrow deposit
    combinedTransactionFee,          // What buyer sees as "Transaction Fee"
    totalFees,
    taxTotal,
    totalBuyerCharge,
    netAmount: amount,               // Vendor principal (1% escrow fee baked in)
    // Fund flow: ALL → Transaction Fee Wallet → keeps 0.5% + taxes → routes principal → Escrow Wallet
    transactionWalletReceives: round(trustlockFee + taxTotal), // TrustLock keeps this
    escrowWalletReceives: amount,    // principal only (routed from Transaction Fee Wallet)
    processorReceives: processorFee,
    lockFundsCalldata,
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

// ─── Action: Initiate Checkout (init_session) ──────────────
async function initiateCheckout(params: Record<string, unknown>): Promise<Response> {
  const { vendorId, amount, item, buyerEmail, buyerName, buyerLocation, paymentMethod } = params;

  if (!vendorId || !amount || !item || !buyerEmail || !buyerName || !paymentMethod) {
    return errorResponse("vendorId, amount, item, buyerEmail, buyerName, and paymentMethod are required", 400);
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) return errorResponse("Amount must be positive", 400);

  const supabase = getSupabase();

  // ── Vendor Billing Enforcement: block new orders if vendor has expired plan or overdue bills ──
  const { data: vendorSub } = await supabase
    .from("vendor_subscriptions")
    .select("status")
    .eq("vendor_id", String(vendorId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vendorSub?.status === "expired") {
    return errorResponse("This vendor is temporarily unable to accept new orders. Please try again later.", 503);
  }

  // Check for overdue bills older than 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: overdueBillCount } = await supabase
    .from("vendor_bills")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", String(vendorId))
    .eq("status", "overdue")
    .lt("due_date", sevenDaysAgo);

  if ((overdueBillCount || 0) > 0) {
    return errorResponse("This vendor is temporarily unable to accept new orders. Please try again later.", 503);
  }

  // Check if widget is disabled due to unpaid installation fee
  if (params.site_id) {
    const { data: widgetFee } = await supabase
      .from("vendor_widget_fees")
      .select("widget_state, payment_confirmed")
      .eq("vendor_id", String(vendorId))
      .eq("site_id", String(params.site_id))
      .maybeSingle();

    if (widgetFee?.widget_state === "disabled") {
      return errorResponse("This checkout widget is currently inactive. Please contact the vendor.", 503);
    }
  }

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

  // ── Auto-processor selection (cost-optimized priority) ──
  const processor = selectCheapestProcessor(country, isCrypto);

  // ── Enforce processor transaction limits via select-processor ──
  const limitCheck = (await callEdgeFunction("select-processor", {
    action: "check_limits",
    user_id: params.buyer_id || "guest",
    amount: numAmount,
    processor_id: processor.processorId,
    kyc_tier: params.kyc_tier || "basic",
  })) as { allowed?: boolean; errors?: string[] };

  if (limitCheck.allowed === false && limitCheck.errors?.length) {
    return errorResponse(limitCheck.errors[0], 403);
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

  // ── Dynamic Tax Resolution ──
  let taxBreakdown: TaxLineResult[] = [];
  let taxTotal = 0;
  try {
    const taxResult = (await callEdgeFunction("tax-resolve", {
      buyer_country: country,
      vendor_country: params.vendor_country || country,
      amount: numAmount,
      industry: params.industry || "default",
      item_category: params.item_category || "general",
      is_cross_border: params.vendor_country ? (String(params.vendor_country) !== country) : false,
    })) as { taxes?: TaxLineResult[]; total_tax?: number };

    if (taxResult?.taxes && Array.isArray(taxResult.taxes)) {
      taxBreakdown = taxResult.taxes;
      taxTotal = round(taxResult.total_tax || taxBreakdown.reduce((s, t) => s + (t.amount || 0), 0));
    }
  } catch {
    console.log("Tax resolution skipped or failed — proceeding without auto-taxes");
  }

  // If vendor provided manual tax items, merge them
  if (params.tax_items && Array.isArray(params.tax_items)) {
    const manualTaxes = (params.tax_items as { label?: string; value?: number; type?: string }[]).map((t) => ({
      type: t.type || "percentage",
      label: t.label || "Tax",
      rate: t.type === "percentage" ? (t.value || 0) : 0,
      amount: t.type === "percentage" ? round(numAmount * ((t.value || 0) / 100)) : round(t.value || 0),
      source: "vendor_manual",
    }));
    taxBreakdown = [...taxBreakdown, ...manualTaxes];
    taxTotal = round(taxBreakdown.reduce((s, t) => s + (t.amount || 0), 0));
  }

  // ── 3-Way Fee Calculation ──
  const fees = calculateCheckoutFees(numAmount, processor.feeRate, isCrypto, taxTotal);

  // ── Determine order_type from vendor_offerings or vendor_settings ──
  let orderType: "simple" | "milestone" | "hybrid" = "simple";
  try {
    // First: check if there's a matching vendor offering for this item/industry
    if (params.offering_id) {
      const { data: offering } = await supabase
        .from("vendor_offerings")
        .select("offering_type, industry_key, custom_category")
        .eq("id", String(params.offering_id))
        .eq("vendor_id", String(vendorId))
        .eq("is_active", true)
        .maybeSingle();

      if (offering) {
        if (offering.offering_type === "service" || offering.offering_type === "project") {
          orderType = "milestone";
        }
        // Override industry from offering if not explicitly provided
        if (!params.industry && offering.industry_key) {
          params.industry = offering.industry_key;
        }
      }
    }

    // Fallback: check vendor_settings
    if (orderType === "simple") {
      const { data: vendorSettings } = await supabase
        .from("vendor_settings")
        .select("supported_order_types, default_order_type")
        .eq("vendor_id", String(vendorId))
        .single();

      if (vendorSettings?.default_order_type) {
        const dt = String(vendorSettings.default_order_type);
        if (dt === "milestone" || dt === "hybrid") orderType = dt;
      }
    }

    // Allow override from params
    if (params.order_type) {
      const ot = String(params.order_type);
      if (ot === "milestone" || ot === "hybrid" || ot === "simple") orderType = ot;
    }
  } catch {
    // Default to simple
  }

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
    // Non-blocking
  }

  // Fee breakdown JSON for storage
  const feeBreakdownJson = {
    trustlockFee: fees.trustlockFee,
    platformFee: fees.platformFee,
    processorFee: fees.processorFee,
    combinedTransactionFee: fees.combinedTransactionFee,
    escrowDeposit: 0, // DEPRECATED — no escrow deposit
    totalFees: fees.totalFees,
    taxTotal,
    taxBreakdown,
    processorId: processor.processorId,
    processorName: processor.processorName,
    processorRate: processor.feeRate,
    isCrypto,
    routing: {
      transactionWallet: fees.transactionWalletReceives,
      escrowWallet: fees.escrowWalletReceives,
      processor: fees.processorReceives,
    },
    lockFundsCalldata: fees.lockFundsCalldata,
  };

  // Create session
  const sessionId = generateSessionId();
  const session: CheckoutSession = {
    sessionId,
    vendorId: String(vendorId),
    amount: numAmount,
    fee: fees.totalFees,
    total: fees.totalBuyerCharge,
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
    taxBreakdown,
    taxTotal,
    escrowFee: 0,                    // No escrow deposit — 0.5% is TrustLock transaction fee
    platformFee: fees.trustlockFee,  // 0.5% TrustLock transaction fee
    processorFee: fees.processorFee,
    // gasFee removed — gasless
    orderType,
    industry: params.industry ? String(params.industry) : undefined,
    feeBreakdownJson,
    marketplaceMetadata: (params.marketplace_metadata as Record<string, unknown>) || null,
    buyerEntityType: params.buyerEntityType ? String(params.buyerEntityType) : "individual",
    buyerCompanyName: params.buyerCompanyName ? String(params.buyerCompanyName) : undefined,
    bankTransferDetails: params.bankTransferDetails ? (params.bankTransferDetails as CheckoutSession["bankTransferDetails"]) : null,
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
      orderType,
      processor: {
        id: processor.processorId,
        name: processor.processorName,
        feeRate: processor.feeRate,
      },
      feeBreakdown: {
        trustlockFee: fees.trustlockFee,
        processorFee: fees.processorFee,
        combinedTransactionFee: fees.combinedTransactionFee,
        escrowDeposit: 0,
        totalFees: fees.totalFees,
        taxBreakdown,
        taxTotal,
      },
      walletRouting: {
        transactionWallet: { address: AZIX_TRANSACTION_WALLET, receives: fees.transactionWalletReceives, description: "Platform fee + taxes — immediate at checkout" },
        escrowWallet: { address: AZIX_ESCROW_WALLET, receives: fees.escrowWalletReceives, description: "Escrow principal + 0.5% deposit — held until release" },
        processorReceives: fees.processorReceives,
      },
      smartContract: fees.lockFundsCalldata,
      walletAddresses: session.walletAddresses,
      vendorName,
      item,
      contract: contractResult.contract_id ? {
        contractId: contractResult.contract_id,
        autoSigned: contractResult.auto_signed || false,
        route: contractResult.route || null,
      } : null,
      cryptoVerification,
      buyerEntity: {
        type: session.buyerEntityType || "individual",
        companyName: session.buyerCompanyName || null,
      },
      disclosure: {
        escrowPrincipalPreserved: true,
        vendorReceives: `Escrow principal minus 1% escrow service fee ($${numAmount.toFixed(2)})`,
        gasFeePolicy: "Gasless — MATIC gas paid by TrustLock Relayer Wallet. $0 gas to users.",
        refundPolicy: "Full locked principal returned to buyer. All fees waived. The 0.5% transaction fee (already collected) is NOT refunded.",
        splitPayoutPolicy: "1.0% escrow fee applied to vendor share only. Buyer receives full split amount with $0 deductions.",
      },
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

  const supabase = getSupabase();

  // Create transaction via escrow-manager lock_funds with fee breakdown
  const lockResult = (await callEdgeFunction("escrow-manager", {
    action: "lock_funds",
    vendor_id: session.vendorId,
    buyer_id: params.buyer_id || null, // Guest buyer — may not have account
    amount: session.amount,
    item: session.item,
    buyer_name: session.buyerName,
    vendor_name: session.vendorName,
    buyer_location: session.buyerLocation,
    processor: session.processor.processorId,
    payment_type: session.paymentMethod === "crypto" ? "checkout_crypto" : "checkout_fiat",
    order_type: session.orderType,
    industry: session.industry,
  })) as Record<string, unknown>;

  if (!lockResult.success) {
    return errorResponse(String(lockResult.error || "Failed to lock funds"), 500);
  }

  // Mark session confirmed
  session.status = "confirmed";

  const tx = lockResult.transaction as Record<string, unknown>;
  const transactionId = tx?.id as string | undefined;
  const txId = tx?.tx_id as string | undefined;
  const confirmationCode = generateConfirmationCode();

  // Store fee breakdown in the transaction (update with JSON)
  if (transactionId) {
    const updatePayload: Record<string, unknown> = {
      fee: session.fee,
      order_type: session.orderType,
      buyer_entity_type: session.buyerEntityType || "individual",
      buyer_company_name: session.buyerCompanyName || null,
    };
    // Persist marketplace metadata on the transaction for downstream callbacks
    if (session.marketplaceMetadata) {
      updatePayload.metadata = session.marketplaceMetadata;
    }
    await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", transactionId);
  }

  // ── Standalone buyer flow: generate signup/login links ──
  const baseUrl = Deno.env.get("SITE_URL") || "https://trustlockpay.lovable.app";
  const signupLink = `${baseUrl}/buyer/signup?ref=${txId}&vendor=${session.vendorId}`;
  const loginLink = `${baseUrl}/buyer/login?ref=${txId}`;

  // Build checkout details with marketplace flag
  const checkoutDetailsWithSource = {
    ...session.feeBreakdownJson,
    ...(session.marketplaceMetadata ? {
      marketplace_source: true,
      marketplace_platform: session.marketplaceMetadata.platform_name || session.marketplaceMetadata.platform,
      marketplace_order_id: session.marketplaceMetadata.marketplace_order_id || null,
      marketplace_invoice_ref: session.marketplaceMetadata.marketplace_invoice_number || null,
      integration_id: session.marketplaceMetadata.integration_id || null,
    } : { marketplace_source: false }),
  };

  // Store in order_carbon_copies
  await supabase.from("order_carbon_copies").insert({
    transaction_id: transactionId || null,
    order_number: txId || null,
    vendor_id: session.vendorId,
    buyer_id: params.buyer_id || null,
    buyer_name: session.buyerName,
    vendor_name: session.vendorName,
    item: session.item,
    amount: session.amount,
    fee: session.fee,
    status: "active",
    confirmation_code: confirmationCode,
    checkout_details: checkoutDetailsWithSource,
    signup_link: signupLink,
    login_link: loginLink,
  });

  return jsonResponse({
    success: true,
    transaction: tx,
    confirmationCode,
    orderNumber: txId,
    orderType: session.orderType,
    paymentProof: paymentProof || null,
    feeBreakdown: session.feeBreakdownJson,
    smartContract: session.feeBreakdownJson.lockFundsCalldata,
    buyerLinks: {
      signupLink,
      loginLink,
      message: "Share these links with the buyer to track their order.",
    },
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

  // Get vendor settings (including order type config)
  const { data: settings } = await supabase
    .from("vendor_settings")
    .select("pay_enabled, payout_tier, supported_order_types, default_order_type")
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
    enterprise: -1,
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
    orderTypes: {
      supported: settings?.supported_order_types || ["simple"],
      default: settings?.default_order_type || "simple",
    },
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
      case "init_session":
        return await initiateCheckout(params);
      case "confirm_payment":
        return await confirmPayment(params);
      case "handle_webhook":
        return await handleWebhook(req, body);
      case "get_vendor_config":
        return await getVendorConfig(params);
      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: init_session, confirm_payment, handle_webhook, get_vendor_config`,
          400
        );
    }
  } catch (err) {
    console.error("checkout-widget error:", err);
    return errorResponse("Internal server error", 500);
  }
});

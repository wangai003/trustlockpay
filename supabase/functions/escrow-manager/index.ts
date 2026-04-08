import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Fee Constants ─────────────────────────────────────────
// CORRECTED FEE MODEL:
//   0.5% = TrustLock upfront transaction fee (kept by Transaction Wallet at checkout)
//   1.0% = Escrow service fee (baked into principal, extracted at release/split)
//   Gas  = Gasless — MATIC paid by TrustLock Relayer Wallet
const FEE_RULES = {
  checkout_fiat: { trustlockRate: 0.5, escrowServiceRate: 0, gasEstimate: 0 },
  checkout_crypto: { trustlockRate: 0.5, escrowServiceRate: 0, gasEstimate: 0 },
  release: { trustlockRate: 0, escrowServiceRate: 1.0, gasEstimate: 0 },
  refund: { trustlockRate: 0, escrowServiceRate: 0, gasEstimate: 0 },
  split: { trustlockRate: 0, escrowServiceRate: 1.0, gasEstimate: 0 },
} as const;

const PROCESSOR_RATES: Record<string, number> = {
  stripe: 2.9,
  coinbase: 1.5,
  transak: 1.5,
  direct: 0,
};

// ─── AML / Compliance Thresholds ──────────────────────────
const AML_THRESHOLDS = {
  FATF_TRAVEL_RULE_CRYPTO: 1_000,
  EDD_THRESHOLD: 3_000,
  CTR_REPORTING: 10_000,
  STRUCTURING_BAND_LOW: 7_500,
} as const;

// ─── Processor Transaction Limits (by KYC tier) ──────────
type KycTier = "none" | "basic" | "intermediate" | "full";

const PROCESSOR_LIMITS: Record<string, {
  minPerTx: number;
  maxPerTx: Record<KycTier, number>;
}> = {
  stripe: {
    minPerTx: 0.50,
    maxPerTx: { none: 500, basic: 10_000, intermediate: 250_000, full: 999_999 },
  },
  coinbase: {
    minPerTx: 1.00,
    maxPerTx: { none: 300, basic: 7_500, intermediate: 50_000, full: 250_000 },
  },
  transak: {
    minPerTx: 1.00,
    maxPerTx: { none: 100, basic: 500, intermediate: 15_000, full: 50_000 },
  },
  direct: {
    minPerTx: 0.01,
    maxPerTx: { none: 50_000, basic: 250_000, intermediate: 1_000_000, full: 10_000_000 },
  },
};

// ─── Helpers ───────────────────────────────────────────────
function generateTxId(): string {
  return `TL-${Date.now()}`;
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generatePayoutId(): string {
  return `PO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function generateAccessToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function calculateFees(
  amount: number,
  type: keyof typeof FEE_RULES,
  processorId = "direct",
  vendorShareFraction?: number
) {
  const rule = FEE_RULES[type];
  const processorRate = PROCESSOR_RATES[processorId] ?? 0;

  const trustlockFee = amount * (rule.trustlockRate / 100);
  const processorFee = processorId === "direct" ? 0 : amount * (processorRate / 100);

  // Escrow service fee: 1% at release/split (baked into principal)
  // At checkout: escrowServiceRate = 0 (no separate escrow deposit)
  // At split: fee applies to vendor share ONLY
  let escrowFee = 0;
  if (rule.escrowServiceRate > 0) {
    if (type === "split" && vendorShareFraction !== undefined) {
      escrowFee = amount * vendorShareFraction * (rule.escrowServiceRate / 100);
    } else {
      escrowFee = amount * (rule.escrowServiceRate / 100);
    }
  }

  // Gas = 0 — gasless architecture (MATIC paid by TrustLock Relayer)
  const totalFees = trustlockFee + processorFee + escrowFee;

  return {
    trustlockFee: round(trustlockFee),
    processorFee: round(processorFee),
    escrowFee: round(escrowFee),
    gasFee: 0, // Gasless — MATIC paid by Relayer
    totalFees: round(totalFees),
    netAmount: round(amount - totalFees),
    transactionWalletReceives: round(trustlockFee),
    escrowWalletReceives: round(escrowFee),
    feePercentage: amount > 0 ? round((totalFees / amount) * 100) : 0,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function getWalletAddresses() {
  return {
    transactionWallet: Deno.env.get("TRANSACTION_WALLET_ADDRESS") ?? "0x7A3b...F92d",
    escrowWallet: Deno.env.get("ESCROW_WALLET_ADDRESS") ?? "0x4E1c...A83b",
  };
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

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

// ─── Authorization Helpers ─────────────────────────────────
async function getTransactionParty(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  transactionId: string,
  userId?: string
): Promise<{ tx: Record<string, unknown> | null; role: string | null }> {
  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (!tx) return { tx: null, role: null };

  if (userId === tx.buyer_id) return { tx, role: "buyer" };
  if (userId === tx.vendor_id) return { tx, role: "vendor" };

  // Check admin role
  if (userId) {
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRole) return { tx, role: "admin" };
  }

  return { tx, role: null };
}

async function triageNotification(
  notificationType: string,
  userId: string,
  message: string,
  metadata?: Record<string, unknown>,
  transactionId?: string,
  severity?: string
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notification-triage`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: "triage",
        notification_type: notificationType,
        user_id: userId,
        message,
        transaction_id: transactionId,
        severity,
        metadata,
      }),
    });
  } catch (e) {
    console.error("Triage notification error:", e);
  }
}

async function logAuditAction(
  _supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string | undefined,
  action: string,
  details: Record<string, unknown>
) {
  // Map escrow actions to notification types for triage
  const actionTypeMap: Record<string, string> = {
    lock_funds: "escrow_locked",
    release_funds: "escrow_released",
    refund_buyer: "escrow_released",
    split_payout: "escrow_released",
    create_milestones: "milestone_completed",
    update_milestone: "milestone_completed",
    release_milestone_payment: "milestone_payment_release",
    delete_milestone: "milestone_completed",
    add_observer: "observer_added",
  };

  const notifType = actionTypeMap[action] ?? "escrow_locked";
  const uid = userId ?? "00000000-0000-0000-0000-000000000000";

  await triageNotification(
    notifType,
    uid,
    `Escrow Action: ${action} — ${JSON.stringify(details)}`,
    details,
    details.transaction_id as string,
  );
}

// ─── Compliance Pre-Check (runs before lockFunds/releaseFunds) ──
async function runCompliancePreCheck(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  amount: number,
  processorId: string,
  paymentType: string,
): Promise<{ allowed: boolean; errors: string[]; amlFlags: string[] }> {
  const errors: string[] = [];
  const amlFlags: string[] = [];

  // 1) Processor transaction limit check
  const limits = PROCESSOR_LIMITS[processorId] || PROCESSOR_LIMITS.direct;
  const kycTier: KycTier = await getUserKycTier(supabase, userId);

  if (amount < limits.minPerTx) {
    errors.push(`Amount $${amount} below ${processorId} minimum of $${limits.minPerTx}`);
  }
  if (amount > limits.maxPerTx[kycTier]) {
    errors.push(`Amount $${amount.toLocaleString()} exceeds ${processorId} per-transaction limit of $${limits.maxPerTx[kycTier].toLocaleString()} for ${kycTier} KYC tier`);
  }

  // 2) AML threshold flags
  const isCrypto = paymentType.includes("crypto") || processorId === "direct";
  if (isCrypto && amount >= AML_THRESHOLDS.FATF_TRAVEL_RULE_CRYPTO) {
    amlFlags.push("FATF_TRAVEL_RULE: Crypto ≥$1,000 — originator/beneficiary ID required");
  }
  if (amount >= AML_THRESHOLDS.EDD_THRESHOLD) {
    amlFlags.push("EDD_REQUIRED: Transaction ≥$3,000 — enhanced due diligence applies");
  }
  if (amount >= AML_THRESHOLDS.CTR_REPORTING) {
    amlFlags.push("CTR_REPORTING: Transaction ≥$10,000 — mandatory currency transaction report");
  }

  // 3) Velocity check — call compliance-velocity if amount is significant
  if (amount >= AML_THRESHOLDS.EDD_THRESHOLD) {
    try {
      const velocityUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/compliance-velocity`;
      const vRes = await fetch(velocityUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ action: "check", user_id: userId, amount }),
      });
      const vData = await vRes.json();
      if (vData.severity === "critical") {
        errors.push(`Anti-structuring block: ${vData.flags?.[0]?.detail || "Suspicious pattern detected"}`);
      } else if (vData.flags?.length > 0) {
        for (const f of vData.flags) {
          amlFlags.push(`${f.type}: ${f.detail}`);
        }
      }
    } catch (e) {
      console.error("Velocity check error:", e);
      // Fail-open but flag
      amlFlags.push("VELOCITY_CHECK_UNAVAILABLE: Manual review recommended");
    }
  }

  return { allowed: errors.length === 0, errors, amlFlags };
}

async function getUserKycTier(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<KycTier> {
  // Determine tier from kyc_documents status
  const { data: docs } = await supabase
    .from("kyc_documents")
    .select("status")
    .eq("vendor_id", userId);

  if (!docs || docs.length === 0) return "none";
  const approved = docs.filter(d => d.status === "approved").length;
  if (approved >= 4) return "full";
  if (approved >= 2) return "intermediate";
  if (approved >= 1) return "basic";
  return "none";
}

// ─── Original Action Handlers ──────────────────────────────

async function lockFunds(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const {
    buyer_id, vendor_id, amount, item,
    buyer_name, vendor_name, buyer_location, vendor_location,
    industry, processor = "direct", payment_type = "checkout_crypto",
    locked_price, price_currency, commodity_unit, commodity_quantity,
    corridor_route, settlement_currency,
  } = body;

  if (!buyer_id || !vendor_id || !amount) {
    return errorResponse("buyer_id, vendor_id, and amount are required", 400);
  }

  const numAmount = Number(amount);

  // ── Compliance Pre-Check (processor limits + AML + velocity) ──
  const compliance = await runCompliancePreCheck(
    supabase,
    String(buyer_id),
    numAmount,
    String(processor),
    String(payment_type),
  );

  if (!compliance.allowed) {
    return jsonResponse({
      success: false,
      blocked: true,
      errors: compliance.errors,
      amlFlags: compliance.amlFlags,
      message: "Transaction blocked by compliance checks",
    }, 403);
  }

  // Log AML flags (non-blocking) for audit trail
  if (compliance.amlFlags.length > 0) {
    for (const flag of compliance.amlFlags) {
      const flagId = `ESC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: flag.split(":")[0]?.trim() || "aml_flag",
        description: `Escrow lockFunds: ${flag}`,
        severity: flag.includes("CTR") ? "high" : "medium",
        status: "open",
        related_buyer_id: String(buyer_id),
        related_vendor_id: String(vendor_id),
      });
    }
  }

  const feeType = payment_type === "checkout_fiat" ? "checkout_fiat" : "checkout_crypto";
  const fees = calculateFees(numAmount, feeType, String(processor));
  const txId = generateTxId();
  const confirmationCode = generateConfirmationCode();
  const autoRelease = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const wallets = getWalletAddresses();

  const { data: transaction, error: txErr } = await supabase
    .from("transactions")
    .insert({
      tx_id: txId,
      buyer_id,
      vendor_id,
      amount: numAmount,
      fee: fees.totalFees,
      item: item ?? null,
      buyer_name: buyer_name ?? null,
      vendor_name: vendor_name ?? null,
      buyer_location: buyer_location ?? null,
      vendor_location: vendor_location ?? null,
      industry: industry ?? null,
      status: "locked",
      type: "product",
      auto_release_date: autoRelease,
      // Phase 1: Commodity price snapshot at order creation
      locked_price: locked_price ? Number(locked_price) : numAmount,
      price_currency: price_currency ? String(price_currency) : "USD",
      price_snapshot_at: new Date().toISOString(),
      commodity_unit: commodity_unit ? String(commodity_unit) : null,
      commodity_quantity: commodity_quantity ? Number(commodity_quantity) : null,
      // Corridor analytics
      corridor_route: corridor_route ? String(corridor_route) : null,
      settlement_currency: settlement_currency ? String(settlement_currency) : "USD",
    })
    .select()
    .single();

  if (txErr) return errorResponse(txErr.message, 500);

  const { error: ccErr } = await supabase.from("order_carbon_copies").insert({
    transaction_id: transaction.id,
    order_number: txId,
    buyer_id,
    vendor_id,
    buyer_name: buyer_name ?? null,
    vendor_name: vendor_name ?? null,
    amount: numAmount,
    fee: fees.totalFees,
    item: item ?? null,
    status: "active",
    confirmation_code: confirmationCode,
  });

  if (ccErr) console.error("Carbon copy insert error:", ccErr.message);

  await logAuditAction(supabase, String(buyer_id), "lock_funds", {
    transaction_id: transaction.id,
    tx_id: txId,
    amount: numAmount,
  });

  // Anchor: invoice + price lock snapshot
  await anchorProof(supabase, transaction.id, "invoice", {
    event: "escrow_locked",
    tx_id: txId,
    amount: numAmount,
    fee: fees.totalFees,
    buyer_id: String(buyer_id),
    vendor_id: String(vendor_id),
    buyer_name: buyer_name ?? null,
    vendor_name: vendor_name ?? null,
    industry: industry ?? null,
    processor: String(processor),
    locked_at: new Date().toISOString(),
  });

  // Anchor: price lock snapshot (if commodity pricing)
  if (locked_price || price_currency) {
    await anchorProof(supabase, transaction.id, "price_lock", {
      event: "price_lock_snapshot",
      tx_id: txId,
      locked_price: locked_price ? Number(locked_price) : numAmount,
      price_currency: price_currency ? String(price_currency) : "USD",
      commodity_unit: commodity_unit ? String(commodity_unit) : null,
      commodity_quantity: commodity_quantity ? Number(commodity_quantity) : null,
      snapshot_at: new Date().toISOString(),
    });
  }

  return jsonResponse({
    success: true,
    transaction,
    confirmationCode,
    feeBreakdown: fees,
    walletRouting: {
      transactionWallet: wallets.transactionWallet,
      transactionWalletReceives: fees.transactionWalletReceives,
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
    autoReleaseDate: autoRelease,
  });
}

async function releaseFunds(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId, user_id } = body;
  if (!txId) return errorResponse("txId is required", 400);

  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);
  if (tx.status === "released") return errorResponse("Already released", 400);

  // ── Compliance: log high-value releases for CTR ──
  if (tx.amount >= AML_THRESHOLDS.CTR_REPORTING) {
    await supabase.from("compliance_flags").insert({
      flag_id: `REL-${Date.now()}`,
      type: "CTR_RELEASE",
      description: `Escrow release of $${tx.amount.toLocaleString()} for ${tx.tx_id}. Mandatory CTR reporting threshold exceeded.`,
      severity: "high",
      status: "open",
      related_buyer_id: tx.buyer_id,
      related_vendor_id: tx.vendor_id,
    });
  }

  const fees = calculateFees(tx.amount, "release");
  const wallets = getWalletAddresses();
  const now = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("transactions")
    .update({ status: "released", released_date: now, updated_at: now })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  const payoutId = generatePayoutId();
  const { data: payout, error: poErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: payoutId,
      vendor_id: tx.vendor_id,
      transaction_id: tx.id,
      amount: fees.netAmount,
      tx_id: tx.tx_id,
      method: "escrow_release",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (poErr) return errorResponse(poErr.message, 500);

  await logAuditAction(supabase, String(user_id), "release_funds", {
    transaction_id: tx.id,
    tx_id: tx.tx_id,
    amount: fees.netAmount,
  });

  // Anchor: payout event (full release)
  await anchorProof(supabase, tx.id, "payout", {
    event: "escrow_released",
    tx_id: tx.tx_id,
    payout_id: payoutId,
    gross_amount: tx.amount,
    net_amount: fees.netAmount,
    escrow_fee: fees.escrowFee,
    buyer_id: tx.buyer_id,
    vendor_id: tx.vendor_id,
    released_at: new Date().toISOString(),
  });

  return jsonResponse({
    success: true,
    payout,
    feeBreakdown: fees,
    walletRouting: {
      transactionWallet: wallets.transactionWallet,
      transactionWalletReceives: fees.transactionWalletReceives,
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
  });
}

async function refundBuyer(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId, refundReason, user_id } = body;
  if (!txId) return errorResponse("txId is required", 400);

  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);

  const fees = calculateFees(tx.amount, "refund");
  const now = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("transactions")
    .update({ status: "refunded", updated_at: now })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  const payoutId = generatePayoutId();
  const { data: refundPayout, error: poErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: payoutId,
      vendor_id: tx.buyer_id,
      transaction_id: tx.id,
      amount: fees.netAmount,
      tx_id: tx.tx_id,
      method: "refund",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (poErr) return errorResponse(poErr.message, 500);

  await logAuditAction(supabase, String(user_id), "refund_buyer", {
    transaction_id: tx.id,
    tx_id: tx.tx_id,
    refundReason,
  });

  // Anchor: refund event
  await anchorProof(supabase, tx.id, "payout", {
    event: "escrow_refunded",
    tx_id: tx.tx_id,
    payout_id: payoutId,
    refund_amount: fees.netAmount,
    original_amount: tx.amount,
    buyer_id: tx.buyer_id,
    vendor_id: tx.vendor_id,
    refund_reason: refundReason ?? "Buyer refund",
    refunded_at: new Date().toISOString(),
  });

  return jsonResponse({
    success: true,
    refundPayout,
    refundReason: refundReason ?? null,
    feeBreakdown: {
      ...fees,
      note: "Escrow fee waived on refunds. Only network gas charged.",
    },
  });
}

async function splitPayout(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { txId, vendorSharePercent, buyerSharePercent, user_id } = body;

  if (!txId || vendorSharePercent == null || buyerSharePercent == null) {
    return errorResponse("txId, vendorSharePercent, and buyerSharePercent are required", 400);
  }

  const vPct = Number(vendorSharePercent);
  const bPct = Number(buyerSharePercent);
  if (Math.abs(vPct + bPct - 100) > 0.01) {
    return errorResponse("Shares must total 100%", 400);
  }

  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("tx_id", String(txId))
    .single();

  if (fetchErr || !tx) return errorResponse("Transaction not found", 404);

  const vendorAmount = round(tx.amount * (vPct / 100));
  const buyerAmount = round(tx.amount * (bPct / 100));

  const fees = calculateFees(tx.amount, "split", "direct", vPct / 100);
  const wallets = getWalletAddresses();
  const now = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("transactions")
    .update({
      status: "split_resolved",
      released_date: now,
      updated_at: now,
    })
    .eq("id", tx.id);

  if (upErr) return errorResponse(upErr.message, 500);

  const vendorNet = round(vendorAmount - fees.escrowWalletReceives);
  const { data: vendorPayout, error: vpErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: generatePayoutId(),
      vendor_id: tx.vendor_id,
      transaction_id: tx.id,
      amount: vendorNet,
      tx_id: tx.tx_id,
      method: "split_vendor",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (vpErr) return errorResponse(vpErr.message, 500);

  const buyerNet = buyerAmount; // $0 fees on buyer's share
  const { data: buyerPayout, error: bpErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: generatePayoutId(),
      vendor_id: tx.buyer_id,
      transaction_id: tx.id,
      amount: buyerNet,
      tx_id: tx.tx_id,
      method: "split_buyer",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (bpErr) return errorResponse(bpErr.message, 500);

  await logAuditAction(supabase, String(user_id), "split_payout", {
    transaction_id: tx.id,
    tx_id: tx.tx_id,
    vendorPercent: vPct,
    buyerPercent: bPct,
  });

  // Anchor: split payout event
  await anchorProof(supabase, tx.id, "payout", {
    event: "escrow_split_payout",
    tx_id: tx.tx_id,
    original_amount: tx.amount,
    vendor_percent: vPct,
    buyer_percent: bPct,
    vendor_amount: vendorAmount,
    buyer_amount: buyerAmount,
    vendor_net: vendorNet,
    escrow_fee: fees.escrowFee,
    buyer_id: tx.buyer_id,
    vendor_id: tx.vendor_id,
    split_at: new Date().toISOString(),
  });

  return jsonResponse({
    success: true,
    vendorPayout,
    buyerPayout,
    split: { vendorPercent: vPct, buyerPercent: bPct, vendorAmount, buyerAmount },
    feeBreakdown: {
      ...fees,
      note: "Escrow fee (1%) applied only to vendor share. Gas doubled for dual disbursement.",
    },
    walletRouting: {
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
  });
}

// ─── New Action Handlers ───────────────────────────────────

async function createMilestones(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { transaction_id, industry_key, custom_milestones, user_id } = body;

  if (!transaction_id) return errorResponse("transaction_id is required", 400);

  // Auth check
  const { tx, role } = await getTransactionParty(supabase, String(transaction_id), String(user_id));
  if (!tx) return errorResponse("Transaction not found", 404);
  if (!role) return errorResponse("Unauthorized: not a participant in this transaction", 403);

  // Check for existing milestones
  const { data: existing } = await supabase
    .from("transaction_milestones")
    .select("id")
    .eq("transaction_id", String(transaction_id))
    .limit(1);

  if (existing && existing.length > 0) {
    return errorResponse("Milestones already exist for this transaction. Use update_milestone or reorder_milestones.", 400);
  }

  let milestoneData: Array<Record<string, unknown>> = [];

  if (custom_milestones && Array.isArray(custom_milestones) && custom_milestones.length > 0) {
    // Use custom milestones provided by caller
    milestoneData = custom_milestones;
  } else if (industry_key) {
    // Fetch from industry template
    const { data: template, error: tplErr } = await supabase
      .from("industry_templates")
      .select("default_milestones, required_observer_roles")
      .eq("industry_key", String(industry_key))
      .eq("is_active", true)
      .single();

    if (tplErr || !template) {
      return errorResponse(`Industry template '${industry_key}' not found`, 404);
    }

    milestoneData = template.default_milestones as Array<Record<string, unknown>>;
  } else {
    return errorResponse("Either industry_key or custom_milestones is required", 400);
  }

  // Calculate payment amounts from percentages if transaction amount is known
  const txAmount = Number(tx.amount);
  const milestoneCount = milestoneData.length;

  // ── Equal-split default ─────────────────────────────
  // If no milestone has a custom percentage or amount set,
  // auto-distribute equally. Parties can override per-milestone.
  const hasAnyCustomAmount = milestoneData.some(
    (m: Record<string, unknown>) =>
      (m.payment_percentage && Number(m.payment_percentage) > 0) ||
      (m.payment_amount && Number(m.payment_amount) > 0)
  );

  const equalShare = milestoneCount > 0 ? round(txAmount / milestoneCount) : txAmount;
  // Last milestone absorbs rounding remainder
  const equalShareLast = milestoneCount > 0
    ? round(txAmount - equalShare * (milestoneCount - 1))
    : txAmount;

  const rows = milestoneData.map((m: Record<string, unknown>, idx: number) => {
    let paymentAmount: number | null = null;

    if (m.is_payment_milestone && m.payment_percentage && Number(m.payment_percentage) > 0 && txAmount > 0) {
      // Custom percentage provided — use it
      paymentAmount = round(txAmount * (Number(m.payment_percentage) / 100));
    } else if (m.payment_amount && Number(m.payment_amount) > 0) {
      // Custom fixed amount provided — use it
      paymentAmount = Number(m.payment_amount);
    } else if (txAmount > 0) {
      // No custom amount — auto-distribute equally (optional default)
      paymentAmount = idx === milestoneCount - 1 ? equalShareLast : equalShare;
    }

    // Determine document mode: required (hard block), optional (warn), none (pass)
    const docMode = typeof m.document_mode === "string" ? m.document_mode : "none";
    const optionalDocs = Array.isArray(m.optional_documents) ? m.optional_documents : [];

    // Estimated duration in days for Gantt timeline
    const estimatedDays = typeof m.estimated_days === "number" && m.estimated_days > 0
      ? m.estimated_days
      : 7; // default 7 days per milestone

    return {
      transaction_id: String(transaction_id),
      title: String(m.title ?? `Milestone ${idx + 1}`),
      description: m.description ? String(m.description) : null,
      position: idx,
      status: "pending",
      required_documents: Array.isArray(m.required_documents) ? m.required_documents : [],
      optional_documents: optionalDocs,
      document_mode: docMode,
      assigned_to: m.assigned_to ? String(m.assigned_to) : null,
      is_payment_milestone: Boolean(m.is_payment_milestone),
      payment_amount: paymentAmount,
      estimated_days: estimatedDays,
    };
  });

  const { data: milestones, error: insErr } = await supabase
    .from("transaction_milestones")
    .insert(rows)
    .select();

  if (insErr) return errorResponse(insErr.message, 500);

  await logAuditAction(supabase, String(user_id), "create_milestones", {
    transaction_id: String(transaction_id),
    industry_key: industry_key ?? "custom",
    count: milestones.length,
  });

  return jsonResponse({ success: true, milestones, count: milestones.length });
}

async function updateMilestone(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { milestone_id, user_id, status, uploaded_documents, description } = body;

  if (!milestone_id) return errorResponse("milestone_id is required", 400);

  // Fetch milestone + parent transaction
  const { data: milestone, error: mErr } = await supabase
    .from("transaction_milestones")
    .select("*, transactions!inner(buyer_id, vendor_id, id)")
    .eq("id", String(milestone_id))
    .single();

  if (mErr || !milestone) return errorResponse("Milestone not found", 404);

  // Auth check
  const txData = milestone.transactions as Record<string, unknown>;
  const { role } = await getTransactionParty(supabase, String(txData.id), String(user_id));
  if (!role) return errorResponse("Unauthorized", 403);

  // Build update payload
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status) {
    updatePayload.status = String(status);
    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString();
      updatePayload.completed_by = user_id;
    }
  }

  if (uploaded_documents) {
    // Merge new documents with existing
    const existingDocs = Array.isArray(milestone.uploaded_documents) ? milestone.uploaded_documents : [];
    const newDocs = Array.isArray(uploaded_documents) ? uploaded_documents : [uploaded_documents];
    updatePayload.uploaded_documents = [...existingDocs, ...newDocs];
  }

  if (description !== undefined) {
    updatePayload.description = description;
  }

  const { data: updated, error: upErr } = await supabase
    .from("transaction_milestones")
    .update(updatePayload)
    .eq("id", String(milestone_id))
    .select()
    .single();

  if (upErr) return errorResponse(upErr.message, 500);

  // Notify counterparty when milestone is marked fulfilled
  if (status === "completed" && role === "vendor") {
    const buyerId = String(txData.buyer_id);
    await supabase.from("notifications").insert({
      user_id: buyerId,
      title: "⚠️ Signature Required — Milestone Fulfilled",
      message: `The vendor has marked milestone "${updated.title || "Untitled"}" as fulfilled. Review the deliverables and sign the Milestone Acknowledgement Form to release funds, or file a dispute within 14 days.${updated.description ? ` Vendor note: "${updated.description}"` : ""}`,
      type: "high",
      related_entity_type: "milestone",
      related_entity_id: String(milestone_id),
      is_action_required: true,
      action_url: "/trustlock/buyer/orders",
    });
  } else if (status === "completed" && role === "buyer") {
    const vendorId = String(txData.vendor_id);
    await supabase.from("notifications").insert({
      user_id: vendorId,
      title: "Milestone Confirmed by Buyer",
      message: `The buyer has confirmed milestone "${updated.title || "Untitled"}" as complete.`,
      type: "info",
      related_entity_type: "milestone",
      related_entity_id: String(milestone_id),
    });
  }

  // Notify counterparty when a milestone note is updated
  if (description !== undefined && !status) {
    const counterpartyId = role === "vendor" ? String(txData.buyer_id) : String(txData.vendor_id);
    const fromRole = role === "vendor" ? "Vendor" : "Buyer";
    await supabase.from("notifications").insert({
      user_id: counterpartyId,
      title: `Milestone Note Updated by ${fromRole}`,
      message: `${fromRole} updated the note on milestone "${milestone.title || "Untitled"}": "${String(description).slice(0, 200)}"`,
      type: "info",
      related_entity_type: "milestone",
      related_entity_id: String(milestone_id),
    });
  }

  await logAuditAction(supabase, String(user_id), "update_milestone", {
    transaction_id: txData.id,
    milestone_id: String(milestone_id),
    changes: Object.keys(updatePayload),
  });

  return jsonResponse({ success: true, milestone: updated });
}

async function reorderMilestones(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { transaction_id, milestone_ids, user_id } = body;

  if (!transaction_id || !milestone_ids || !Array.isArray(milestone_ids)) {
    return errorResponse("transaction_id and milestone_ids array are required", 400);
  }

  const { tx, role } = await getTransactionParty(supabase, String(transaction_id), String(user_id));
  if (!tx) return errorResponse("Transaction not found", 404);
  if (!role) return errorResponse("Unauthorized", 403);

  // Update positions sequentially
  const updates = [];
  for (let i = 0; i < milestone_ids.length; i++) {
    updates.push(
      supabase
        .from("transaction_milestones")
        .update({ position: i, updated_at: new Date().toISOString() })
        .eq("id", String(milestone_ids[i]))
        .eq("transaction_id", String(transaction_id))
    );
  }

  await Promise.all(updates);

  await logAuditAction(supabase, String(user_id), "reorder_milestones", {
    transaction_id: String(transaction_id),
    new_order: milestone_ids,
  });

  return jsonResponse({ success: true, message: "Milestones reordered", count: milestone_ids.length });
}

async function deleteMilestone(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { milestone_id, user_id } = body;

  if (!milestone_id) return errorResponse("milestone_id is required", 400);

  // Fetch milestone
  const { data: milestone, error: mErr } = await supabase
    .from("transaction_milestones")
    .select("*, transactions!inner(buyer_id, vendor_id, id)")
    .eq("id", String(milestone_id))
    .single();

  if (mErr || !milestone) return errorResponse("Milestone not found", 404);

  // Only pending milestones can be deleted
  if (milestone.status !== "pending") {
    return errorResponse("Only pending milestones can be deleted", 400);
  }

  // Check for acknowledgement forms
  const { data: forms } = await supabase
    .from("acknowledgement_forms")
    .select("id, signed_by_buyer, signed_by_vendor")
    .eq("milestone_id", String(milestone_id));

  if (forms && forms.some((f: Record<string, unknown>) => f.signed_by_buyer || f.signed_by_vendor)) {
    return errorResponse("Cannot delete milestone with signed acknowledgement forms", 400);
  }

  const txData = milestone.transactions as Record<string, unknown>;
  const { role } = await getTransactionParty(supabase, String(txData.id), String(user_id));
  if (!role) return errorResponse("Unauthorized", 403);

  // Soft-delete: mark status as 'deleted' (restorable during pre-order)
  const { error: delErr } = await supabase
    .from("transaction_milestones")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", String(milestone_id));

  if (delErr) return errorResponse(delErr.message, 500);

  await logAuditAction(supabase, String(user_id), "delete_milestone", {
    transaction_id: txData.id,
    milestone_id: String(milestone_id),
    title: milestone.title,
  });

  // Notify counterparty
  const counterpartyId = String(user_id) === String(txData.buyer_id) ? String(txData.vendor_id) : String(txData.buyer_id);
  await supabase.from("notifications").insert({
    user_id: counterpartyId,
    title: "Milestone Stage Removed",
    message: `"${milestone.title}" was removed from the work order. It can be restored before funds are locked.`,
    type: "warning",
    related_entity_type: "transaction",
    related_entity_id: String(txData.id),
  });

  return jsonResponse({ success: true, message: "Milestone soft-deleted — restorable before funds are locked" });
}

// ─── Restore Milestone ──────────────────────────────────────
async function restoreMilestone(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { milestone_id, user_id } = body;
  if (!milestone_id || !user_id) return errorResponse("milestone_id and user_id required", 400);

  const { data: milestone, error: mErr } = await supabase
    .from("transaction_milestones")
    .select("*, transactions!inner(buyer_id, vendor_id, id, status)")
    .eq("id", String(milestone_id))
    .single();

  if (mErr || !milestone) return errorResponse("Milestone not found", 404);
  if (milestone.status !== "deleted") return errorResponse("Only deleted milestones can be restored", 400);

  const txData = milestone.transactions as Record<string, unknown>;

  // Block restore if funds are already locked
  const lockedStatuses = new Set(["locked", "shipped", "delivered", "released", "disputed", "compliance_hold", "compliance_review", "blocked"]);
  if (lockedStatuses.has(String(txData.status))) {
    return errorResponse("Cannot restore milestone after funds are locked. Use the amendment workflow instead.", 400);
  }

  const { role } = await getTransactionParty(supabase, String(txData.id), String(user_id));
  if (!role) return errorResponse("Unauthorized", 403);

  const { error: restoreErr } = await supabase
    .from("transaction_milestones")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", String(milestone_id));

  if (restoreErr) return errorResponse(restoreErr.message, 500);

  await logAuditAction(supabase, String(user_id), "restore_milestone", {
    transaction_id: txData.id,
    milestone_id: String(milestone_id),
    title: milestone.title,
  });

  // Notify counterparty
  const counterpartyId = String(user_id) === String(txData.buyer_id) ? String(txData.vendor_id) : String(txData.buyer_id);
  await supabase.from("notifications").insert({
    user_id: counterpartyId,
    title: "Milestone Stage Restored",
    message: `"${milestone.title}" has been restored to the work order.`,
    type: "info",
    related_entity_type: "transaction",
    related_entity_id: String(txData.id),
  });

  return jsonResponse({ success: true, message: "Milestone restored to pending" });
}

async function releaseMilestonePayment(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { milestone_id, user_id } = body;

  if (!milestone_id) return errorResponse("milestone_id is required", 400);

  // Fetch milestone with transaction
  const { data: milestone, error: mErr } = await supabase
    .from("transaction_milestones")
    .select("*, transactions!inner(*)")
    .eq("id", String(milestone_id))
    .single();

  if (mErr || !milestone) return errorResponse("Milestone not found", 404);

  if (!milestone.is_payment_milestone) {
    return errorResponse("This is not a payment milestone", 400);
  }
  if (milestone.payment_released) {
    return errorResponse("Payment already released for this milestone", 400);
  }
  if (milestone.status !== "completed") {
    return errorResponse("Milestone must be completed before payment can be released", 400);
  }

  const txData = milestone.transactions as Record<string, unknown>;
  const { role } = await getTransactionParty(supabase, String(txData.id), String(user_id));
  if (!role) return errorResponse("Unauthorized", 403);

  // Check both parties have signed acknowledgement form (if one exists)
  const { data: forms } = await supabase
    .from("acknowledgement_forms")
    .select("signed_by_buyer, signed_by_vendor")
    .eq("milestone_id", String(milestone_id));

  if (forms && forms.length > 0) {
    const allSigned = forms.every(
      (f: Record<string, unknown>) => f.signed_by_buyer && f.signed_by_vendor
    );
    if (!allSigned) {
      return errorResponse("Both buyer and vendor must sign the acknowledgement form before releasing payment", 400);
    }
  }

  const paymentAmount = Number(milestone.payment_amount ?? 0);
  if (paymentAmount <= 0) {
    return errorResponse("No payment amount set for this milestone", 400);
  }

  const fees = calculateFees(paymentAmount, "release");
  const wallets = getWalletAddresses();
  const now = new Date().toISOString();

  // Mark milestone payment as released
  const { error: msUpErr } = await supabase
    .from("transaction_milestones")
    .update({ payment_released: true, updated_at: now })
    .eq("id", String(milestone_id));

  if (msUpErr) return errorResponse(msUpErr.message, 500);

  // Create payout record
  const payoutId = generatePayoutId();
  const { data: payout, error: poErr } = await supabase
    .from("payouts")
    .insert({
      payout_id: payoutId,
      vendor_id: txData.vendor_id,
      transaction_id: txData.id,
      amount: fees.netAmount,
      tx_id: txData.tx_id,
      method: "milestone_release",
      status: "completed",
      completed_at: now,
    })
    .select()
    .single();

  if (poErr) return errorResponse(poErr.message, 500);

  // Check if all payment milestones are released — if so, mark transaction as released
  const { data: allMilestones } = await supabase
    .from("transaction_milestones")
    .select("is_payment_milestone, payment_released")
    .eq("transaction_id", String(txData.id));

  const allPaymentsDone = allMilestones
    ?.filter((m: Record<string, unknown>) => m.is_payment_milestone)
    .every((m: Record<string, unknown>) => m.payment_released);

  if (allPaymentsDone) {
    await supabase
      .from("transactions")
      .update({ status: "released", released_date: now, updated_at: now })
      .eq("id", String(txData.id));
  }

  await logAuditAction(supabase, String(user_id), "release_milestone_payment", {
    transaction_id: txData.id,
    milestone_id: String(milestone_id),
    paymentAmount,
    netAmount: fees.netAmount,
    allPaymentsDone,
  });

  // Anchor: milestone payment release
  await anchorProof(supabase, String(txData.id), "milestone", {
    event: "milestone_payment_released",
    tx_id: txData.tx_id,
    milestone_id: String(milestone_id),
    milestone_title: milestone.title,
    payment_amount: paymentAmount,
    net_amount: fees.netAmount,
    escrow_fee: fees.escrowFee,
    all_milestones_released: allPaymentsDone,
    released_at: now,
  });

  return jsonResponse({
    success: true,
    payout,
    milestoneTitle: milestone.title,
    allPaymentMilestonesReleased: allPaymentsDone,
    feeBreakdown: fees,
    walletRouting: {
      transactionWallet: wallets.transactionWallet,
      transactionWalletReceives: fees.transactionWalletReceives,
      escrowWallet: wallets.escrowWallet,
      escrowWalletReceives: fees.escrowWalletReceives,
    },
  });
}

async function checkAutoRelease() {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // ── Atomic (non-milestone) transactions ──
  const { data: expired, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("status", "locked")
    .lte("auto_release_date", now);

  if (error) return errorResponse(error.message, 500);

  const results = [];

  if (expired && expired.length > 0) {
    for (const tx of expired) {
      // Skip if transaction has milestones (handled separately)
      const { data: hasMilestones } = await supabase
        .from("transaction_milestones")
        .select("id")
        .eq("transaction_id", tx.id)
        .limit(1);

      if (hasMilestones && hasMilestones.length > 0) continue;

      const fees = calculateFees(tx.amount, "release");
      const payoutId = generatePayoutId();

      await supabase
        .from("transactions")
        .update({ status: "released", released_date: now, updated_at: now })
        .eq("id", tx.id);

      const { data: payout } = await supabase
        .from("payouts")
        .insert({
          payout_id: payoutId,
          vendor_id: tx.vendor_id,
          transaction_id: tx.id,
          amount: fees.netAmount,
          tx_id: tx.tx_id,
          method: "auto_release",
          status: "completed",
          completed_at: now,
        })
        .select()
        .single();

      results.push({ txId: tx.tx_id, payout, feeBreakdown: fees, type: "atomic" });
    }
  }

  // ── Milestone-based: auto-release individual milestones 14 days after vendor marks fulfilled ──
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: overdueMilestones } = await supabase
    .from("transaction_milestones")
    .select("*, transactions!inner(*)")
    .eq("status", "completed")
    .eq("is_payment_milestone", true)
    .eq("payment_released", false)
    .lte("completed_at", fourteenDaysAgo);

  if (overdueMilestones && overdueMilestones.length > 0) {
    for (const ms of overdueMilestones) {
      const txData = ms.transactions as Record<string, unknown>;
      const paymentAmount = Number(ms.payment_amount ?? 0);
      if (paymentAmount <= 0) continue;

      const fees = calculateFees(paymentAmount, "release");
      const payoutId = generatePayoutId();

      await supabase
        .from("transaction_milestones")
        .update({ payment_released: true, updated_at: now })
        .eq("id", ms.id);

      const { data: payout } = await supabase
        .from("payouts")
        .insert({
          payout_id: payoutId,
          vendor_id: txData.vendor_id,
          transaction_id: txData.id,
          amount: fees.netAmount,
          tx_id: txData.tx_id,
          method: "milestone_auto_release",
          status: "completed",
          completed_at: now,
        })
        .select()
        .single();

      results.push({
        txId: txData.tx_id,
        milestoneId: ms.id,
        milestoneTitle: ms.title,
        payout,
        feeBreakdown: fees,
        type: "milestone",
      });
    }
  }

  return jsonResponse({
    success: true,
    released: results.length,
    results,
    message: results.length === 0 ? "No transactions or milestones due for auto-release." : undefined,
  });
}

async function addObserver(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const {
    transaction_id, observer_email, observer_name, observer_role,
    permissions, milestone_ids, user_id, expires_at,
  } = body;

  if (!transaction_id || !observer_email || !observer_name) {
    return errorResponse("transaction_id, observer_email, and observer_name are required", 400);
  }

  const { tx, role } = await getTransactionParty(supabase, String(transaction_id), String(user_id));
  if (!tx) return errorResponse("Transaction not found", 404);
  if (!role || role === "observer") {
    return errorResponse("Only buyer, vendor, or admin can add observers", 403);
  }

  const accessToken = generateAccessToken();

  const { data: observer, error: obsErr } = await supabase
    .from("transaction_observers")
    .insert({
      transaction_id: String(transaction_id),
      observer_email: String(observer_email),
      observer_name: String(observer_name),
      observer_role: observer_role ? String(observer_role) : null,
      invited_by: user_id ? String(user_id) : null,
      access_token: accessToken,
      permissions: Array.isArray(permissions) ? permissions : ["view"],
      milestone_ids: Array.isArray(milestone_ids) ? milestone_ids : [],
      expires_at: expires_at ? String(expires_at) : null,
    })
    .select()
    .single();

  if (obsErr) return errorResponse(obsErr.message, 500);

  // Link observer to milestones if specific milestone_ids provided
  if (Array.isArray(milestone_ids) && milestone_ids.length > 0) {
    for (const msId of milestone_ids) {
      await supabase
        .from("transaction_milestones")
        .update({ observer_id: observer.id, updated_at: new Date().toISOString() })
        .eq("id", String(msId))
        .eq("transaction_id", String(transaction_id));
    }
  }

  await logAuditAction(supabase, String(user_id), "add_observer", {
    transaction_id: String(transaction_id),
    observer_email: String(observer_email),
    observer_role: observer_role ?? null,
    milestone_count: Array.isArray(milestone_ids) ? milestone_ids.length : 0,
  });

  return jsonResponse({
    success: true,
    observer,
    accessToken,
    message: `Observer ${observer_name} added successfully`,
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
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // Original actions
      case "lock_funds":
        return await lockFunds(body);
      case "release_funds":
        return await releaseFunds(body);
      case "refund_buyer":
        return await refundBuyer(body);
      case "split_payout":
        return await splitPayout(body);

      // New milestone & observer actions
      case "create_milestones":
        return await createMilestones(body);
      case "update_milestone":
        return await updateMilestone(body);
      case "reorder_milestones":
        return await reorderMilestones(body);
      case "delete_milestone":
        return await deleteMilestone(body);
      case "restore_milestone":
        return await restoreMilestone(body);
      case "release_milestone_payment":
        return await releaseMilestonePayment(body);
      case "check_auto_release":
        return await checkAutoRelease();
      case "add_observer":
        return await addObserver(body);

      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: lock_funds, release_funds, refund_buyer, split_payout, create_milestones, update_milestone, reorder_milestones, delete_milestone, restore_milestone, release_milestone_payment, check_auto_release, add_observer`,
          400
        );
    }
  } catch (err) {
    console.error("escrow-manager error:", err);
    return errorResponse("Internal server error", 500);
  }
});

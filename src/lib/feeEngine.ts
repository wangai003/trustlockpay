// ─── Dual Azix Wallet Fee Engine ───────────────────────────
// Two distinct custodian wallets:
//   1. TRANSACTION WALLET — collects platform fees + taxes at checkout
//   2. ESCROW WALLET — receives escrow principal + pre-paid escrow fee;
//      trickles escrow fee to Transaction Wallet upon release

export const AZIX_WALLETS = {
  transaction: {
    label: "Azix Transaction Wallet",
    publicKey: "0x7A3b...F92d",
    purpose: "Collects platform fees and taxes from checkout payments",
  },
  escrow: {
    label: "Azix Escrow Wallet",
    publicKey: "0x4E1c...A83b",
    purpose: "Holds escrow principal + pre-paid escrow fee until release or refund",
  },
} as const;

export type WalletType = keyof typeof AZIX_WALLETS;

// ─── Transaction Types ─────────────────────────────────────
export type TransactionType =
  | "checkout_fiat"        // Buyer pays with fiat at checkout → crypto conversion
  | "checkout_crypto"      // Buyer pays with crypto at checkout
  | "release_to_vendor"    // Confirmed release of escrowed funds to vendor
  | "refund_crypto"        // Refund back to buyer in crypto
  | "refund_fiat"          // Refund back to buyer converted to fiat
  | "split_payout"         // Dispute-resolved split between buyer & vendor
  | "os_payment";          // Internal OS service payment (plans, reports, AI)

// ─── Processor Configuration ──────────────────────────────
export type ProcessorId = "stripe" | "coinbase" | "transak" | "direct";

export type PaymentMethod = "card" | "bank_transfer" | "mobile_money" | "crypto";

export interface ProcessorConfig {
  name: string;
  feeRate: number;          // % fee the processor charges
  supportsFiat: boolean;
  supportsCrypto: boolean;
  regions: string[];
  onRamp: boolean;
  offRamp: boolean;
  supportedMethods: PaymentMethod[];
}

// ─── KYC Tier Definitions ─────────────────────────────────
export type KycTier = "none" | "basic" | "intermediate" | "full";

export interface ProcessorLimits {
  minPerTx: number;
  maxPerTx: Record<KycTier, number>;
  dailyLimit: Record<KycTier, number>;
  monthlyLimit: Record<KycTier, number>;
  maxDailyTxCount: number;
}

export const PROCESSORS: Record<ProcessorId, ProcessorConfig & { limits: ProcessorLimits }> = {
  stripe: {
    name: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    regions: ["US", "EU", "UK", "CA", "AU", "JP", "SG", "HK", "NZ", "global"],
    onRamp: true,
    offRamp: false,
    supportedMethods: ["card", "bank_transfer"],
    limits: {
      minPerTx: 0.50,
      maxPerTx:    { none: 500, basic: 10_000, intermediate: 250_000, full: 999_999 },
      dailyLimit:  { none: 2_000, basic: 50_000, intermediate: 500_000, full: 2_000_000 },
      monthlyLimit:{ none: 10_000, basic: 250_000, intermediate: 2_000_000, full: 10_000_000 },
      maxDailyTxCount: 200,
    },
  },
  coinbase: {
    name: "Coinbase",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    regions: [
      "US", "EU", "UK",
      "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
      "Uganda", "Tanzania", "Rwanda",
    ],
    onRamp: true,
    offRamp: true,
    supportedMethods: ["card", "bank_transfer", "mobile_money", "crypto"],
    limits: {
      minPerTx: 1.00,
      maxPerTx:    { none: 300, basic: 7_500, intermediate: 50_000, full: 250_000 },
      dailyLimit:  { none: 500, basic: 25_000, intermediate: 100_000, full: 500_000 },
      monthlyLimit:{ none: 5_000, basic: 100_000, intermediate: 500_000, full: 2_500_000 },
      maxDailyTxCount: 100,
    },
  },
  transak: {
    name: "Transak",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    regions: [
      "US", "EU", "UK", "IN", "BR", "MX",
      "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt",
      "global",
    ],
    onRamp: true,
    offRamp: true,
    supportedMethods: ["card", "bank_transfer", "mobile_money", "crypto"],
    limits: {
      minPerTx: 1.00,
      maxPerTx:    { none: 100, basic: 500, intermediate: 15_000, full: 50_000 },
      dailyLimit:  { none: 100, basic: 1_500, intermediate: 25_000, full: 100_000 },
      monthlyLimit:{ none: 1_000, basic: 10_000, intermediate: 100_000, full: 500_000 },
      maxDailyTxCount: 50,
    },
  },
  direct: {
    name: "Direct (On-chain)",
    feeRate: 0,
    supportsFiat: false,
    supportsCrypto: true,
    regions: ["global"],
    onRamp: false,
    offRamp: false,
    supportedMethods: ["crypto"],
    limits: {
      minPerTx: 0.01,
      maxPerTx:    { none: 50_000, basic: 250_000, intermediate: 1_000_000, full: 10_000_000 },
      dailyLimit:  { none: 100_000, basic: 500_000, intermediate: 5_000_000, full: 50_000_000 },
      monthlyLimit:{ none: 500_000, basic: 2_500_000, intermediate: 25_000_000, full: 100_000_000 },
      maxDailyTxCount: 500,
    },
  },
};

// ─── AML / Compliance Thresholds ─────────────────────────
export const AML_THRESHOLDS = {
  FATF_TRAVEL_RULE_CRYPTO: 1_000,
  WIRE_RECORDING: 3_000,
  EDD_THRESHOLD: 3_000,
  CTR_REPORTING: 10_000,
  STRUCTURING_BAND_LOW: 7_500,
  STRUCTURING_WINDOW_HOURS: 24,
  STRUCTURING_MIN_COUNT: 3,
  VELOCITY_SPIKE_MULTIPLIER: 3,
} as const;

// ─── Transaction Limit Validation ─────────────────────────
export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  maxAllowed?: number;
  currentUsage?: { daily: number; monthly: number; dailyCount: number };
  suggestedAction?: string;
  upgradeRequired?: boolean;
  amlFlags?: string[];
}

export function checkTransactionLimits(
  amount: number,
  processorId: ProcessorId,
  kycTier: KycTier = "basic",
  paymentMethod: PaymentMethod = "card",
  dailyVolumeUsed: number = 0,
  monthlyVolumeUsed: number = 0,
  dailyTxCount: number = 0,
): LimitCheckResult {
  const processor = PROCESSORS[processorId];
  const limits = processor.limits;
  const amlFlags: string[] = [];

  if (amount < limits.minPerTx) {
    return {
      allowed: false,
      reason: `Minimum transaction for ${processor.name} is $${limits.minPerTx.toFixed(2)}`,
      maxAllowed: limits.maxPerTx[kycTier],
    };
  }

  const maxTx = limits.maxPerTx[kycTier];
  if (amount > maxTx) {
    const nextTier = getNextKycTier(kycTier);
    return {
      allowed: false,
      reason: `$${amount.toLocaleString()} exceeds ${processor.name} per-transaction limit of $${maxTx.toLocaleString()} for your verification level (${kycTier})`,
      maxAllowed: maxTx,
      upgradeRequired: !!nextTier,
      suggestedAction: nextTier
        ? `Upgrade to ${nextTier} verification to increase your limit to $${limits.maxPerTx[nextTier].toLocaleString()}`
        : "Contact support for enterprise limits",
    };
  }

  const maxDaily = limits.dailyLimit[kycTier];
  if (dailyVolumeUsed + amount > maxDaily) {
    return {
      allowed: false,
      reason: `Adding $${amount.toLocaleString()} would exceed your daily limit of $${maxDaily.toLocaleString()} (used: $${dailyVolumeUsed.toLocaleString()})`,
      maxAllowed: maxDaily - dailyVolumeUsed,
      currentUsage: { daily: dailyVolumeUsed, monthly: monthlyVolumeUsed, dailyCount: dailyTxCount },
      suggestedAction: "Try again tomorrow or upgrade your verification level",
      upgradeRequired: true,
    };
  }

  const maxMonthly = limits.monthlyLimit[kycTier];
  if (monthlyVolumeUsed + amount > maxMonthly) {
    return {
      allowed: false,
      reason: `Adding $${amount.toLocaleString()} would exceed your monthly limit of $${maxMonthly.toLocaleString()} (used: $${monthlyVolumeUsed.toLocaleString()})`,
      maxAllowed: maxMonthly - monthlyVolumeUsed,
      currentUsage: { daily: dailyVolumeUsed, monthly: monthlyVolumeUsed, dailyCount: dailyTxCount },
      suggestedAction: "Wait until next billing cycle or upgrade your verification level",
      upgradeRequired: true,
    };
  }

  if (dailyTxCount >= limits.maxDailyTxCount) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxDailyTxCount} transactions per day for ${processor.name}`,
      currentUsage: { daily: dailyVolumeUsed, monthly: monthlyVolumeUsed, dailyCount: dailyTxCount },
      suggestedAction: "Try again tomorrow",
    };
  }

  const isCrypto = paymentMethod === "crypto" || processorId === "direct";
  if (isCrypto && amount >= AML_THRESHOLDS.FATF_TRAVEL_RULE_CRYPTO) {
    amlFlags.push(`FATF Travel Rule: Crypto transaction ≥$${AML_THRESHOLDS.FATF_TRAVEL_RULE_CRYPTO.toLocaleString()} requires originator/beneficiary identification`);
  }
  if (amount >= AML_THRESHOLDS.EDD_THRESHOLD) {
    amlFlags.push(`Enhanced Due Diligence: Transaction ≥$${AML_THRESHOLDS.EDD_THRESHOLD.toLocaleString()} triggers additional identity verification`);
  }
  if (amount >= AML_THRESHOLDS.CTR_REPORTING) {
    amlFlags.push(`CTR Reporting: Transaction ≥$${AML_THRESHOLDS.CTR_REPORTING.toLocaleString()} is subject to mandatory Currency Transaction Reporting`);
  }

  return {
    allowed: true,
    maxAllowed: maxTx,
    currentUsage: { daily: dailyVolumeUsed, monthly: monthlyVolumeUsed, dailyCount: dailyTxCount },
    amlFlags: amlFlags.length > 0 ? amlFlags : undefined,
  };
}

function getNextKycTier(current: KycTier): KycTier | null {
  const order: KycTier[] = ["none", "basic", "intermediate", "full"];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export function getProcessorLimitsDisplay(processorId: ProcessorId, kycTier: KycTier = "basic") {
  const p = PROCESSORS[processorId];
  return {
    processor: p.name,
    tier: kycTier,
    minPerTx: p.limits.minPerTx,
    maxPerTx: p.limits.maxPerTx[kycTier],
    dailyLimit: p.limits.dailyLimit[kycTier],
    monthlyLimit: p.limits.monthlyLimit[kycTier],
    maxDailyTxCount: p.limits.maxDailyTxCount,
  };
}

// ─── Fee Calculation Result ────────────────────────────────
export interface FeeBreakdown {
  transactionType: TransactionType;
  amount: number;
  // Fees
  trustlockFee: number;        // TrustLock's platform cut
  processorFee: number;        // Processor's cut
  escrowFee: number;           // 1% escrow service fee (pre-paid at checkout)
  gasFee: number;              // Polygon L2 gas estimate
  totalFees: number;
  netAmount: number;
  // What the buyer actually pays at checkout (amount + all fees)
  buyerTotalCharge: number;
  // Wallet routing
  transactionWalletReceives: number;
  escrowWalletReceives: number;  // principal + escrow fee held until release
  processorReceives: number;
  feeTrickleToTransactionWallet: number;
  // Metadata
  processorUsed: ProcessorId;
  feePercentage: number;
  trickleRule: "none" | "full_escrow_fee" | "vendor_share_only";
}

// ─── Fee Rules by Transaction Type ─────────────────────────
interface FeeRule {
  trustlockRate: number;   // %
  escrowRate: number;      // % — charged upfront at checkout, not deducted from principal
  gasEstimate: number;     // Fixed USD
  escrowApplies: boolean;
  escrowVendorOnly: boolean;
}

const FEE_RULES: Record<TransactionType, FeeRule> = {
  checkout_fiat: {
    trustlockRate: 1.5,
    escrowRate: 1.0,       // 1% escrow fee charged UPFRONT at checkout
    gasEstimate: 0,        // Gas covered by platform for inbound routing
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  checkout_crypto: {
    trustlockRate: 1.0,
    escrowRate: 1.0,       // 1% escrow fee charged UPFRONT at checkout
    gasEstimate: 0,        // Gas covered by platform for inbound routing
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  release_to_vendor: {
    trustlockRate: 0,
    escrowRate: 0,         // Already pre-paid at checkout — no additional charge
    gasEstimate: 0,        // Gas covered by platform for release
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  refund_crypto: {
    trustlockRate: 0,
    escrowRate: 0,
    gasEstimate: 0,        // Gas absorbed from pre-paid escrow fee — $0 to buyer
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  refund_fiat: {
    trustlockRate: 0,
    escrowRate: 0,
    gasEstimate: 0,        // Gas absorbed from pre-paid escrow fee — $0 to buyer
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  split_payout: {
    trustlockRate: 0,
    escrowRate: 1.0,       // Halved from original milestone rate, vendor side only
    gasEstimate: 0,        // Gas absorbed from pre-paid escrow fee — $0 to parties
    escrowApplies: true,
    escrowVendorOnly: true,
  },
  os_payment: {
    trustlockRate: 1.5,
    escrowRate: 0,
    gasEstimate: 0,        // Gas covered by platform
    escrowApplies: false,
    escrowVendorOnly: false,
  },
};

// ─── Processor Selection Logic ─────────────────────────────
export interface ProcessorMatch {
  id: ProcessorId;
  config: ProcessorConfig;
  combinedRate: number;
}

export function getEligibleProcessors(
  country: string,
  paymentMethod: PaymentMethod = "card",
  transactionType: TransactionType = "checkout_fiat"
): ProcessorMatch[] {
  const trustlockRate = FEE_RULES[transactionType]?.trustlockRate ?? 1.5;

  const eligible: ProcessorMatch[] = [];

  for (const [id, config] of Object.entries(PROCESSORS) as [ProcessorId, ProcessorConfig][]) {
    if (id === "direct" && paymentMethod !== "crypto") continue;
    if (paymentMethod === "crypto" && !config.supportsCrypto) continue;
    const regionMatch = config.regions.includes(country) || config.regions.includes("global");
    if (!regionMatch) continue;
    if (!config.supportedMethods.includes(paymentMethod)) continue;

    eligible.push({
      id: id as ProcessorId,
      config,
      combinedRate: trustlockRate + config.feeRate,
    });
  }

  eligible.sort((a, b) => a.combinedRate - b.combinedRate);
  return eligible;
}

export function selectProcessor(
  country: string,
  isCrypto: boolean,
  processorHint?: ProcessorId,
  paymentMethod?: PaymentMethod,
  transactionType?: TransactionType
): ProcessorId {
  if (processorHint && PROCESSORS[processorHint]) return processorHint;
  if (isCrypto) return "direct";

  const method = paymentMethod ?? "card";
  const txType = transactionType ?? "checkout_fiat";
  const eligible = getEligibleProcessors(country, method, txType);

  if (eligible.length > 0) return eligible[0].id;
  return "stripe";
}

// ─── Invoice Fee Calculator ───────────────────────────────
// Computes the complete breakdown for the invoice stage so buyers
// see exactly what they pay and vendors know the full escrow principal.
export interface InvoiceFeeCalculation {
  escrowPrincipal: number;     // Amount vendor will receive (preserved)
  escrowFee: number;           // 1% of principal — added on top
  platformFee: number;         // TrustLock platform fee — added on top
  processorFee: number;        // Processor fee — added on top
  taxAmount: number;           // Taxes/tariffs from invoice
  gasFee: number;              // $0 — covered by platform
  totalBuyerCharge: number;    // What the buyer actually pays
  escrowWalletReceives: number;  // principal + escrow fee
  transactionWalletReceives: number; // platform fee + taxes
}

export function calculateInvoiceFees(
  escrowPrincipal: number,
  processorId: ProcessorId,
  isCrypto: boolean,
  taxAmount: number = 0,
): InvoiceFeeCalculation {
  const platformRate = isCrypto ? 1.0 : 1.5;
  const processorRate = PROCESSORS[processorId]?.feeRate ?? 0;

  const escrowFee = round(escrowPrincipal * 0.01);         // 1% of principal
  const platformFee = round(escrowPrincipal * (platformRate / 100));
  const processorFee = processorId === "direct" ? 0 : round(escrowPrincipal * (processorRate / 100));
  const tax = round(taxAmount);

  const totalBuyerCharge = round(escrowPrincipal + escrowFee + platformFee + processorFee + tax);

  return {
    escrowPrincipal,
    escrowFee,
    platformFee,
    processorFee,
    taxAmount: tax,
    gasFee: 0,
    totalBuyerCharge,
    escrowWalletReceives: round(escrowPrincipal + escrowFee),
    transactionWalletReceives: round(platformFee + tax),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Main Fee Calculator ───────────────────────────────────
export function calculateFeesV2(
  amount: number,
  transactionType: TransactionType,
  processorId: ProcessorId,
  options?: {
    splitVendorShare?: number;
    milestoneEscrowFeeRate?: number;  // Pre-calculated fractional rate for split payouts
  }
): FeeBreakdown {
  const rule = FEE_RULES[transactionType];
  const processor = PROCESSORS[processorId];

  const trustlockFee = round(amount * (rule.trustlockRate / 100));
  const processorFee = processorId === "direct" ? 0 : round(amount * (processor.feeRate / 100));

  let escrowFee = 0;
  if (rule.escrowApplies) {
    if (rule.escrowVendorOnly && options?.splitVendorShare !== undefined) {
      // Split payout: use halved rate on vendor's share only
      const vendorAmount = amount * options.splitVendorShare;
      const effectiveRate = options.milestoneEscrowFeeRate ?? (rule.escrowRate / 2);
      escrowFee = round(vendorAmount * (effectiveRate / 100));
    } else {
      escrowFee = round(amount * (rule.escrowRate / 100));
    }
  }

  const gasFee = rule.gasEstimate;
  const totalFees = round(trustlockFee + processorFee + escrowFee + gasFee);
  const netAmount = round(amount - totalFees);

  // For checkout: buyer pays amount + fees ON TOP (fees not deducted from amount)
  const isCheckout = transactionType === "checkout_fiat" || transactionType === "checkout_crypto";
  const buyerTotalCharge = isCheckout ? round(amount + totalFees) : amount;

  const feeTrickleToTransactionWallet = rule.escrowApplies ? escrowFee : 0;
  const trickleRule: "none" | "full_escrow_fee" | "vendor_share_only" =
    !rule.escrowApplies ? "none" : rule.escrowVendorOnly ? "vendor_share_only" : "full_escrow_fee";

  return {
    transactionType,
    amount,
    trustlockFee,
    processorFee,
    escrowFee,
    gasFee,
    totalFees,
    netAmount,
    buyerTotalCharge,
    transactionWalletReceives: round(trustlockFee + feeTrickleToTransactionWallet),
    escrowWalletReceives: isCheckout ? round(amount + escrowFee) : 0,
    processorReceives: processorFee,
    feeTrickleToTransactionWallet,
    processorUsed: processorId,
    feePercentage: amount > 0 ? (totalFees / amount) * 100 : 0,
    trickleRule,
  };
}

// ─── Convenience: human-readable fee range ─────────────────
export function getFeeRangeForType(type: TransactionType): string {
  switch (type) {
    case "checkout_crypto":
      return "2.0% total (1.0% platform + 1.0% escrow) — added to invoice";
    case "checkout_fiat":
      return "2.5% – 5.4% total (platform + processor + escrow) — added to invoice";
    case "refund_crypto":
      return "$0 — all gas absorbed from pre-paid escrow fee, no service fees";
    case "refund_fiat":
      return "$0 — all gas absorbed from pre-paid escrow fee, no service fees";
    case "release_to_vendor":
      return "No additional fees — escrow fee pre-paid at checkout, gas absorbed from escrow fee";
    case "split_payout":
      return "Halved escrow fee on vendor side only · Gas absorbed from escrow fee";
    case "os_payment":
      return "1.0% – 1.5% platform fee (no escrow)";
    default:
      return "2.0% – 5.4%";
  }
}

// ─── Canonical Fee Display Constants ───────────────────────
export const FEE_CATEGORIES = {
  platform: {
    label: "TrustLock Platform Fee",
    shortLabel: "Platform Fee",
    crypto: { rate: 1.0, display: "1.0%" },
    fiat: { rate: 1.5, display: "1.5%" },
    range: "1.0% – 1.5%",
    wallet: "transaction" as WalletType,
    description: "Covers payment processing, currency conversion coordination, and network infrastructure.",
    when: "Charged at checkout, added to the invoice total. Not deducted from escrow principal.",
  },
  processor: {
    label: "Payment Processor Fee",
    shortLabel: "Processor Fee",
    rates: {
      coinbase: { rate: 1.5, display: "1.5%" },
      transak: { rate: 1.5, display: "1.5%" },
      stripe: { rate: 2.9, display: "2.9%" },
      direct: { rate: 0, display: "0%" },
    },
    range: "1.5% – 2.9%",
    rangeWithDirect: "0% – 2.9%",
    wallet: "external" as const,
    description: "Paid to the payment processor (Stripe, Coinbase, or Transak) for payment processing.",
    when: "Charged at checkout. Direct crypto transfers bypass this fee entirely.",
  },
  escrow: {
    label: "Escrow Service Fee",
    shortLabel: "Escrow Fee",
    rate: 1.0,
    display: "1.0%",
    wallet: "escrow" as WalletType,
    description: "Covers smart contract escrow custody, milestone tracking, and secure fund release. Pre-paid at checkout and held with the escrow principal until release.",
    when: "1.0% charged upfront at checkout (added to buyer's total). Trickled to TrustLock upon successful release. Fully refunded to buyer on cancellation/refund before work begins.",
  },
  gas: {
    label: "Network Gas Fee",
    shortLabel: "Gas",
    estimate: "$0.00",
    refundEstimate: "$0.02 – $0.05",
    splitEstimate: "$0.01 – $0.025 per party",
    description: "Gas fees are small costs paid to blockchain network validators (not TrustLock) to process and confirm transactions — similar to a bank wire transfer fee. They fluctuate with network demand, which is why we show an estimated range instead of a fixed price.",
    when: "Standard transactions & vendor releases: $0 (covered by TrustLock). Refunds: ~$0.02–$0.05 deducted from returned funds. Split payouts: ~$0.02–$0.05 total, split equally between buyer and vendor.",
  },
} as const;

// ─── All-in fee ranges ─────────────────────────────────────
export const ALL_IN_RANGES = {
  cryptoDirect: { range: "2.0%", label: "Crypto-to-Crypto (Direct)" },
  cryptoViaProcessor: { range: "2.5% – 3.5%", label: "Crypto via Processor" },
  fiat: { range: "4.4% – 5.4%", label: "Fiat-to-Crypto" },
  refund: { range: "Gas only (~$0.02–$0.05)", label: "Refund (no service fees)" },
  osPayment: { range: "1.0% – 1.5%", label: "OS Platform Payment (no escrow)" },
} as const;

// ─── Formatted disclosure text ────────────────────────────
export const DUAL_WALLET_DISCLOSURE = `TrustLock uses two separate custodian wallets for maximum transparency:

• **Transaction Wallet** (${AZIX_WALLETS.transaction.publicKey}): Receives platform fees (${FEE_CATEGORIES.platform.range}) and jurisdiction taxes at checkout. These are non-refundable service fees.

• **Escrow Wallet** (${AZIX_WALLETS.escrow.publicKey}): Receives the full escrow principal PLUS the pre-paid 1% escrow service fee. The vendor receives 100% of the escrow principal upon completion. The escrow fee trickles to TrustLock only upon successful release. On refund, 100% of the escrow principal and pre-paid escrow fee are returned to the buyer — no TrustLock service fees are charged.

Processor fees (${FEE_CATEGORIES.processor.range}) are paid to the external payment processor.

All-in fee ranges: Crypto direct (${ALL_IN_RANGES.cryptoDirect.range}), Fiat (${ALL_IN_RANGES.fiat.range}), Refunds (${ALL_IN_RANGES.refund.range}).`;

export const FEE_DISCLOSURE_SHORT = `All fees are charged upfront at checkout and added to the invoice total — the escrow principal is never reduced. Platform: ${FEE_CATEGORIES.platform.range} · Processor: ${FEE_CATEGORIES.processor.range} · Escrow: ${FEE_CATEGORIES.escrow.display}. Refunds: gas only, no service fees. Gas for internal transfers covered by TrustLock.`;

export const FEE_DISCLOSURE_FULL = `TrustLock Pay fees are transparently added to your invoice total so the vendor receives 100% of the agreed escrow amount:

1. **Platform Fee** (${FEE_CATEGORIES.platform.range}): ${FEE_CATEGORIES.platform.description} ${FEE_CATEGORIES.platform.when}

2. **Processor Fee** (${FEE_CATEGORIES.processor.range}): ${FEE_CATEGORIES.processor.description} ${FEE_CATEGORIES.processor.when}

3. **Escrow Service Fee** (${FEE_CATEGORIES.escrow.display}): ${FEE_CATEGORIES.escrow.description} ${FEE_CATEGORIES.escrow.when}

4. **Network Gas Fees**: ${FEE_CATEGORIES.gas.description}

**What are Gas Fees?** Think of gas fees like a small postage cost to send a package — except instead of a physical package, you're sending money on the blockchain. These fees go to the network, NOT to TrustLock.

**When Gas Fees Apply:**
• ✅ **Standard checkout & vendor release:** $0 — TrustLock covers all gas from platform revenue
• ⚠️ **Refunds:** ~$0.02–$0.05 deducted from the refund amount (the ONLY cost on refunds — no TrustLock service fees)
• ⚠️ **Split payouts (dispute resolution):** ~$0.02–$0.05 total, split equally between buyer and vendor (~$0.01–$0.025 each)

**Why can't we show an exact gas amount upfront?** Gas fees fluctuate based on how busy the blockchain network is at the moment of your transaction — similar to how ride-sharing prices change during peak hours. The range shown ($0.02–$0.05) represents typical costs on the Polygon network, which is one of the most affordable blockchain networks available.

**Split Payouts (Dispute Resolution):** The escrow fee is halved from the original milestone rate and applied only to the vendor's share.`;

// ─── Invoice Mandatory Disclosure ──────────────────────────
export const INVOICE_MANDATORY_DISCLOSURE = `**Fee Transparency Notice**

The total amount charged includes the following fees added on top of the escrow principal:
• **Platform Fee** (${FEE_CATEGORIES.platform.range}): Service fee for TrustLock's payment infrastructure
• **Processor Fee** (${FEE_CATEGORIES.processor.rangeWithDirect}): Charged by the payment processor for your selected method
• **Escrow Service Fee** (${FEE_CATEGORIES.escrow.display}): Held with your escrow funds and only collected by TrustLock upon successful vendor release
• **Taxes/Tariffs**: Determined by buyer and vendor jurisdictions and item category

**The escrow principal (the agreed invoice amount) is preserved in full.** The vendor will receive 100% of this amount upon successful completion.

**What are Network Gas Fees?**
Gas fees are small costs required by the blockchain network to process and verify transactions on the ledger. Think of them like a postage stamp — a small fee that goes to the network validators (not TrustLock) who confirm your transaction is legitimate. Because network demand fluctuates, gas fees are variable and shown as an estimated range rather than a fixed price.

**When Gas Fees Apply:**
• **Checkout & Vendor Release:** $0.00 — TrustLock covers all internal gas from platform revenue. You pay nothing.
• **Refunds:** An estimated ~$0.02–$0.05 is deducted from the refund amount to cover the blockchain cost of returning your funds. This is the ONLY charge on refunds — no TrustLock service fees apply.
• **Split Payouts (Dispute Resolution):** An estimated ~$0.02–$0.05 total is split equally between buyer and vendor (~$0.01–$0.025 each).

Gas fees are NOT charged upfront because the exact cost is only known at the time of the blockchain transaction. The Polygon network used by TrustLock is one of the most affordable networks available, keeping these costs minimal.

**Internal Gas Fees:** TrustLock covers all blockchain gas fees for routing funds between internal wallets. These costs come from platform revenue and are never charged to buyers or vendors.`;

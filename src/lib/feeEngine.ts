// ─── Dual Azix Wallet Fee Engine ───────────────────────────
// Two distinct custodian wallets:
//   1. TRANSACTION WALLET — collects platform fees + taxes at checkout
//   2. ESCROW WALLET — receives escrow principal + pre-paid escrow fee;
//      trickles escrow fee to Transaction Wallet upon release

export const AZIX_WALLETS = {
  transaction: {
    label: "Azix Transaction Fee Wallet",
    publicKey: "0x7A3b...F92d",
    purpose: "Collects transactional fees (platform fee + escrow service fee via trickle-down)",
  },
  escrow: {
    label: "Azix Escrow Wallet",
    publicKey: "0x4E1c...A83b",
    purpose: "Collects escrow service fees upon release (net balance = 0 after trickle-down)",
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
  // No gasFee — gasless architecture (MATIC paid by TrustLock Relayer)
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
  escrowApplies: boolean;
  escrowVendorOnly: boolean;
}

const FEE_RULES: Record<TransactionType, FeeRule> = {
  checkout_fiat: {
    trustlockRate: 1.5,       // 1.5% platform fee
    escrowRate: 0.5,          // 0.5% escrow deposit (held until release)
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  checkout_crypto: {
    trustlockRate: 1.0,       // 1.0% platform fee
    escrowRate: 0.5,          // 0.5% escrow deposit
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  release_to_vendor: {
    trustlockRate: 0,
    escrowRate: 1.0,          // 1.0% escrow service fee deducted at release
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  refund_crypto: {
    trustlockRate: 0,
    escrowRate: 0,            // ALL fees waived on refund
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  refund_fiat: {
    trustlockRate: 0,
    escrowRate: 0,            // ALL fees waived on refund
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  split_payout: {
    trustlockRate: 0,
    escrowRate: 1.0,          // 1.0% escrow fee on VENDOR share only
    escrowApplies: true,
    escrowVendorOnly: true,
  },
  os_payment: {
    trustlockRate: 1.5,       // 1.5% platform fee, no escrow
    escrowRate: 0,
    escrowApplies: false,
    escrowVendorOnly: false,
  },
};
// GAS MODEL: Gasless (ERC-2771 Meta-Transactions)
// All on-chain gas is paid in MATIC by TrustLock's Relayer Wallet.
// No gas fees are charged to users or deducted from stablecoin amounts.

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
  escrowPrincipal: number;     // Amount vendor will receive (minus escrow service fee at release)
  escrowDeposit: number;       // 0.5% of principal — added on top at checkout
  platformFee: number;         // TrustLock platform fee — added on top
  processorFee: number;        // Processor fee — added on top
  taxAmount: number;           // Taxes/tariffs from invoice
  gasFee: number;              // $0.02 gas
  totalBuyerCharge: number;    // What the buyer actually pays
  escrowWalletReceives: number;  // principal + escrow deposit
  transactionWalletReceives: number; // platform fee + taxes
  // Legacy alias
  escrowFee: number;
}

export function calculateInvoiceFees(
  escrowPrincipal: number,
  processorId: ProcessorId,
  isCrypto: boolean,
  taxAmount: number = 0,
): InvoiceFeeCalculation {
  const platformRate = isCrypto ? 1.0 : 1.5;
  const processorRate = PROCESSORS[processorId]?.feeRate ?? 0;

  const escrowDeposit = round(escrowPrincipal * 0.005);    // 0.5% escrow deposit
  const platformFee = round(escrowPrincipal * (platformRate / 100));
  const processorFee = processorId === "direct" ? 0 : round(escrowPrincipal * (processorRate / 100));
  const tax = round(taxAmount);
  const gasFee = 0.02;

  const totalBuyerCharge = round(escrowPrincipal + escrowDeposit + platformFee + processorFee + tax + gasFee);

  return {
    escrowPrincipal,
    escrowDeposit,
    escrowFee: escrowDeposit, // legacy alias
    platformFee,
    processorFee,
    taxAmount: tax,
    gasFee,
    totalBuyerCharge,
    escrowWalletReceives: round(escrowPrincipal + escrowDeposit),
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
      return "1.5% total (1.0% platform + 0.5% escrow deposit) + $0.02 gas";
    case "checkout_fiat":
      return "2.0% – 4.9% total (1.5% platform + 0.5% escrow deposit + processor 1.0–2.9%) + $0.02 gas";
    case "refund_crypto":
      return "$0.02 gas only — ALL fees waived";
    case "refund_fiat":
      return "$0.05 gas only — ALL fees waived";
    case "release_to_vendor":
      return "1.0% escrow service fee + $0.02 gas";
    case "split_payout":
      return "1.0% escrow fee on vendor share only + $0.04 gas";
    case "os_payment":
      return "1.5% platform fee (no escrow)";
    default:
      return "1.5% – 4.9%";
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
    range: "1.0% – 2.9%",
    rangeWithDirect: "0% – 2.9%",
    wallet: "external" as const,
    description: "Paid to the payment processor (Stripe, Coinbase, or Transak) for payment processing.",
    when: "Charged at checkout. Direct crypto transfers bypass this fee entirely.",
  },
  escrowDeposit: {
    label: "Escrow Deposit Fee",
    shortLabel: "Escrow Deposit",
    rate: 0.5,
    display: "0.5%",
    wallet: "escrow" as WalletType,
    description: "Pre-paid deposit held with escrow principal until release. Moves with the vendor balance.",
    when: "0.5% charged upfront at checkout. Held in escrow until obligations are met.",
  },
  escrowService: {
    label: "Escrow Service Fee",
    shortLabel: "Escrow Fee",
    rate: 1.0,
    display: "1.0%",
    wallet: "transaction" as WalletType,
    description: "Collected upon fund release. Trickles from escrow wallet → transaction wallet, leaving escrow net balance = 0.",
    when: "1.0% deducted at release/settlement. On refund, this fee is NOT charged.",
  },
  gas: {
    label: "Network Gas Fee",
    shortLabel: "Gas",
    checkout: "$0.02",
    release: "$0.02",
    refundCrypto: "$0.02",
    refundFiat: "$0.05",
    split: "$0.04",
    description: "Polygon L2 gas fees paid to blockchain validators. Minimal and predictable.",
    when: "Applied per transaction type. Refunds and splits include gas only — all other fees waived.",
  },
} as const;

// ─── All-in fee ranges ─────────────────────────────────────
export const ALL_IN_RANGES = {
  cryptoDirect: { range: "1.5% + $0.02 gas", label: "Crypto-to-Crypto (Direct)" },
  cryptoViaProcessor: { range: "2.5% – 3.0% + $0.02 gas", label: "Crypto via Processor" },
  fiat: { range: "3.0% – 4.9% + $0.02 gas", label: "Fiat-to-Crypto" },
  refund: { range: "$0.02–$0.05 gas only — ALL fees waived", label: "Refund" },
  release: { range: "1.0% escrow service fee + $0.02 gas", label: "Release to Vendor" },
  osPayment: { range: "1.5%", label: "OS Platform Payment (no escrow)" },
} as const;

// ─── Formatted disclosure text ────────────────────────────
export const DUAL_WALLET_DISCLOSURE = `TrustLock uses two separate custodian wallets for maximum transparency:

• **Transaction Fee Wallet** (${AZIX_WALLETS.transaction.publicKey}): Collects transactional fees — platform fee (${FEE_CATEGORIES.platform.range}) at checkout, plus the 1.0% escrow service fee via trickle-down upon release.

• **Escrow Wallet** (${AZIX_WALLETS.escrow.publicKey}): Holds the vendor's principal + 0.5% escrow deposit. Upon release, the 1.0% escrow service fee trickles to the Transaction Wallet, leaving the escrow wallet at net balance = 0.

Processor fees (${FEE_CATEGORIES.processor.range}) are deducted by the processor before funds reach TrustLock.

Trickle-Down Rule: Escrow wallet forwards collected fees to transaction wallet. Escrow wallet net balance = 0 after forwarding.`;

export const FEE_DISCLOSURE_SHORT = `Platform: ${FEE_CATEGORIES.platform.range} · Processor: ${FEE_CATEGORIES.processor.range} · Escrow Deposit: ${FEE_CATEGORIES.escrowDeposit.display} at checkout · Escrow Service: ${FEE_CATEGORIES.escrowService.display} at release. Refunds: gas only ($0.02–$0.05) — ALL fees waived.`;

export const FEE_DISCLOSURE_FULL = `TrustLock Pay fee schedule per transaction type:

1. **Checkout (Fiat):** 1.5% platform + 0.5% escrow deposit + processor (1.0–2.9%) + $0.02 gas
2. **Checkout (Crypto):** 1.0% platform + 0.5% escrow deposit + $0.02 gas
3. **Release to Vendor:** 1.0% escrow service fee only + $0.02 gas
4. **Refund (Crypto/Fiat):** $0.02–$0.05 gas only — ALL fees waived
5. **Split Payout:** 1.0% escrow fee on VENDOR share only + $0.04 gas
6. **OS Payment:** 1.5% platform fee, no escrow

**Trickle-Down Rule:** Upon release, the escrow wallet forwards the 1.0% escrow service fee to the transaction fee wallet. The escrow wallet's net balance = 0 after forwarding.

**Wallet Architecture:**
• Transaction Fee Wallet (${AZIX_WALLETS.transaction.publicKey}): Collects transactional fees
• Escrow Wallet (${AZIX_WALLETS.escrow.publicKey}): Collects escrow service fees upon release

**Refund Policy:** On refund, the buyer receives 100% of locked funds. No escrow service fee is charged. Only gas ($0.02–$0.05) applies.`;

// ─── Invoice Mandatory Disclosure ──────────────────────────
export const INVOICE_MANDATORY_DISCLOSURE = `**Fee Transparency Notice**

The total amount charged includes the following fees added on top of the escrow principal:
• **Transaction Fee** (${FEE_CATEGORIES.platform.range}): Combined platform and processing fee
• **Escrow Deposit** (${FEE_CATEGORIES.escrowDeposit.display}): Held with escrow until release
• **Taxes/Tariffs**: Determined by buyer and vendor jurisdictions

The escrow principal is preserved in full. The vendor receives their principal minus the 1.0% escrow service fee at release.

**Refund Policy:** If a refund is processed, the buyer receives 100% of locked funds. No service fees — gas only ($0.02–$0.05).`;

// ─── Dual Azix Wallet Fee Engine ───────────────────────────
// Two distinct custodian wallets:
//   1. TRANSACTION FEE WALLET — receives ALL post-processor funds at checkout,
//      keeps TrustLock 0.5% transaction fee + taxes, then routes vendor principal
//      (with 1% escrow fee baked in) to Escrow Wallet.
//   2. ESCROW WALLET — holds vendor principal (which includes TrustLock's 1% escrow
//      service fee baked in). On release, 1% is extracted → trickled back to
//      Transaction Fee Wallet, remainder → vendor.

export const AZIX_WALLETS = {
  transaction: {
    label: "Azix Transaction Fee Wallet",
    publicKey: "0x7A3b...F92d",
    purpose: "Receives all post-processor funds. Keeps 0.5% transaction fee + taxes. Routes vendor principal to Escrow Wallet.",
  },
  escrow: {
    label: "Azix Escrow Wallet",
    publicKey: "0x4E1c...A83b",
    purpose: "Holds vendor principal (with 1% escrow fee baked in). On release, 1% trickles back to Transaction Fee Wallet.",
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
  trustlockFee: number;        // TrustLock's 0.5% upfront transaction fee (kept in Transaction Fee Wallet)
  processorFee: number;        // Processor's cut (deducted before funds reach TrustLock)
  escrowFee: number;           // 1% escrow service fee (baked into vendor principal, extracted at release)
  // No gasFee — gasless architecture (MATIC paid by TrustLock Relayer)
  totalFees: number;
  netAmount: number;
  // What the buyer actually pays at checkout (amount + transaction fee + processor fee + taxes)
  buyerTotalCharge: number;
  // Wallet routing
  transactionWalletReceives: number;  // TrustLock 0.5% + taxes (retained) + 1% trickle at release
  escrowWalletReceives: number;       // vendor principal (with 1% baked in)
  processorReceives: number;
  feeTrickleToTransactionWallet: number;
  // Metadata
  processorUsed: ProcessorId;
  feePercentage: number;
  trickleRule: "none" | "full_escrow_fee" | "vendor_share_only";
}

// ─── Fee Rules by Transaction Type ─────────────────────────
// CORRECTED FEE MODEL:
//   At checkout:
//     - Processor takes their cut first (before funds reach TrustLock)
//     - ALL remaining funds → Transaction Fee Wallet
//     - Transaction Fee Wallet keeps: 0.5% TrustLock transaction fee + taxes
//     - Transaction Fee Wallet routes to Escrow Wallet: vendor principal
//       (the principal already has TrustLock's 1% escrow fee baked into it)
//   At release:
//     - 1% extracted from vendor principal → trickled to Transaction Fee Wallet
//     - Remaining principal → vendor
//   Total TrustLock revenue: 0.5% (upfront) + 1.0% (release) = 1.5%
interface FeeRule {
  trustlockRate: number;   // % — TrustLock's upfront transaction fee (kept in Transaction Fee Wallet)
  escrowRate: number;      // % — escrow service fee (baked into principal, extracted at release)
  escrowApplies: boolean;
  escrowVendorOnly: boolean;
}

const FEE_RULES: Record<TransactionType, FeeRule> = {
  checkout_fiat: {
    trustlockRate: 0.5,       // 0.5% TrustLock transaction fee (upfront revenue)
    escrowRate: 0,            // No escrow fee at checkout — 1% is baked into principal, extracted at release
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  checkout_crypto: {
    trustlockRate: 0.5,       // 0.5% TrustLock transaction fee (same for crypto)
    escrowRate: 0,            // No escrow fee at checkout
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  release_to_vendor: {
    trustlockRate: 0,
    escrowRate: 1.0,          // 1.0% escrow service fee extracted from vendor principal at release
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
  const trustlockRate = FEE_RULES[transactionType]?.trustlockRate ?? 0.5;

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
// CORRECTED MODEL:
//   The invoice shows ONE combined "Transaction Fee" line to the buyer:
//     Transaction Fee = processor fee + TrustLock 0.5% transaction fee
//   The 1% escrow service fee is NOT shown separately — it's baked into the
//   vendor principal and only extracted at release.
//
//   Fund flow at checkout:
//     1. Processor takes their cut (before funds reach TrustLock)
//     2. ALL remaining funds → Transaction Fee Wallet
//     3. Transaction Fee Wallet keeps: 0.5% + taxes
//     4. Transaction Fee Wallet sends principal → Escrow Wallet
//        (principal has 1% baked in — extracted at release)
export interface InvoiceFeeCalculation {
  escrowPrincipal: number;     // Vendor principal (includes 1% escrow fee baked in)
  trustlockFee: number;        // 0.5% TrustLock upfront transaction fee
  processorFee: number;        // Processor fee
  taxAmount: number;           // Taxes/tariffs from invoice
  totalBuyerCharge: number;    // What the buyer actually pays
  escrowWalletReceives: number;  // principal only (routed from Transaction Fee Wallet)
  transactionWalletReceives: number; // 0.5% TrustLock fee + taxes (retained)
  // Combined "Transaction Fee" shown on invoice (processor + TrustLock 0.5%)
  combinedTransactionFee: number;
  // Legacy aliases
  platformFee: number;         // alias for trustlockFee
  escrowFee: number;           // alias for trustlockFee (was wrongly called escrow deposit)
  escrowDeposit: number;       // DEPRECATED — always 0 (there is no escrow deposit)
}

export function calculateInvoiceFees(
  escrowPrincipal: number,
  processorId: ProcessorId,
  isCrypto: boolean,
  taxAmount: number = 0,
): InvoiceFeeCalculation {
  const processorRate = PROCESSORS[processorId]?.feeRate ?? 0;

  // TrustLock's upfront transaction fee: always 0.5% (same for fiat and crypto)
  const trustlockFee = round(escrowPrincipal * 0.005);
  const processorFee = processorId === "direct" ? 0 : round(escrowPrincipal * (processorRate / 100));
  const tax = round(taxAmount);

  // Combined "Transaction Fee" shown on invoice = processor + TrustLock 0.5%
  const combinedTransactionFee = round(trustlockFee + processorFee);

  // No gas fee — gasless (MATIC paid by TrustLock Relayer)
  const totalBuyerCharge = round(escrowPrincipal + combinedTransactionFee + tax);

  return {
    escrowPrincipal,
    trustlockFee,
    platformFee: trustlockFee,       // legacy alias
    escrowFee: trustlockFee,         // legacy alias (renamed from escrow deposit)
    escrowDeposit: 0,                // DEPRECATED — no escrow deposit exists
    processorFee,
    taxAmount: tax,
    combinedTransactionFee,
    totalBuyerCharge,
    // Escrow Wallet receives ONLY the principal (routed from Transaction Fee Wallet)
    escrowWalletReceives: escrowPrincipal,
    // Transaction Fee Wallet keeps 0.5% TrustLock fee + taxes
    transactionWalletReceives: round(trustlockFee + tax),
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

  // No gas fee — gasless architecture
  const totalFees = round(trustlockFee + processorFee + escrowFee);
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
    totalFees,
    netAmount,
    buyerTotalCharge,
    // At checkout: Transaction Fee Wallet receives ALL, keeps 0.5% + taxes
    // At release: Transaction Fee Wallet receives 1% trickle from Escrow Wallet
    transactionWalletReceives: round(trustlockFee + feeTrickleToTransactionWallet),
    // At checkout: Escrow Wallet receives principal (routed from Transaction Fee Wallet)
    escrowWalletReceives: isCheckout ? amount : 0,
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
      return "0.5% TrustLock transaction fee (direct crypto)";
    case "checkout_fiat":
      return "0.5% TrustLock fee + processor (1.0–2.9%) — shown as combined 'Transaction Fee'";
    case "refund_crypto":
    case "refund_fiat":
      return "$0 — ALL fees waived (gasless)";
    case "release_to_vendor":
      return "1.0% escrow service fee (extracted from vendor principal)";
    case "split_payout":
      return "1.0% escrow fee on vendor share only";
    case "os_payment":
      return "1.5% platform fee (no escrow)";
    default:
      return "0.5% – 3.4%";
  }
}

// ─── Canonical Fee Display Constants ───────────────────────
export const FEE_CATEGORIES = {
  transactionFee: {
    label: "TrustLock Transaction Fee",
    shortLabel: "Transaction Fee",
    rate: 0.5,
    display: "0.5%",
    wallet: "transaction" as WalletType,
    description: "TrustLock's upfront processing fee. Combined with processor fee on the invoice as a single 'Transaction Fee' line item.",
    when: "Charged at checkout. Stays in the Transaction Fee Wallet as TrustLock revenue.",
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
    range: "0% – 2.9%",
    rangeWithDirect: "0% – 2.9%",
    wallet: "external" as const,
    description: "Paid to the payment processor (Stripe, Coinbase, or Transak). Direct crypto transfers bypass this fee entirely.",
    when: "Deducted by the processor before funds reach TrustLock.",
  },
  escrowService: {
    label: "Escrow Service Fee",
    shortLabel: "Escrow Fee",
    rate: 1.0,
    display: "1.0%",
    wallet: "transaction" as WalletType,
    description: "Baked into the vendor principal. Extracted at release and trickled from Escrow Wallet → Transaction Fee Wallet.",
    when: "1.0% extracted from vendor principal at release. On refund, NOT charged. On split, applied to vendor share only.",
  },
  gasModel: {
    label: "Gas Model",
    shortLabel: "Gasless",
    model: "ERC-2771 Meta-Transactions",
    description: "All on-chain gas is paid in MATIC by TrustLock's Relayer Wallet. Users never see or pay gas fees.",
    userCost: "$0",
  },
  // DEPRECATED — kept for backward compatibility
  platform: {
    label: "TrustLock Transaction Fee",
    shortLabel: "Transaction Fee",
    crypto: { rate: 0.5, display: "0.5%" },
    fiat: { rate: 0.5, display: "0.5%" },
    range: "0.5%",
    wallet: "transaction" as WalletType,
    description: "TrustLock's upfront processing fee.",
    when: "Charged at checkout.",
  },
  // DEPRECATED — there is no escrow deposit
  escrowDeposit: {
    label: "DEPRECATED — No Escrow Deposit",
    shortLabel: "N/A",
    rate: 0,
    display: "0%",
    wallet: "escrow" as WalletType,
    description: "DEPRECATED — The 0.5% is TrustLock's transaction fee, NOT an escrow deposit.",
    when: "N/A",
  },
} as const;

// ─── All-in fee ranges ─────────────────────────────────────
export const ALL_IN_RANGES = {
  cryptoDirect: { range: "0.5%", label: "Crypto-to-Crypto (Direct)" },
  cryptoViaProcessor: { range: "2.0% – 2.5%", label: "Crypto via Processor" },
  fiat: { range: "2.0% – 3.4%", label: "Fiat-to-Crypto" },
  refund: { range: "$0 — ALL fees waived (gasless)", label: "Refund" },
  release: { range: "1.0% escrow service fee", label: "Release to Vendor" },
  osPayment: { range: "1.5%", label: "OS Platform Payment (no escrow)" },
} as const;

// ─── Formatted disclosure text ────────────────────────────
export const DUAL_WALLET_DISCLOSURE = `TrustLock uses two separate custodian wallets for maximum transparency:

• **Transaction Fee Wallet** (${AZIX_WALLETS.transaction.publicKey}): Receives ALL post-processor funds. Keeps TrustLock's 0.5% transaction fee + jurisdiction taxes. Routes vendor principal to Escrow Wallet.

• **Escrow Wallet** (${AZIX_WALLETS.escrow.publicKey}): Holds the vendor's principal (which includes TrustLock's 1.0% escrow service fee baked in). Upon release, the 1.0% is extracted and trickled back to the Transaction Fee Wallet. Vendor receives principal minus 1%.

Processor fees (${FEE_CATEGORIES.processor.range}) are deducted by the processor before funds reach TrustLock.

Total TrustLock Revenue: 0.5% (upfront) + 1.0% (at release) = 1.5% per transaction.`;

export const FEE_DISCLOSURE_SHORT = `Transaction Fee: 0.5% TrustLock + processor (0–2.9%) — shown as one line on invoice. Escrow Service: 1.0% extracted from vendor principal at release. Refunds: $0 — ALL fees waived. Gas: Gasless (paid by TrustLock).`;

export const FEE_DISCLOSURE_FULL = `TrustLock Pay fee schedule per transaction type:

1. **Checkout (Fiat/Crypto):** 0.5% TrustLock transaction fee + processor fee (0–2.9%) — shown as combined "Transaction Fee" on invoice
2. **Release to Vendor:** 1.0% escrow service fee extracted from vendor principal
3. **Refund (Crypto/Fiat):** $0 — ALL fees waived
4. **Split Payout:** 1.0% escrow fee on VENDOR share only
5. **OS Payment:** 1.5% platform fee, no escrow

**Fund Flow at Checkout:**
  Processor takes cut → remaining → Transaction Fee Wallet → keeps 0.5% + taxes → routes principal → Escrow Wallet

**Fund Flow at Release:**
  Escrow Wallet → extracts 1% → trickles to Transaction Fee Wallet → sends principal-1% → vendor

**Gas Model:** Gasless (ERC-2771 Meta-Transactions). All on-chain gas is paid in MATIC by TrustLock's Relayer Wallet.

**Total TrustLock Revenue:** 0.5% (upfront) + 1.0% (release) = 1.5% per transaction.

**Wallet Architecture:**
• Transaction Fee Wallet (${AZIX_WALLETS.transaction.publicKey}): Receives all funds, keeps fees + taxes
• Escrow Wallet (${AZIX_WALLETS.escrow.publicKey}): Holds vendor principal until release`;

// ─── Invoice Mandatory Disclosure ──────────────────────────
export const INVOICE_MANDATORY_DISCLOSURE = `**Fee Transparency Notice**

The total amount charged includes the following fees added on top of the escrow principal:
• **Transaction Fee** (${FEE_CATEGORIES.transactionFee.display} TrustLock + processor): Combined processing fee
• **Taxes/Tariffs**: Determined by buyer and vendor jurisdictions

The vendor principal is held in escrow. Upon release, a 1.0% escrow service fee is extracted from the vendor's principal.

**Refund Policy:** If a refund is processed, the buyer receives 100% of locked funds. $0 fees — gasless.`;

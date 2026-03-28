// ─── Dual Azix Wallet Fee Engine ───────────────────────────
// Two distinct custodian wallets:
//   1. TRANSACTION WALLET — collects checkout/payment processing fees
//   2. ESCROW WALLET — collects escrow service fees (conditional)

export const AZIX_WALLETS = {
  transaction: {
    label: "Azix Transaction Wallet",
    publicKey: "0x7A3b...F92d",
    purpose: "Collects transactional fees from checkout payments",
  },
  escrow: {
    label: "Azix Escrow Wallet",
    publicKey: "0x4E1c...A83b",
    purpose: "Collects escrow service fees upon fund release",
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
  regions: string[];        // primary operating regions
  onRamp: boolean;          // fiat → crypto
  offRamp: boolean;         // crypto → fiat
  supportedMethods: PaymentMethod[];  // what payment methods this processor handles
}

export const PROCESSORS: Record<ProcessorId, ProcessorConfig> = {
  stripe: {
    name: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    regions: ["US", "EU", "UK", "CA", "AU", "JP", "SG", "HK", "NZ", "global"],
    onRamp: true,
    offRamp: false,
    supportedMethods: ["card", "bank_transfer"],
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
  },
};

// ─── Fee Calculation Result ────────────────────────────────
export interface FeeBreakdown {
  transactionType: TransactionType;
  amount: number;
  // Fees
  trustlockFee: number;        // TrustLock's platform cut
  processorFee: number;        // Crypto processor's cut (Coinbase/YellowCard/Transak/Stripe)
  escrowFee: number;           // Escrow service fee (conditional)
  gasFee: number;              // Polygon L2 gas estimate
  totalFees: number;
  netAmount: number;
  // Wallet routing
  transactionWalletReceives: number;  // Platform fee + trickled escrow fee → AZIX_WALLETS.transaction
  escrowWalletReceives: number;       // Net zero — escrow forwards fees to transaction wallet
  processorReceives: number;          // Goes to external processor
  feeTrickleToTransactionWallet: number; // Escrow fee forwarded to transaction wallet
  // Metadata
  processorUsed: ProcessorId;
  feePercentage: number;       // Total fee as % of amount
  trickleRule: "none" | "full_escrow_fee" | "vendor_share_only";
}

// ─── Fee Rules by Transaction Type ─────────────────────────
interface FeeRule {
  trustlockRate: number;   // %
  escrowRate: number;      // %
  gasEstimate: number;     // Fixed USD
  escrowApplies: boolean;
  escrowVendorOnly: boolean;  // For splits: only charge vendor side
}

const FEE_RULES: Record<TransactionType, FeeRule> = {
  checkout_fiat: {
    trustlockRate: 1.5,
    escrowRate: 0.5,
    gasEstimate: 0.02,
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  checkout_crypto: {
    trustlockRate: 1.0,
    escrowRate: 0.5,
    gasEstimate: 0.02,
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  release_to_vendor: {
    trustlockRate: 0,
    escrowRate: 1.0,
    gasEstimate: 0.02,
    escrowApplies: true,
    escrowVendorOnly: false,
  },
  refund_crypto: {
    trustlockRate: 0,
    escrowRate: 0,         // No escrow fee on refunds
    gasEstimate: 0.05,
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  refund_fiat: {
    trustlockRate: 0,
    escrowRate: 0,         // No escrow fee on refunds
    gasEstimate: 0.02,
    escrowApplies: false,
    escrowVendorOnly: false,
  },
  split_payout: {
    trustlockRate: 0,
    escrowRate: 1.0,       // Escrow fee applies ONLY to vendor's share
    gasEstimate: 0.04,     // 2x gas for dual disbursement
    escrowApplies: true,
    escrowVendorOnly: true,
  },
  os_payment: {
    trustlockRate: 1.5,
    escrowRate: 0,
    gasEstimate: 0.02,
    escrowApplies: false,
    escrowVendorOnly: false,
  },
};

// ─── Processor Selection Logic ─────────────────────────────
// Cost-optimized: finds all eligible processors for a region+method,
// ranks by combined fee (TrustLock + processor), picks cheapest.

export interface ProcessorMatch {
  id: ProcessorId;
  config: ProcessorConfig;
  combinedRate: number; // trustlock rate + processor rate
}

/**
 * Returns all processors eligible for a given country and payment method,
 * sorted by fee rate ascending (cheapest first).
 */
export function getEligibleProcessors(
  country: string,
  paymentMethod: PaymentMethod = "card",
  transactionType: TransactionType = "checkout_fiat"
): ProcessorMatch[] {
  const trustlockRate = FEE_RULES[transactionType]?.trustlockRate ?? 1.5;

  const eligible: ProcessorMatch[] = [];

  for (const [id, config] of Object.entries(PROCESSORS) as [ProcessorId, ProcessorConfig][]) {
    // Skip direct for non-crypto methods
    if (id === "direct" && paymentMethod !== "crypto") continue;
    // Skip non-crypto processors for crypto method
    if (paymentMethod === "crypto" && !config.supportsCrypto) continue;
    // Check region match
    const regionMatch = config.regions.includes(country) || config.regions.includes("global");
    if (!regionMatch) continue;
    // Check payment method support
    if (!config.supportedMethods.includes(paymentMethod)) continue;

    eligible.push({
      id: id as ProcessorId,
      config,
      combinedRate: trustlockRate + config.feeRate,
    });
  }

  // Sort by combined rate ascending (cheapest first)
  eligible.sort((a, b) => a.combinedRate - b.combinedRate);

  return eligible;
}

/**
 * Selects the cheapest eligible processor for a country and payment method.
 * Falls back to Stripe for unmatched regions.
 */
export function selectProcessor(
  country: string,
  isCrypto: boolean,
  processorHint?: ProcessorId,
  paymentMethod?: PaymentMethod,
  transactionType?: TransactionType
): ProcessorId {
  // If caller specifies a processor, use it
  if (processorHint && PROCESSORS[processorHint]) return processorHint;

  // Direct crypto-to-crypto bypasses all processors
  if (isCrypto) return "direct";

  const method = paymentMethod ?? "card";
  const txType = transactionType ?? "checkout_fiat";
  const eligible = getEligibleProcessors(country, method, txType);

  if (eligible.length > 0) {
    return eligible[0].id;
  }

  // Ultimate fallback
  return "stripe";
}

// ─── Main Fee Calculator ───────────────────────────────────
export function calculateFeesV2(
  amount: number,
  transactionType: TransactionType,
  processorId: ProcessorId,
  options?: {
    splitVendorShare?: number;  // Vendor's share in a split (0-1)
  }
): FeeBreakdown {
  const rule = FEE_RULES[transactionType];
  const processor = PROCESSORS[processorId];

  // TrustLock platform fee → transaction wallet
  const trustlockFee = amount * (rule.trustlockRate / 100);

  // Processor fee (only applies for fiat conversions, not direct crypto)
  const processorFee = processorId === "direct" ? 0 : amount * (processor.feeRate / 100);

  // Escrow fee → escrow wallet (conditional)
  let escrowFee = 0;
  if (rule.escrowApplies) {
    if (rule.escrowVendorOnly && options?.splitVendorShare !== undefined) {
      // Split payout: escrow fee only on vendor's fractional share
      const vendorAmount = amount * options.splitVendorShare;
      escrowFee = vendorAmount * (rule.escrowRate / 100);
    } else {
      escrowFee = amount * (rule.escrowRate / 100);
    }
  }

  const gasFee = rule.gasEstimate;
  const totalFees = trustlockFee + processorFee + escrowFee + gasFee;
  const netAmount = amount - totalFees;

  // Trickle-down: escrow fees are forwarded to the transaction wallet
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
    transactionWalletReceives: trustlockFee + feeTrickleToTransactionWallet,
    escrowWalletReceives: 0, // Escrow wallet forwards all fees — net zero
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
      return "1.5% – 2.5% (platform + escrow deposit)";
    case "checkout_fiat":
      return "3.0% – 5.4% (platform + processor + escrow deposit)";
    case "refund_crypto":
      return "Gas only (~$0.05) — all fees waived";
    case "refund_fiat":
      return "Gas only (~$0.02) — all fees waived";
    case "release_to_vendor":
      return "1.0% escrow service fee";
    case "split_payout":
      return "1.0% escrow fee (vendor side only)";
    case "os_payment":
      return "1.0% – 1.5% platform fee (no escrow)";
    default:
      return "2.5% – 5.9%";
  }
}

// ─── Canonical Fee Display Constants ───────────────────────
// Single source of truth for ALL fee labels, ranges, and disclosures
// across landing pages, checkout widgets, OS Pay, documents, and PDFs.

export const FEE_CATEGORIES = {
  platform: {
    label: "TrustLock Platform Fee",
    shortLabel: "Platform Fee",
    crypto: { rate: 1.0, display: "1.0%" },
    fiat: { rate: 1.5, display: "1.5%" },
    range: "1.0% – 1.5%",
    wallet: "transaction" as WalletType,
    description: "Covers payment processing, currency conversion coordination, and network infrastructure.",
    when: "Charged at checkout on every transaction.",
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
    description: "Paid to the payment processor (Stripe, Coinbase, or Transak) for fiat-to-crypto conversion.",
    when: "Charged at checkout. Direct crypto-to-crypto transfers bypass this fee entirely.",
  },
  escrow: {
    label: "Escrow Service Fee",
    shortLabel: "Escrow Fee",
    atCheckout: { rate: 0.5, display: "0.5%" },
    atRelease: { rate: 1.0, display: "1.0%" },
    range: "0.5% – 1.0%",
    totalLifecycle: "1.5%",
    wallet: "escrow" as WalletType,
    description: "Covers smart contract escrow custody, milestone tracking, and secure fund release.",
    when: "0.5% charged at checkout deposit. 1.0% charged upon fund release to vendor. Fully waived on refunds.",
  },
  gas: {
    label: "Network Gas Fee",
    shortLabel: "Gas",
    estimate: "$0.02 – $0.05",
    description: "Polygon L2 blockchain transaction cost. Minimal and fixed.",
    when: "Charged per on-chain transaction.",
  },
} as const;

// ─── All-in fee ranges (checkout + release combined) ───────
export const ALL_IN_RANGES = {
  cryptoDirect: { range: "1.5% – 2.5%", label: "Crypto-to-Crypto (Direct)" },
  cryptoViaProcessor: { range: "2.5% – 4.0%", label: "Crypto via Processor" },
  fiat: { range: "3.0% – 5.9%", label: "Fiat-to-Crypto" },
  refund: { range: "Gas only (~$0.02–$0.05)", label: "Refund" },
  osPayment: { range: "1.0% – 1.5%", label: "OS Platform Payment (no escrow)" },
} as const;

// ─── Formatted disclosure text ────────────────────────────
export const DUAL_WALLET_DISCLOSURE = `TrustLock uses two separate custodian wallets for maximum transparency:

• **Transaction Wallet** (${AZIX_WALLETS.transaction.publicKey}): Collects platform fees (${FEE_CATEGORIES.platform.range}) at checkout, plus all OS service payments (plan upgrades, AI packs). These are unconditional fees that are never refunded.

• **Escrow Wallet** (${AZIX_WALLETS.escrow.publicKey}): Collects escrow service fees ONLY when funds are released to vendors (${FEE_CATEGORIES.escrow.atRelease.display} at release, ${FEE_CATEGORIES.escrow.atCheckout.display} at deposit). No escrow fees on refunds. Split payout escrow fees apply only to the vendor's share.

Processor fees (${FEE_CATEGORIES.processor.range}) are paid directly to the external payment processor and vary by provider.

All-in fee ranges: Crypto direct (${ALL_IN_RANGES.cryptoDirect.range}), Fiat (${ALL_IN_RANGES.fiat.range}), Refunds (${ALL_IN_RANGES.refund.range}).`;

export const FEE_DISCLOSURE_SHORT = `Platform fee: ${FEE_CATEGORIES.platform.range} · Processor fee: ${FEE_CATEGORIES.processor.range} · Escrow fee: ${FEE_CATEGORIES.escrow.range} · Gas: ${FEE_CATEGORIES.gas.estimate}. All-in: ${ALL_IN_RANGES.cryptoDirect.range} (crypto) to ${ALL_IN_RANGES.fiat.range} (fiat). No escrow fees on refunds.`;

export const FEE_DISCLOSURE_FULL = `TrustLock Pay fees consist of three components:

1. **Platform Fee** (${FEE_CATEGORIES.platform.range}): ${FEE_CATEGORIES.platform.description} ${FEE_CATEGORIES.platform.when}

2. **Processor Fee** (${FEE_CATEGORIES.processor.range}): ${FEE_CATEGORIES.processor.description} ${FEE_CATEGORIES.processor.when}

3. **Escrow Service Fee** (${FEE_CATEGORIES.escrow.range}): ${FEE_CATEGORIES.escrow.description} ${FEE_CATEGORIES.escrow.when}

4. **Gas Fee** (${FEE_CATEGORIES.gas.estimate}): ${FEE_CATEGORIES.gas.description}

All fees are transparently displayed before you confirm any transaction.`;

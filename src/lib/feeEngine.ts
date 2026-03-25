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
export type ProcessorId = "stripe" | "coinbase" | "yellow_card" | "transak" | "direct";

export interface ProcessorConfig {
  name: string;
  feeRate: number;          // % fee the processor charges
  supportsFiat: boolean;
  supportsCrypto: boolean;
  regions: string[];        // primary operating regions
  onRamp: boolean;          // fiat → crypto
  offRamp: boolean;         // crypto → fiat
}

export const PROCESSORS: Record<ProcessorId, ProcessorConfig> = {
  stripe: {
    name: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    regions: ["US", "EU", "UK", "CA", "AU", "global"],
    onRamp: true,
    offRamp: false,
  },
  coinbase: {
    name: "Coinbase",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    regions: ["US", "EU", "UK", "Nigeria", "Kenya", "Ghana", "South Africa", "global"],
    onRamp: true,
    offRamp: true,
  },
  yellow_card: {
    name: "Yellow Card",
    feeRate: 2.0,
    supportsFiat: true,
    supportsCrypto: true,
    regions: [
      "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
      "Senegal", "Mali", "Cote d'Ivoire", "Burkina Faso", "Benin", "Togo",
      "DR Congo", "Uganda", "Tanzania", "Rwanda", "Mozambique", "Malawi",
      "Niger", "Chad", "Guinea", "Madagascar", "Botswana", "Gambia", "Zambia",
    ],
    onRamp: true,
    offRamp: true,
  },
  transak: {
    name: "Transak",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    regions: [
      "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt",
      "US", "EU", "UK", "India", "global",
    ],
    onRamp: true,
    offRamp: true,
  },
  direct: {
    name: "Direct (On-chain)",
    feeRate: 0,
    supportsFiat: false,
    supportsCrypto: true,
    regions: ["global"],
    onRamp: false,
    offRamp: false,
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
  transactionWalletReceives: number;  // Goes to AZIX_WALLETS.transaction
  escrowWalletReceives: number;       // Goes to AZIX_WALLETS.escrow
  processorReceives: number;          // Goes to external processor
  // Metadata
  processorUsed: ProcessorId;
  feePercentage: number;       // Total fee as % of amount
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
// Selects best processor based on region and transaction type
export function selectProcessor(
  country: string,
  isCrypto: boolean,
  processorHint?: ProcessorId
): ProcessorId {
  // If caller specifies a processor, use it
  if (processorHint && PROCESSORS[processorHint]) return processorHint;

  // Direct crypto-to-crypto bypasses all processors
  if (isCrypto) return "direct";

  // African local payments: prefer Yellow Card, fallback to Coinbase
  const africanCountries = PROCESSORS.yellow_card.regions;
  if (africanCountries.includes(country)) {
    return "yellow_card";
  }

  // Coinbase for supported regions with crypto on/off ramp
  if (PROCESSORS.coinbase.regions.includes(country)) {
    return "coinbase";
  }

  // Diaspora / global: Stripe for pure fiat, Transak for fiat-to-crypto
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

  return {
    transactionType,
    amount,
    trustlockFee,
    processorFee,
    escrowFee,
    gasFee,
    totalFees,
    netAmount,
    transactionWalletReceives: trustlockFee,
    escrowWalletReceives: escrowFee,
    processorReceives: processorFee,
    processorUsed: processorId,
    feePercentage: amount > 0 ? (totalFees / amount) * 100 : 0,
  };
}

// ─── Convenience: human-readable fee range ─────────────────
export function getFeeRangeForType(type: TransactionType): string {
  switch (type) {
    case "checkout_crypto":
    case "refund_crypto":
      return "1.5% – 2%";
    case "checkout_fiat":
    case "refund_fiat":
      return "3% – 5%";
    case "release_to_vendor":
      return "1% – 1.5%";
    case "split_payout":
      return "1% – 2% (vendor side only)";
    case "os_payment":
      return "1.5%";
    default:
      return "2% – 4%";
  }
}

// ─── Fee disclosure text with dual wallet explanation ──────
export const DUAL_WALLET_DISCLOSURE = `TrustLock uses two separate custodian wallets for maximum transparency:

• **Transaction Wallet** (${AZIX_WALLETS.transaction.publicKey}): Collects platform processing fees at checkout. These fees cover payment processing, crypto conversion, and network costs.

• **Escrow Wallet** (${AZIX_WALLETS.escrow.publicKey}): Collects escrow service fees ONLY when funds are released to vendors. No escrow fees are charged on refunds. For split payouts after dispute resolution, escrow fees apply only to the vendor's share.

Fee ranges: Crypto-to-crypto (1.5–2%), Fiat-to-crypto (3–5%), Escrow release (1–1.5%), Refunds (gas fees only, ~$0.02–$0.05).`;

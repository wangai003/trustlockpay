// Payment provider registry — 4 active processors: Stripe, Coinbase, Transak, Thirdweb Pay + Direct
// Covers international and local payment methods with dynamic cost-optimized routing

import { type ProcessorId, getEligibleProcessors, type PaymentMethod } from "./feeEngine";
import {
  COUNTRY_BANKS,
  MOBILE_MONEY_OPERATORS,
  COUNTRY_BANK_FIELDS,
  COUNTRY_PROCESSOR_MAP,
  getBankFieldsForCountry,
  getPaymentSuggestions,
  getMobileMoneyForCountry,
  getBanksForCountry,
  type CountryProcessorInfo,
  type ProcessorTier,
  type PaymentSuggestion,
} from "./countryPaymentData";

export type PaymentCategory = "card" | "bank_account" | "mobile_money" | "crypto_wallet" | "digital_wallet";

export interface ProviderField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "number" | "select";
  options?: string[];
  required: boolean;
}

export interface PaymentProvider {
  id: string;
  name: string;
  category: PaymentCategory;
  mode: "diaspora" | "local" | "both";
  countries?: string[];
  processor: ProcessorId;
  fields: ProviderField[];
  icon?: string;
  fallbackNote?: string; // shown for Tier 3 countries
}

// Re-export from countryPaymentData for consumers
export { getPaymentSuggestions, getMobileMoneyForCountry, getBanksForCountry, COUNTRY_PROCESSOR_MAP };
export type { CountryProcessorInfo, ProcessorTier, PaymentSuggestion };

// Re-export the V2 engine for new code
export { calculateFeesV2, getFeeRangeForType, AZIX_WALLETS, DUAL_WALLET_DISCLOSURE, FEE_CATEGORIES, ALL_IN_RANGES, FEE_DISCLOSURE_SHORT, FEE_DISCLOSURE_FULL } from "./feeEngine";
export type { FeeBreakdown, TransactionType } from "./feeEngine";

// Legacy calculateFees — keeps the old signature for existing consumers
export function calculateFees(amount: number, type: string): { trustlock: number; processor: number; escrow: number; gas: number; total: number; net: number } {
  const rates: Record<string, { tl: number; proc: number; esc: number; gas: number }> = {
    crypto_to_crypto: { tl: 1.0, proc: 0, esc: 0.5, gas: 0.02 },
    fiat_to_crypto: { tl: 1.5, proc: 1.5, esc: 0.5, gas: 0.02 },
    crypto_to_fiat: { tl: 1.5, proc: 1.5, esc: 0.5, gas: 0.02 },
    escrow_hold: { tl: 0, proc: 0, esc: 1.0, gas: 0 },
    refund_crypto: { tl: 0, proc: 0, esc: 0, gas: 0.05 },
    refund_fiat: { tl: 0, proc: 1.0, esc: 0, gas: 0.02 },
  };
  const r = rates[type] || rates.fiat_to_crypto;
  const trustlock = amount * (r.tl / 100);
  const processor = amount * (r.proc / 100);
  const escrow = amount * (r.esc / 100);
  const gas = r.gas;
  const total = trustlock + processor + escrow + gas;
  return { trustlock, processor, escrow, gas, total, net: amount - total };
}

// Legacy getFeeRange
export function getFeeRange(): string {
  return "2.5% – 5.9%";
}

// ─── Dynamic Processor Selection Helper ───────────────────
function cheapestProcessor(country: string, method: PaymentMethod): ProcessorId {
  const eligible = getEligibleProcessors(country, method, "checkout_fiat");
  return eligible.length > 0 ? eligible[0].id : "stripe";
}

// Determines processor for a country — uses aligned processors for Tier 3
function resolveProcessor(country: string, method: PaymentMethod): ProcessorId {
  const info = COUNTRY_PROCESSOR_MAP[country];
  if (!info || info.tier === "tier3") {
    // Tier 3: crypto goes direct, everything else uses transak global fallback
    if (method === "crypto") return "direct";
    return "transak"; // Transak has "global" in its regions
  }
  return cheapestProcessor(country, method);
}

// ─── DIASPORA PROVIDERS ────────────────────────────────────
const DIASPORA_PROVIDERS: PaymentProvider[] = [
  {
    id: "visa_mc",
    name: "Visa / Mastercard",
    category: "card",
    mode: "diaspora",
    processor: "stripe",
    fields: [
      { key: "card_number", label: "Card Number", placeholder: "4242 4242 4242 4242", type: "text", required: true },
      { key: "expiry", label: "Expiry Date", placeholder: "MM/YY", type: "text", required: true },
      { key: "cvv", label: "CVV", placeholder: "123", type: "text", required: true },
      { key: "cardholder", label: "Cardholder Name", placeholder: "John Doe", type: "text", required: true },
    ],
  },
  {
    id: "paypal",
    name: "PayPal",
    category: "digital_wallet",
    mode: "diaspora",
    processor: "stripe",
    fields: [
      { key: "email", label: "PayPal Email", placeholder: "your@email.com", type: "text", required: true },
    ],
  },
  { id: "apple_pay", name: "Apple Pay", category: "digital_wallet", mode: "diaspora", processor: "stripe", fields: [] },
  { id: "google_pay", name: "Google Pay", category: "digital_wallet", mode: "diaspora", processor: "stripe", fields: [] },
  {
    id: "coinbase_pay",
    name: "Coinbase Pay",
    category: "digital_wallet",
    mode: "diaspora",
    processor: "coinbase",
    fields: [
      { key: "email", label: "Coinbase Email", placeholder: "your@coinbase.com", type: "text", required: true },
    ],
  },
  {
    id: "crypto_wallet_diaspora",
    name: "Other Wallet (USDC)",
    category: "crypto_wallet",
    mode: "diaspora",
    processor: "direct",
    fields: [
      { key: "wallet_address", label: "Wallet Address (Polygon)", placeholder: "0x...", type: "text", required: true },
      { key: "network", label: "Network", placeholder: "Polygon", type: "select", options: ["Polygon", "Ethereum", "Base"], required: true },
    ],
  },
  {
    id: "coinbase_wallet",
    name: "Coinbase Wallet",
    category: "crypto_wallet",
    mode: "diaspora",
    processor: "coinbase",
    fields: [
      { key: "wallet_address", label: "Coinbase Wallet Address", placeholder: "0x...", type: "text", required: true },
    ],
  },
  {
    id: "bank_wire_diaspora",
    name: "Bank Account (ACH/Wire)",
    category: "bank_account",
    mode: "diaspora",
    processor: "stripe",
    fields: [
      { key: "account_holder", label: "Account Holder Name", placeholder: "John Doe", type: "text", required: true },
      { key: "routing_number", label: "Routing Number", placeholder: "021000021", type: "text", required: true },
      { key: "account_number", label: "Account Number", placeholder: "1234567890", type: "text", required: true },
    ],
  },
  {
    id: "thirdweb_pay",
    name: "Thirdweb Pay",
    category: "crypto_wallet",
    mode: "diaspora",
    processor: "thirdweb",
    fields: [
      { key: "wallet_address", label: "Receiving Wallet (Polygon)", placeholder: "0x... (optional — escrow wallet used by default)", type: "text", required: false },
    ],
  },
];

// ─── BUILD LOCAL PROVIDERS FROM COUNTRY DATA ───────────────

function buildAllBankProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  for (const [country, banks] of Object.entries(COUNTRY_BANKS)) {
    const processor = resolveProcessor(country, "bank_transfer");
    const fields = getBankFieldsForCountry(country);
    const info = COUNTRY_PROCESSOR_MAP[country];
    for (const bank of banks) {
      providers.push({
        id: `bank_${country.toLowerCase().replace(/\s/g, "_")}_${bank.toLowerCase().replace(/\s/g, "_")}`,
        name: bank,
        category: "bank_account",
        mode: "local",
        countries: [country],
        processor,
        fields,
        fallbackNote: info?.fallbackNote,
      });
    }
  }
  return providers;
}

function buildAllMobileMoneyProviders(): PaymentProvider[] {
  return MOBILE_MONEY_OPERATORS.map((op) => {
    const primaryCountry = op.countries[0] || "Nigeria";
    const processor = resolveProcessor(primaryCountry, "mobile_money");
    const info = COUNTRY_PROCESSOR_MAP[primaryCountry];
    return {
      id: op.id,
      name: op.name,
      category: "mobile_money" as PaymentCategory,
      mode: "local" as const,
      countries: op.countries,
      processor,
      fields: [
        { key: "phone_number", label: "Mobile Number", placeholder: "+234 800 000 0000", type: "text" as const, required: true },
        { key: "account_name", label: "Registered Name", placeholder: "Name on mobile money account", type: "text" as const, required: true },
      ],
      fallbackNote: info?.fallbackNote,
    };
  });
}

// Local card options
const LOCAL_CARD_PROVIDERS: PaymentProvider[] = [
  {
    id: "card_africa_visa",
    name: "Visa / Mastercard",
    category: "card",
    mode: "local",
    processor: "coinbase",
    fields: [
      { key: "card_number", label: "Card Number", placeholder: "4242 4242 4242 4242", type: "text", required: true },
      { key: "card_expiry", label: "Expiry (MM/YY)", placeholder: "12/27", type: "text", required: true },
      { key: "card_cvc", label: "CVC", placeholder: "123", type: "text", required: true },
    ],
  },
];

// Local crypto options
const LOCAL_CRYPTO_PROVIDERS: PaymentProvider[] = [
  {
    id: "crypto_wallet_local",
    name: "Other Wallet (USDC Direct)",
    category: "crypto_wallet",
    mode: "local",
    processor: "direct",
    fields: [
      { key: "wallet_address", label: "Wallet Address (Polygon)", placeholder: "0x...", type: "text", required: true },
    ],
  },
  {
    id: "thirdweb_pay_local",
    name: "Thirdweb Pay (Card / Bank / Mobile Money → USDC)",
    category: "crypto_wallet",
    mode: "local",
    processor: "thirdweb",
    fields: [
      { key: "wallet_address", label: "Receiving Wallet (Polygon)", placeholder: "0x... (optional — escrow wallet used by default)", type: "text", required: false },
    ],
  },
  {
    id: "coinbase_offramp_local",
    name: "Coinbase Off-Ramp",
    category: "crypto_wallet",
    mode: "local",
    countries: ["Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt", "Uganda", "Tanzania", "Rwanda"],
    processor: "coinbase",
    fields: [
      { key: "email", label: "Coinbase Email", placeholder: "your@coinbase.com", type: "text", required: true },
    ],
  },
];

// ─── FULL REGISTRY ─────────────────────────────────────────
const LOCAL_BANK_PROVIDERS = buildAllBankProviders();

export const ALL_PROVIDERS: PaymentProvider[] = [
  ...DIASPORA_PROVIDERS,
  ...LOCAL_BANK_PROVIDERS,
  ...LOCAL_CARD_PROVIDERS,
  ...buildAllMobileMoneyProviders(),
  ...LOCAL_CRYPTO_PROVIDERS,
];

export function getProvidersByMode(mode: "diaspora" | "local"): PaymentProvider[] {
  return ALL_PROVIDERS.filter((p) => p.mode === mode || p.mode === "both");
}

// Get providers filtered by country — respects processor alignment
export function getProvidersByCountry(country: string): PaymentProvider[] {
  const all = getProvidersByMode("local");
  const countryProviders = all.filter(
    (p) => !p.countries || p.countries.includes(country)
  );
  return countryProviders;
}

export function getProviderCategories(mode: "diaspora" | "local"): PaymentCategory[] {
  const providers = getProvidersByMode(mode);
  return [...new Set(providers.map((p) => p.category))];
}

export function searchProviders(query: string, mode: "diaspora" | "local", category?: PaymentCategory): PaymentProvider[] {
  let providers = getProvidersByMode(mode);
  if (category) providers = providers.filter((p) => p.category === category);
  if (!query.trim()) return providers;
  const q = query.toLowerCase();
  return providers.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.countries?.some((c) => c.toLowerCase().includes(q))
  );
}

export const CATEGORY_LABELS: Record<PaymentCategory, string> = {
  card: "Card Payment",
  bank_account: "Bank Account",
  mobile_money: "Mobile Money",
  crypto_wallet: "Crypto Wallet",
  digital_wallet: "Digital Wallet",
};

export const CATEGORY_ICONS: Record<PaymentCategory, string> = {
  card: "CreditCard",
  bank_account: "Building2",
  mobile_money: "Smartphone",
  crypto_wallet: "Wallet",
  digital_wallet: "Smartphone",
};

export const SUPPORTED_COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
  "Uganda", "Tanzania", "Rwanda",
  "Senegal", "Mali", "Cote d'Ivoire", "Burkina Faso", "Benin", "Togo",
  "DR Congo", "Mozambique", "Malawi", "Niger", "Chad", "Guinea", "Madagascar",
  "Botswana", "Gambia", "Zambia", "Angola", "Cape Verde", "Djibouti",
  "Gabon", "Mauritius", "Namibia", "Tunisia",
];

export const PRIVACY_DISCLAIMER = "TrustLock does not save, store, or retain any card numbers, bank account details, mobile money credentials, or crypto wallet addresses. All payment information is transmitted securely via encrypted API connections to our licensed payment processors (Stripe, Coinbase, Transak, Thirdweb Pay) and is used solely for the purpose of completing this single transaction. Your financial data never touches our servers or databases.";

export const FEE_DISCLOSURE = `TrustLock Pay fees consist of three components: Platform Fee (1.0%–1.5%) charged at checkout covering payment processing and infrastructure; Processor Fee (1.5%–2.9%) paid to the external processor for fiat-to-crypto conversion (direct crypto bypasses this); and Escrow Service Fee (1.0%) pre-paid at checkout and held with your escrow funds — fully refunded on cancellation before work begins. No TrustLock service fees are charged on refunds.

**What are Gas Fees?** Gas fees are small costs required by the blockchain network (similar to a bank wire transfer fee) to process and verify transactions. They are NOT charged by TrustLock — they go to the network validators who confirm your transaction on the blockchain. Gas fees fluctuate based on network demand, which is why we show an estimated range rather than a fixed price.

**When do Gas Fees apply?**
• Standard transactions & releases: Gas is covered by TrustLock — you pay $0.
• Refunds: A small gas fee (~$0.02–$0.05) applies because a new blockchain transaction is required to return your funds. This is the ONLY cost on refunds.
• Split Payouts (Dispute Resolution): Gas fees (~$0.02–$0.05 total) are split equally between buyer and vendor since both parties receive a payout.

All fees are displayed before you confirm any payment.`;

// Payment provider registry — 3 active processors: Stripe, Coinbase, Transak + Direct
// Covers diaspora and local African payment methods with dynamic cost-optimized routing

import { type ProcessorId, getEligibleProcessors, type PaymentMethod } from "./feeEngine";

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
}

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
// Picks the cheapest processor for a given country and payment method
function cheapestProcessor(country: string, method: PaymentMethod): ProcessorId {
  const eligible = getEligibleProcessors(country, method, "checkout_fiat");
  return eligible.length > 0 ? eligible[0].id : "stripe";
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
    name: "Crypto Wallet (USDC)",
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
    id: "transak_fiat",
    name: "Buy with Card (Transak)",
    category: "card",
    mode: "diaspora",
    processor: "transak",
    fields: [
      { key: "card_number", label: "Card Number", placeholder: "4242 4242 4242 4242", type: "text", required: true },
      { key: "expiry", label: "Expiry Date", placeholder: "MM/YY", type: "text", required: true },
      { key: "cvv", label: "CVV", placeholder: "123", type: "text", required: true },
      { key: "cardholder", label: "Cardholder Name", placeholder: "John Doe", type: "text", required: true },
    ],
  },
];

// ─── LOCAL AFRICAN PROVIDERS ───────────────────────────────
const NIGERIAN_BANKS = ["Access Bank", "First Bank", "GTBank", "Zenith Bank", "UBA", "Fidelity Bank", "Sterling Bank", "Wema Bank", "Polaris Bank", "Stanbic IBTC", "Union Bank", "Ecobank Nigeria", "FCMB", "Keystone Bank", "Heritage Bank"];
const KENYAN_BANKS = ["KCB Bank", "Equity Bank", "Co-operative Bank", "NCBA Bank", "Absa Kenya", "Standard Chartered Kenya", "I&M Bank", "DTB Kenya", "Family Bank", "Stanbic Kenya"];
const GHANAIAN_BANKS = ["GCB Bank", "Ecobank Ghana", "Fidelity Bank Ghana", "Stanbic Ghana", "Absa Ghana", "CalBank", "Zenith Ghana", "Access Bank Ghana", "Republic Bank", "ADB Ghana"];
const SA_BANKS = ["Standard Bank", "FNB", "Absa", "Nedbank", "Capitec", "Investec", "TymeBank", "Discovery Bank", "African Bank"];
const CAMEROON_BANKS = ["Afriland First Bank", "Ecobank Cameroon", "Société Générale Cameroon", "UBA Cameroon", "BICEC"];
const EGYPT_BANKS = ["National Bank of Egypt", "Banque Misr", "CIB Egypt", "QNB Alahli", "Faisal Islamic Bank"];

const MOBILE_MONEY_OPERATORS = [
  { id: "mtn_momo", name: "MTN Mobile Money", countries: ["Nigeria", "Ghana", "Cameroon", "Uganda", "Rwanda", "Benin", "Cote d'Ivoire", "Congo"] },
  { id: "mpesa", name: "M-Pesa", countries: ["Kenya", "Tanzania", "Mozambique", "DR Congo", "Egypt"] },
  { id: "airtel_money", name: "Airtel Money", countries: ["Kenya", "Uganda", "Tanzania", "Malawi", "Nigeria", "Rwanda", "Niger", "Chad"] },
  { id: "orange_money", name: "Orange Money", countries: ["Senegal", "Mali", "Cote d'Ivoire", "Cameroon", "Guinea", "Burkina Faso", "Madagascar"] },
  { id: "wave", name: "Wave", countries: ["Senegal", "Cote d'Ivoire", "Mali", "Burkina Faso", "Gambia"] },
  { id: "free_money", name: "Free Money", countries: ["Senegal"] },
  { id: "myzaka", name: "MyZaka", countries: ["Botswana"] },
  { id: "tigopesa", name: "TigoPesa", countries: ["Tanzania"] },
  { id: "halopesa", name: "HaloPesa", countries: ["Tanzania"] },
  { id: "tmoney", name: "Tmoney TG", countries: ["Togo"] },
  { id: "togocell", name: "Togocell Money", countries: ["Togo"] },
  { id: "zamtel", name: "Zamtel Money", countries: ["Zambia"] },
  { id: "vodacom_mpesa", name: "Vodacom M-Pesa", countries: ["South Africa", "Tanzania", "Mozambique", "DR Congo"] },
];

// Country-specific required fields for banks
const COUNTRY_BANK_FIELDS: Record<string, ProviderField[]> = {
  Nigeria: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number (NUBAN)", placeholder: "10-digit NUBAN", type: "text", required: true },
    { key: "bvn", label: "BVN (Bank Verification Number)", placeholder: "11-digit BVN", type: "text", required: true },
    { key: "bank_branch", label: "Branch (optional)", placeholder: "Branch name or code", type: "text", required: false },
  ],
  Kenya: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "e.g. 001", type: "text", required: true },
    { key: "id_number", label: "National ID Number", placeholder: "ID number", type: "text", required: false },
  ],
  Ghana: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch / Sort Code", placeholder: "Branch code", type: "text", required: true },
  ],
  "South Africa": [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code (Universal)", placeholder: "6-digit branch code", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "e.g. SBZAZAJJ", type: "text", required: false },
  ],
  Cameroon: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number / RIB", placeholder: "IBAN or RIB", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Egypt: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number / IBAN", placeholder: "EG + 27 digits", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "national_id", label: "National ID Number", placeholder: "14-digit NID", type: "text", required: false },
  ],
};

const DEFAULT_BANK_FIELDS: ProviderField[] = [
  { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
  { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
  { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  { key: "bank_branch", label: "Branch (optional)", placeholder: "Branch name or code", type: "text", required: false },
];

// Dynamically assigns cheapest bank_transfer processor per country
function buildBankProviders(country: string, banks: string[]): PaymentProvider[] {
  const processor = cheapestProcessor(country, "bank_transfer");
  const fields = COUNTRY_BANK_FIELDS[country] || DEFAULT_BANK_FIELDS;
  return banks.map((bank) => ({
    id: `bank_${country.toLowerCase().replace(/\s/g, "_")}_${bank.toLowerCase().replace(/\s/g, "_")}`,
    name: bank,
    category: "bank_account" as PaymentCategory,
    mode: "local" as const,
    countries: [country],
    processor,
    fields,
  }));
}

// Dynamically assigns cheapest mobile_money processor per operator's primary country
function buildMobileMoneyProviders(): PaymentProvider[] {
  return MOBILE_MONEY_OPERATORS.map((op) => {
    const primaryCountry = op.countries[0] || "Nigeria";
    const processor = cheapestProcessor(primaryCountry, "mobile_money");
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
    };
  });
}

// Local crypto options — Direct + cheapest off-ramp processors
const LOCAL_CRYPTO_PROVIDERS: PaymentProvider[] = [
  {
    id: "crypto_wallet_local",
    name: "Crypto Wallet (USDC Direct)",
    category: "crypto_wallet",
    mode: "local",
    processor: "direct",
    fields: [
      { key: "wallet_address", label: "Wallet Address (Polygon)", placeholder: "0x...", type: "text", required: true },
    ],
  },
  {
    id: "coinbase_offramp_local",
    name: "Coinbase Off-Ramp",
    category: "crypto_wallet",
    mode: "local",
    countries: ["Nigeria", "Kenya", "Ghana", "South Africa"],
    processor: "coinbase",
    fields: [
      { key: "email", label: "Coinbase Email", placeholder: "your@coinbase.com", type: "text", required: true },
    ],
  },
  {
    id: "transak_offramp_local",
    name: "Transak Off-Ramp",
    category: "crypto_wallet",
    mode: "local",
    countries: ["Nigeria", "Kenya", "Ghana", "South Africa", "Egypt"],
    processor: "transak",
    fields: [
      { key: "email", label: "Transak Email", placeholder: "your@email.com", type: "text", required: true },
    ],
  },
];

// ─── FULL REGISTRY ─────────────────────────────────────────
const LOCAL_BANK_PROVIDERS: PaymentProvider[] = [
  ...buildBankProviders("Nigeria", NIGERIAN_BANKS),
  ...buildBankProviders("Kenya", KENYAN_BANKS),
  ...buildBankProviders("Ghana", GHANAIAN_BANKS),
  ...buildBankProviders("South Africa", SA_BANKS),
  ...buildBankProviders("Cameroon", CAMEROON_BANKS),
  ...buildBankProviders("Egypt", EGYPT_BANKS),
];

export const ALL_PROVIDERS: PaymentProvider[] = [
  ...DIASPORA_PROVIDERS,
  ...LOCAL_BANK_PROVIDERS,
  ...buildMobileMoneyProviders(),
  ...LOCAL_CRYPTO_PROVIDERS,
];

export function getProvidersByMode(mode: "diaspora" | "local"): PaymentProvider[] {
  return ALL_PROVIDERS.filter((p) => p.mode === mode || p.mode === "both");
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
  "Senegal", "Mali", "Cote d'Ivoire", "Burkina Faso", "Benin", "Togo",
  "DR Congo", "Uganda", "Tanzania", "Rwanda", "Mozambique", "Malawi",
  "Niger", "Chad", "Guinea", "Madagascar", "Botswana", "Gambia", "Zambia",
  "Angola", "Cape Verde", "Djibouti", "Gabon", "Mauritius", "Namibia", "Tunisia",
];

export const PRIVACY_DISCLAIMER = "TrustLock does not save, store, or retain any card numbers, bank account details, mobile money credentials, or crypto wallet addresses. All payment information is transmitted securely via encrypted API connections to our licensed payment processors (Stripe, Coinbase, Transak) and is used solely for the purpose of completing this single transaction. Your financial data never touches our servers or databases.";

export const FEE_DISCLOSURE = `TrustLock Pay fees consist of three components: Platform Fee (1.0%–1.5%) charged at checkout covering payment processing and infrastructure; Processor Fee (1.5%–2.9%) paid to the external processor for fiat-to-crypto conversion (direct crypto bypasses this); and Escrow Service Fee (1.0%) pre-paid at checkout and held with your escrow funds — fully refunded on cancellation before work begins. No TrustLock service fees are charged on refunds.

**What are Gas Fees?** Gas fees are small costs required by the blockchain network (similar to a bank wire transfer fee) to process and verify transactions. They are NOT charged by TrustLock — they go to the network validators who confirm your transaction on the blockchain. Gas fees fluctuate based on network demand, which is why we show an estimated range rather than a fixed price.

**When do Gas Fees apply?**
• Standard transactions & releases: Gas is covered by TrustLock — you pay $0.
• Refunds: A small gas fee (~$0.02–$0.05) applies because a new blockchain transaction is required to return your funds. This is the ONLY cost on refunds.
• Split Payouts (Dispute Resolution): Gas fees (~$0.02–$0.05 total) are split equally between buyer and vendor since both parties receive a payout.

All fees are displayed before you confirm any payment.`;

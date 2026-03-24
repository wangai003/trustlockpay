// Payment provider registry derived from Transak, Coinbase/Yellow Card, and Stripe processor analysis
// Covers diaspora and local African payment methods with formatted fields per provider

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
  processor: "transak" | "yellow_card" | "stripe" | "direct";
  fields: ProviderField[];
  icon?: string;
}

export interface FeeStructure {
  trustlockFee: number;       // TrustLock's cut (%)
  processorFee: number;       // Crypto processor cut (%)
  escrowFee: number;          // Escrow holding fee (%)
  gasFee: number;             // Polygon L2 gas (fixed USD)
  totalMin: number;           // Combined minimum %
  totalMax: number;           // Combined maximum %
}

// Fee structures by payment type
export const FEE_SCHEDULES: Record<string, FeeStructure> = {
  crypto_to_crypto: {
    trustlockFee: 1.0,
    processorFee: 0,
    escrowFee: 0.5,
    gasFee: 0.02,
    totalMin: 1.5,
    totalMax: 1.5,
  },
  fiat_to_crypto: {
    trustlockFee: 1.5,
    processorFee: 1.5,
    escrowFee: 0.5,
    gasFee: 0.02,
    totalMin: 3.0,
    totalMax: 4.0,
  },
  crypto_to_fiat: {
    trustlockFee: 1.5,
    processorFee: 1.5,
    escrowFee: 0.5,
    gasFee: 0.02,
    totalMin: 3.0,
    totalMax: 4.0,
  },
  escrow_hold: {
    trustlockFee: 0,
    processorFee: 0,
    escrowFee: 1.0,
    gasFee: 0,
    totalMin: 1.0,
    totalMax: 1.0,
  },
  refund_crypto: {
    trustlockFee: 0,
    processorFee: 0,
    escrowFee: 0,
    gasFee: 0.05,
    totalMin: 0,
    totalMax: 0,
  },
  refund_fiat: {
    trustlockFee: 0,
    processorFee: 1.0,
    escrowFee: 0,
    gasFee: 0.02,
    totalMin: 1.0,
    totalMax: 1.5,
  },
};

export function getFeeRange(): string {
  return "2% – 4%";
}

export function calculateFees(amount: number, type: string): { trustlock: number; processor: number; escrow: number; gas: number; total: number; net: number } {
  const schedule = FEE_SCHEDULES[type] || FEE_SCHEDULES.fiat_to_crypto;
  const trustlock = amount * (schedule.trustlockFee / 100);
  const processor = amount * (schedule.processorFee / 100);
  const escrow = amount * (schedule.escrowFee / 100);
  const gas = schedule.gasFee;
  const total = trustlock + processor + escrow + gas;
  return { trustlock, processor, escrow, gas, total, net: amount - total };
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
  {
    id: "apple_pay",
    name: "Apple Pay",
    category: "digital_wallet",
    mode: "diaspora",
    processor: "stripe",
    fields: [],
  },
  {
    id: "google_pay",
    name: "Google Pay",
    category: "digital_wallet",
    mode: "diaspora",
    processor: "stripe",
    fields: [],
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
    id: "bank_wire_diaspora",
    name: "Bank Account",
    category: "bank_account",
    mode: "diaspora",
    processor: "stripe",
    fields: [
      { key: "account_holder", label: "Account Holder Name", placeholder: "John Doe", type: "text", required: true },
      { key: "routing_number", label: "Routing Number", placeholder: "021000021", type: "text", required: true },
      { key: "account_number", label: "Account Number", placeholder: "1234567890", type: "text", required: true },
    ],
  },
];

// ─── LOCAL AFRICAN PROVIDERS ───────────────────────────────
// Banks by country (sourced from Yellow Card + Transak partner lists)
const NIGERIAN_BANKS = ["Access Bank", "First Bank", "GTBank", "Zenith Bank", "UBA", "Fidelity Bank", "Sterling Bank", "Wema Bank", "Polaris Bank", "Stanbic IBTC", "Union Bank", "Ecobank Nigeria", "FCMB", "Keystone Bank", "Heritage Bank"];
const KENYAN_BANKS = ["KCB Bank", "Equity Bank", "Co-operative Bank", "NCBA Bank", "Absa Kenya", "Standard Chartered Kenya", "I&M Bank", "DTB Kenya", "Family Bank", "Stanbic Kenya"];
const GHANAIAN_BANKS = ["GCB Bank", "Ecobank Ghana", "Fidelity Bank Ghana", "Stanbic Ghana", "Absa Ghana", "CalBank", "Zenith Ghana", "Access Bank Ghana", "Republic Bank", "ADB Ghana"];
const SA_BANKS = ["Standard Bank", "FNB", "Absa", "Nedbank", "Capitec", "Investec", "TymeBank", "Discovery Bank", "African Bank"];
const CAMEROON_BANKS = ["Afriland First Bank", "Ecobank Cameroon", "Société Générale Cameroon", "UBA Cameroon", "BICEC"];
const EGYPT_BANKS = ["National Bank of Egypt", "Banque Misr", "CIB Egypt", "QNB Alahli", "Faisal Islamic Bank"];

// Mobile money operators (sourced from Yellow Card materials)
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

// Build local bank providers per country
function buildBankProviders(country: string, banks: string[]): PaymentProvider[] {
  return banks.map((bank) => ({
    id: `bank_${country.toLowerCase().replace(/\s/g, "_")}_${bank.toLowerCase().replace(/\s/g, "_")}`,
    name: bank,
    category: "bank_account" as PaymentCategory,
    mode: "local" as const,
    countries: [country],
    processor: "yellow_card" as const,
    fields: [
      { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text" as const, required: true },
      { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text" as const, required: true },
      { key: "bank_branch", label: "Branch (optional)", placeholder: "Branch name or code", type: "text" as const, required: false },
    ],
  }));
}

// Build mobile money providers
function buildMobileMoneyProviders(): PaymentProvider[] {
  return MOBILE_MONEY_OPERATORS.map((op) => ({
    id: op.id,
    name: op.name,
    category: "mobile_money" as PaymentCategory,
    mode: "local" as const,
    countries: op.countries,
    processor: "yellow_card" as const,
    fields: [
      { key: "phone_number", label: "Mobile Number", placeholder: "+234 800 000 0000", type: "text" as const, required: true },
      { key: "account_name", label: "Registered Name", placeholder: "Name on mobile money account", type: "text" as const, required: true },
    ],
  }));
}

// Build local crypto wallet provider
const LOCAL_CRYPTO: PaymentProvider = {
  id: "crypto_wallet_local",
  name: "Crypto Wallet (USDC Direct)",
  category: "crypto_wallet",
  mode: "local",
  processor: "direct",
  fields: [
    { key: "wallet_address", label: "Wallet Address (Polygon)", placeholder: "0x...", type: "text", required: true },
  ],
};

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
  LOCAL_CRYPTO,
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

// Countries supported (union of all processors)
export const SUPPORTED_COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
  "Senegal", "Mali", "Cote d'Ivoire", "Burkina Faso", "Benin", "Togo",
  "DR Congo", "Uganda", "Tanzania", "Rwanda", "Mozambique", "Malawi",
  "Niger", "Chad", "Guinea", "Madagascar", "Botswana", "Gambia", "Zambia",
  "Angola", "Cape Verde", "Djibouti", "Gabon", "Mauritius", "Namibia", "Tunisia",
];

// Privacy disclaimer text
export const PRIVACY_DISCLAIMER = "TrustLock does not save, store, or retain any card numbers, bank account details, mobile money credentials, or crypto wallet addresses. All payment information is transmitted securely via encrypted API connections to our licensed payment processors and is used solely for the purpose of completing this single transaction. Your financial data never touches our servers or databases.";

export const FEE_DISCLOSURE = `TrustLock Pay fees range from ${getFeeRange()} depending on payment method. Crypto-to-crypto transfers (1.5%) are lowest as they bypass fiat conversion. Fiat payments (3–4%) include crypto processor conversion fees. Escrow holding fees (0.5–1%) are deducted upon fund release to vendors. Refunds to crypto wallets incur only a small network gas fee (~$0.02–$0.05). Refunds to fiat accounts may include a 1–1.5% processor conversion fee. All fees are transparently displayed before you confirm any transaction.`;

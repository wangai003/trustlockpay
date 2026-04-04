// ─── Country-Specific Payment Data ─────────────────────────
// Bank lists, mobile money operators, and KYC field configs
// for all 32 supported African + diaspora markets.

import type { ProviderField } from "./paymentProviders";

// ─── BANK LISTS BY COUNTRY ────────────────────────────────

export const COUNTRY_BANKS: Record<string, string[]> = {
  // ── Coinbase-supported (9 countries) ──
  Nigeria: ["Access Bank", "First Bank", "GTBank", "Zenith Bank", "UBA", "Fidelity Bank", "Sterling Bank", "Wema Bank", "Polaris Bank", "Stanbic IBTC", "Union Bank", "Ecobank Nigeria", "FCMB", "Keystone Bank", "Heritage Bank"],
  Kenya: ["KCB Bank", "Equity Bank", "Co-operative Bank", "NCBA Bank", "Absa Kenya", "Standard Chartered Kenya", "I&M Bank", "DTB Kenya", "Family Bank", "Stanbic Kenya"],
  Ghana: ["GCB Bank", "Ecobank Ghana", "Fidelity Bank Ghana", "Stanbic Ghana", "Absa Ghana", "CalBank", "Zenith Ghana", "Access Bank Ghana", "Republic Bank", "ADB Ghana"],
  "South Africa": ["Standard Bank", "FNB", "Absa", "Nedbank", "Capitec", "Investec", "TymeBank", "Discovery Bank", "African Bank"],
  Cameroon: ["Afriland First Bank", "Ecobank Cameroon", "Société Générale Cameroon", "UBA Cameroon", "BICEC"],
  Egypt: ["National Bank of Egypt", "Banque Misr", "CIB Egypt", "QNB Alahli", "Faisal Islamic Bank"],
  Uganda: ["Stanbic Uganda", "DFCU Bank", "Centenary Bank", "Absa Uganda", "Bank of Africa Uganda", "Housing Finance Bank", "Equity Bank Uganda", "UBA Uganda", "Ecobank Uganda", "Post Bank Uganda"],
  Tanzania: ["CRDB Bank", "NMB Bank", "Stanbic Tanzania", "Absa Tanzania", "DTB Tanzania", "Exim Bank Tanzania", "NBC Tanzania", "Equity Bank Tanzania", "Bank of Africa Tanzania", "Access Bank Tanzania"],
  Rwanda: ["Bank of Kigali", "Equity Bank Rwanda", "I&M Bank Rwanda", "BPR Atlas Mara", "Ecobank Rwanda", "Access Bank Rwanda", "Cogebanque", "KCB Bank Rwanda", "NCBA Rwanda", "GT Bank Rwanda"],

  // ── Transak-supported (no additional beyond Coinbase) ──
  // Nigeria, Kenya, Ghana, South Africa, Egypt already above

  // ── Non-aligned countries (Direct crypto + fallback) ──
  Senegal: ["CBAO Group Attijariwafa", "Société Générale Senegal", "Ecobank Senegal", "BICIS", "BHS Senegal", "Banque Atlantique Senegal", "UBA Senegal"],
  Mali: ["BDM-SA", "BNDA Mali", "Ecobank Mali", "Banque Atlantique Mali", "BIM-SA", "Coris Bank Mali"],
  "Cote d'Ivoire": ["Société Générale CI", "Ecobank CI", "NSIA Banque CI", "Banque Atlantique CI", "Bridge Bank CI", "BICICI", "UBA CI", "Coris Bank CI"],
  "Burkina Faso": ["Coris Bank", "Ecobank Burkina", "Société Générale Burkina", "BICIA-B", "Banque Atlantique BF", "UBA Burkina"],
  Benin: ["Ecobank Benin", "BOA Benin", "Société Générale Benin", "BIBE", "UBA Benin", "Banque Atlantique Benin"],
  Togo: ["Ecobank Togo", "UTB Togo", "Orabank Togo", "BSIC Togo", "Banque Atlantique Togo", "Société Générale Togo"],
  "DR Congo": ["Rawbank", "Equity BCDC", "TMB (Trust Merchant Bank)", "Access Bank RDC", "Ecobank RDC", "FBN Bank DRC", "Sofibanque"],
  Mozambique: ["BCI Mozambique", "Standard Bank Mozambique", "Millennium BIM", "FNB Mozambique", "Absa Mozambique", "Moza Banco"],
  Malawi: ["National Bank of Malawi", "Standard Bank Malawi", "FDH Bank", "NBS Bank", "Ecobank Malawi", "CDH Investment Bank"],
  Niger: ["Ecobank Niger", "BOA Niger", "Société Générale Niger", "BSIC Niger", "Banque Atlantique Niger", "Coris Bank Niger"],
  Chad: ["Société Générale Tchad", "Ecobank Chad", "Commercial Bank Tchad", "UBA Chad", "BSIC Chad"],
  Guinea: ["Ecobank Guinea", "Société Générale Guinea", "BPMG", "BICIGUI", "UBA Guinea", "Vista Bank Guinea"],
  Madagascar: ["BNI Madagascar", "BOA Madagascar", "BFV-SG Madagascar", "Aksès Banque", "BMOI", "MCB Madagascar"],
  Botswana: ["First National Bank Botswana", "Stanbic Bank Botswana", "Absa Botswana", "Standard Chartered Botswana", "Bank Gaborone", "BancABC Botswana"],
  Gambia: ["Standard Chartered Gambia", "Trust Bank Gambia", "Ecobank Gambia", "Access Bank Gambia", "GTBank Gambia", "FBN Bank Gambia"],
  Zambia: ["Zanaco", "Stanbic Zambia", "Absa Zambia", "FNB Zambia", "Standard Chartered Zambia", "Access Bank Zambia", "Atlas Mara Zambia", "Indo Zambia Bank"],
  Angola: ["BAI (Banco Angolano de Investimentos)", "BFA (Banco de Fomento Angola)", "BIC Angola", "Standard Bank Angola", "BMA Angola", "Banco Económico"],
  "Cape Verde": ["BCA (Banco Comercial do Atlântico)", "Caixa Económica de Cabo Verde", "BAI Cabo Verde", "Banco Interatlântico"],
  Djibouti: ["CAC International Bank", "Banque pour le Commerce et l'Industrie", "Bank of Africa Djibouti", "Saba Islamic Bank"],
  Gabon: ["BGFI Bank", "Société Générale Gabon", "UBA Gabon", "Ecobank Gabon", "BICIG"],
  Mauritius: ["MCB (Mauritius Commercial Bank)", "SBM Bank", "Absa Mauritius", "Standard Chartered Mauritius", "AfrAsia Bank", "Bank One"],
  Namibia: ["FNB Namibia", "Standard Bank Namibia", "Bank Windhoek", "Nedbank Namibia", "Letshego Bank Namibia"],
  Tunisia: ["Banque de Tunisie", "BIAT", "STB", "Amen Bank", "ATB", "BNA Tunisia", "UIB", "Banque de l'Habitat"],
};

// ─── MOBILE MONEY OPERATORS ──────────────────────────────
// Extended list covering all 32 countries

export const MOBILE_MONEY_OPERATORS = [
  { id: "mtn_momo", name: "MTN Mobile Money", countries: ["Nigeria", "Ghana", "Cameroon", "Uganda", "Rwanda", "Benin", "Cote d'Ivoire", "DR Congo", "Guinea", "Zambia", "Togo"] },
  { id: "mpesa", name: "M-Pesa", countries: ["Kenya", "Tanzania", "Mozambique", "DR Congo", "Egypt"] },
  { id: "airtel_money", name: "Airtel Money", countries: ["Kenya", "Uganda", "Tanzania", "Malawi", "Nigeria", "Rwanda", "Niger", "Chad", "Madagascar", "Zambia", "Gabon"] },
  { id: "orange_money", name: "Orange Money", countries: ["Senegal", "Mali", "Cote d'Ivoire", "Cameroon", "Guinea", "Burkina Faso", "Madagascar", "Tunisia", "Egypt"] },
  { id: "wave", name: "Wave", countries: ["Senegal", "Cote d'Ivoire", "Mali", "Burkina Faso", "Gambia"] },
  { id: "free_money", name: "Free Money", countries: ["Senegal"] },
  { id: "myzaka", name: "MyZaka", countries: ["Botswana"] },
  { id: "tigopesa", name: "TigoPesa", countries: ["Tanzania"] },
  { id: "halopesa", name: "HaloPesa", countries: ["Tanzania"] },
  { id: "tmoney", name: "Tmoney TG", countries: ["Togo"] },
  { id: "togocell", name: "Togocell Money", countries: ["Togo"] },
  { id: "zamtel", name: "Zamtel Money", countries: ["Zambia"] },
  { id: "vodacom_mpesa", name: "Vodacom M-Pesa", countries: ["South Africa", "Tanzania", "Mozambique", "DR Congo"] },
  { id: "ecocash", name: "EcoCash", countries: ["Botswana", "Mozambique"] },
  { id: "moov_money", name: "Moov Money", countries: ["Benin", "Togo", "Niger", "Cote d'Ivoire", "Chad", "Gabon"] },
  { id: "emoney", name: "e-money", countries: ["Cape Verde"] },
  { id: "mvola", name: "MVola", countries: ["Madagascar"] },
  { id: "unitel_money", name: "Unitel Money", countries: ["Angola"] },
  { id: "multicaixa", name: "Multicaixa Express", countries: ["Angola"] },
  { id: "juice_mauritius", name: "Juice by MCB", countries: ["Mauritius"] },
  { id: "my_t_money", name: "my.t money", countries: ["Mauritius"] },
  { id: "ewallet_namibia", name: "FNB eWallet", countries: ["Namibia"] },
  { id: "d_money", name: "D-Money", countries: ["Djibouti"] },
  { id: "mobicash_gabon", name: "Mobicash", countries: ["Gabon"] },
];

// ─── KYC / BANK FIELDS BY COUNTRY ─────────────────────────

export const COUNTRY_BANK_FIELDS: Record<string, ProviderField[]> = {
  // ── Tier 1: Full processor-supported countries ──
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

  // ── Tier 2: Coinbase-supported (new) ──
  Uganda: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code", type: "text", required: true },
    { key: "national_id", label: "National ID (NIN)", placeholder: "14-character NIN", type: "text", required: false },
  ],
  Tanzania: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: false },
  ],
  Rwanda: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code", type: "text", required: true },
    { key: "national_id", label: "National ID", placeholder: "16-digit NID", type: "text", required: false },
  ],

  // ── Tier 3: Non-aligned countries — SWIFT/IBAN required ──
  // WAEMU Zone (CFA Franc — XOF)
  Senegal: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "SN + 26 characters", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Mali: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "ML + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  "Cote d'Ivoire": [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "CI + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  "Burkina Faso": [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "BF + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Benin: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "BJ + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Togo: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "TG + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Niger: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "NE + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Guinea: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // CEMAC Zone (CFA Franc — XAF)
  Chad: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "TD + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Gabon: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "GA + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // East Africa
  "DR Congo": [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // Southern Africa
  Mozambique: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN", placeholder: "MZ + 21 digits", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Malawi: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "branch_code", label: "Branch/Sort Code", placeholder: "Sort code", type: "text", required: true },
  ],
  Zambia: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code", type: "text", required: true },
  ],
  Botswana: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code", type: "text", required: true },
  ],
  Namibia: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "branch_code", label: "Branch Code (Universal)", placeholder: "6-digit branch code", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: false },
  ],

  // Island Nations
  Madagascar: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / RIB", placeholder: "MG + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  Mauritius: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN", placeholder: "MU + 26 characters", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],
  "Cape Verde": [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN", placeholder: "CV + account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // North / Horn of Africa
  Tunisia: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN", placeholder: "TN + 22 digits", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "cin", label: "CIN (National ID)", placeholder: "8-digit CIN", type: "text", required: false },
  ],
  Djibouti: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // West Africa Other
  Gambia: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  ],

  // Central Africa
  Angola: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN", placeholder: "AO + 21 digits", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "nif", label: "NIF (Tax ID)", placeholder: "Tax identification number", type: "text", required: false },
  ],
};

// ─── PROCESSOR ALIGNMENT STATUS ───────────────────────────
// Defines which countries have aligned payment processors

export type ProcessorTier = "tier1" | "tier2" | "tier3";

export interface CountryProcessorInfo {
  tier: ProcessorTier;
  alignedProcessors: string[];       // processors explicitly listing this country
  availableMethods: string[];         // what actually works
  fallbackNote?: string;             // shown to users in non-aligned countries
  currencyCode: string;
  currencyName: string;
}

export const COUNTRY_PROCESSOR_MAP: Record<string, CountryProcessorInfo> = {
  // Tier 1 — Multiple aligned processors
  Nigeria:        { tier: "tier1", alignedProcessors: ["coinbase", "transak"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "NGN", currencyName: "Nigerian Naira" },
  Kenya:          { tier: "tier1", alignedProcessors: ["coinbase", "transak"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "KES", currencyName: "Kenyan Shilling" },
  Ghana:          { tier: "tier1", alignedProcessors: ["coinbase", "transak"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "GHS", currencyName: "Ghanaian Cedi" },
  "South Africa": { tier: "tier1", alignedProcessors: ["coinbase", "transak"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "ZAR", currencyName: "South African Rand" },
  Egypt:          { tier: "tier1", alignedProcessors: ["coinbase", "transak"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "EGP", currencyName: "Egyptian Pound" },

  // Tier 2 — One aligned processor
  Cameroon:       { tier: "tier2", alignedProcessors: ["coinbase"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "XAF", currencyName: "CFA Franc (CEMAC)" },
  Uganda:         { tier: "tier2", alignedProcessors: ["coinbase"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "UGX", currencyName: "Ugandan Shilling" },
  Tanzania:       { tier: "tier2", alignedProcessors: ["coinbase"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "TZS", currencyName: "Tanzanian Shilling" },
  Rwanda:         { tier: "tier2", alignedProcessors: ["coinbase"], availableMethods: ["card", "bank_transfer", "mobile_money", "crypto"], currencyCode: "RWF", currencyName: "Rwandan Franc" },

  // Tier 3 — No aligned processor; Direct crypto + mobile money where available
  Senegal:        { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend mobile money (Wave, Orange Money) or direct USDC for fastest settlement." },
  Mali:           { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Orange Money or direct USDC for fastest settlement." },
  "Cote d'Ivoire":{ tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Wave, MTN MoMo, or direct USDC." },
  "Burkina Faso": { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Wave, Orange Money, or direct USDC." },
  Benin:          { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend MTN MoMo, Moov Money, or direct USDC." },
  Togo:           { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Tmoney, Togocell Money, or direct USDC." },
  Niger:          { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XOF", currencyName: "CFA Franc (WAEMU)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Airtel Money, Moov Money, or direct USDC." },
  Guinea:         { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "GNF", currencyName: "Guinean Franc", fallbackNote: "Bank transfers require SWIFT wire. We recommend Orange Money, MTN MoMo, or direct USDC." },
  Chad:           { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XAF", currencyName: "CFA Franc (CEMAC)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Airtel Money, Moov Money, or direct USDC." },
  Gabon:          { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "XAF", currencyName: "CFA Franc (CEMAC)", fallbackNote: "Bank transfers require SWIFT wire. We recommend Airtel Money, Mobicash, or direct USDC." },
  "DR Congo":     { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "CDF", currencyName: "Congolese Franc", fallbackNote: "Bank transfers require SWIFT wire. We recommend M-Pesa, Vodacom M-Pesa, or direct USDC." },
  Mozambique:     { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "MZN", currencyName: "Mozambican Metical", fallbackNote: "Bank transfers require SWIFT wire. We recommend M-Pesa, Vodacom M-Pesa, or direct USDC." },
  Malawi:         { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "MWK", currencyName: "Malawian Kwacha", fallbackNote: "Bank transfers require SWIFT wire. We recommend Airtel Money or direct USDC." },
  Zambia:         { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "ZMW", currencyName: "Zambian Kwacha", fallbackNote: "Bank transfers require SWIFT wire. We recommend MTN MoMo, Airtel Money, or direct USDC." },
  Madagascar:     { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "MGA", currencyName: "Malagasy Ariary", fallbackNote: "Bank transfers require SWIFT wire. We recommend MVola, Orange Money, or direct USDC." },
  Botswana:       { tier: "tier3", alignedProcessors: [], availableMethods: ["bank_transfer", "crypto"], currencyCode: "BWP", currencyName: "Botswana Pula", fallbackNote: "Bank transfers require SWIFT wire. Direct USDC is recommended for fastest settlement." },
  Gambia:         { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "GMD", currencyName: "Gambian Dalasi", fallbackNote: "Bank transfers require SWIFT wire. We recommend Wave or direct USDC." },
  Angola:         { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "AOA", currencyName: "Angolan Kwanza", fallbackNote: "Bank transfers require SWIFT wire. We recommend Multicaixa Express, Unitel Money, or direct USDC." },
  "Cape Verde":   { tier: "tier3", alignedProcessors: [], availableMethods: ["crypto"], currencyCode: "CVE", currencyName: "Cape Verdean Escudo", fallbackNote: "Limited local payment options. Bank transfers require SWIFT wire. Direct USDC is the fastest option." },
  Djibouti:       { tier: "tier3", alignedProcessors: [], availableMethods: ["crypto"], currencyCode: "DJF", currencyName: "Djiboutian Franc", fallbackNote: "Limited local payment options. Bank transfers require SWIFT wire. Direct USDC is the fastest option." },
  Mauritius:      { tier: "tier3", alignedProcessors: [], availableMethods: ["bank_transfer", "mobile_money", "crypto"], currencyCode: "MUR", currencyName: "Mauritian Rupee", fallbackNote: "Bank transfers require SWIFT wire. We recommend Juice by MCB or direct USDC." },
  Namibia:        { tier: "tier3", alignedProcessors: [], availableMethods: ["bank_transfer", "crypto"], currencyCode: "NAD", currencyName: "Namibian Dollar", fallbackNote: "Bank transfers require SWIFT wire. We recommend FNB eWallet or direct USDC." },
  Tunisia:        { tier: "tier3", alignedProcessors: [], availableMethods: ["mobile_money", "crypto"], currencyCode: "TND", currencyName: "Tunisian Dinar", fallbackNote: "Bank transfers require SWIFT wire. We recommend Orange Money or direct USDC." },
};

// ─── HELPER: Get alternative payment suggestions for non-aligned countries ──

export interface PaymentSuggestion {
  method: string;
  label: string;
  description: string;
  recommended: boolean;
}

export function getPaymentSuggestions(country: string): PaymentSuggestion[] {
  const info = COUNTRY_PROCESSOR_MAP[country];
  if (!info) return [];

  // Tier 1 & 2 countries have full processor support — no suggestions needed
  if (info.tier !== "tier3") return [];

  const suggestions: PaymentSuggestion[] = [];

  // Always recommend direct crypto for Tier 3
  suggestions.push({
    method: "crypto",
    label: "Pay with USDC (Direct)",
    description: "Send USDC directly on Polygon — no intermediary, lowest fees (1.0%), instant escrow lock.",
    recommended: true,
  });

  // Check for mobile money availability
  const countryMoMo = MOBILE_MONEY_OPERATORS.filter((op) => op.countries.includes(country));
  if (countryMoMo.length > 0) {
    const names = countryMoMo.slice(0, 3).map((op) => op.name).join(", ");
    suggestions.push({
      method: "mobile_money",
      label: "Mobile Money",
      description: `Available via ${names}. Processed through Transak's global network.`,
      recommended: countryMoMo.length >= 2,
    });
  }

  // Bank transfer is always available via SWIFT (expensive, slow)
  suggestions.push({
    method: "bank_transfer",
    label: "Bank Wire (SWIFT)",
    description: "International wire transfer via your local bank. Takes 2-5 business days, bank fees may apply.",
    recommended: false,
  });

  return suggestions;
}

// ─── HELPER: Get mobile money operators for a country ──

export function getMobileMoneyForCountry(country: string) {
  return MOBILE_MONEY_OPERATORS.filter((op) => op.countries.includes(country));
}

// ─── HELPER: Get banks for a country ──

export function getBanksForCountry(country: string): string[] {
  return COUNTRY_BANKS[country] || [];
}

// ─── HELPER: Get KYC fields for a country ──

const DEFAULT_BANK_FIELDS: ProviderField[] = [
  { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
  { key: "account_number", label: "Account Number", placeholder: "Enter account number", type: "text", required: true },
  { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
  { key: "bank_branch", label: "Branch (optional)", placeholder: "Branch name or code", type: "text", required: false },
];

export function getBankFieldsForCountry(country: string): ProviderField[] {
  return COUNTRY_BANK_FIELDS[country] || DEFAULT_BANK_FIELDS;
}

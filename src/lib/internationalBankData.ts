// ─── International Bank Registry ──────────────────────────
// Banks organized by region, aligned with Stripe, Coinbase, or Transak.
// Each region has standardized field requirements for bank transfers.

import type { ProviderField } from "./paymentProviders";

export type InternationalRegion =
  | "north_america"
  | "central_america"
  | "south_america"
  | "europe"
  | "caribbean"
  | "asia"
  | "australia_oceania";

export interface RegionConfig {
  key: InternationalRegion;
  label: string;
  flag: string;
  processor: "stripe" | "coinbase" | "transak";
  fields: ProviderField[];
  banks: string[];
}

// ─── NORTH AMERICA (Stripe) ───────────────────────────────
const NORTH_AMERICA: RegionConfig = {
  key: "north_america",
  label: "North America",
  flag: "🌎",
  processor: "stripe",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_type", label: "Account Type", placeholder: "Checking or Savings", type: "select", options: ["Checking", "Savings"], required: true },
    { key: "routing_number", label: "Routing Number (ABA)", placeholder: "9-digit routing number", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
  ],
  banks: [
    // United States
    "JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank", "U.S. Bank",
    "PNC Bank", "Capital One", "TD Bank (US)", "Truist Financial", "Goldman Sachs",
    "Morgan Stanley", "Charles Schwab Bank", "Fifth Third Bank", "Citizens Financial",
    "KeyBank", "Regions Bank", "M&T Bank", "Huntington National Bank", "Ally Bank",
    "Discover Bank", "BMO Harris Bank", "HSBC Bank USA", "First Republic Bank",
    "Silicon Valley Bank", "Synchrony Bank", "American Express National Bank",
    "USAA Federal Savings", "Navy Federal Credit Union",
    // Canada
    "Royal Bank of Canada (RBC)", "Toronto-Dominion Bank (TD)", "Bank of Nova Scotia (Scotiabank)",
    "Bank of Montreal (BMO)", "Canadian Imperial Bank of Commerce (CIBC)", "National Bank of Canada",
    "Desjardins Group", "HSBC Canada", "Tangerine Bank", "Simplii Financial",
    // Mexico (Stripe-supported)
    "BBVA México", "Banorte", "Citibanamex", "Santander México", "HSBC México",
    "Scotiabank México", "Banco Azteca", "Inbursa",
  ],
};

// ─── CENTRAL AMERICA (Transak) ────────────────────────────
const CENTRAL_AMERICA: RegionConfig = {
  key: "central_america",
  label: "Central America",
  flag: "🌎",
  processor: "transak",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / Account Number", placeholder: "Account number or IBAN", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "e.g. BABORABB", type: "text", required: true },
    { key: "bank_branch", label: "Branch Name", placeholder: "Branch name or code", type: "text", required: false },
  ],
  banks: [
    // Guatemala
    "Banco Industrial (Guatemala)", "Banco G&T Continental", "Banrural Guatemala",
    "BAC Credomatic Guatemala", "Banco de los Trabajadores",
    // Costa Rica
    "Banco Nacional de Costa Rica", "Banco de Costa Rica", "BAC San José",
    "Scotiabank Costa Rica", "Banco Popular Costa Rica",
    // Panama
    "Banco General (Panama)", "Banistmo", "BAC International Bank",
    "Global Bank Panama", "Banco Nacional de Panamá",
    // El Salvador
    "Banco Agrícola (El Salvador)", "Banco de América Central (BAC)", "Banco Cuscatlán",
    "Davivienda El Salvador",
    // Honduras
    "Banco Atlántida", "BAC Honduras", "Ficohsa", "Banco de Occidente Honduras",
    // Belize
    "Belize Bank", "Atlantic Bank Belize", "Heritage Bank Belize",
    // Nicaragua
    "Banpro (Nicaragua)", "BAC Nicaragua", "Banco Lafise Nicaragua",
  ],
};

// ─── SOUTH AMERICA (Stripe / Transak) ─────────────────────
const SOUTH_AMERICA: RegionConfig = {
  key: "south_america",
  label: "South America",
  flag: "🌎",
  processor: "stripe",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "IBAN / Account Number", placeholder: "Account number or IBAN", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "tax_id", label: "Tax ID (CPF / RUT / CUIT)", placeholder: "National tax identifier", type: "text", required: true },
  ],
  banks: [
    // Brazil
    "Banco do Brasil", "Itaú Unibanco", "Bradesco", "Caixa Econômica Federal",
    "Santander Brasil", "Banco Safra", "BTG Pactual", "Nubank", "Banco Inter",
    "Banco Original", "C6 Bank",
    // Argentina
    "Banco de la Nación Argentina", "Banco Galicia", "Banco Santander Argentina",
    "BBVA Argentina", "Banco Macro", "Banco HSBC Argentina", "Mercado Pago",
    // Colombia
    "Bancolombia", "Banco de Bogotá", "Davivienda", "Banco de Occidente (Colombia)",
    "BBVA Colombia", "Scotiabank Colpatria", "Nequi",
    // Chile
    "Banco de Chile", "BancoEstado", "Santander Chile", "Scotiabank Chile",
    "BCI Chile", "Itaú Chile", "Banco Falabella Chile",
    // Peru
    "Banco de Crédito del Perú (BCP)", "BBVA Perú", "Scotiabank Perú",
    "Interbank Perú", "Banco de la Nación (Perú)",
    // Ecuador
    "Banco Pichincha", "Banco del Pacífico", "Banco de Guayaquil", "Produbanco",
    // Uruguay
    "Banco República (BROU)", "Santander Uruguay", "Itaú Uruguay", "BBVA Uruguay",
    // Paraguay
    "Banco Nacional de Fomento (Paraguay)", "Banco Continental (Paraguay)", "Itaú Paraguay",
    // Venezuela
    "Banco de Venezuela", "Banesco", "Banco Mercantil (Venezuela)", "BBVA Provincial",
    // Bolivia
    "Banco Nacional de Bolivia", "Banco Mercantil Santa Cruz", "BancoSol Bolivia",
  ],
};

// ─── EUROPE (Stripe) ──────────────────────────────────────
const EUROPE: RegionConfig = {
  key: "europe",
  label: "Europe",
  flag: "🇪🇺",
  processor: "stripe",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "iban", label: "IBAN", placeholder: "e.g. DE89 3704 0044 0532 0130 00", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "e.g. COBADEFFXXX", type: "text", required: true },
  ],
  banks: [
    // UK
    "Barclays", "HSBC UK", "Lloyds Banking Group", "NatWest Group", "Standard Chartered UK",
    "Santander UK", "Nationwide Building Society", "Monzo", "Revolut", "Starling Bank",
    // Germany
    "Deutsche Bank", "Commerzbank", "DZ Bank", "KfW", "Landesbank Baden-Württemberg",
    "N26", "ING Germany",
    // France
    "BNP Paribas", "Crédit Agricole", "Société Générale", "BPCE / Banque Populaire",
    "Crédit Mutuel", "La Banque Postale",
    // Netherlands
    "ING Group", "Rabobank", "ABN AMRO", "Bunq",
    // Spain
    "Banco Santander", "BBVA Spain", "CaixaBank", "Banco Sabadell",
    // Italy
    "UniCredit", "Intesa Sanpaolo", "Banca Monte dei Paschi", "Mediobanca",
    // Switzerland
    "UBS", "Credit Suisse", "Julius Baer", "Zurich Cantonal Bank",
    // Sweden
    "SEB", "Swedbank", "Handelsbanken", "Nordea Sweden", "Klarna Bank",
    // Norway
    "DNB", "Nordea Norway", "SpareBank 1",
    // Denmark
    "Danske Bank", "Jyske Bank", "Nordea Denmark",
    // Finland
    "Nordea Finland", "OP Financial Group",
    // Belgium
    "KBC Group", "BNP Paribas Fortis", "Belfius",
    // Austria
    "Erste Group", "Raiffeisen Bank International",
    // Ireland
    "Bank of Ireland", "AIB Group", "Permanent TSB",
    // Portugal
    "Caixa Geral de Depósitos", "Millennium BCP", "Novo Banco",
    // Poland
    "PKO Bank Polski", "mBank", "ING Bank Śląski", "Santander Bank Polska",
    // Czech Republic
    "Česká spořitelna", "ČSOB", "Komerční banka",
    // Greece
    "National Bank of Greece", "Piraeus Bank", "Alpha Bank", "Eurobank Greece",
    // Romania
    "Banca Transilvania", "BRD – Groupe Société Générale",
    // Hungary
    "OTP Bank",
    // Turkey
    "Türkiye İş Bankası", "Garanti BBVA", "Akbank", "Yapı Kredi",
  ],
};

// ─── CARIBBEAN (Transak / Coinbase) ───────────────────────
const CARIBBEAN: RegionConfig = {
  key: "caribbean",
  label: "Caribbean",
  flag: "🏝️",
  processor: "transak",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "bank_branch", label: "Branch Name / Code", placeholder: "Branch name", type: "text", required: false },
  ],
  banks: [
    // Jamaica
    "National Commercial Bank (NCB) Jamaica", "Scotiabank Jamaica", "JMMB Bank Jamaica",
    "First Caribbean International Bank (Jamaica)", "Sagicor Bank Jamaica",
    // Trinidad & Tobago
    "Republic Bank (Trinidad)", "First Citizens Bank (Trinidad)", "Scotiabank Trinidad",
    "RBC Royal Bank Trinidad",
    // Bahamas
    "Royal Bank of Canada (Bahamas)", "Commonwealth Bank (Bahamas)", "Scotiabank Bahamas",
    "Fidelity Bank (Bahamas)",
    // Barbados
    "Republic Bank Barbados", "First Caribbean International (Barbados)",
    "Scotiabank Barbados",
    // Dominican Republic
    "Banco Popular Dominicano", "Banreservas", "Scotiabank Dominicana",
    "Banco BHD León",
    // Haiti
    "BNC Haiti", "Sogebank", "Unibank Haiti",
    // Cayman Islands
    "Butterfield Bank (Cayman)", "Scotiabank Cayman",
    // Bermuda
    "Butterfield Bank (Bermuda)", "HSBC Bermuda",
    // Curaçao
    "Maduro & Curiel's Bank", "CIBC FirstCaribbean (Curaçao)",
    // Eastern Caribbean
    "Bank of Saint Lucia", "RBTT Bank Grenada", "CIBC FirstCaribbean (OECS)",
  ],
};

// ─── ASIA (Stripe / Transak) ──────────────────────────────
const ASIA: RegionConfig = {
  key: "asia",
  label: "Asia",
  flag: "🌏",
  processor: "stripe",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "account_number", label: "Account Number / IBAN", placeholder: "Account number or IBAN", type: "text", required: true },
    { key: "swift_bic", label: "SWIFT/BIC Code", placeholder: "SWIFT code", type: "text", required: true },
    { key: "branch_code", label: "Branch Code", placeholder: "Branch code or IFSC", type: "text", required: true },
  ],
  banks: [
    // India
    "State Bank of India (SBI)", "HDFC Bank", "ICICI Bank", "Axis Bank",
    "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda",
    "IndusInd Bank", "Yes Bank", "IDBI Bank", "Union Bank of India",
    // China
    "Industrial and Commercial Bank of China (ICBC)", "China Construction Bank",
    "Agricultural Bank of China", "Bank of China", "Bank of Communications",
    "China Merchants Bank", "Shanghai Pudong Development Bank",
    // Japan
    "MUFG Bank", "Sumitomo Mitsui Banking Corporation (SMBC)", "Mizuho Bank",
    "Resona Bank", "Shinsei Bank", "Japan Post Bank",
    // South Korea
    "KB Kookmin Bank", "Shinhan Bank", "Woori Bank", "Hana Bank", "NH NongHyup",
    // Singapore
    "DBS Bank", "OCBC Bank", "United Overseas Bank (UOB)", "Standard Chartered Singapore",
    // Hong Kong
    "HSBC Hong Kong", "Standard Chartered Hong Kong", "Bank of China (Hong Kong)",
    "Hang Seng Bank",
    // Malaysia
    "Maybank", "CIMB Bank", "Public Bank Berhad", "RHB Bank", "Hong Leong Bank",
    // Thailand
    "Bangkok Bank", "Kasikornbank", "Siam Commercial Bank", "Krung Thai Bank",
    // Indonesia
    "Bank Central Asia (BCA)", "Bank Mandiri", "Bank Rakyat Indonesia (BRI)",
    "Bank Negara Indonesia (BNI)", "Bank CIMB Niaga",
    // Philippines
    "BDO Unibank", "Metropolitan Bank (Metrobank)", "Bank of the Philippine Islands (BPI)",
    "Land Bank of the Philippines", "UnionBank Philippines",
    // Vietnam
    "Vietcombank", "VietinBank", "BIDV", "Techcombank", "MB Bank",
    // Pakistan
    "Habib Bank Limited (HBL)", "United Bank Limited (UBL)", "MCB Bank Pakistan",
    "Allied Bank Pakistan", "National Bank of Pakistan",
    // Bangladesh
    "Islami Bank Bangladesh", "BRAC Bank", "Dutch-Bangla Bank", "Eastern Bank Limited",
    // Sri Lanka
    "Commercial Bank of Ceylon", "Hatton National Bank", "Sampath Bank",
    // UAE
    "Emirates NBD", "First Abu Dhabi Bank (FAB)", "Abu Dhabi Commercial Bank",
    "Mashreq Bank", "Dubai Islamic Bank",
    // Saudi Arabia
    "Saudi National Bank (SNB)", "Al Rajhi Bank", "Riyad Bank", "Banque Saudi Fransi",
    // Israel
    "Bank Leumi", "Bank Hapoalim", "Israel Discount Bank",
  ],
};

// ─── AUSTRALIA & OCEANIA (Stripe) ─────────────────────────
const AUSTRALIA_OCEANIA: RegionConfig = {
  key: "australia_oceania",
  label: "Australia & Oceania",
  flag: "🇦🇺",
  processor: "stripe",
  fields: [
    { key: "account_holder", label: "Account Holder Name", placeholder: "Full legal name", type: "text", required: true },
    { key: "bsb", label: "BSB Number", placeholder: "6-digit BSB", type: "text", required: true },
    { key: "account_number", label: "Account Number", placeholder: "Account number", type: "text", required: true },
  ],
  banks: [
    // Australia
    "Commonwealth Bank of Australia (CBA)", "Westpac", "ANZ Bank", "National Australia Bank (NAB)",
    "Macquarie Bank", "Bendigo and Adelaide Bank", "Suncorp Bank", "Bank of Queensland",
    "ING Australia", "ME Bank", "Bankwest", "Up Bank",
    // New Zealand
    "ANZ New Zealand", "ASB Bank", "Westpac New Zealand", "BNZ (Bank of New Zealand)",
    "Kiwibank", "TSB Bank NZ",
  ],
};

// ─── FULL REGISTRY ────────────────────────────────────────

export const INTERNATIONAL_REGIONS: RegionConfig[] = [
  NORTH_AMERICA,
  CENTRAL_AMERICA,
  SOUTH_AMERICA,
  EUROPE,
  CARIBBEAN,
  ASIA,
  AUSTRALIA_OCEANIA,
];

export function getRegionConfig(key: InternationalRegion): RegionConfig | undefined {
  return INTERNATIONAL_REGIONS.find(r => r.key === key);
}

export function searchBanksInRegion(region: InternationalRegion, query: string): string[] {
  const config = getRegionConfig(region);
  if (!config) return [];
  if (!query.trim()) return config.banks;
  const q = query.toLowerCase();
  return config.banks.filter(b => b.toLowerCase().includes(q));
}

export function getFieldsForRegion(region: InternationalRegion): ProviderField[] {
  return getRegionConfig(region)?.fields || [];
}

export function getProcessorForRegion(region: InternationalRegion): "stripe" | "coinbase" | "transak" {
  return getRegionConfig(region)?.processor || "stripe";
}

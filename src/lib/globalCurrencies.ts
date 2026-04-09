/**
 * Global Currency Registry
 * Covers all supported trade corridors: Africa, Caribbean (CARICOM),
 * Europe (EU), Asia (ASEAN), Middle East (GCC), Americas (USMCA, MERCOSUR,
 * CAFTA-DR), Pacific (CPTPP), and Oceania.
 *
 * Rates are indicative USD-based snapshots — production would use a live FX API.
 */

export interface CurrencyInfo {
  code: string;        // ISO 4217 currency code
  name: string;        // Human-readable name
  symbol: string;      // Display symbol (e.g. "₦", "€", "J$")
  rate: number;        // Units per 1 USD (indicative)
  region?: string;     // Trade corridor label
}

// ─── AFRICA ──────────────────────────────────────────────
const AFRICA: Record<string, CurrencyInfo> = {
  NG: { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 1580.00, region: "Africa" },
  KE: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 153.50, region: "Africa" },
  GH: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", rate: 15.80, region: "Africa" },
  ZA: { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.25, region: "Africa" },
  CM: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  GA: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  CG: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  TD: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  CF: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  GQ: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  EG: { code: "EGP", name: "Egyptian Pound", symbol: "E£", rate: 50.85, region: "Africa" },
  UG: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", rate: 3780.00, region: "Africa" },
  TZ: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rate: 2650.00, region: "Africa" },
  RW: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", rate: 1350.00, region: "Africa" },
  SN: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  CI: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  ML: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  BF: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  BJ: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  TG: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  ZM: { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", rate: 27.50, region: "Africa" },
  MW: { code: "MWK", name: "Malawian Kwacha", symbol: "MK", rate: 1720.00, region: "Africa" },
  MG: { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", rate: 4550.00, region: "Africa" },
  ET: { code: "ETB", name: "Ethiopian Birr", symbol: "Br", rate: 57.50, region: "Africa" },
  MZ: { code: "MZN", name: "Mozambican Metical", symbol: "MT", rate: 63.80, region: "Africa" },
  AO: { code: "AOA", name: "Angolan Kwanza", symbol: "Kz", rate: 835.00, region: "Africa" },
  ZW: { code: "ZWL", name: "Zimbabwe Dollar", symbol: "Z$", rate: 14200.00, region: "Africa" },
  BW: { code: "BWP", name: "Botswana Pula", symbol: "P", rate: 13.70, region: "Africa" },
  NA: { code: "NAD", name: "Namibian Dollar", symbol: "N$", rate: 18.25, region: "Africa" },
  LS: { code: "LSL", name: "Lesotho Loti", symbol: "L", rate: 18.25, region: "Africa" },
  SZ: { code: "SZL", name: "Eswatini Lilangeni", symbol: "E", rate: 18.25, region: "Africa" },
  MU: { code: "MUR", name: "Mauritian Rupee", symbol: "₨", rate: 45.80, region: "Africa" },
  MA: { code: "MAD", name: "Moroccan Dirham", symbol: "MAD", rate: 10.10, region: "Africa" },
  TN: { code: "TND", name: "Tunisian Dinar", symbol: "DT", rate: 3.12, region: "Africa" },
  DZ: { code: "DZD", name: "Algerian Dinar", symbol: "DA", rate: 135.50, region: "Africa" },
  LY: { code: "LYD", name: "Libyan Dinar", symbol: "LD", rate: 4.85, region: "Africa" },
  SD: { code: "SDG", name: "Sudanese Pound", symbol: "SDG", rate: 600.00, region: "Africa" },
  SS: { code: "SSP", name: "South Sudanese Pound", symbol: "SSP", rate: 1050.00, region: "Africa" },
  ER: { code: "ERN", name: "Eritrean Nakfa", symbol: "Nfk", rate: 15.00, region: "Africa" },
  DJ: { code: "DJF", name: "Djiboutian Franc", symbol: "Fdj", rate: 177.72, region: "Africa" },
  SO: { code: "SOS", name: "Somali Shilling", symbol: "Sh", rate: 571.00, region: "Africa" },
  SL: { code: "SLE", name: "Sierra Leonean Leone", symbol: "Le", rate: 22.50, region: "Africa" },
  LR: { code: "LRD", name: "Liberian Dollar", symbol: "L$", rate: 192.00, region: "Africa" },
  GN: { code: "GNF", name: "Guinean Franc", symbol: "FG", rate: 8600.00, region: "Africa" },
  GM: { code: "GMD", name: "Gambian Dalasi", symbol: "D", rate: 70.00, region: "Africa" },
  GW: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  CV: { code: "CVE", name: "Cape Verdean Escudo", symbol: "Esc", rate: 102.50, region: "Africa" },
  SC: { code: "SCR", name: "Seychellois Rupee", symbol: "₨", rate: 14.30, region: "Africa" },
  BI: { code: "BIF", name: "Burundian Franc", symbol: "FBu", rate: 2870.00, region: "Africa" },
  CD: { code: "CDF", name: "Congolese Franc", symbol: "FC", rate: 2780.00, region: "Africa" },
  NE: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00, region: "Africa" },
  ST: { code: "STN", name: "São Tomé and Príncipe Dobra", symbol: "Db", rate: 22.80, region: "Africa" },
  KM: { code: "KMF", name: "Comorian Franc", symbol: "CF", rate: 455.00, region: "Africa" },
};

// ─── CARIBBEAN (CARICOM) ─────────────────────────────────
const CARIBBEAN: Record<string, CurrencyInfo> = {
  JM: { code: "JMD", name: "Jamaican Dollar", symbol: "J$", rate: 156.50, region: "Caribbean" },
  TT: { code: "TTD", name: "Trinidad & Tobago Dollar", symbol: "TT$", rate: 6.79, region: "Caribbean" },
  BB: { code: "BBD", name: "Barbadian Dollar", symbol: "Bds$", rate: 2.00, region: "Caribbean" },
  GY: { code: "GYD", name: "Guyanese Dollar", symbol: "G$", rate: 209.50, region: "Caribbean" },
  BS: { code: "BSD", name: "Bahamian Dollar", symbol: "B$", rate: 1.00, region: "Caribbean" },
  BZ: { code: "BZD", name: "Belize Dollar", symbol: "BZ$", rate: 2.02, region: "Caribbean" },
  SR: { code: "SRD", name: "Surinamese Dollar", symbol: "SRD", rate: 36.20, region: "Caribbean" },
  HT: { code: "HTG", name: "Haitian Gourde", symbol: "G", rate: 132.50, region: "Caribbean" },
  AG: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  DM: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  GD: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  KN: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  LC: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  VC: { code: "XCD", name: "East Caribbean Dollar", symbol: "EC$", rate: 2.70, region: "Caribbean" },
  DO: { code: "DOP", name: "Dominican Peso", symbol: "RD$", rate: 58.80, region: "Caribbean" },
  CU: { code: "CUP", name: "Cuban Peso", symbol: "₱", rate: 24.00, region: "Caribbean" },
};

// ─── EUROPE (EU + UK + EEA) ──────────────────────────────
const EUROPE: Record<string, CurrencyInfo> = {
  // Eurozone
  DE: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  FR: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  IT: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  ES: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  NL: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  BE: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  AT: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  PT: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  IE: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  FI: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  GR: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  SK: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  SI: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  LT: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  LV: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  EE: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  LU: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  MT: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  CY: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  HR: { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, region: "Europe" },
  // Non-Euro EU
  PL: { code: "PLN", name: "Polish Zloty", symbol: "zł", rate: 4.05, region: "Europe" },
  CZ: { code: "CZK", name: "Czech Koruna", symbol: "Kč", rate: 23.40, region: "Europe" },
  HU: { code: "HUF", name: "Hungarian Forint", symbol: "Ft", rate: 375.00, region: "Europe" },
  RO: { code: "RON", name: "Romanian Leu", symbol: "lei", rate: 4.62, region: "Europe" },
  BG: { code: "BGN", name: "Bulgarian Lev", symbol: "лв", rate: 1.80, region: "Europe" },
  SE: { code: "SEK", name: "Swedish Krona", symbol: "kr", rate: 10.85, region: "Europe" },
  DK: { code: "DKK", name: "Danish Krone", symbol: "kr", rate: 6.90, region: "Europe" },
  // UK & EEA
  GB: { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79, region: "Europe" },
  NO: { code: "NOK", name: "Norwegian Krone", symbol: "kr", rate: 10.95, region: "Europe" },
  CH: { code: "CHF", name: "Swiss Franc", symbol: "CHF", rate: 0.88, region: "Europe" },
  IS: { code: "ISK", name: "Icelandic Króna", symbol: "kr", rate: 138.00, region: "Europe" },
};

// ─── AMERICAS (USMCA, MERCOSUR, CAFTA-DR) ────────────────
const AMERICAS: Record<string, CurrencyInfo> = {
  US: { code: "USD", name: "US Dollar", symbol: "$", rate: 1.00, region: "Americas" },
  CA: { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.37, region: "Americas" },
  MX: { code: "MXN", name: "Mexican Peso", symbol: "MX$", rate: 17.15, region: "Americas" },
  BR: { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.05, region: "Americas" },
  AR: { code: "ARS", name: "Argentine Peso", symbol: "AR$", rate: 875.00, region: "Americas" },
  UY: { code: "UYU", name: "Uruguayan Peso", symbol: "$U", rate: 39.50, region: "Americas" },
  PY: { code: "PYG", name: "Paraguayan Guaraní", symbol: "₲", rate: 7350.00, region: "Americas" },
  CL: { code: "CLP", name: "Chilean Peso", symbol: "CL$", rate: 950.00, region: "Americas" },
  CO: { code: "COP", name: "Colombian Peso", symbol: "COL$", rate: 3950.00, region: "Americas" },
  PE: { code: "PEN", name: "Peruvian Sol", symbol: "S/", rate: 3.72, region: "Americas" },
  CR: { code: "CRC", name: "Costa Rican Colón", symbol: "₡", rate: 510.00, region: "Americas" },
  SV: { code: "USD", name: "US Dollar", symbol: "$", rate: 1.00, region: "Americas" },
  GT: { code: "GTQ", name: "Guatemalan Quetzal", symbol: "Q", rate: 7.80, region: "Americas" },
  HN: { code: "HNL", name: "Honduran Lempira", symbol: "L", rate: 24.80, region: "Americas" },
  NI: { code: "NIO", name: "Nicaraguan Córdoba", symbol: "C$", rate: 36.60, region: "Americas" },
  PA: { code: "PAB", name: "Panamanian Balboa", symbol: "B/.", rate: 1.00, region: "Americas" },
  EC: { code: "USD", name: "US Dollar", symbol: "$", rate: 1.00, region: "Americas" },
};

// ─── ASIA (ASEAN + Major Markets) ────────────────────────
const ASIA: Record<string, CurrencyInfo> = {
  CN: { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.25, region: "Asia" },
  JP: { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 151.50, region: "Asia" },
  KR: { code: "KRW", name: "South Korean Won", symbol: "₩", rate: 1340.00, region: "Asia" },
  IN: { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.50, region: "Asia" },
  SG: { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.35, region: "Asia" },
  MY: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", rate: 4.72, region: "Asia" },
  TH: { code: "THB", name: "Thai Baht", symbol: "฿", rate: 36.50, region: "Asia" },
  ID: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", rate: 15800.00, region: "Asia" },
  PH: { code: "PHP", name: "Philippine Peso", symbol: "₱", rate: 56.50, region: "Asia" },
  VN: { code: "VND", name: "Vietnamese Dong", symbol: "₫", rate: 25250.00, region: "Asia" },
  MM: { code: "MMK", name: "Myanmar Kyat", symbol: "K", rate: 2100.00, region: "Asia" },
  KH: { code: "KHR", name: "Cambodian Riel", symbol: "៛", rate: 4100.00, region: "Asia" },
  LA: { code: "LAK", name: "Lao Kip", symbol: "₭", rate: 21500.00, region: "Asia" },
  BN: { code: "BND", name: "Brunei Dollar", symbol: "B$", rate: 1.35, region: "Asia" },
  BD: { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", rate: 110.00, region: "Asia" },
  PK: { code: "PKR", name: "Pakistani Rupee", symbol: "₨", rate: 279.00, region: "Asia" },
  LK: { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", rate: 310.00, region: "Asia" },
  NP: { code: "NPR", name: "Nepalese Rupee", symbol: "₨", rate: 133.50, region: "Asia" },
  TW: { code: "TWD", name: "New Taiwan Dollar", symbol: "NT$", rate: 31.80, region: "Asia" },
  HK: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", rate: 7.82, region: "Asia" },
};

// ─── MIDDLE EAST (GCC + Others) ──────────────────────────
const MIDDLE_EAST: Record<string, CurrencyInfo> = {
  AE: { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67, region: "Middle East" },
  SA: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75, region: "Middle East" },
  QA: { code: "QAR", name: "Qatari Riyal", symbol: "QR", rate: 3.64, region: "Middle East" },
  KW: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", rate: 0.31, region: "Middle East" },
  BH: { code: "BHD", name: "Bahraini Dinar", symbol: "BD", rate: 0.376, region: "Middle East" },
  OM: { code: "OMR", name: "Omani Rial", symbol: "OMR", rate: 0.385, region: "Middle East" },
  IL: { code: "ILS", name: "Israeli Shekel", symbol: "₪", rate: 3.65, region: "Middle East" },
  JO: { code: "JOD", name: "Jordanian Dinar", symbol: "JD", rate: 0.709, region: "Middle East" },
  LB: { code: "LBP", name: "Lebanese Pound", symbol: "L£", rate: 89500.00, region: "Middle East" },
  TR: { code: "TRY", name: "Turkish Lira", symbol: "₺", rate: 32.50, region: "Middle East" },
};

// ─── OCEANIA ─────────────────────────────────────────────
const OCEANIA: Record<string, CurrencyInfo> = {
  AU: { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.54, region: "Oceania" },
  NZ: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", rate: 1.68, region: "Oceania" },
  FJ: { code: "FJD", name: "Fijian Dollar", symbol: "FJ$", rate: 2.26, region: "Oceania" },
  PG: { code: "PGK", name: "Papua New Guinean Kina", symbol: "K", rate: 3.85, region: "Oceania" },
  WS: { code: "WST", name: "Samoan Tala", symbol: "WS$", rate: 2.78, region: "Oceania" },
  TO: { code: "TOP", name: "Tongan Paʻanga", symbol: "T$", rate: 2.38, region: "Oceania" },
  SB: { code: "SBD", name: "Solomon Islands Dollar", symbol: "SI$", rate: 8.45, region: "Oceania" },
  VU: { code: "VUV", name: "Vanuatu Vatu", symbol: "VT", rate: 120.00, region: "Oceania" },
};

// ─── Merged Global Registry ──────────────────────────────
export const GLOBAL_CURRENCIES: Record<string, CurrencyInfo> = {
  ...AFRICA,
  ...CARIBBEAN,
  ...EUROPE,
  ...AMERICAS,
  ...ASIA,
  ...MIDDLE_EAST,
  ...OCEANIA,
};

/**
 * Look up currency info by ISO country code.
 * Returns USD fallback if country not found.
 */
export function getCurrencyForCountry(countryCode: string): CurrencyInfo {
  const cc = (countryCode || "").toUpperCase().trim();
  return GLOBAL_CURRENCIES[cc] ?? { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0, region: "Global" };
}

/**
 * Convert a USD amount to a local currency amount.
 */
export function toLocalCurrency(usdAmount: number, countryCode: string): { amount: number; formatted: string; currency: CurrencyInfo } {
  const currency = getCurrencyForCountry(countryCode);
  const localAmount = usdAmount * currency.rate;
  const formatted = `${currency.symbol}${localAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return { amount: localAmount, formatted, currency };
}

/**
 * Format a dual-currency display string: "$500.00 (₦790,000.00)"
 */
export function formatDualCurrency(usdAmount: number, countryCode: string): string {
  const usdFormatted = `$${usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const currency = getCurrencyForCountry(countryCode);
  if (currency.code === "USD") return usdFormatted;
  const local = toLocalCurrency(usdAmount, countryCode);
  return `${usdFormatted} (${local.formatted} ${currency.code})`;
}

/** Duration (ms) for which a locked exchange rate remains valid */
export const RATE_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ─── Backward compatibility re-exports ───────────────────
// Legacy code imports from africanCurrencies.ts — keep those working
export type AfricanCurrency = CurrencyInfo;
export const AFRICAN_CURRENCIES: Record<string, CurrencyInfo> = AFRICA;

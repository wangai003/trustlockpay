import type { TradeScope } from "@/components/shared/TradeScopeSelector";

/**
 * Global trade blocs and regional corridors.
 * Used to auto-detect "regional" scope when buyer + vendor are in the same bloc.
 * ISO 3166-1 alpha-2 country codes.
 */

export interface TradeBloc {
  id: string;
  name: string;
  shortName: string;
  countries: string[];
}

export const TRADE_BLOCS: TradeBloc[] = [
  // ─── Africa ───
  {
    id: "afcfta",
    name: "African Continental Free Trade Area",
    shortName: "AfCFTA",
    countries: [
      "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD",
      "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
      "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
      "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
      "ZM", "ZW",
    ],
  },
  {
    id: "ecowas",
    name: "Economic Community of West African States",
    shortName: "ECOWAS",
    countries: ["BJ", "BF", "CV", "CI", "GM", "GH", "GN", "GW", "LR", "ML", "NE", "NG", "SN", "SL", "TG"],
  },
  {
    id: "eac",
    name: "East African Community",
    shortName: "EAC",
    countries: ["BI", "CD", "KE", "RW", "SS", "TZ", "UG"],
  },
  {
    id: "sadc",
    name: "Southern African Development Community",
    shortName: "SADC",
    countries: ["AO", "BW", "KM", "CD", "SZ", "LS", "MG", "MW", "MU", "MZ", "NA", "SC", "ZA", "TZ", "ZM", "ZW"],
  },
  {
    id: "cemac",
    name: "Central African Economic & Monetary Community",
    shortName: "CEMAC",
    countries: ["CM", "CF", "TD", "CG", "GQ", "GA"],
  },
  {
    id: "comesa",
    name: "Common Market for Eastern and Southern Africa",
    shortName: "COMESA",
    countries: ["BI", "KM", "CD", "DJ", "EG", "ER", "SZ", "ET", "KE", "LY", "MG", "MW", "MU", "RW", "SC", "SO", "SD", "TN", "UG", "ZM", "ZW"],
  },

  // ─── Europe ───
  {
    id: "eu",
    name: "European Union",
    shortName: "EU",
    countries: [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
      "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
      "SI", "ES", "SE",
    ],
  },
  {
    id: "eea",
    name: "European Economic Area",
    shortName: "EEA",
    countries: [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
      "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
      "SI", "ES", "SE", "IS", "LI", "NO",
    ],
  },
  {
    id: "efta",
    name: "European Free Trade Association",
    shortName: "EFTA",
    countries: ["IS", "LI", "NO", "CH"],
  },

  // ─── Americas ───
  {
    id: "usmca",
    name: "United States–Mexico–Canada Agreement",
    shortName: "USMCA",
    countries: ["US", "CA", "MX"],
  },
  {
    id: "mercosur",
    name: "Southern Common Market",
    shortName: "Mercosur",
    countries: ["AR", "BR", "PY", "UY", "BO"],
  },
  {
    id: "caricom",
    name: "Caribbean Community",
    shortName: "CARICOM",
    countries: ["AG", "BS", "BB", "BZ", "DM", "GD", "GY", "HT", "JM", "KN", "LC", "VC", "SR", "TT"],
  },
  {
    id: "pacific_alliance",
    name: "Pacific Alliance",
    shortName: "Pacific Alliance",
    countries: ["CL", "CO", "MX", "PE"],
  },
  {
    id: "cafta_dr",
    name: "Central America–Dominican Republic Free Trade Agreement",
    shortName: "CAFTA-DR",
    countries: ["US", "CR", "SV", "GT", "HN", "NI", "DO"],
  },

  // ─── Asia-Pacific ───
  {
    id: "asean",
    name: "Association of Southeast Asian Nations",
    shortName: "ASEAN",
    countries: ["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "VN"],
  },
  {
    id: "rcep",
    name: "Regional Comprehensive Economic Partnership",
    shortName: "RCEP",
    countries: [
      "AU", "BN", "KH", "CN", "ID", "JP", "KR", "LA", "MY", "MM", "NZ",
      "PH", "SG", "TH", "VN",
    ],
  },
  {
    id: "cptpp",
    name: "Comprehensive and Progressive Agreement for Trans-Pacific Partnership",
    shortName: "CPTPP",
    countries: ["AU", "BN", "CA", "CL", "JP", "MY", "MX", "NZ", "PE", "SG", "VN", "GB"],
  },
  {
    id: "saarc",
    name: "South Asian Association for Regional Cooperation",
    shortName: "SAARC",
    countries: ["AF", "BD", "BT", "IN", "MV", "NP", "PK", "LK"],
  },
  {
    id: "gcc",
    name: "Gulf Cooperation Council",
    shortName: "GCC",
    countries: ["BH", "KW", "OM", "QA", "SA", "AE"],
  },

  // ─── Eurasia ───
  {
    id: "eaeu",
    name: "Eurasian Economic Union",
    shortName: "EAEU",
    countries: ["AM", "BY", "KZ", "KG", "RU"],
  },

  // ─── Oceania ───
  {
    id: "anzcerta",
    name: "Australia–New Zealand Closer Economic Relations",
    shortName: "ANZCERTA",
    countries: ["AU", "NZ"],
  },
  {
    id: "picta",
    name: "Pacific Island Countries Trade Agreement",
    shortName: "PICTA",
    countries: ["FJ", "KI", "MH", "FM", "NR", "PW", "PG", "WS", "SB", "TO", "TV", "VU"],
  },
];

/**
 * Find all trade blocs that both countries share.
 */
export function getSharedBlocs(countryA: string, countryB: string): TradeBloc[] {
  if (!countryA || !countryB) return [];
  const a = countryA.toUpperCase();
  const b = countryB.toUpperCase();
  return TRADE_BLOCS.filter((bloc) => bloc.countries.includes(a) && bloc.countries.includes(b));
}

/**
 * Auto-detect the most appropriate trade scope.
 */
export function detectTradeScope(buyerCountry: string, vendorCountry: string): { scope: TradeScope; bloc?: TradeBloc } {
  if (!buyerCountry || !vendorCountry) return { scope: "international" };
  const a = buyerCountry.toUpperCase();
  const b = vendorCountry.toUpperCase();
  if (a === b) return { scope: "domestic" };
  const shared = getSharedBlocs(a, b);
  if (shared.length > 0) return { scope: "regional", bloc: shared[0] };
  return { scope: "international" };
}

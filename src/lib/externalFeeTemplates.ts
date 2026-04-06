import type { TradeScope } from "@/components/shared/TradeScopeSelector";

export interface ExternalFeeTemplate {
  label: string;
  typical_range?: string;
  required_scope: TradeScope[];
}

/**
 * Pre-populated external fee suggestions per industry.
 * required_scope controls when the suggestion appears based on trade scope.
 */
export const INDUSTRY_EXTERNAL_FEES: Record<string, ExternalFeeTemplate[]> = {
  logistics: [
    { label: "Freight / Haulage", typical_range: "$200–$5,000", required_scope: ["regional", "international"] },
    { label: "Customs Duty", typical_range: "5–35% CIF", required_scope: ["regional", "international"] },
    { label: "Demurrage", typical_range: "$50–$300/day", required_scope: ["international"] },
    { label: "Port Handling / THC", typical_range: "$150–$800", required_scope: ["international"] },
    { label: "Warehousing", typical_range: "$50–$500", required_scope: ["domestic", "regional", "international"] },
    { label: "Clearing Agent Fee", typical_range: "$100–$500", required_scope: ["regional", "international"] },
    { label: "Inland Haulage", typical_range: "$100–$2,000", required_scope: ["domestic", "regional", "international"] },
  ],
  mining: [
    { label: "Assay / Lab Testing", typical_range: "$200–$2,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Export Royalty", typical_range: "3–10%", required_scope: ["regional", "international"] },
    { label: "Environmental Clearance Fee", typical_range: "$500–$5,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Security Escort", typical_range: "$500–$3,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Customs Declaration", typical_range: "$200–$1,000", required_scope: ["international"] },
    { label: "Chain-of-Custody Insurance", typical_range: "0.5–2%", required_scope: ["international"] },
  ],
  agriculture: [
    { label: "Phytosanitary Certificate", typical_range: "$50–$300", required_scope: ["regional", "international"] },
    { label: "Fumigation", typical_range: "$100–$500", required_scope: ["regional", "international"] },
    { label: "Cold Storage", typical_range: "$100–$1,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Export Levy", typical_range: "2–8%", required_scope: ["international"] },
    { label: "Grading / Quality Inspection", typical_range: "$50–$500", required_scope: ["domestic", "regional", "international"] },
    { label: "Transport to Port", typical_range: "$200–$2,000", required_scope: ["regional", "international"] },
  ],
  automotive: [
    { label: "Import Duty", typical_range: "10–35%", required_scope: ["international"] },
    { label: "Vehicle Inspection (Destination)", typical_range: "$100–$500", required_scope: ["regional", "international"] },
    { label: "RORO / Container Shipping", typical_range: "$800–$5,000", required_scope: ["international"] },
    { label: "Clearing & Forwarding", typical_range: "$200–$1,000", required_scope: ["regional", "international"] },
    { label: "Registration / Licensing", typical_range: "$100–$1,000", required_scope: ["domestic", "regional", "international"] },
  ],
  marine_fisheries: [
    { label: "Landing Fees", typical_range: "$50–$500", required_scope: ["domestic", "regional", "international"] },
    { label: "Cold Chain Logistics", typical_range: "$200–$2,000", required_scope: ["regional", "international"] },
    { label: "Export Health Certificate", typical_range: "$100–$300", required_scope: ["international"] },
    { label: "Fish Quality Inspection", typical_range: "$50–$300", required_scope: ["domestic", "regional", "international"] },
  ],
  energy: [
    { label: "Tank Farm / Storage Rental", typical_range: "$1,000–$50,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Discharge Fee", typical_range: "$500–$5,000", required_scope: ["international"] },
    { label: "NPA / Port Authority Fee", typical_range: "$500–$3,000", required_scope: ["international"] },
    { label: "Pipeline Throughput Fee", typical_range: "$0.50–$2/barrel", required_scope: ["regional", "international"] },
    { label: "Regulatory Compliance Fee", typical_range: "$1,000–$10,000", required_scope: ["domestic", "regional", "international"] },
  ],
  construction: [
    { label: "Building Permit Fee", typical_range: "$200–$10,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Material Import Duty", typical_range: "5–25%", required_scope: ["international"] },
    { label: "Inspection / Survey Fee", typical_range: "$200–$2,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Environmental Impact Fee", typical_range: "$500–$5,000", required_scope: ["domestic", "regional", "international"] },
  ],
  manufacturing: [
    { label: "Raw Material Import Duty", typical_range: "5–20%", required_scope: ["international"] },
    { label: "Quality Certification", typical_range: "$200–$2,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Factory Inspection", typical_range: "$300–$1,500", required_scope: ["regional", "international"] },
  ],
  pharmaceuticals: [
    { label: "NAFDAC / FDA Registration", typical_range: "$500–$5,000", required_scope: ["regional", "international"] },
    { label: "Cold Chain Logistics", typical_range: "$500–$5,000", required_scope: ["regional", "international"] },
    { label: "GMP Audit Fee", typical_range: "$1,000–$10,000", required_scope: ["international"] },
    { label: "Import Permit", typical_range: "$200–$1,000", required_scope: ["international"] },
  ],
  renewable_energy: [
    { label: "Import Duty (Solar Panels)", typical_range: "5–15%", required_scope: ["international"] },
    { label: "Installation Permit", typical_range: "$200–$2,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Grid Connection Fee", typical_range: "$500–$5,000", required_scope: ["domestic", "regional", "international"] },
  ],
  textiles: [
    { label: "Import Duty", typical_range: "10–35%", required_scope: ["international"] },
    { label: "Quality / Standards Testing", typical_range: "$100–$500", required_scope: ["regional", "international"] },
    { label: "Fumigation Certificate", typical_range: "$50–$200", required_scope: ["international"] },
  ],
  aviation: [
    { label: "Landing / Parking Fees", typical_range: "$500–$10,000", required_scope: ["domestic", "regional", "international"] },
    { label: "Customs / Import Duty", typical_range: "5–25%", required_scope: ["international"] },
    { label: "Airworthiness Certification", typical_range: "$1,000–$20,000", required_scope: ["domestic", "regional", "international"] },
  ],
  // Generic fallback for industries not explicitly listed
  _default: [
    { label: "Customs Duty", typical_range: "Varies", required_scope: ["international"] },
    { label: "Shipping / Freight", typical_range: "Varies", required_scope: ["regional", "international"] },
    { label: "Inspection Fee", typical_range: "Varies", required_scope: ["domestic", "regional", "international"] },
  ],
};

export function getExternalFeeSuggestions(industry: string): ExternalFeeTemplate[] {
  const key = industry.replace(/-/g, "_");
  return INDUSTRY_EXTERNAL_FEES[key] || INDUSTRY_EXTERNAL_FEES._default;
}

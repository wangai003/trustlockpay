/**
 * Industry-specific RFQ terminology and configuration.
 * Maps each RFQ-eligible industry to its customer-facing label and form hints.
 */

export interface RFQIndustryTerms {
  rfqLabel: string;         // e.g., "Request for Quote", "Request Custom Quote"
  proformaLabel: string;    // e.g., "Proforma Invoice", "Custom Quote"
  buyerNoun: string;        // e.g., "buyer", "client", "customer"
  specPrompt: string;       // placeholder text for specification notes
}

const RFQ_INDUSTRY_TERMS: Record<string, RFQIndustryTerms> = {
  mining: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Commodity type, tonnage, grade, delivery port...",
  },
  agriculture: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Product type, quantity, quality grade, harvest season...",
  },
  construction: {
    rfqLabel: "Request Project Quote",
    proformaLabel: "Project Estimate",
    buyerNoun: "client",
    specPrompt: "Project type, location, scope of work, timeline...",
  },
  real_estate: {
    rfqLabel: "Request Property Quote",
    proformaLabel: "Property Offer",
    buyerNoun: "buyer",
    specPrompt: "Property type, location, budget range, requirements...",
  },
  freelance: {
    rfqLabel: "Request Custom Quote",
    proformaLabel: "Service Proposal",
    buyerNoun: "client",
    specPrompt: "Project scope, deliverables, timeline, budget range...",
  },
  logistics: {
    rfqLabel: "Request Freight Quote",
    proformaLabel: "Freight Estimate",
    buyerNoun: "shipper",
    specPrompt: "Cargo description, origin, destination, container type...",
  },
  education: {
    rfqLabel: "Request Program Quote",
    proformaLabel: "Program Fee Proposal",
    buyerNoun: "student/organization",
    specPrompt: "Program type, number of participants, duration...",
  },
  project_management: {
    rfqLabel: "Request Engagement Quote",
    proformaLabel: "Engagement Proposal",
    buyerNoun: "client",
    specPrompt: "Project type, scope, deliverables, team size...",
  },
  energy: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Product, volume, grade, delivery point...",
  },
  pharmaceuticals: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Product, quantity, dosage form, cold chain requirements...",
  },
  telecommunications: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "client",
    specPrompt: "Equipment/service type, quantity, deployment scope...",
  },
  manufacturing: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Product specs, MOQ, lead time, tooling requirements...",
  },
  renewable_energy: {
    rfqLabel: "Request Project Quote",
    proformaLabel: "Project Estimate",
    buyerNoun: "client",
    specPrompt: "System type, capacity (kW/MW), installation site...",
  },
  textiles: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Fabric type, quantity, composition, finishing...",
  },
  marine_fisheries: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Catch type, volume, processing, delivery port...",
  },
  water_sanitation: {
    rfqLabel: "Request Project Quote",
    proformaLabel: "Project Estimate",
    buyerNoun: "client",
    specPrompt: "Infrastructure type, capacity, location, timeline...",
  },
  media_entertainment: {
    rfqLabel: "Request Production Quote",
    proformaLabel: "Production Estimate",
    buyerNoun: "client",
    specPrompt: "Project type, scope, deliverables, timeline...",
  },
  aviation: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "client",
    specPrompt: "Service/parts type, quantity, aircraft model...",
  },
  insurance: {
    rfqLabel: "Request Premium Quote",
    proformaLabel: "Premium Proposal",
    buyerNoun: "client",
    specPrompt: "Coverage type, risk profile, insured value, period...",
  },
  legal_services: {
    rfqLabel: "Request Retainer Quote",
    proformaLabel: "Engagement Proposal",
    buyerNoun: "client",
    specPrompt: "Matter type, jurisdiction, scope of work...",
  },
  food_beverage: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Product type, quantity, shelf life, packaging...",
  },
  waste_management: {
    rfqLabel: "Request Service Quote",
    proformaLabel: "Service Estimate",
    buyerNoun: "client",
    specPrompt: "Waste type, volume, frequency, location...",
  },
  automotive: {
    rfqLabel: "Request for Quote",
    proformaLabel: "Proforma Invoice",
    buyerNoun: "buyer",
    specPrompt: "Vehicle/parts type, quantity, shipping method...",
  },
};

const DEFAULT_TERMS: RFQIndustryTerms = {
  rfqLabel: "Request for Quote",
  proformaLabel: "Proforma Invoice",
  buyerNoun: "buyer",
  specPrompt: "Describe your requirements, quantity, and timeline...",
};

export function getRFQTerms(industry: string): RFQIndustryTerms {
  return RFQ_INDUSTRY_TERMS[industry] || DEFAULT_TERMS;
}

/** Industries that should NOT show RFQ option */
const NON_RFQ_INDUSTRIES = new Set(["ecommerce", "tourism"]);

export function isRFQEligible(industry: string): boolean {
  return !NON_RFQ_INDUSTRIES.has(industry);
}

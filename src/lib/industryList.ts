/**
 * Centralized industry list for use across the entire platform.
 * All 25 supported industries with their keys, labels, and milestone requirements.
 */

export interface IndustryOption {
  value: string;
  label: string;
  milestone: boolean;
  /** Whether GPS capture is mandatory for milestone completion */
  gpsRequired: boolean;
}

export const ALL_INDUSTRIES: IndustryOption[] = [
  { value: "ecommerce", label: "E-Commerce / Retail", milestone: false },
  { value: "construction", label: "Construction", milestone: true },
  { value: "real_estate", label: "Real Estate", milestone: true },
  { value: "mining", label: "Mining & Minerals", milestone: true },
  { value: "agriculture", label: "Agriculture & Export", milestone: true },
  { value: "freelance", label: "Freelance / Professional Services", milestone: true },
  { value: "logistics", label: "Logistics & Cross-Border Trade", milestone: true },
  { value: "tourism", label: "Tourism & Hospitality", milestone: false },
  { value: "education", label: "Education & Training", milestone: true },
  { value: "project_management", label: "Project Management", milestone: true },
  { value: "automotive", label: "Automotive & Vehicle Import", milestone: true },
  { value: "energy", label: "Energy / Oil & Gas", milestone: true },
  { value: "pharmaceuticals", label: "Pharmaceuticals & Healthcare", milestone: true },
  { value: "telecommunications", label: "Telecommunications & ICT", milestone: true },
  { value: "manufacturing", label: "Manufacturing & Equipment", milestone: true },
  { value: "renewable_energy", label: "Renewable Energy / Solar", milestone: true },
  { value: "textiles", label: "Textiles & Apparel", milestone: true },
  { value: "marine_fisheries", label: "Marine & Fisheries", milestone: true },
  { value: "water_sanitation", label: "Water & Sanitation (WASH)", milestone: true },
  { value: "media_entertainment", label: "Media, Film & Entertainment", milestone: true },
  { value: "aviation", label: "Aviation & Aerospace", milestone: true },
  { value: "insurance", label: "Insurance & Reinsurance", milestone: true },
  { value: "legal_services", label: "Legal & Professional Services", milestone: true },
  { value: "food_beverage", label: "Food & Beverage (Processed)", milestone: true },
  { value: "waste_management", label: "Waste Management & Recycling", milestone: true },
];

/** Map of value → label for quick lookups */
export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  ALL_INDUSTRIES.map((i) => [i.value, i.label])
);

/** Check if an industry uses milestone-based escrow */
export function isMilestoneIndustryByKey(key: string): boolean {
  return ALL_INDUSTRIES.find((i) => i.value === key)?.milestone ?? false;
}

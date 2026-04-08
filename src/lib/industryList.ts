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
  // GPS optional — digital / service-based
  { value: "ecommerce", label: "E-Commerce / Retail", milestone: false, gpsRequired: false },
  { value: "freelance", label: "Freelance / Professional Services", milestone: true, gpsRequired: false },
  { value: "tourism", label: "Tourism & Hospitality", milestone: false, gpsRequired: false },
  { value: "education", label: "Education & Training", milestone: true, gpsRequired: false },
  { value: "telecommunications", label: "Telecommunications & ICT", milestone: true, gpsRequired: false },
  { value: "media_entertainment", label: "Media, Film & Entertainment", milestone: true, gpsRequired: false },
  { value: "insurance", label: "Insurance & Reinsurance", milestone: true, gpsRequired: false },
  { value: "legal_services", label: "Legal & Professional Services", milestone: true, gpsRequired: false },
  { value: "project_management", label: "Project Management", milestone: true, gpsRequired: false },
  // GPS required — physical goods / site work / cross-border
  { value: "construction", label: "Construction", milestone: true, gpsRequired: true },
  { value: "real_estate", label: "Real Estate", milestone: true, gpsRequired: true },
  { value: "mining", label: "Mining & Minerals", milestone: true, gpsRequired: true },
  { value: "agriculture", label: "Agriculture & Export", milestone: true, gpsRequired: true },
  { value: "logistics", label: "Logistics & Cross-Border Trade", milestone: true, gpsRequired: true },
  { value: "automotive", label: "Automotive & Vehicle Import", milestone: true, gpsRequired: true },
  { value: "energy", label: "Energy / Oil & Gas", milestone: true, gpsRequired: true },
  { value: "pharmaceuticals", label: "Pharmaceuticals & Healthcare", milestone: true, gpsRequired: true },
  { value: "manufacturing", label: "Manufacturing & Equipment", milestone: true, gpsRequired: true },
  { value: "renewable_energy", label: "Renewable Energy / Solar", milestone: true, gpsRequired: true },
  { value: "textiles", label: "Textiles & Apparel", milestone: true, gpsRequired: true },
  { value: "marine_fisheries", label: "Marine & Fisheries", milestone: true, gpsRequired: true },
  { value: "water_sanitation", label: "Water & Sanitation (WASH)", milestone: true, gpsRequired: true },
  { value: "aviation", label: "Aviation & Aerospace", milestone: true, gpsRequired: true },
  { value: "food_beverage", label: "Food & Beverage (Processed)", milestone: true, gpsRequired: true },
  { value: "waste_management", label: "Waste Management & Recycling", milestone: true, gpsRequired: true },
];

/** Map of value → label for quick lookups */
export const INDUSTRY_LABELS: Record<string, string> = Object.fromEntries(
  ALL_INDUSTRIES.map((i) => [i.value, i.label])
);

/** Check if an industry uses milestone-based escrow */
export function isMilestoneIndustryByKey(key: string): boolean {
  return ALL_INDUSTRIES.find((i) => i.value === key)?.milestone ?? false;
}

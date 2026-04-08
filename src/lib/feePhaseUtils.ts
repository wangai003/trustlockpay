/**
 * Fee Phase Classification Utilities
 * Temporal classification of external fees in the trade lifecycle.
 */

export type FeePhase = "pre_escrow" | "pre_shipment" | "in_transit" | "post_arrival";

export const FEE_PHASE_LABELS: Record<FeePhase, string> = {
  pre_escrow: "Pre-Escrow",
  pre_shipment: "Pre-Shipment",
  in_transit: "In-Transit",
  post_arrival: "Post-Arrival",
};

export const FEE_PHASE_ICONS: Record<FeePhase, string> = {
  pre_escrow: "📋",
  pre_shipment: "📦",
  in_transit: "🚢",
  post_arrival: "🏗️",
};

export const FEE_PHASE_ORDER: FeePhase[] = ["pre_escrow", "pre_shipment", "in_transit", "post_arrival"];

/**
 * Auto-suggest a fee phase based on fee label and milestone position.
 */
export function suggestFeePhase(feeLabel: string, milestoneIndex: number, totalMilestones: number): FeePhase {
  const lower = feeLabel.toLowerCase();

  // Pre-escrow indicators
  if (/letter\s*of\s*credit|lc\s*fee|inspection.*pre|proforma|advance/i.test(lower)) return "pre_escrow";

  // In-transit indicators
  if (/freight|shipping|demurrage|port\s*handling|container|roro|pipeline/i.test(lower)) return "in_transit";

  // Post-arrival indicators
  if (/customs\s*duty|import\s*duty|landing|unload|discharge|clearing|last\s*mile|delivery/i.test(lower)) return "post_arrival";

  // Position-based fallback
  const position = totalMilestones > 0 ? milestoneIndex / totalMilestones : 0;
  if (position < 0.3) return "pre_shipment";
  if (position < 0.7) return "in_transit";
  return "post_arrival";
}

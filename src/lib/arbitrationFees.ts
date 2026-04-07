/**
 * Tiered flat-fee schedule for Arbitration Filing & Case Management.
 * Covers TrustLock's coordination costs — arbitrator professional fees are separate.
 */

export const ARBITRATION_TIERS = [
  { min: 10_000, max: 50_000, fee: 500 },
  { min: 50_000, max: 250_000, fee: 1_500 },
  { min: 250_000, max: 1_000_000, fee: 3_000 },
  { min: 1_000_000, max: Infinity, fee: 5_000 },
] as const;

export const ARBITRATION_MIN_ESCROW = 10_000;

/**
 * Returns the flat arbitration filing fee for a given escrow amount.
 * Returns 0 if below threshold.
 */
export function getArbitrationFee(escrowAmount: number): number {
  if (escrowAmount < ARBITRATION_MIN_ESCROW) return 0;
  for (const tier of ARBITRATION_TIERS) {
    if (escrowAmount >= tier.min && escrowAmount < tier.max) return tier.fee;
  }
  return ARBITRATION_TIERS[ARBITRATION_TIERS.length - 1].fee;
}

/**
 * Human-readable fee schedule string for UI display.
 */
export function getArbitrationFeeScheduleText(): string {
  return ARBITRATION_TIERS.map(t => {
    const maxLabel = t.max === Infinity ? "+" : ` – $${(t.max).toLocaleString()}`;
    return `$${t.min.toLocaleString()}${maxLabel}: $${t.fee.toLocaleString()}`;
  }).join(" · ");
}

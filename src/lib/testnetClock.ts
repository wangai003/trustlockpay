// Guided Testnet — client-side time compression helper.
// Mirrors the public.testnet_clock_effective_now SQL function so the UI
// can show compressed deadlines (e.g. auto-release tiebreaker) without
// a round trip. Mainnet always returns the real timestamp.

const DEFAULT_COMPRESSION_RATIO = 1440; // 1 real-day → 1 minute

export type TestnetNetwork = "mainnet" | "testnet";

/**
 * Returns the "effective now" for time-based logic on testnet.
 * On mainnet, returns the supplied real timestamp unchanged.
 */
export function testnetEffectiveNow(
  realStart: Date | string,
  network: TestnetNetwork,
  compressionRatio: number = DEFAULT_COMPRESSION_RATIO,
): Date {
  const start =
    typeof realStart === "string" ? new Date(realStart) : realStart;
  if (network !== "testnet") return new Date();
  const elapsedMs = Date.now() - start.getTime();
  return new Date(start.getTime() + elapsedMs * compressionRatio);
}

/**
 * Effective remaining ms until a deadline, with testnet compression applied.
 * Negative when the (compressed) deadline has passed.
 */
export function testnetRemainingMs(
  realStart: Date | string,
  realDeadline: Date | string,
  network: TestnetNetwork,
  compressionRatio: number = DEFAULT_COMPRESSION_RATIO,
): number {
  const deadline =
    typeof realDeadline === "string" ? new Date(realDeadline) : realDeadline;
  const effectiveNow = testnetEffectiveNow(
    realStart,
    network,
    compressionRatio,
  );
  return deadline.getTime() - effectiveNow.getTime();
}

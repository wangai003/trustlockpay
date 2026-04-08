/**
 * Normalize a name for signature matching:
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces into one
 * - Lowercase
 * NOTE: Accents/diacritics are preserved (é ≠ e) to respect legal names.
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Check if two names match after normalization.
 */
export function namesMatch(typed: string, expected: string): boolean {
  return normalizeName(typed) === normalizeName(expected);
}

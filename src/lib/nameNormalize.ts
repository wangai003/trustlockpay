/**
 * Normalize a name for signature matching:
 * - Trim leading/trailing whitespace
 * - Collapse multiple spaces into one
 * - Remove diacritics/accents (é → e, ñ → n, etc.)
 * - Lowercase
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Check if two names match after normalization.
 */
export function namesMatch(typed: string, expected: string): boolean {
  return normalizeName(typed) === normalizeName(expected);
}

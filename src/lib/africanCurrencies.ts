/**
 * @deprecated Use globalCurrencies.ts instead.
 * This file re-exports for backward compatibility.
 */
export {
  AFRICAN_CURRENCIES,
  RATE_LOCK_DURATION_MS,
  type AfricanCurrency,
} from "./globalCurrencies";
export { getCurrencyForCountry, toLocalCurrency, formatDualCurrency } from "./globalCurrencies";
export type { CurrencyInfo } from "./globalCurrencies";

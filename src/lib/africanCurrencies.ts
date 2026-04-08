/**
 * African Currency Exchange Rates (indicative, would be fetched from API in production)
 * Shared across TrustLockOSPay, TrustLockDualCheckout, and other payment UIs.
 */

export interface AfricanCurrency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export const AFRICAN_CURRENCIES: Record<string, AfricanCurrency> = {
  NG: { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 1580.00 },
  KE: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 153.50 },
  GH: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", rate: 15.80 },
  ZA: { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.25 },
  CM: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00 },
  EG: { code: "EGP", name: "Egyptian Pound", symbol: "E£", rate: 50.85 },
  UG: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", rate: 3780.00 },
  TZ: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rate: 2650.00 },
  RW: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", rate: 1350.00 },
  SN: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  CI: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  ML: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  BF: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  BJ: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  TG: { code: "XOF", name: "CFA Franc (WAEMU)", symbol: "FCFA", rate: 610.00 },
  ZM: { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", rate: 27.50 },
  MW: { code: "MWK", name: "Malawian Kwacha", symbol: "MK", rate: 1720.00 },
  MG: { code: "MGA", name: "Malagasy Ariary", symbol: "Ar", rate: 4550.00 },
};

/** Duration (ms) for which a locked exchange rate remains valid */
export const RATE_LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

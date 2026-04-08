import { describe, it, expect } from "vitest";
import { AFRICAN_CURRENCIES, RATE_LOCK_DURATION_MS } from "@/lib/africanCurrencies";

describe("African Currencies", () => {
  it("contains all major currencies", () => {
    expect(AFRICAN_CURRENCIES.NG.code).toBe("NGN");
    expect(AFRICAN_CURRENCIES.KE.code).toBe("KES");
    expect(AFRICAN_CURRENCIES.GH.code).toBe("GHS");
    expect(AFRICAN_CURRENCIES.ZA.code).toBe("ZAR");
    expect(AFRICAN_CURRENCIES.EG.code).toBe("EGP");
  });

  it("rates are positive numbers", () => {
    for (const [key, curr] of Object.entries(AFRICAN_CURRENCIES)) {
      expect(curr.rate).toBeGreaterThan(0);
      expect(curr.symbol.length).toBeGreaterThan(0);
      expect(curr.code.length).toBe(3);
    }
  });

  it("WAEMU countries share same rate", () => {
    const waemu = ["SN", "CI", "ML", "BF", "BJ", "TG"];
    const rates = waemu.map(c => AFRICAN_CURRENCIES[c].rate);
    expect(new Set(rates).size).toBe(1);
  });

  it("RATE_LOCK_DURATION_MS is 30 minutes", () => {
    expect(RATE_LOCK_DURATION_MS).toBe(30 * 60 * 1000);
  });
});

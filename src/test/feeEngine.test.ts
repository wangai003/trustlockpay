import { describe, it, expect } from "vitest";
import {
  calculateFeesV2,
  selectProcessor,
  PROCESSORS,
  AZIX_WALLETS,
  getFeeRangeForType,
  type TransactionType,
  type ProcessorId,
} from "@/lib/feeEngine";

describe("Fee Engine V2", () => {
  describe("selectProcessor", () => {
    it("returns direct for crypto transactions", () => {
      expect(selectProcessor("US", true)).toBe("direct");
    });

    it("returns yellow_card for African countries", () => {
      expect(selectProcessor("Nigeria", false)).toBe("yellow_card");
      expect(selectProcessor("Kenya", false)).toBe("yellow_card");
      expect(selectProcessor("Ghana", false)).toBe("yellow_card");
    });

    it("returns coinbase for supported non-African regions", () => {
      expect(selectProcessor("US", false)).toBe("coinbase");
      expect(selectProcessor("EU", false)).toBe("coinbase");
    });

    it("returns stripe for unsupported regions", () => {
      expect(selectProcessor("Japan", false)).toBe("stripe");
    });

    it("respects processorHint override", () => {
      expect(selectProcessor("Nigeria", false, "stripe")).toBe("stripe");
    });
  });

  describe("calculateFeesV2", () => {
    it("calculates checkout_fiat fees correctly", () => {
      const result = calculateFeesV2(100, "checkout_fiat", "stripe");
      expect(result.trustlockFee).toBe(1.5);        // 1.5%
      expect(result.processorFee).toBe(2.9);         // Stripe 2.9%
      expect(result.escrowFee).toBe(0.5);            // 0.5%
      expect(result.gasFee).toBe(0.02);
      expect(result.totalFees).toBeCloseTo(4.92, 2);
      expect(result.netAmount).toBeCloseTo(95.08, 2);
      expect(result.transactionWalletReceives).toBe(1.5);
      expect(result.escrowWalletReceives).toBe(0.5);
    });

    it("calculates checkout_crypto with direct (no processor fee)", () => {
      const result = calculateFeesV2(100, "checkout_crypto", "direct");
      expect(result.processorFee).toBe(0);
      expect(result.trustlockFee).toBe(1.0);
      expect(result.escrowFee).toBe(0.5);
    });

    it("charges zero escrow fee on refunds", () => {
      const refundCrypto = calculateFeesV2(100, "refund_crypto", "direct");
      expect(refundCrypto.escrowFee).toBe(0);
      expect(refundCrypto.trustlockFee).toBe(0);
      expect(refundCrypto.escrowWalletReceives).toBe(0);

      const refundFiat = calculateFeesV2(100, "refund_fiat", "stripe");
      expect(refundFiat.escrowFee).toBe(0);
      expect(refundFiat.trustlockFee).toBe(0);
    });

    it("charges escrow fee only on vendor share for split_payout", () => {
      const result = calculateFeesV2(1000, "split_payout", "coinbase", {
        splitVendorShare: 0.6,
      });
      // Escrow 1% on vendor's $600 = $6
      expect(result.escrowFee).toBe(6);
      expect(result.escrowWalletReceives).toBe(6);
    });

    it("handles zero amount without division errors", () => {
      const result = calculateFeesV2(0, "checkout_fiat", "stripe");
      expect(result.feePercentage).toBe(0);
      expect(result.totalFees).toBeCloseTo(0.02); // gas only
    });

    it("os_payment has no escrow fee", () => {
      const result = calculateFeesV2(50, "os_payment", "stripe");
      expect(result.escrowFee).toBe(0);
      expect(result.trustlockFee).toBe(0.75); // 1.5%
    });

    it("release_to_vendor charges only escrow fee", () => {
      const result = calculateFeesV2(500, "release_to_vendor", "direct");
      expect(result.trustlockFee).toBe(0);
      expect(result.processorFee).toBe(0);
      expect(result.escrowFee).toBe(5); // 1%
      expect(result.escrowWalletReceives).toBe(5);
    });
  });

  describe("Wallet configuration", () => {
    it("has two distinct wallets", () => {
      expect(AZIX_WALLETS.transaction.publicKey).not.toBe(AZIX_WALLETS.escrow.publicKey);
    });

    it("wallet keys are non-empty strings", () => {
      expect(AZIX_WALLETS.transaction.publicKey.length).toBeGreaterThan(0);
      expect(AZIX_WALLETS.escrow.publicKey.length).toBeGreaterThan(0);
    });
  });

  describe("Processor configuration", () => {
    it("all processors have required fields", () => {
      for (const [id, config] of Object.entries(PROCESSORS)) {
        expect(config.name).toBeTruthy();
        expect(typeof config.feeRate).toBe("number");
        expect(config.feeRate).toBeGreaterThanOrEqual(0);
        expect(config.regions.length).toBeGreaterThan(0);
      }
    });

    it("direct processor has 0% fee", () => {
      expect(PROCESSORS.direct.feeRate).toBe(0);
      expect(PROCESSORS.direct.supportsFiat).toBe(false);
    });
  });

  describe("getFeeRangeForType", () => {
    it("returns valid ranges for all transaction types", () => {
      const types: TransactionType[] = [
        "checkout_fiat", "checkout_crypto", "release_to_vendor",
        "refund_crypto", "refund_fiat", "split_payout", "os_payment"
      ];
      for (const t of types) {
        const range = getFeeRangeForType(t);
        expect(range).toBeTruthy();
        expect(range.includes("%")).toBe(true);
      }
    });
  });
});

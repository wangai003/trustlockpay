import { describe, it, expect } from "vitest";
import {
  calculateFeesV2,
  selectProcessor,
  getEligibleProcessors,
  PROCESSORS,
  AZIX_WALLETS,
  getFeeRangeForType,
  type TransactionType,
  type ProcessorId,
} from "@/lib/feeEngine";

describe("Fee Engine V2", () => {
  describe("selectProcessor (cost-optimized)", () => {
    it("returns direct for crypto transactions", () => {
      expect(selectProcessor("US", true)).toBe("direct");
    });

    it("picks cheapest processor for African countries (coinbase/transak at 1.5%)", () => {
      const result = selectProcessor("Nigeria", false);
      expect(["coinbase", "transak"]).toContain(result);
    });

    it("picks cheapest for US (coinbase/transak at 1.5% beats stripe at 2.9%)", () => {
      const result = selectProcessor("US", false);
      expect(["coinbase", "transak"]).toContain(result);
    });

    it("picks transak for regions where transak has global coverage (cheaper than stripe)", () => {
      expect(selectProcessor("JP", false)).toBe("transak");
    });

    it("respects processorHint override", () => {
      expect(selectProcessor("Nigeria", false, "stripe")).toBe("stripe");
    });

    it("selects by payment method — mobile_money excludes stripe", () => {
      const result = selectProcessor("Kenya", false, undefined, "mobile_money");
      expect(["coinbase", "transak"]).toContain(result);
    });

    it("selects crypto method → direct", () => {
      const result = selectProcessor("US", false, undefined, "crypto");
      expect(result).toBe("direct");
    });
  });

  describe("getEligibleProcessors", () => {
    it("returns multiple candidates sorted by combined rate", () => {
      const eligible = getEligibleProcessors("US", "card", "checkout_fiat");
      expect(eligible.length).toBeGreaterThan(1);
      for (let i = 1; i < eligible.length; i++) {
        expect(eligible[i].combinedRate).toBeGreaterThanOrEqual(eligible[i - 1].combinedRate);
      }
    });

    it("excludes stripe for mobile_money", () => {
      const eligible = getEligibleProcessors("Nigeria", "mobile_money", "checkout_fiat");
      const ids = eligible.map(e => e.id);
      expect(ids).not.toContain("stripe");
      expect(ids.length).toBeGreaterThan(0);
    });

    it("returns only direct for crypto method", () => {
      const eligible = getEligibleProcessors("US", "crypto", "checkout_crypto");
      const ids = eligible.map(e => e.id);
      expect(ids).toContain("direct");
      expect(eligible[0].id).toBe("direct");
    });
  });

  describe("calculateFeesV2", () => {
    it("calculates checkout_fiat fees correctly (0.5% escrow deposit, gasless)", () => {
      const result = calculateFeesV2(100, "checkout_fiat", "stripe");
      expect(result.trustlockFee).toBe(1.5);
      expect(result.processorFee).toBe(2.9);
      expect(result.escrowFee).toBe(0.5);          // 0.5% escrow deposit at checkout
      // gasFee removed — gasless architecture
      expect(result.totalFees).toBeCloseTo(4.9, 2);
      expect(result.netAmount).toBeCloseTo(95.1, 2);
      expect(result.transactionWalletReceives).toBe(2); // trustlock 1.5 + escrow trickle 0.5
      expect(result.escrowWalletReceives).toBe(100.5);  // principal + 0.5% escrow deposit
      expect(result.feeTrickleToTransactionWallet).toBe(0.5);
    });

    it("calculates checkout_crypto with direct (no processor fee)", () => {
      const result = calculateFeesV2(100, "checkout_crypto", "direct");
      expect(result.processorFee).toBe(0);
      expect(result.trustlockFee).toBe(1.0);
      expect(result.escrowFee).toBe(0.5);         // 0.5% escrow deposit
      // gasFee removed — gasless
    });

    it("charges zero escrow fee on refunds and $0 gas", () => {
      const refundCrypto = calculateFeesV2(100, "refund_crypto", "direct");
      expect(refundCrypto.escrowFee).toBe(0);
      expect(refundCrypto.trustlockFee).toBe(0);
      // gasFee removed — gasless
      expect(refundCrypto.escrowWalletReceives).toBe(0);

      const refundFiat = calculateFeesV2(100, "refund_fiat", "stripe");
      expect(refundFiat.escrowFee).toBe(0);
      expect(refundFiat.trustlockFee).toBe(0);
      // gasFee removed — gasless
    });

    it("charges escrow fee only on vendor share for split_payout (halved rate)", () => {
      const result = calculateFeesV2(1000, "split_payout", "coinbase", {
        splitVendorShare: 0.6,
      });
      // Halved rate: 0.5% on vendor share (600) = $3
      expect(result.escrowFee).toBe(3);
      expect(result.escrowWalletReceives).toBe(0);
      expect(result.feeTrickleToTransactionWallet).toBe(3);
      expect(result.trickleRule).toBe("vendor_share_only");
      // gasFee removed — gasless
    });

    it("handles zero amount without division errors", () => {
      const result = calculateFeesV2(0, "checkout_fiat", "stripe");
      expect(result.feePercentage).toBe(0);
      expect(result.totalFees).toBe(0);            // $0 gas now
    });

    it("os_payment has no escrow fee", () => {
      const result = calculateFeesV2(50, "os_payment", "stripe");
      expect(result.escrowFee).toBe(0);
      expect(result.trustlockFee).toBe(0.75);
    });

    it("release_to_vendor charges $0 — escrow fee pre-paid at checkout", () => {
      const result = calculateFeesV2(500, "release_to_vendor", "direct");
      expect(result.trustlockFee).toBe(0);
      expect(result.processorFee).toBe(0);
      expect(result.escrowFee).toBe(0);            // Pre-paid, no additional charge
      // gasFee removed — gasless
      expect(result.totalFees).toBe(0);
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
        expect(config.supportedMethods.length).toBeGreaterThan(0);
      }
    });

    it("direct processor has 0% fee", () => {
      expect(PROCESSORS.direct.feeRate).toBe(0);
      expect(PROCESSORS.direct.supportsFiat).toBe(false);
    });

    it("only 3 active processors plus direct", () => {
      const ids = Object.keys(PROCESSORS);
      expect(ids).toContain("stripe");
      expect(ids).toContain("coinbase");
      expect(ids).toContain("transak");
      expect(ids).toContain("direct");
      expect(ids.length).toBe(4);
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
        // All ranges should contain either %, $, or descriptive text
        expect(range.length).toBeGreaterThan(5);
      }
    });
  });
});

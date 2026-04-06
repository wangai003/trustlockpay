import { describe, it, expect } from "vitest";
import {
  calculateFeesV2,
  calculateBuyerFeeDisplay,
  calculateInvoiceFees,
  selectProcessor,
  getEligibleProcessors,
  PROCESSORS,
  AZIX_WALLETS,
  getFeeRangeForType,
  BUYER_FEE_LINES,
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
    it("calculates checkout_fiat fees correctly (0.5% TrustLock tx fee, no escrow deposit)", () => {
      const result = calculateFeesV2(100, "checkout_fiat", "stripe");
      expect(result.trustlockFee).toBe(0.5);
      expect(result.processorFee).toBe(2.9);
      expect(result.escrowFee).toBe(0);
      expect(result.totalFees).toBeCloseTo(3.4, 2);
      expect(result.netAmount).toBeCloseTo(96.6, 2);
      expect(result.transactionWalletReceives).toBe(0.5);
      expect(result.escrowWalletReceives).toBe(100);
      expect(result.feeTrickleToTransactionWallet).toBe(0);
    });

    it("calculates checkout_crypto with direct (no processor fee)", () => {
      const result = calculateFeesV2(100, "checkout_crypto", "direct");
      expect(result.processorFee).toBe(0);
      expect(result.trustlockFee).toBe(0.5);
      expect(result.escrowFee).toBe(0);
      expect(result.totalFees).toBeCloseTo(0.5, 2);
      expect(result.escrowWalletReceives).toBe(100);
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

    it("charges escrow fee only on vendor share for split_payout (halved rate)", () => {
      const result = calculateFeesV2(1000, "split_payout", "coinbase", {
        splitVendorShare: 0.6,
      });
      expect(result.escrowFee).toBe(3);
      expect(result.escrowWalletReceives).toBe(0);
      expect(result.feeTrickleToTransactionWallet).toBe(3);
      expect(result.trickleRule).toBe("vendor_share_only");
    });

    it("handles zero amount without division errors", () => {
      const result = calculateFeesV2(0, "checkout_fiat", "stripe");
      expect(result.feePercentage).toBe(0);
      expect(result.totalFees).toBe(0);
    });

    it("os_payment has no escrow fee", () => {
      const result = calculateFeesV2(50, "os_payment", "stripe");
      expect(result.escrowFee).toBe(0);
      expect(result.trustlockFee).toBe(0.75);
    });

    it("release_to_vendor charges 1% escrow service fee (extracted from principal)", () => {
      const result = calculateFeesV2(500, "release_to_vendor", "direct");
      expect(result.trustlockFee).toBe(0);
      expect(result.processorFee).toBe(0);
      expect(result.escrowFee).toBe(5);
      expect(result.totalFees).toBe(5);
      expect(result.feeTrickleToTransactionWallet).toBe(5);
    });
  });

  describe("calculateBuyerFeeDisplay (3-line model)", () => {
    it("combines processor + TrustLock into single Transaction Fee line", () => {
      const display = calculateBuyerFeeDisplay(1000, "stripe", 50);
      // Transaction Fee = 0.5% TrustLock ($5) + 2.9% Stripe ($29) = $34
      expect(display.transactionFee).toBe(34);
      expect(display.transactionFeeLabel).toBe("Transaction Fee");
    });

    it("shows Taxes & Duties as a single combined line", () => {
      const display = calculateBuyerFeeDisplay(1000, "stripe", 75);
      expect(display.taxesAndDuties).toBe(75);
      expect(display.taxesAndDutiesLabel).toBe("Taxes & Duties");
    });

    it("shows Escrow Service Fee as informational (1%)", () => {
      const display = calculateBuyerFeeDisplay(1000, "stripe");
      expect(display.escrowServiceFee).toBe(10);
      expect(display.escrowServiceFeeNote).toContain("not charged to you upfront");
    });

    it("totalBuyerCharge = principal + transaction fee + taxes (excludes escrow)", () => {
      const display = calculateBuyerFeeDisplay(1000, "stripe", 50);
      // 1000 + 34 + 50 = 1084
      expect(display.totalBuyerCharge).toBe(1084);
    });

    it("crypto direct has minimal transaction fee", () => {
      const display = calculateBuyerFeeDisplay(1000, "direct");
      expect(display.transactionFee).toBe(5); // only 0.5% TrustLock
    });
  });

  describe("calculateInvoiceFees with remittance", () => {
    it("includes remittance fee in transactionWalletReceives", () => {
      const result = calculateInvoiceFees(1000, "stripe", false, 50, 1);
      expect(result.remittanceFee).toBe(1);
      // Transaction wallet gets: 0.5% ($5) + taxes ($50) + remittance ($1) = $56
      expect(result.transactionWalletReceives).toBe(56);
    });

    it("buyerDisplay bundles taxes + remittance into Taxes & Duties", () => {
      const result = calculateInvoiceFees(1000, "stripe", false, 50, 1);
      expect(result.buyerDisplay.taxesAndDuties).toBe(51); // 50 + 1
    });
  });

  describe("BUYER_FEE_LINES constants", () => {
    it("has exactly 3 buyer-facing lines", () => {
      expect(Object.keys(BUYER_FEE_LINES)).toHaveLength(3);
      expect(BUYER_FEE_LINES.transactionFee).toBeDefined();
      expect(BUYER_FEE_LINES.taxesAndDuties).toBeDefined();
      expect(BUYER_FEE_LINES.escrowServiceFee).toBeDefined();
    });

    it("escrow service fee note mentions vendor payout", () => {
      expect(BUYER_FEE_LINES.escrowServiceFee.description).toContain("vendor");
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
        expect(range.length).toBeGreaterThan(5);
      }
    });
  });
});

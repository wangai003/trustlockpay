import { describe, it, expect } from "vitest";
import {
  PLANS,
  PLAN_ORDER,
  getVendorPlanState,
  getOrderRangeLabel,
  getRequiredPlanForOrders,
  getPlanPrice,
  type PlanId,
} from "@/hooks/useVendorPlan";

describe("Vendor Plan Logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("PLANS configuration", () => {
    it("has all 5 tiers defined", () => {
      expect(Object.keys(PLANS)).toHaveLength(5);
      expect(PLAN_ORDER).toEqual(["basic", "starter", "growth", "professional", "enterprise"]);
    });

    it("basic plan is free", () => {
      expect(PLANS.basic.monthly).toBe(0);
      expect(PLANS.basic.yearly).toBe(0);
      expect(PLANS.basic.isPaid).toBe(false);
    });

    it("enterprise is unlimited", () => {
      expect(PLANS.enterprise.orderMax).toBe(-1);
    });

    it("order ranges are contiguous", () => {
      for (let i = 1; i < PLAN_ORDER.length; i++) {
        const prev = PLANS[PLAN_ORDER[i - 1]];
        const curr = PLANS[PLAN_ORDER[i]];
        if (prev.orderMax !== -1) {
          expect(curr.orderMin).toBe(prev.orderMax + 1);
        }
      }
    });

    it("yearly prices offer savings over monthly", () => {
      for (const id of PLAN_ORDER) {
        const p = PLANS[id];
        if (p.isPaid) {
          expect(p.yearly).toBeLessThan(p.monthly * 12);
        }
      }
    });
  });

  describe("getVendorPlanState", () => {
    it("returns basic with no stored data", () => {
      const state = getVendorPlanState();
      expect(state.currentPlan).toBe("basic");
      expect(state.isTrialActive).toBe(false);
      expect(state.isExpired).toBe(false);
    });

    it("handles active free trial", () => {
      localStorage.setItem("tl_vendor_plan", "free");
      localStorage.setItem("tl_vendor_trial_start", new Date().toISOString());
      const state = getVendorPlanState();
      expect(state.isTrialActive).toBe(true);
      expect(state.currentPlan).toBe("growth"); // trial gives Growth access
      expect(state.trialDaysLeft).toBeGreaterThan(0);
    });

    it("handles expired trial", () => {
      localStorage.setItem("tl_vendor_plan", "free");
      const expired = new Date();
      expired.setDate(expired.getDate() - 31);
      localStorage.setItem("tl_vendor_trial_start", expired.toISOString());
      const state = getVendorPlanState();
      expect(state.isTrialActive).toBe(false);
      expect(state.currentPlan).toBe("basic");
    });

    it("handles active paid plan", () => {
      localStorage.setItem("tl_vendor_plan", "starter");
      localStorage.setItem("tl_vendor_billing", "monthly");
      const future = new Date();
      future.setDate(future.getDate() + 20);
      localStorage.setItem("tl_vendor_plan_expires", future.toISOString());
      const state = getVendorPlanState();
      expect(state.currentPlan).toBe("starter");
      expect(state.isExpired).toBe(false);
      expect(state.daysUntilExpiry).toBeGreaterThan(0);
    });

    it("handles expired paid plan", () => {
      localStorage.setItem("tl_vendor_plan", "growth");
      const past = new Date();
      past.setDate(past.getDate() - 5);
      localStorage.setItem("tl_vendor_plan_expires", past.toISOString());
      const state = getVendorPlanState();
      expect(state.currentPlan).toBe("basic");
      expect(state.isExpired).toBe(true);
    });
  });

  describe("getRequiredPlanForOrders", () => {
    it("returns basic for ≤15 orders", () => {
      expect(getRequiredPlanForOrders(1)).toBe("basic");
      expect(getRequiredPlanForOrders(15)).toBe("basic");
    });

    it("returns starter for 16-75", () => {
      expect(getRequiredPlanForOrders(16)).toBe("starter");
      expect(getRequiredPlanForOrders(75)).toBe("starter");
    });

    it("returns enterprise for 1001+", () => {
      expect(getRequiredPlanForOrders(1001)).toBe("enterprise");
      expect(getRequiredPlanForOrders(50000)).toBe("enterprise");
    });
  });

  describe("getPlanPrice", () => {
    it("returns correct price for billing cycle", () => {
      expect(getPlanPrice("starter", "monthly")).toBe(5);
      expect(getPlanPrice("starter", "yearly")).toBe(50);
      expect(getPlanPrice("enterprise", "monthly")).toBe(75);
      expect(getPlanPrice("enterprise", "yearly")).toBe(750);
    });
  });

  describe("getOrderRangeLabel", () => {
    it("shows unlimited for enterprise", () => {
      expect(getOrderRangeLabel(PLANS.enterprise)).toContain("Unlimited");
    });

    it("shows range for bounded plans", () => {
      expect(getOrderRangeLabel(PLANS.starter)).toBe("16–75");
    });
  });
});

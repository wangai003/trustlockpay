// Centralized vendor plan state management
export type PlanId = "basic" | "starter" | "growth" | "professional" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanConfig {
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  orderMin: number;
  orderMax: number; // -1 = unlimited
  features: string[];
  isPaid: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  basic: {
    id: "basic",
    name: "Basic",
    monthly: 0,
    yearly: 0,
    orderMin: 1,
    orderMax: 15,
    features: [
      "1–15 orders/month",
      "Basic dashboard (read-only analytics)",
      "Email support",
      "10MB document storage",
      "TrustLock Pay widget active",
    ],
    isPaid: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthly: 5,
    yearly: 50,
    orderMin: 16,
    orderMax: 75,
    features: [
      "16–75 orders/month",
      "Full dashboard access",
      "Basic analytics & reports",
      "20 free AI queries/month",
      "Email support",
      "50MB document storage",
      "Auto-delivery toggle",
    ],
    isPaid: true,
  },
  growth: {
    id: "growth",
    name: "Growth",
    monthly: 15,
    yearly: 150,
    orderMin: 76,
    orderMax: 300,
    features: [
      "76–300 orders/month",
      "Advanced analytics & reports",
      "TrustLock Assist AI (unlimited)",
      "Priority email support",
      "200MB document storage",
      "CSV/PDF data export",
      "Auto-delivery toggle",
      "Bulk order actions",
    ],
    isPaid: true,
  },
  professional: {
    id: "professional",
    name: "Professional",
    monthly: 35,
    yearly: 350,
    orderMin: 301,
    orderMax: 1000,
    features: [
      "301–1,000 orders/month",
      "Everything in Growth",
      "API access & webhooks",
      "Custom analytics dashboards",
      "500MB document storage",
      "Dedicated support channel",
      "Multi-site management",
    ],
    isPaid: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthly: 75,
    yearly: 750,
    orderMin: 1001,
    orderMax: -1,
    features: [
      "Unlimited orders (1,001+)",
      "Everything in Professional",
      "White-label branding",
      "Dedicated account manager",
      "1GB document storage",
      "Custom integrations",
      "SLA guarantee",
      "Priority dispute resolution",
    ],
    isPaid: true,
  },
};

export const PLAN_ORDER: PlanId[] = ["basic", "starter", "growth", "professional", "enterprise"];

export interface VendorPlanState {
  currentPlan: PlanId;
  billing: BillingCycle | null;
  isTrialActive: boolean;
  trialDaysLeft: number;
  isExpired: boolean;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
  orderMin: number;
  orderMax: number;
  trustlockPayEnabled: boolean;
}

const TRIAL_DAYS = 30;

export function getVendorPlanState(): VendorPlanState {
  const plan = localStorage.getItem("tl_vendor_plan");
  const trialStart = localStorage.getItem("tl_vendor_trial_start");
  const planExpires = localStorage.getItem("tl_vendor_plan_expires");
  const billing = localStorage.getItem("tl_vendor_billing") as BillingCycle | null;
  const payEnabled = localStorage.getItem("tl_vendor_pay_enabled") !== "false";

  // Free trial state
  if (plan === "free" && trialStart) {
    const start = new Date(trialStart);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(TRIAL_DAYS - elapsed, 0);
    const expired = remaining === 0;

    return {
      currentPlan: expired ? "basic" : "growth",
      billing: null,
      isTrialActive: !expired,
      trialDaysLeft: remaining,
      isExpired: false,
      expiresAt: null,
      daysUntilExpiry: remaining > 0 ? remaining : null,
      orderMin: expired ? PLANS.basic.orderMin : PLANS.growth.orderMin,
      orderMax: expired ? PLANS.basic.orderMax : PLANS.growth.orderMax,
      trustlockPayEnabled: payEnabled,
    };
  }

  // Paid plan
  if (plan && plan !== "free" && PLANS[plan as PlanId]) {
    const planId = plan as PlanId;
    const config = PLANS[planId];

    if (planExpires) {
      const expires = new Date(planExpires);
      const now = new Date();
      const expired = expires < now;
      const daysLeft = expired ? 0 : Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (expired) {
        return {
          currentPlan: "basic",
          billing,
          isTrialActive: false,
          trialDaysLeft: 0,
          isExpired: true,
          expiresAt: expires,
          daysUntilExpiry: 0,
          orderMin: PLANS.basic.orderMin,
          orderMax: PLANS.basic.orderMax,
          trustlockPayEnabled: payEnabled,
        };
      }

      return {
        currentPlan: planId,
        billing,
        isTrialActive: false,
        trialDaysLeft: 0,
        isExpired: false,
        expiresAt: expires,
        daysUntilExpiry: daysLeft,
        orderMin: config.orderMin,
        orderMax: config.orderMax,
        trustlockPayEnabled: payEnabled,
      };
    }

    return {
      currentPlan: planId,
      billing,
      isTrialActive: false,
      trialDaysLeft: 0,
      isExpired: false,
      expiresAt: null,
      daysUntilExpiry: null,
      orderMin: config.orderMin,
      orderMax: config.orderMax,
      trustlockPayEnabled: payEnabled,
    };
  }

  // No plan at all
  return {
    currentPlan: "basic",
    billing: null,
    isTrialActive: false,
    trialDaysLeft: 0,
    isExpired: false,
    expiresAt: null,
    daysUntilExpiry: null,
    orderMin: PLANS.basic.orderMin,
    orderMax: PLANS.basic.orderMax,
    trustlockPayEnabled: payEnabled,
  };
}

export function getOrderRangeLabel(plan: PlanConfig): string {
  if (plan.orderMax === -1) return `${plan.orderMin.toLocaleString()}+ (Unlimited)`;
  return `${plan.orderMin}–${plan.orderMax.toLocaleString()}`;
}

export function getRequiredPlanForOrders(orderCount: number): PlanId {
  for (const id of PLAN_ORDER) {
    const p = PLANS[id];
    if (p.orderMax === -1 || orderCount <= p.orderMax) return id;
  }
  return "enterprise";
}

export function getPlanPrice(planId: PlanId, billing: BillingCycle): number {
  const p = PLANS[planId];
  return billing === "monthly" ? p.monthly : p.yearly;
}

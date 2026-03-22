import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building2, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

type BillingCycle = "monthly" | "yearly";

const plansData = [
  {
    id: "free",
    name: "Free Trial",
    monthly: 0,
    yearly: 0,
    period: "30 days",
    icon: Gift,
    description: "Explore the full platform risk-free",
    features: [
      "Full dashboard access",
      "Up to 10 orders",
      "Basic analytics",
      "20 free AI queries",
      "Email support",
    ],
    cta: "Activate Free Trial",
    highlight: false,
    isPaid: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthly: 5,
    yearly: 50,
    icon: Zap,
    description: "For small vendors getting started",
    features: [
      "Full dashboard access",
      "Up to 50 orders/month",
      "Basic analytics & reports",
      "20 free AI queries/month",
      "Email support",
      "50MB document storage",
    ],
    cta: "Get Starter License",
    highlight: false,
    isPaid: true,
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 15,
    yearly: 150,
    icon: Crown,
    description: "For growing businesses",
    features: [
      "Unlimited orders",
      "Advanced analytics & reports",
      "TrustLock Assist AI (unlimited)",
      "Priority email support",
      "200MB document storage",
      "CSV/PDF data export",
      "Auto-delivery toggle",
    ],
    cta: "Get Growth License",
    highlight: true,
    isPaid: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: 50,
    yearly: 500,
    icon: Building2,
    description: "White-label & full control",
    features: [
      "Everything in Growth",
      "White-label branding",
      "API access & webhooks",
      "Dedicated account manager",
      "500MB document storage",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlight: false,
    isPaid: true,
  },
];

const VendorPricing = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const [activatingTrial, setActivatingTrial] = useState(false);

  const trialActive = localStorage.getItem("tl_vendor_trial_start") !== null;
  const currentPlan = localStorage.getItem("tl_vendor_plan") || (trialActive ? "free" : null);
  const planExpires = localStorage.getItem("tl_vendor_plan_expires");

  // Check if current paid plan is expired
  const isExpired = (() => {
    if (!planExpires || currentPlan === "free") return false;
    return new Date(planExpires) < new Date();
  })();

  const handleSelect = (planId: string) => {
    if (planId === "free") {
      setActivatingTrial(true);
      return;
    }
    // Route to TrustLock Pay checkout
    navigate(`/trustlock/vendor/checkout?plan=${planId}&billing=${billing}`);
  };

  const confirmTrial = () => {
    localStorage.setItem("tl_vendor_trial_start", new Date().toISOString());
    localStorage.setItem("tl_vendor_plan", "free");
    toast.success("🎉 Free trial activated! You have 30 days to explore.");
    setActivatingTrial(false);
  };

  return (
    <div>
      <VendorHeader title="Plans & Pricing" />
      <div className="p-3 sm:p-6 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold">TrustLock OS License Plans</h2>
          <p className="text-sm text-muted-foreground">Choose a plan and pay securely via TrustLock Pay.</p>
        </div>

        {/* Expired notice */}
        {isExpired && currentPlan && currentPlan !== "free" && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <p className="text-xs font-semibold text-destructive">Your {currentPlan} plan has expired.</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Your dashboard is in read-only mode. Renew below to regain full access. Your data is preserved.
            </p>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              billing === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors relative ${
              billing === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge className="absolute -top-2 -right-6 bg-primary text-primary-foreground text-[8px] px-1.5">
              Save 17%
            </Badge>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plansData.map((plan) => {
            const price = plan.isPaid
              ? billing === "monthly" ? plan.monthly : plan.yearly
              : 0;
            const periodLabel = plan.isPaid
              ? billing === "monthly" ? "/mo" : "/yr"
              : plan.period;
            const isCurrentPlan = currentPlan === plan.id && !isExpired;

            return (
              <Card key={plan.id} className={`relative flex flex-col ${plan.highlight ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {plan.highlight && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <plan.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-2xl font-bold">${price}</span>
                    <span className="text-xs text-muted-foreground">{periodLabel}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full mt-4"
                    variant={plan.highlight ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelect(plan.id)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? "Current Plan" : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Billing info */}
        {billing === "monthly" && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Monthly billing:</strong> No auto-renewal. You pay manually each month.
                If payment is not received by your renewal date, your dashboard enters read-only mode until the next payment is made.
                A new billing cycle starts from the date of your next payment.
              </p>
            </CardContent>
          </Card>
        )}

        {/* FAQ */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
            {[
              { q: "When does the free trial start?", a: "Only when you click 'Activate Free Trial'. Browse the platform freely before committing." },
              { q: "What happens when the trial ends?", a: "Your dashboard enters read-only mode. All your data is preserved. Simply choose a plan to regain full access." },
              { q: "What if I miss a monthly payment?", a: "Your dashboard goes into read-only mode immediately. Once you pay, a new cycle begins from that date." },
              { q: "Are there transaction fees on top?", a: "TrustLock Pay charges 2.5% (products) or 3% (services) per transaction. This is separate from the OS license." },
              { q: "Can I switch between monthly and yearly?", a: "Yes! Switch anytime. If upgrading to yearly, you get the remaining value credited." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-xs font-medium">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Trial Confirmation Dialog */}
      <Dialog open={activatingTrial} onOpenChange={setActivatingTrial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Free Trial</DialogTitle>
            <DialogDescription>
              Your 30-day countdown starts now. You'll have full access to explore all features. No payment required.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingTrial(false)}>Cancel</Button>
            <Button onClick={confirmTrial}>Start Free Trial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPricing;

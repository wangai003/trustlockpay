import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building2, Gift } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

const plans = [
  {
    id: "free",
    name: "Free Trial",
    price: "$0",
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
  },
  {
    id: "starter",
    name: "Starter",
    price: "$50",
    period: "/year",
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
  },
  {
    id: "growth",
    name: "Growth",
    price: "$150",
    period: "/year",
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
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$500",
    period: "/year",
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
  },
];

const VendorPricing = () => {
  const [activating, setActivating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const trialActive = localStorage.getItem("tl_vendor_trial_start") !== null;
  const currentPlan = localStorage.getItem("tl_vendor_plan") || (trialActive ? "free" : null);

  const handleActivate = (planId: string) => {
    if (planId === "free") {
      setSelectedPlan("free");
      setActivating(true);
    } else if (planId === "enterprise") {
      toast.info("Enterprise sales: Contact admin@trustlock.com");
    } else {
      setSelectedPlan(planId);
      setActivating(true);
    }
  };

  const confirmActivation = () => {
    if (selectedPlan === "free") {
      localStorage.setItem("tl_vendor_trial_start", new Date().toISOString());
      localStorage.setItem("tl_vendor_plan", "free");
      toast.success("🎉 Free trial activated! You have 30 days to explore.");
    } else {
      localStorage.setItem("tl_vendor_plan", selectedPlan || "starter");
      localStorage.removeItem("tl_vendor_trial_start");
      toast.success(`${selectedPlan?.charAt(0).toUpperCase()}${selectedPlan?.slice(1)} plan activated!`);
    }
    setActivating(false);
    setSelectedPlan(null);
  };

  return (
    <div>
      <VendorHeader title="Plans & Pricing" />
      <div className="p-3 sm:p-6 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold">TrustLock OS License Plans</h2>
          <p className="text-sm text-muted-foreground">Annual license to access the full TrustLock OS dashboard and workflow tools.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
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
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">{plan.period}</span>
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
                  onClick={() => handleActivate(plan.id)}
                  disabled={currentPlan === plan.id}
                >
                  {currentPlan === plan.id ? "Current Plan" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
            {[
              { q: "When does the free trial start?", a: "Only when you click 'Activate Free Trial'. Browse the platform freely before committing." },
              { q: "What happens when the trial ends?", a: "Your dashboard enters read-only mode. All your data is preserved. Simply choose a plan to regain full access." },
              { q: "Are there transaction fees on top?", a: "TrustLock Pay charges 2.5% (products) or 3% (services) per transaction. This is separate from the OS license." },
              { q: "Can I upgrade mid-year?", a: "Yes! You pay the prorated difference for the remaining months." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-xs font-medium">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={activating} onOpenChange={setActivating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPlan === "free" ? "Activate Free Trial" : `Activate ${selectedPlan?.charAt(0).toUpperCase()}${selectedPlan?.slice(1)} Plan`}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan === "free"
                ? "Your 30-day countdown starts now. You'll have full access to explore all features."
                : `Your annual license will be activated immediately.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivating(false)}>Cancel</Button>
            <Button onClick={confirmActivation}>
              {selectedPlan === "free" ? "Start Trial" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPricing;

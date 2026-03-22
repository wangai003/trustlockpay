import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building2, Gift, Briefcase, Shield } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { PLANS, PLAN_ORDER, getVendorPlanState, type PlanId, type BillingCycle } from "@/hooks/useVendorPlan";

const planIcons: Record<PlanId, typeof Gift> = {
  basic: Shield,
  starter: Zap,
  growth: Crown,
  professional: Briefcase,
  enterprise: Building2,
};

const VendorPricing = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const [activatingTrial, setActivatingTrial] = useState(false);

  const planState = getVendorPlanState();
  const trialUsed = localStorage.getItem("tl_vendor_trial_start") !== null;

  const handleSelect = (planId: PlanId) => {
    if (planId === "basic") return; // Basic is free fallback, no action
    navigate(`/trustlock/vendor/checkout?plan=${planId}&billing=${billing}`);
  };

  const confirmTrial = () => {
    localStorage.setItem("tl_vendor_trial_start", new Date().toISOString());
    localStorage.setItem("tl_vendor_plan", "free");
    toast.success("🎉 Free trial activated! You have 30 days of Growth-level access.");
    setActivatingTrial(false);
  };

  return (
    <div>
      <VendorHeader title="Plans & Pricing" />
      <div className="p-3 sm:p-6 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold">TrustLock OS License Plans</h2>
          <p className="text-sm text-muted-foreground">Choose a plan that fits your business. Pay securely via TrustLock Pay.</p>
        </div>

        {/* Expired notice */}
        {planState.isExpired && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <p className="text-xs font-semibold text-destructive">Your plan has expired — you're on the Basic fallback.</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Your dashboard is limited to {PLANS.basic.orderLimit} orders/month. Orders above this limit are grayed out. Upgrade to regain full access.
            </p>
          </div>
        )}

        {/* Free trial CTA */}
        {!trialUsed && planState.currentPlan === "basic" && !planState.isExpired && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Try Growth features free for 30 days</p>
              <p className="text-xs text-muted-foreground">Full access to analytics, AI, and up to 300 orders. No payment required.</p>
            </div>
            <Button size="sm" onClick={() => setActivatingTrial(true)}>Activate Free Trial</Button>
          </div>
        )}

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-1 p-1 bg-muted rounded-lg w-fit mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${
              billing === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >Monthly</button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-4 py-2 rounded-md text-xs font-medium transition-colors relative ${
              billing === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <Badge className="absolute -top-2 -right-6 bg-primary text-primary-foreground text-[8px] px-1.5">Save 17%</Badge>
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            const price = plan.isPaid ? (billing === "monthly" ? plan.monthly : plan.yearly) : 0;
            const periodLabel = plan.isPaid ? (billing === "monthly" ? "/mo" : "/yr") : "forever";
            const isCurrentPlan = planState.currentPlan === planId && !planState.isExpired;
            const isHighlighted = planId === "growth";
            const isBasicFallback = planId === "basic" && planState.isExpired;

            return (
              <Card key={planId} className={`relative flex flex-col ${isHighlighted ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {isHighlighted && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {plan.orderLimit === -1 ? "Unlimited orders" : `Up to ${plan.orderLimit.toLocaleString()} orders/mo`}
                  </CardDescription>
                  <div className="pt-2">
                    <span className="text-2xl font-bold">${price}</span>
                    <span className="text-xs text-muted-foreground"> {periodLabel}</span>
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
                    variant={isHighlighted ? "default" : "outline"}
                    size="sm"
                    onClick={() => plan.isPaid ? handleSelect(planId) : null}
                    disabled={isCurrentPlan || planId === "basic"}
                  >
                    {isCurrentPlan ? "Current Plan" : isBasicFallback ? "Active (Fallback)" : planId === "basic" ? "Free Fallback" : `Get ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How it works */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">How Plan Limits Work</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• <strong className="text-foreground">Order limits</strong> are counted per calendar month. Orders above your plan limit appear <strong className="text-foreground">grayed out</strong> in your dashboard.</p>
              <p>• <strong className="text-foreground">Grayed-out orders</strong> are real payments waiting to be processed. You must upgrade to the appropriate plan to accept and fulfill them.</p>
              <p>• If you choose not to upgrade, you can <strong className="text-foreground">reject individual orders</strong> via checkbox — the buyer is notified automatically.</p>
              <p>• <strong className="text-foreground">No auto-renewal.</strong> When your plan expires, you fall back to Basic ({PLANS.basic.orderLimit} orders/mo). Your data is preserved.</p>
              <p>• You can <strong className="text-foreground">upgrade, downgrade, or switch billing</strong> (monthly ↔ yearly) at any time.</p>
            </div>
          </CardContent>
        </Card>

        {/* Billing info */}
        {billing === "monthly" && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Monthly billing:</strong> No auto-renewal. You pay manually each month.
                If payment is not received by your renewal date, you fall back to the Basic plan until the next payment is made.
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
              { q: "What is the Basic plan?", a: "Basic is the free fallback plan. If your trial or paid plan expires, you keep access with a limit of 15 orders/month. Orders beyond this are grayed out until you upgrade." },
              { q: "What happens to grayed-out orders?", a: "Grayed-out orders are real pending payments. You can either upgrade to process them, or reject them individually — buyers are notified immediately." },
              { q: "Can I switch plans at any time?", a: "Yes! Upgrade or downgrade freely. If upgrading, you pay the difference. If downgrading, the change takes effect at next renewal." },
              { q: "What if I want to stop using TrustLock Pay?", a: "Go to Settings and toggle off 'TrustLock Pay Widget'. Your widget will be disabled on your store immediately. You can re-enable it anytime." },
              { q: "Are there transaction fees on top?", a: "TrustLock Pay charges 2.5% (products) or 3% (services) per transaction. This is separate from the OS license." },
              { q: "When does the free trial start?", a: "Only when you click 'Activate Free Trial'. Browse the platform freely before committing. The trial gives Growth-level access for 30 days." },
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
              Your 30-day countdown starts now. You'll get full Growth-level access including advanced analytics, AI assistant, and up to 300 orders/month. No payment required.
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

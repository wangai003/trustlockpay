import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Building2, Gift, Briefcase, Shield } from "lucide-react";
import { toast } from "sonner";
import TLId from "@/components/shared/TLId";
import { useActivateTrial } from "@/hooks/useBackendSync";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { PLANS, PLAN_ORDER, getVendorPlanState, getOrderRangeLabel, type PlanId, type BillingCycle } from "@/hooks/useVendorPlan";

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

  // Locked-in plan from previous selection
  const lockedPlan = localStorage.getItem("tl_vendor_plan") as PlanId | null;
  const lockedBilling = localStorage.getItem("tl_vendor_billing") as BillingCycle | null;
  const hasLockedPlan = lockedPlan && lockedPlan !== "basic" && lockedPlan !== ("free" as string) && PLANS[lockedPlan as PlanId];

  const handleSelect = (planId: PlanId) => {
    if (planId === "basic") return;
    navigate(`/trustlock/vendor/checkout?plan=${planId}&billing=${billing}`);
  };

  const handleRenew = () => {
    if (!hasLockedPlan || !lockedBilling) return;
    navigate(`/trustlock/vendor/checkout?plan=${lockedPlan}&billing=${lockedBilling}&renew=true`);
  };

  const activateTrial = useActivateTrial();

  const confirmTrial = () => {
    activateTrial.mutateAsync().then(() => setActivatingTrial(false));
  };

  return (
    <div>
      <VendorHeader title="Plans & Pricing" />
      <div className="p-3 sm:p-6 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold">TrustLock OS License Plans</h2>
          <p className="text-sm text-muted-foreground">Choose a plan that fits your order volume range. Pay securely via TrustLock Pay.</p>
        </div>

        {planState.isExpired && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <p className="text-xs font-semibold text-destructive">Your plan has expired — you're on the Basic fallback.</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Limited to {PLANS.basic.orderMin}–{PLANS.basic.orderMax} orders/month. Orders above this range are grayed out.
            </p>
          </div>
        )}

        {/* One-click renewal for vendors with a locked-in plan */}
        {hasLockedPlan && (planState.isExpired || (planState.daysUntilExpiry !== null && planState.daysUntilExpiry <= 14)) && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {planState.isExpired ? "Renew Your Plan" : "Quick Renewal"}
              </p>
              <p className="text-xs text-muted-foreground">
                Your <strong>{PLANS[lockedPlan as PlanId].name}</strong> plan ({lockedBilling}) is locked in from your original selection. 
                Just click to pay — no need to re-select.
              </p>
            </div>
            <Button size="sm" onClick={handleRenew}>
              Renew ${lockedBilling === "monthly" ? PLANS[lockedPlan as PlanId].monthly : PLANS[lockedPlan as PlanId].yearly}/{lockedBilling === "monthly" ? "mo" : "yr"}
            </Button>
          </div>
        )}

        {!trialUsed && planState.currentPlan === "basic" && !planState.isExpired && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Try Growth features free for 30 days</p>
                <p className="text-xs text-muted-foreground">Full access to analytics, AI, and up to 300 orders. No payment required.</p>
              </div>
              <TLId code="TL-V-PRC-BTN-TRIAL" inline><Button size="sm" onClick={() => setActivatingTrial(true)}>Activate Free Trial</Button></TLId>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">⚠️ Important — Activate trial BEFORE installing widgets:</strong>{" "}
                Widget installation fees ($5/site) are waived during your trial period. If you install widgets without activating a trial first, 
                our system will treat your account as a regular (non-trial) account and charge standard fees. 
                To avoid unnecessary charges: <strong>1)</strong> Activate your free trial here → <strong>2)</strong> Go to My Sites → <strong>3)</strong> Install widgets for free.
                Once your trial ends, you'll automatically move to the Basic plan and widget fees will apply for the next billing cycle.
              </p>
            </div>
          </div>
        )}

        {/* Active trial — cancel button */}
        {planState.isTrialActive && (
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-3">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Free Trial Active — {planState.trialDaysLeft} days left</p>
              <p className="text-xs text-muted-foreground">You have Growth-level access. Widget installations are free during trial. Cancel anytime.</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => {
              localStorage.removeItem("tl_vendor_trial_start");
              localStorage.setItem("tl_vendor_plan", "basic");
              localStorage.removeItem("tl_vendor_plan_expires");
              toast.success("Trial cancelled. You're now on the Basic plan.");
              window.location.reload();
            }}>Cancel Trial</Button>
          </div>
        )}

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const Icon = planIcons[planId];
            const price = plan.isPaid ? (billing === "monthly" ? plan.monthly : plan.yearly) : 0;
            const periodLabel = plan.isPaid ? (billing === "monthly" ? "/mo" : "/yr") : "forever";
            const isCurrentPlan = planState.currentPlan === planId && !planState.isExpired;
            const isHighlighted = planId === "starter";
            const isBasicFallback = planId === "basic" && planState.isExpired;

            return (
              <Card key={planId} className={`relative flex flex-col ${isHighlighted ? "border-primary ring-1 ring-primary/20" : ""}`}>
                {isHighlighted && (
                  <>
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                      Recommended
                    </Badge>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/50">
                      <span className="text-white text-[8px] font-bold">👆</span>
                    </div>
                  </>
                )}
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {getOrderRangeLabel(plan)} orders/mo
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

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">How Plan Ranges Work</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• <strong className="text-foreground">Order ranges</strong> define how many orders your plan supports per month. If you receive 18 orders, you only need Starter ($5/mo), not Growth.</p>
              <p>• <strong className="text-foreground">Grayed-out orders</strong> appear when you exceed your plan's upper range. Upgrade to the appropriate plan to process them.</p>
              <p>• If you choose not to upgrade, you can <strong className="text-foreground">reject individual orders</strong> via checkbox — the buyer is notified automatically.</p>
              <p>• <strong className="text-foreground">No auto-renewal.</strong> When your plan expires, you fall back to Basic ({PLANS.basic.orderMin}–{PLANS.basic.orderMax} orders/mo). Your data is preserved.</p>
              <p>• You can <strong className="text-foreground">upgrade, downgrade, or switch billing</strong> (monthly ↔ yearly) at any time.</p>
            </div>
          </CardContent>
        </Card>

        {billing === "monthly" && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Monthly billing:</strong> No auto-renewal. You pay manually each month.
                If payment is not received by your renewal date, you fall back to the Basic plan until the next payment is made.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
            {[
              { q: "What is the Basic plan?", a: `Basic is the free fallback plan. If your trial or paid plan expires, you keep access with a limit of ${PLANS.basic.orderMax} orders/month. Orders beyond this are grayed out until you upgrade.` },
              { q: "What happens to grayed-out orders?", a: "Grayed-out orders are real pending payments. You can either upgrade to process them, or reject them individually — buyers are notified immediately." },
              { q: "Can I switch plans at any time?", a: "Yes! Upgrade or downgrade freely. If upgrading, you pay the difference. If downgrading, the change takes effect at next renewal." },
              { q: "What if I want to stop using TrustLock Pay?", a: "Go to Settings and toggle off 'TrustLock Pay Widget'. Your widget will be disabled on your store immediately." },
              { q: "Are there transaction fees on top?", a: "TrustLock Pay charges 2.5% (products) or 3% (services) per transaction. This is separate from the OS license." },
              { q: "When does the free trial start?", a: "Only when you click 'Activate Free Trial'. Browse the platform freely before committing." },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-xs font-medium">{q}</p>
                <p className="text-xs text-muted-foreground">{a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={activatingTrial} onOpenChange={setActivatingTrial}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Free Trial</DialogTitle>
            <DialogDescription>
              Your 30-day countdown starts now. You'll get full Growth-level access including advanced analytics, AI assistant, and up to 300 orders/month.
              <br /><br />
              <strong>🎁 Widget fees are waived during trial.</strong> Install as many widgets as you need across different sites — no charge until trial ends.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/30 rounded-lg border border-border text-[10px] text-muted-foreground">
            <strong className="text-foreground">Note:</strong> The free trial will be fully activated once all payment processing and smart contract infrastructure is live on mainnet. 
            During testnet, you can preview the trial experience. Trial can be cancelled anytime from this page.
          </div>
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

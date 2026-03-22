import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Sparkles, AlertTriangle, Shield } from "lucide-react";
import { getVendorPlanState, PLANS } from "@/hooks/useVendorPlan";

const TrialBanner = () => {
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const state = getVendorPlanState();

  // No plan and no trial → prompt to explore
  if (!localStorage.getItem("tl_vendor_plan") && !localStorage.getItem("tl_vendor_trial_start")) {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Try TrustLock OS free for 30 days</p>
          <p className="text-[10px] text-muted-foreground">Browse first, activate when you're ready.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          View Plans
        </Button>
      </div>
    );
  }

  // Active trial
  if (state.isTrialActive && state.trialDaysLeft > 0) {
    const progress = ((30 - state.trialDaysLeft) / 30) * 100;
    const isUrgent = state.trialDaysLeft <= 7;

    return (
      <div className={`mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border ${
        isUrgent ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"
      }`}>
        <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-accent" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {state.trialDaysLeft} day{state.trialDaysLeft !== 1 ? "s" : ""} left on free trial
            </p>
            <span className="text-[10px] text-muted-foreground">{Math.round(progress)}% elapsed</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Upgrade
        </Button>
      </div>
    );
  }

  // Expired (trial or paid) → Basic fallback
  if (state.isExpired || (localStorage.getItem("tl_vendor_plan") === "free" && state.trialDaysLeft === 0)) {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-destructive">
            {state.isExpired ? "Your plan has expired" : "Free trial expired"} — Basic mode active
          </p>
          <p className="text-[10px] text-muted-foreground">
            Limited to {PLANS.basic.orderMax} orders/month. Orders above this limit are grayed out. Upgrade to process them.
          </p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Upgrade Now
        </Button>
      </div>
    );
  }

  // Active paid plan with approaching expiry (≤14 days)
  if (state.daysUntilExpiry !== null && state.daysUntilExpiry <= 14 && !state.isTrialActive) {
    const isUrgent = state.daysUntilExpiry <= 7;
    return (
      <div className={`mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border ${
        isUrgent ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"
      }`}>
        <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-accent" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {state.daysUntilExpiry} day{state.daysUntilExpiry !== 1 ? "s" : ""} until {PLANS[state.currentPlan].name} renewal
          </p>
          <p className="text-[10px] text-muted-foreground">Renew before expiry to avoid falling back to Basic ({PLANS.basic.orderLimit} orders/mo).</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Renew
        </Button>
      </div>
    );
  }

  // Active paid plan with no urgency
  if (!state.isExpired && state.currentPlan !== "basic") {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 p-2 rounded-lg bg-muted/20">
        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[10px] text-muted-foreground">
          <strong className="text-foreground">{PLANS[state.currentPlan].name}</strong> plan active
          {state.expiresAt && ` · Expires ${state.expiresAt.toLocaleDateString()}`}
        </p>
      </div>
    );
  }

  return null;
};

export default TrialBanner;

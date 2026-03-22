import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Sparkles, AlertTriangle } from "lucide-react";

const TRIAL_DAYS = 30;

const TrialBanner = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { type: "no_plan" }
    | { type: "trial"; daysLeft: number }
    | { type: "trial_expired" }
    | { type: "paid"; plan: string; daysLeft: number }
    | { type: "paid_expired"; plan: string }
    | { type: "active_paid" }
  >({ type: "no_plan" });

  useEffect(() => {
    const currentPlan = localStorage.getItem("tl_vendor_plan");
    const trialStart = localStorage.getItem("tl_vendor_trial_start");
    const planExpires = localStorage.getItem("tl_vendor_plan_expires");

    if (!currentPlan) {
      setState({ type: "no_plan" });
      return;
    }

    // Free trial
    if (currentPlan === "free" && trialStart) {
      const start = new Date(trialStart);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const remaining = Math.max(TRIAL_DAYS - elapsed, 0);
      if (remaining === 0) {
        setState({ type: "trial_expired" });
      } else {
        setState({ type: "trial", daysLeft: remaining });
      }
      return;
    }

    // Paid plan
    if (planExpires) {
      const expires = new Date(planExpires);
      const now = new Date();
      if (expires < now) {
        setState({ type: "paid_expired", plan: currentPlan });
      } else {
        const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 14) {
          setState({ type: "paid", plan: currentPlan, daysLeft });
        } else {
          setState({ type: "active_paid" });
        }
      }
      return;
    }

    setState({ type: "active_paid" });
  }, []);

  if (state.type === "no_plan") {
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

  if (state.type === "active_paid") return null;

  if (state.type === "trial_expired") {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
        <Clock className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-destructive">Free trial expired</p>
          <p className="text-[10px] text-muted-foreground">Dashboard is in read-only mode. Choose a plan to regain full access.</p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Upgrade Now
        </Button>
      </div>
    );
  }

  if (state.type === "paid_expired") {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-destructive">Your {state.plan} plan has expired</p>
          <p className="text-[10px] text-muted-foreground">Dashboard is paused. Renew to start a new billing cycle.</p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Renew Now
        </Button>
      </div>
    );
  }

  if (state.type === "paid") {
    const isUrgent = state.daysLeft <= 7;
    return (
      <div className={`mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border ${
        isUrgent ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"
      }`}>
        <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-accent" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {state.daysLeft} day{state.daysLeft !== 1 ? "s" : ""} until {state.plan} renewal
          </p>
          <p className="text-[10px] text-muted-foreground">Renew before expiry to avoid service interruption.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Renew
        </Button>
      </div>
    );
  }

  // Trial active
  if (state.type === "trial") {
    const progress = ((TRIAL_DAYS - state.daysLeft) / TRIAL_DAYS) * 100;
    const isUrgent = state.daysLeft <= 7;

    return (
      <div className={`mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border ${
        isUrgent ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"
      }`}>
        <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-accent" : "text-muted-foreground"}`} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {state.daysLeft} day{state.daysLeft !== 1 ? "s" : ""} left on free trial
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

  return null;
};

export default TrialBanner;

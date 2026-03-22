import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, Sparkles } from "lucide-react";

const TRIAL_DAYS = 30;

const TrialBanner = () => {
  const navigate = useNavigate();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    const currentPlan = localStorage.getItem("tl_vendor_plan");
    setPlan(currentPlan);

    const trialStart = localStorage.getItem("tl_vendor_trial_start");
    if (!trialStart || currentPlan !== "free") {
      setDaysLeft(null);
      return;
    }

    const start = new Date(trialStart);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(TRIAL_DAYS - elapsed, 0);
    setDaysLeft(remaining);
  }, []);

  // No plan at all — show activation prompt
  if (!plan) {
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

  // Paid plan — no banner
  if (plan !== "free") return null;

  // Trial active
  if (daysLeft === null) return null;

  const progress = ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100;
  const isExpired = daysLeft === 0;
  const isUrgent = daysLeft <= 7 && daysLeft > 0;

  if (isExpired) {
    return (
      <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
        <Clock className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-destructive">Free trial expired</p>
          <p className="text-[10px] text-muted-foreground">Your dashboard is in read-only mode. Choose a plan to regain full access.</p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={() => navigate("/trustlock/vendor/pricing")}>
          Upgrade Now
        </Button>
      </div>
    );
  }

  return (
    <div className={`mx-4 sm:mx-6 mt-3 flex items-center gap-3 p-3 rounded-lg border ${
      isUrgent ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"
    }`}>
      <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? "text-accent" : "text-muted-foreground"}`} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">
            {daysLeft} day{daysLeft !== 1 ? "s" : ""} left on free trial
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
};

export default TrialBanner;

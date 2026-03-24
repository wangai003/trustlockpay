import { useNavigate, useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PLANS, type PlanId, type BillingCycle } from "@/hooks/useVendorPlan";
import { toast } from "sonner";
import { useActivatePlan } from "@/hooks/useSupabaseData";

const VendorCheckout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = (params.get("plan") || "starter") as PlanId;
  const billing = (params.get("billing") as BillingCycle) || "yearly";
  const plan = PLANS[planId] || PLANS.starter;
  const amount = billing === "monthly" ? plan.monthly : plan.yearly;
  const activatePlan = useActivatePlan();

  const handleComplete = async () => {
    const now = new Date();
    const expiresAt = new Date(now);
    if (billing === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Persist to Supabase
    try {
      await activatePlan.mutateAsync({
        planId,
        billingCycle: billing,
        expiresAt: expiresAt.toISOString(),
      });
    } catch { /* handled by hook */ }

    // Also keep localStorage for plan state helper
    localStorage.setItem("tl_vendor_plan", planId);
    localStorage.setItem("tl_vendor_billing", billing);
    localStorage.setItem("tl_vendor_plan_start", now.toISOString());
    localStorage.setItem("tl_vendor_plan_expires", expiresAt.toISOString());
    localStorage.removeItem("tl_vendor_trial_start");
    toast.success(`🎉 ${plan.name} plan activated! Expires ${expiresAt.toLocaleDateString()}`);
    navigate("/trustlock/vendor/pricing");
  };

  return (
    <div>
      <VendorHeader title="Checkout" />
      <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/trustlock/vendor/pricing")}>
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Paying for <strong>TrustLock OS — {plan.name}</strong> · ${amount}/{billing === "monthly" ? "mo" : "yr"}
        </p>
        <TrustLockOSPay
          role="vendor"
          prefillService={`TrustLock OS — ${plan.name} (${billing})`}
          prefillAmount={String(amount)}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
};

export default VendorCheckout;

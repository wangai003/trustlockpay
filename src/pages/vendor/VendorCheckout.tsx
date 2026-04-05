import { useNavigate, useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PLANS, type PlanId, type BillingCycle } from "@/hooks/useVendorPlan";
import { toast } from "sonner";
import { useActivatePlan } from "@/hooks/useSupabaseData";
import { useVendor } from "@/contexts/VendorContext";

/**
 * Compute a UTC-midnight expiry date from "now".
 * Monthly → same day next month at 23:59:59.999 UTC
 * Yearly  → same day next year at 23:59:59.999 UTC
 */
function computeUtcExpiry(billing: BillingCycle): string {
  const now = new Date();
  const expiry = new Date(Date.UTC(
    now.getUTCFullYear() + (billing === "yearly" ? 1 : 0),
    now.getUTCMonth() + (billing === "monthly" ? 1 : 0),
    now.getUTCDate(),
    23, 59, 59, 999
  ));
  return expiry.toISOString();
}

const VendorCheckout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isTestnet } = useVendor();
  const planId = (params.get("plan") || "starter") as PlanId;
  const billing = (params.get("billing") as BillingCycle) || "yearly";
  const isRenewal = params.get("renew") === "true";
  const plan = PLANS[planId] || PLANS.starter;
  const amount = billing === "monthly" ? plan.monthly : plan.yearly;
  const billId = params.get("bill_id"); // If paying a specific bill
  const activatePlan = useActivatePlan();

  const handleComplete = async () => {
    const expiresAt = computeUtcExpiry(billing);

    try {
      await activatePlan.mutateAsync({
        planId,
        billingCycle: billing,
        expiresAt,
      });
    } catch { /* handled by hook */ }

    // Lock in plan selection so vendor never has to re-select
    localStorage.setItem("tl_vendor_plan", planId);
    localStorage.setItem("tl_vendor_billing", billing);
    localStorage.setItem("tl_vendor_plan_start", new Date().toISOString());
    localStorage.setItem("tl_vendor_plan_expires", expiresAt);
    localStorage.removeItem("tl_vendor_trial_start");
    toast.success(`🎉 ${plan.name} plan ${isRenewal ? "renewed" : "activated"}! Expires ${new Date(expiresAt).toLocaleDateString()}`);
    navigate("/trustlock/vendor/pricing");
  };

  return (
    <div>
      <VendorHeader title={isRenewal ? "Renew Plan" : "Checkout"} />
      <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/trustlock/vendor/pricing")}>
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          {isRenewal ? "Renewing" : "Paying for"} <strong>TrustLock OS — {plan.name}</strong> · ${amount}/{billing === "monthly" ? "mo" : "yr"}
        </p>
        {isRenewal && (
          <p className="text-[10px] text-center text-muted-foreground">
            Your plan and billing cycle are locked in from your original selection. Just pay to renew.
          </p>
        )}
        <TrustLockOSPay
          role="vendor"
          prefillService={`TrustLock OS — ${plan.name} (${billing})${isRenewal ? " — Renewal" : ""}`}
          prefillAmount={String(amount)}
          onComplete={handleComplete}
          isTestnet={isTestnet}
        />
      </div>
    </div>
  );
};

export default VendorCheckout;

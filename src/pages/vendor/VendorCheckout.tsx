import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Wallet, ArrowLeft, Check, Lock } from "lucide-react";
import { toast } from "sonner";

const PLAN_DETAILS: Record<string, { name: string; monthly: number; yearly: number }> = {
  starter: { name: "Starter", monthly: 5, yearly: 50 },
  growth: { name: "Growth", monthly: 15, yearly: 150 },
  enterprise: { name: "Enterprise", monthly: 50, yearly: 500 },
};

const VendorCheckout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planId = params.get("plan") || "starter";
  const billing = (params.get("billing") as "monthly" | "yearly") || "yearly";
  const plan = PLAN_DETAILS[planId] || PLAN_DETAILS.starter;
  const amount = billing === "monthly" ? plan.monthly : plan.yearly;

  const [payMode, setPayMode] = useState<"diaspora" | "local" | null>(null);
  const [processing, setProcessing] = useState(false);

  const handlePay = () => {
    if (!payMode) {
      toast.error("Please select a payment mode.");
      return;
    }
    setProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const now = new Date();
      const expiresAt = new Date(now);
      if (billing === "monthly") {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      localStorage.setItem("tl_vendor_plan", planId);
      localStorage.setItem("tl_vendor_billing", billing);
      localStorage.setItem("tl_vendor_plan_start", now.toISOString());
      localStorage.setItem("tl_vendor_plan_expires", expiresAt.toISOString());
      localStorage.removeItem("tl_vendor_trial_start");

      setProcessing(false);
      toast.success(`🎉 ${plan.name} plan activated! Expires ${expiresAt.toLocaleDateString()}`);
      navigate("/trustlock/vendor/pricing");
    }, 2000);
  };

  return (
    <div>
      <VendorHeader title="Checkout" />
      <div className="p-3 sm:p-6 max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => navigate("/trustlock/vendor/pricing")}>
          <ArrowLeft className="w-4 h-4" /> Back to Plans
        </Button>

        {/* TrustLock Pay header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(45,90%,50%)]/10 border border-[hsl(45,90%,50%)]/20">
            <Shield className="w-5 h-5 text-[hsl(45,90%,50%)]" />
            <span className="font-heading font-bold text-sm" style={{ color: "hsl(45, 90%, 50%)" }}>TrustLock Pay</span>
          </div>
          <p className="text-xs text-muted-foreground">Secure escrow-backed payment</p>
        </div>

        {/* Order summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Order Summary</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">TrustLock OS — {plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {billing === "monthly" ? "Monthly" : "Annual"} license
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">${amount}</p>
                <p className="text-[10px] text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</p>
              </div>
            </div>
            <div className="border-t border-border pt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Due today</span>
              <span className="font-bold text-base">${amount}</span>
            </div>
            {billing === "monthly" && (
              <p className="text-[10px] text-muted-foreground">
                Manual renewal required each month. Service pauses if payment is not received by the due date.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Mode Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Choose Payment Mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Diaspora Mode */}
            <button
              onClick={() => setPayMode("diaspora")}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                payMode === "diaspora"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {payMode === "diaspora" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <Globe className="w-6 h-6 text-primary mb-2" />
              <p className="text-sm font-semibold">Diaspora Mode</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Pay with crypto or stablecoin (USDC, USDT on Polygon)
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> USDC / USDT
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> Polygon network
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> Wallet connect
                </div>
              </div>
            </button>

            {/* Local Mode */}
            <button
              onClick={() => setPayMode("local")}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                payMode === "local"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              {payMode === "local" && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <Wallet className="w-6 h-6 text-accent mb-2" />
              <p className="text-sm font-semibold">Local Mode</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Pay with mobile money or local bank transfer
              </p>
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> Mobile Money (MTN, Vodafone)
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> Bank Transfer
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="w-2.5 h-2.5 text-primary" /> Local currency (GHS, NGN, KES)
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Pay button */}
        <Button
          className="w-full h-12 text-sm font-semibold gap-2"
          onClick={handlePay}
          disabled={!payMode || processing}
        >
          {processing ? (
            <>Processing...</>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Pay ${amount} with TrustLock Pay
            </>
          )}
        </Button>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Protected by TrustLock Pay escrow · Funds secured until activation confirmed</span>
        </div>
      </div>
    </div>
  );
};

export default VendorCheckout;

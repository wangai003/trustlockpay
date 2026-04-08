import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Shield, ArrowRight, Building2, Wallet, CheckCircle2,
  Loader2, Smartphone, CreditCard, Globe, Coins,
} from "lucide-react";

export type FundFlowType =
  | "os_pay_fiat"       // Buyer/Vendor paying for services via fiat
  | "os_pay_crypto"     // Buyer/Vendor paying via crypto
  | "payout_release"    // Vendor receiving released funds
  | "payout_refund"     // Buyer receiving refund
  | "payout_split"      // Admin split pay to both parties
  | "buyer_release"     // Buyer authorizing release to vendor
  | "payout_crypto_direct"  // Polygon direct
  | "payout_crypto_bridge"; // Non-Polygon via processor

interface FundFlowStep {
  label: string;
  sublabel?: string;
  icon: typeof Shield;
  status: "completed" | "active" | "pending";
}

interface FundMovementTrackerProps {
  flowType: FundFlowType;
  role: "admin" | "vendor" | "buyer";
  method?: string;
  chain?: string;
  providerName?: string;
  splitVendorPercent?: string;
  splitBuyerPercent?: string;
  amount?: number;
  className?: string;
}

const getFlowSteps = (
  flowType: FundFlowType,
  role: string,
  method?: string,
  chain?: string,
  providerName?: string,
  splitVendorPercent?: string,
  splitBuyerPercent?: string,
  amount?: number,
): FundFlowStep[] => {
  switch (flowType) {
    // ─── OS PAY (service payments) ───
    case "os_pay_fiat":
      return [
        { label: "Your Payment", sublabel: method || "Card/Bank/Mobile", icon: CreditCard, status: "completed" },
        { label: "Processor", sublabel: `${providerName || "Payment processor"} takes fees`, icon: Building2, status: "completed" },
        { label: "Fee Wallet", sublabel: `0.5% TrustLock fee${amount ? ` ($${(amount * 0.005).toFixed(2)})` : ""} + taxes/remittance`, icon: Shield, status: "active" },
        { label: "Service Activated", sublabel: "Credits applied to your account", icon: CheckCircle2, status: "pending" },
      ];

    case "os_pay_crypto":
      return [
        { label: "Your Wallet", sublabel: "Stablecoin sent", icon: Wallet, status: "completed" },
        { label: "Network Verification", sublabel: "On-chain confirmation", icon: Globe, status: "active" },
        { label: "Fee Wallet", sublabel: `0.5% TrustLock fee${amount ? ` ($${(amount * 0.005).toFixed(2)})` : ""}`, icon: Shield, status: "pending" },
        { label: "Service Activated", sublabel: "Credits applied to your account", icon: CheckCircle2, status: "pending" },
      ];

    // ─── CHECKOUT (escrow inbound) ───
    case "payout_release":
    case "buyer_release":
      return [
        { label: "Escrow Wallet", sublabel: "Funds verified and held", icon: Shield, status: "completed" },
        { label: "1% Escrow Fee", sublabel: `Extracted from vendor principal → Fee Wallet${amount ? ` ($${(amount * 0.01).toFixed(2)})` : ""}`, icon: Coins, status: "active" },
        { label: "Vendor Payout", sublabel: `99% of principal${amount ? ` ($${(amount * 0.99).toFixed(2)})` : ""} → vendor account`, icon: CheckCircle2, status: "pending" },
      ];

    case "payout_refund":
      return [
        { label: "Escrow Wallet", sublabel: "Funds verified and held", icon: Shield, status: "completed" },
        { label: "Full Refund", sublabel: "100% of escrowed principal — $0 fees", icon: Coins, status: "active" },
        { label: "Buyer Account", sublabel: "Funds returned", icon: CheckCircle2, status: "pending" },
      ];

    case "payout_split":
      return [
        { label: "Escrow Wallet", sublabel: "Funds verified and held", icon: Shield, status: "completed" },
        { label: "Split Calculation", sublabel: `1% fee on vendor share only (${splitVendorPercent || "—"}V / ${splitBuyerPercent || "—"}B)`, icon: Coins, status: "active" },
        { label: "Dual Payout", sublabel: "Vendor & buyer receive their portions", icon: CheckCircle2, status: "pending" },
      ];

    case "payout_crypto_direct":
    case "payout_crypto_bridge":
      return [
        { label: "Escrow Wallet", sublabel: "Funds verified and held", icon: Shield, status: "completed" },
        { label: "1% Fee Extracted", sublabel: "Trickled to Fee Wallet", icon: Coins, status: "active" },
        { label: "Settlement", sublabel: `99% → vendor via ${chain || "Polygon"}`, icon: CheckCircle2, status: "pending" },
      ];

    default:
      return [];
  }
};

const FundMovementTracker = ({
  flowType,
  role,
  method,
  chain,
  providerName,
  splitVendorPercent,
  splitBuyerPercent,
  amount,
  className,
}: FundMovementTrackerProps) => {
  const [animatedStep, setAnimatedStep] = useState(0);

  const steps = getFlowSteps(flowType, role, method, chain, providerName, splitVendorPercent, splitBuyerPercent, amount);

  // Animate steps sequentially
  useEffect(() => {
    if (steps.length === 0) return;
    setAnimatedStep(0);
    const timers: NodeJS.Timeout[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setAnimatedStep(i), i * 800));
    });
    return () => timers.forEach(clearTimeout);
  }, [flowType, steps.length]);

  if (steps.length === 0) return null;

  return (
    <div className={cn("p-4 rounded-xl bg-muted/30 border border-border space-y-1", className)}>
      <p className="text-[10px] font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-primary" />
        Fund Movement Tracker
      </p>

      <div className="space-y-0">
        {steps.map((step, i) => {
          const isVisible = i <= animatedStep;
          const isLast = i === steps.length - 1;

          return (
            <div key={i} className={cn("transition-all duration-500", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}>
              <div className="flex items-start gap-3">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    step.status === "completed" ? "bg-primary text-primary-foreground" :
                    step.status === "active" ? "bg-accent/20 text-accent border-2 border-accent" :
                    "bg-muted text-muted-foreground border border-border"
                  )}>
                    {step.status === "active" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <step.icon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={cn(
                      "w-0.5 h-6 transition-all duration-500",
                      step.status === "completed" ? "bg-primary" :
                      step.status === "active" ? "bg-accent/40" :
                      "bg-border"
                    )} />
                  )}
                </div>

                {/* Label */}
                <div className="pt-0.5 min-w-0">
                  <p className={cn(
                    "text-xs font-semibold leading-tight",
                    step.status === "completed" ? "text-primary" :
                    step.status === "active" ? "text-accent" :
                    "text-muted-foreground"
                  )}>
                    {step.label}
                    {step.status === "active" && (
                      <span className="ml-1.5 text-[9px] font-normal animate-pulse">processing...</span>
                    )}
                  </p>
                  {step.sublabel && (
                    <p className="text-[10px] text-muted-foreground leading-tight">{step.sublabel}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FundMovementTracker;

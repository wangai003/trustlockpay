import { AlertTriangle, Wallet, CreditCard, Globe, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROCESSORS, type ProcessorId, type PaymentMethod } from "@/lib/feeEngine";

// ─── Detection Logic ──────────────────────────────────────
export interface UnavailableResult {
  isUnavailable: boolean;
  reason: string;
  alternatives: AlternativeRoute[];
}

interface AlternativeRoute {
  id: string;
  label: string;
  description: string;
  fee: string;
  speed: string;
  icon: typeof Wallet;
  recommended?: boolean;
  action?: string;
}

const TIER1_COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
  "Uganda", "Tanzania", "Rwanda",
  "US", "EU", "UK", "CA", "AU", "JP", "SG", "HK", "NZ",
];

export function detectUnavailableMethod(
  country: string,
  method: PaymentMethod,
): UnavailableResult {
  // Check which processors support this country + method combo
  const matching = (Object.entries(PROCESSORS) as [ProcessorId, typeof PROCESSORS[ProcessorId]][])
    .filter(([id, proc]) => {
      if (id === "direct") return false; // Direct is always fallback, don't count
      const regionMatch = proc.regions.includes(country) || proc.regions.includes("global");
      const methodMatch = proc.supportedMethods.includes(method);
      return regionMatch && methodMatch;
    });

  if (matching.length > 0) {
    return { isUnavailable: false, reason: "", alternatives: [] };
  }

  // No processor found — build alternatives
  const isTier1 = TIER1_COUNTRIES.includes(country);
  const alternatives: AlternativeRoute[] = [];

  // Always offer direct crypto
  alternatives.push({
    id: "direct_crypto",
    label: "Pay with Crypto (USDC)",
    description: "Send USDC directly from any wallet (MetaMask, Trust Wallet, Coinbase Wallet). Works globally with no bank needed.",
    fee: "1.0% platform fee · $0 processor fee",
    speed: "Instant confirmation",
    icon: Wallet,
    recommended: true,
    action: "switch_to_crypto",
  });

  // If the issue is mobile_money or bank_transfer, suggest card
  if (method === "mobile_money" || method === "bank_transfer") {
    alternatives.push({
      id: "card_fallback",
      label: "Use a Visa/Mastercard",
      description: "If your bank issues Visa or Mastercard debit cards, you can pay by card even if the bank itself isn't directly supported.",
      fee: "1.5% platform + 1.5–2.9% processor",
      speed: "Instant",
      icon: CreditCard,
      action: "switch_to_card",
    });
  }

  // Transak global as fallback for cards
  if (method === "card") {
    alternatives.push({
      id: "transak_global",
      label: "Pay via Transak",
      description: "Transak supports cards in 150+ countries. Your card may work through their global network even if not listed locally.",
      fee: "1.5% platform + 1.5% processor",
      speed: "Instant",
      icon: Globe,
      action: "switch_to_transak",
    });
  }

  const methodLabel =
    method === "mobile_money" ? "Mobile Money" :
    method === "bank_transfer" ? "Bank Transfer" :
    method === "card" ? "Card Payment" : method;

  return {
    isUnavailable: true,
    reason: `${methodLabel} is not yet available for ${country} through our current payment processors.`,
    alternatives,
  };
}

// ─── UI Component ─────────────────────────────────────────
interface PaymentMethodUnavailableProps {
  country: string;
  method: PaymentMethod;
  onSwitchMethod: (newMethod: string) => void;
  className?: string;
}

const PaymentMethodUnavailable = ({
  country,
  method,
  onSwitchMethod,
  className,
}: PaymentMethodUnavailableProps) => {
  const result = detectUnavailableMethod(country, method);

  if (!result.isUnavailable) return null;

  return (
    <Card className={cn("border-yellow-500/40 bg-yellow-500/5", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Payment Method Not Available</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.reason}</p>
          </div>
        </div>

        {/* Alternatives */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Available Alternatives
          </p>
          {result.alternatives.map((alt) => (
            <button
              key={alt.id}
              onClick={() => onSwitchMethod(alt.action ?? alt.id)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                alt.recommended
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-3">
                <alt.icon className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  alt.recommended ? "text-emerald-500" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{alt.label}</span>
                    {alt.recommended && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-500">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {alt.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{alt.fee}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{alt.speed}</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
              </div>
            </button>
          ))}
        </div>

        {/* Help footer */}
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          We're continuously adding new payment corridors. Your local provider may be supported soon.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodUnavailable;

import { useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MapPin, Building2, Info, Shuffle, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { detectTradeScope } from "@/lib/tradeBlocs";

export type TradeScope = "domestic" | "regional" | "international" | "hybrid";

interface TradeScopeSelectorProps {
  value: TradeScope;
  onChange: (scope: TradeScope) => void;
  buyerCountry?: string;
  vendorCountry?: string;
  compact?: boolean;
  /** When true, auto-sets scope on country detection (user can override) */
  autoSet?: boolean;
  /** When true, the selector is read-only — GPS has verified the scope */
  locked?: boolean;
  /** Label shown when locked (e.g. "GPS-verified") */
  lockedLabel?: string;
}

const SCOPE_OPTIONS: { value: TradeScope; label: string; icon: typeof Globe; description: string; docLevel: string }[] = [
  {
    value: "domestic",
    label: "Domestic",
    icon: MapPin,
    description: "Both parties in the same country. Minimal shipping docs required.",
    docLevel: "Proof of delivery only",
  },
  {
    value: "regional",
    label: "Regional / Corridor",
    icon: Building2,
    description: "Within a trade bloc (AfCFTA, ECOWAS, EU, ASEAN, USMCA, Mercosur, RCEP, GCC, etc.). Simplified docs.",
    docLevel: "Waybill + basic customs",
  },
  {
    value: "international",
    label: "International",
    icon: Globe,
    description: "Cross-border trade across continents. Full document gates apply.",
    docLevel: "Full customs, BoL, certificates",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    icon: Shuffle,
    description: "Domestic sale with imported inputs (e.g., local manufacturer importing parts). External fee tracker enabled for import milestones.",
    docLevel: "Delivery + import docs for inputs",
  },
];

const TradeScopeSelector = ({ value, onChange, buyerCountry, vendorCountry, compact = false, autoSet = true, locked = false, lockedLabel }: TradeScopeSelectorProps) => {
  const detected = useMemo(
    () => detectTradeScope(buyerCountry || "", vendorCountry || ""),
    [buyerCountry, vendorCountry]
  );
  const suggestedScope = buyerCountry && vendorCountry ? detected.scope : undefined;
  const detectedBlocName = detected.bloc?.shortName;

  // Auto-set scope when countries are detected (only once per detection change)
  const lastAutoSet = useRef<string>("");
  useEffect(() => {
    if (!autoSet || !suggestedScope) return;
    const key = `${buyerCountry}-${vendorCountry}`;
    if (lastAutoSet.current === key) return;
    lastAutoSet.current = key;
    onChange(suggestedScope);
  }, [autoSet, suggestedScope, buyerCountry, vendorCountry, onChange]);

  const isOverridden = suggestedScope && value !== suggestedScope;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-muted-foreground font-medium">Trade scope:</span>
        {SCOPE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.value;
          return (
            <TooltipProvider key={opt.value}>
              <Tooltip>
                <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => !locked && onChange(opt.value)}
                      disabled={locked}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                        locked ? "cursor-not-allowed opacity-60" : ""
                      } ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                    {suggestedScope === opt.value && !isSelected && (
                      <Badge className="text-[7px] px-1 py-0 bg-accent/20 text-accent">
                        {opt.value === "regional" && detectedBlocName ? detectedBlocName : "suggested"}
                      </Badge>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">{opt.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Docs: {opt.docLevel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Trade Scope</span>
          {locked && (
            <Badge className="text-[7px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/30">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              {lockedLabel || "GPS-Verified"}
            </Badge>
          )}
          {!locked && isOverridden && (
            <Badge variant="outline" className="text-[7px] border-accent/30 text-accent">
              Overridden
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px]">
                <p className="text-xs">
                  Auto-detected from buyer &amp; vendor locations. Override if needed. This adjusts which document uploads are required vs optional.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {SCOPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[9px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[7px] text-muted-foreground leading-tight">{opt.docLevel}</span>
                {suggestedScope === opt.value && (
                  <Badge className="absolute -top-1.5 -right-1.5 text-[7px] px-1 py-0 bg-accent text-accent-foreground">
                    {opt.value === "regional" && detectedBlocName ? detectedBlocName : "Auto"}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {detectedBlocName && value === "regional" && (
          <p className="text-[10px] text-muted-foreground">
            Detected trade bloc: <strong>{detectedBlocName}</strong> ({detected.bloc?.name})
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeScopeSelector;

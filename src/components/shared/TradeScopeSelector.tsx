import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, MapPin, Building2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type TradeScope = "domestic" | "regional" | "international";

interface TradeScopeSelectorProps {
  value: TradeScope;
  onChange: (scope: TradeScope) => void;
  buyerCountry?: string;
  vendorCountry?: string;
  compact?: boolean;
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
    description: "Within a trade bloc (AfCFTA, ECOWAS, EAC, EU, ASEAN). Simplified docs.",
    docLevel: "Waybill + basic customs",
  },
  {
    value: "international",
    label: "International",
    icon: Globe,
    description: "Cross-border trade across continents. Full document gates apply.",
    docLevel: "Full customs, BoL, certificates",
  },
];

const TradeScopeSelector = ({ value, onChange, buyerCountry, vendorCountry, compact = false }: TradeScopeSelectorProps) => {
  // Auto-detect suggestion
  const suggestedScope = buyerCountry && vendorCountry
    ? buyerCountry === vendorCountry
      ? "domestic"
      : undefined // could detect regional via trade bloc mapping in future
    : undefined;

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
                    onClick={() => onChange(opt.value)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {opt.label}
                    {suggestedScope === opt.value && !isSelected && (
                      <Badge className="text-[7px] px-1 py-0 bg-accent/20 text-accent">suggested</Badge>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px]">
                <p className="text-xs">
                  Select your trade type. This adjusts which document uploads are required vs optional. Domestic trades need fewer docs.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
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
                <span className={`text-[10px] font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[8px] text-muted-foreground leading-tight">{opt.docLevel}</span>
                {suggestedScope === opt.value && (
                  <Badge className="absolute -top-1.5 -right-1.5 text-[7px] px-1 py-0 bg-accent text-accent-foreground">
                    Auto
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeScopeSelector;

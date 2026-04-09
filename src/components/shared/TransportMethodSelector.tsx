import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Plane, Ship, Truck, TrainFront, Download, HandMetal, Plus, X, ExternalLink, Sparkles,
} from "lucide-react";
import {
  TRANSPORT_METHODS, type TransportMode, type TransportLeg, type TransportMethodMeta,
  getIndustryDefaultTransport, getCarrierSuggestions, autoTrackingUrl, createEmptyLeg,
} from "@/lib/transportMethods";

const ICON_MAP: Record<string, React.ReactNode> = {
  Package: <Package className="w-3.5 h-3.5" />,
  Plane: <Plane className="w-3.5 h-3.5" />,
  Ship: <Ship className="w-3.5 h-3.5" />,
  Truck: <Truck className="w-3.5 h-3.5" />,
  TrainFront: <TrainFront className="w-3.5 h-3.5" />,
  Download: <Download className="w-3.5 h-3.5" />,
  HandMetal: <HandMetal className="w-3.5 h-3.5" />,
};

interface TransportMethodSelectorProps {
  industry?: string | null;
  tradeScope?: string;
  legs: TransportLeg[];
  onLegsChange: (legs: TransportLeg[]) => void;
  disabled?: boolean;
}

export default function TransportMethodSelector({
  industry, tradeScope, legs, onLegsChange, disabled,
}: TransportMethodSelectorProps) {
  const defaults = useMemo(() => getIndustryDefaultTransport(industry), [industry]);

  // Auto-seed first leg from industry default if empty
  useEffect(() => {
    if (legs.length === 0 && defaults.length > 0) {
      onLegsChange([createEmptyLeg(defaults[0])]);
    }
  }, []); // only once on mount

  const addLeg = (mode: TransportMode) => {
    onLegsChange([...legs, createEmptyLeg(mode)]);
  };

  const removeLeg = (id: string) => {
    const updated = legs.filter((l) => l.id !== id);
    onLegsChange(updated);
  };

  const updateLeg = (id: string, patch: Partial<TransportLeg>) => {
    onLegsChange(legs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const region = tradeScope === "domestic" ? undefined : tradeScope === "regional" ? "africa" : "global";

  return (
    <div className="space-y-3">
      {/* Transport mode quick-select chips */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Transport Method(s)</Label>
        <div className="flex flex-wrap gap-1.5">
          {TRANSPORT_METHODS.map((m) => {
            const isActive = legs.some((l) => l.mode === m.key);
            const isDefault = defaults.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!isActive) addLeg(m.key);
                }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                  isActive
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {ICON_MAP[m.icon]}
                {m.label}
                {isDefault && !isActive && (
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-leg details */}
      {legs.map((leg, idx) => (
        <LegEditor
          key={leg.id}
          leg={leg}
          legIndex={idx}
          totalLegs={legs.length}
          onChange={(patch) => updateLeg(leg.id, patch)}
          onRemove={() => removeLeg(leg.id)}
          region={region}
          disabled={disabled}
        />
      ))}

      {legs.length > 0 && legs.length < 5 && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1 text-muted-foreground"
          onClick={() => addLeg(defaults[0] || "courier_express")}
        >
          <Plus className="w-3 h-3" /> Add transport leg
        </Button>
      )}
    </div>
  );
}

// ── Single Leg Editor ──

function LegEditor({
  leg, legIndex, totalLegs, onChange, onRemove, region, disabled,
}: {
  leg: TransportLeg;
  legIndex: number;
  totalLegs: number;
  onChange: (patch: Partial<TransportLeg>) => void;
  onRemove: () => void;
  region?: string;
  disabled?: boolean;
}) {
  const meta = TRANSPORT_METHODS.find((m) => m.key === leg.mode);

  const carriers = useMemo(
    () => getCarrierSuggestions(leg.mode, region),
    [leg.mode, region]
  );

  if (!meta) return null;

  // Auto-fill tracking URL when carrier changes
  const handleCarrierChange = (name: string) => {
    onChange({ carrierName: name });
    if (leg.trackingNumber) {
      const url = autoTrackingUrl(name, leg.trackingNumber);
      if (url) onChange({ carrierName: name, trackingUrl: url });
    }
  };

  const handleTrackingChange = (num: string) => {
    onChange({ trackingNumber: num });
    if (leg.carrierName) {
      const url = autoTrackingUrl(leg.carrierName, num);
      if (url) onChange({ trackingNumber: num, trackingUrl: url });
    }
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/20 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {ICON_MAP[meta.icon]}
          <span className="text-xs font-semibold">{meta.label}</span>
          {totalLegs > 1 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              Leg {legIndex + 1}
            </Badge>
          )}
        </div>
        {!disabled && (
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mode selector (change within leg) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Mode</Label>
          <Select value={leg.mode} onValueChange={(v) => onChange({ mode: v as TransportMode })} disabled={disabled}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORT_METHODS.map((m) => (
                <SelectItem key={m.key} value={m.key} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Carrier */}
        {meta.showCarrier && (
          <div>
            <Label className="text-[10px] text-muted-foreground">Carrier</Label>
            <Select value={leg.carrierName || "__custom"} onValueChange={(v) => v !== "__custom" && handleCarrierChange(v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((c) => (
                  <SelectItem key={c.name} value={c.name} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
                <SelectItem value="__custom" className="text-xs italic">Other (type below)</SelectItem>
              </SelectContent>
            </Select>
            {(leg.carrierName === "" || !carriers.find((c) => c.name === leg.carrierName)) && (
              <Input
                className="h-7 text-xs mt-1"
                placeholder="Carrier name"
                value={leg.carrierName}
                onChange={(e) => onChange({ carrierName: e.target.value })}
                disabled={disabled}
              />
            )}
          </div>
        )}
      </div>

      {/* Tracking number */}
      <div>
        <Label className="text-[10px] text-muted-foreground">{meta.trackingLabel}</Label>
        <Input
          className="h-8 text-xs font-mono"
          placeholder={meta.trackingLabel}
          value={leg.trackingNumber}
          onChange={(e) => handleTrackingChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Tracking URL */}
      {meta.showTrackingUrl && (
        <div>
          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
            Tracking URL
            {leg.trackingUrl && (
              <a href={leg.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary">
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </Label>
          <Input
            className="h-8 text-xs"
            placeholder="https://..."
            value={leg.trackingUrl}
            onChange={(e) => onChange({ trackingUrl: e.target.value })}
            disabled={disabled}
          />
          {leg.trackingUrl && leg.carrierName && (
            <p className="text-[9px] text-primary mt-0.5">Auto-generated from {leg.carrierName}</p>
          )}
        </div>
      )}

      {/* Vessel / Vehicle ID */}
      {meta.showVessel && (
        <div>
          <Label className="text-[10px] text-muted-foreground">{meta.vesselLabel}</Label>
          <Input
            className="h-8 text-xs"
            placeholder={meta.vesselLabel}
            value={leg.vesselId}
            onChange={(e) => onChange({ vesselId: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}

      {/* Multi-leg origin/destination */}
      {totalLegs > 1 && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Origin</Label>
            <Input className="h-7 text-xs" placeholder="From" value={leg.origin} onChange={(e) => onChange({ origin: e.target.value })} disabled={disabled} />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Destination</Label>
            <Input className="h-7 text-xs" placeholder="To" value={leg.destination} onChange={(e) => onChange({ destination: e.target.value })} disabled={disabled} />
          </div>
        </div>
      )}

      {/* Estimated delivery */}
      {meta.showEstimatedDelivery && (
        <div>
          <Label className="text-[10px] text-muted-foreground">Estimated Delivery</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={leg.estimatedDelivery}
            onChange={(e) => onChange({ estimatedDelivery: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

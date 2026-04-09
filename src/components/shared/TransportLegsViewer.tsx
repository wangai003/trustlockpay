import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Truck, Ship, Plane, Train, Package, Wifi, HandMetal, MapPin, Calendar } from "lucide-react";
import type { TransportLeg } from "@/lib/transportMethods";
import { TRANSPORT_MODES } from "@/lib/transportMethods";

const modeIcons: Record<string, any> = {
  air_freight: Plane,
  sea_freight: Ship,
  road_trucking: Truck,
  rail: Train,
  courier_express: Package,
  digital_delivery: Wifi,
  hand_delivery: HandMetal,
};

interface TransportLegsViewerProps {
  legs: TransportLeg[];
  compact?: boolean;
}

export default function TransportLegsViewer({ legs, compact = false }: TransportLegsViewerProps) {
  if (!legs || legs.length === 0) return null;

  const validLegs = legs.filter((l) => l.trackingNumber || l.carrierName);
  if (validLegs.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold flex items-center gap-1.5">
        <Truck className="w-3.5 h-3.5 text-primary" />
        Shipping & Logistics
        {validLegs.length > 1 && (
          <Badge variant="secondary" className="text-[9px]">{validLegs.length} legs</Badge>
        )}
      </h4>
      <div className={`space-y-1.5 ${compact ? "" : "grid grid-cols-1 gap-2"}`}>
        {validLegs.map((leg, i) => {
          const modeInfo = TRANSPORT_MODES.find((m) => m.value === leg.mode);
          const Icon = modeIcons[leg.mode] || Truck;

          return (
            <Card key={i} className="border-border/60">
              <CardContent className="p-2.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">
                      {validLegs.length > 1 && <span className="text-muted-foreground">Leg {i + 1}: </span>}
                      {modeInfo?.label || leg.mode}
                    </p>
                    {leg.carrierName && (
                      <p className="text-[10px] text-muted-foreground truncate">{leg.carrierName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  {leg.trackingNumber && (
                    <div>
                      <span className="text-muted-foreground">Tracking: </span>
                      <span className="font-mono font-semibold">{leg.trackingNumber}</span>
                    </div>
                  )}
                  {leg.vesselId && (
                    <div>
                      <span className="text-muted-foreground">{modeInfo?.vesselLabel || "Vessel"}: </span>
                      <span className="font-semibold">{leg.vesselId}</span>
                    </div>
                  )}
                  {leg.origin && (
                    <div className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">From: </span>
                      <span>{leg.origin}</span>
                    </div>
                  )}
                  {leg.destination && (
                    <div className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">To: </span>
                      <span>{leg.destination}</span>
                    </div>
                  )}
                  {leg.estimatedDelivery && (
                    <div className="flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="text-muted-foreground">ETA: </span>
                      <span>{leg.estimatedDelivery}</span>
                    </div>
                  )}
                </div>

                {leg.trackingUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-6 text-[10px] gap-1"
                    onClick={() => window.open(leg.trackingUrl, "_blank")}
                  >
                    <ExternalLink className="w-3 h-3" /> Track Shipment
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

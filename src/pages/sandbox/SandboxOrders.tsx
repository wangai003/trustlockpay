import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, Clock, FileText, ArrowLeft, ChevronRight, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { getSandboxLiveOrders, completeSandboxMilestone, SandboxLiveOrder } from "./sandboxIndustryData";
import { toast } from "sonner";
import { useGeolocation, GeoPosition } from "@/hooks/useGeolocation";

const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
};

// Physical industries that require GPS hard-gate
const PHYSICAL_INDUSTRIES = [
  "real_estate", "mining", "energy", "ecommerce", "construction",
  "logistics", "agriculture", "manufacturing", "automotive",
  "textiles", "food_beverage", "pharmaceuticals", "marine_fisheries",
  "aviation", "renewable_energy", "water_sanitation",
];

interface ResolvedLocation {
  address: string;
  position: GeoPosition;
}

const SandboxOrders = () => {
  const session = useOutletContext<{ role: string; name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<SandboxLiveOrder[]>([]);
  const selectedId = searchParams.get("detail");
  const { capturePosition, loading: gpsLoading } = useGeolocation();
  const [pendingMilestone, setPendingMilestone] = useState<{ orderId: string; idx: number } | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [resolving, setResolving] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const refreshOrders = () => {
    const all = getSandboxLiveOrders();
    if (session.role === "buyer") {
      setOrders(all.filter(o => o.claimedByBuyer));
    } else {
      setOrders(all);
    }
  };

  useEffect(() => {
    refreshOrders();
    const id = setInterval(refreshOrders, 3000);
    return () => clearInterval(id);
  }, [session.role]);

  const selectedOrder = orders.find(o => o.id === selectedId);

  const isPhysicalIndustry = (industryKey: string) =>
    PHYSICAL_INDUSTRIES.includes(industryKey);

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "TrustLock-Sandbox/1.0" } }
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  const handleAdvanceMilestone = async (orderId: string, milestoneIdx: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // For physical industries, require GPS
    if (isPhysicalIndustry(order.industryKey)) {
      setPendingMilestone({ orderId, idx: milestoneIdx });
      setResolvedLocation(null);
      setGpsError(null);
      setResolving(true);

      const pos = await capturePosition();
      if (!pos) {
        setGpsError("GPS access is required for this industry. Milestone cannot be completed without location verification.");
        setResolving(false);
        return;
      }

      const address = await reverseGeocode(pos.latitude, pos.longitude);
      setResolvedLocation({ address, position: pos });
      setResolving(false);
    } else {
      // Digital industries — complete directly
      finalizeMilestone(orderId, milestoneIdx);
    }
  };

  const finalizeMilestone = (orderId: string, milestoneIdx: number) => {
    const updated = completeSandboxMilestone(orderId, milestoneIdx);
    if (updated) {
      toast.success(`Milestone "${updated.milestones[milestoneIdx].title}" completed!`);
      if (updated.status === "completed") {
        toast.success("🎉 Order completed! Funds released.");
      }
      refreshOrders();
    }
    setPendingMilestone(null);
    setResolvedLocation(null);
    setGpsError(null);
  };

  const cancelGpsFlow = () => {
    setPendingMilestone(null);
    setResolvedLocation(null);
    setGpsError(null);
  };

  if (selectedOrder) {
    const completedPct = selectedOrder.milestones
      .filter(m => m.status === "completed")
      .reduce((s, m) => s + m.percentage, 0);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
          <ArrowLeft className="w-3 h-3 mr-1" /> Back to Orders
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{selectedOrder.orderNumber}</h2>
            <p className="text-xs text-muted-foreground">{selectedOrder.industryLabel} · {selectedOrder.vendorName}</p>
          </div>
          <Badge variant="outline" className={statusLabels[selectedOrder.status]?.color}>
            {statusLabels[selectedOrder.status]?.label}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold">{completedPct}%</span>
            </div>
            <Progress value={completedPct} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span>{selectedOrder.buyerName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{selectedOrder.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${selectedOrder.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fee</span><span>${selectedOrder.fee.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>${selectedOrder.total.toLocaleString()}</span></div>
            <Separator />
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>{item.qty} {item.unit} — {item.name}</span>
                <span>${(item.qty * item.unitPrice).toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Milestone Tracker</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selectedOrder.milestones.map((m, i) => {
              const isActive = m.status === "in_progress";
              const isDone = m.status === "completed";
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${isActive ? "border-primary/30 bg-primary/5" : isDone ? "border-green-200 bg-green-50/30" : "border-border"}`}>
                  <div className="mt-0.5">
                    {isDone ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                     isActive ? <Clock className="w-5 h-5 text-primary" /> :
                     <Circle className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDone ? "text-green-700" : isActive ? "text-primary" : "text-muted-foreground"}`}>{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px]">{m.percentage}%</Badge>
                      {m.documentGate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <FileText className="w-3 h-3" /> {m.documentGate}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <Button size="sm" onClick={() => handleAdvanceMilestone(selectedOrder.id, i)} className="text-xs">
                      {session.role === "vendor" ? "Complete" : "Confirm"} <ChevronRight className="w-3 h-3 ml-0.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Required Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {selectedOrder.documents.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                <span className="flex-1">{d.name}</span>
                <Badge variant="outline" className="text-[9px]">
                  {d.owner === "vendor" ? "(V)" : d.owner === "buyer" ? "(B)" : "(V/B)"}
                </Badge>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground italic mt-2">
              In production, documents would need to be uploaded and verified before milestone advancement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {session.role === "buyer"
                ? "No orders claimed yet. Complete a checkout in the demo store, then enter your order number on the Overview page."
                : "No orders yet. Orders will appear here when buyers complete checkout from the demo store."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const st = statusLabels[order.status] || { label: order.status, color: "" };
            const pct = order.milestones.filter(m => m.status === "completed").reduce((s, m) => s + m.percentage, 0);
            return (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSearchParams({ detail: order.id })}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.items[0]?.name}</p>
                      <p className="text-xs text-muted-foreground">{order.orderNumber} · {order.industryLabel}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">${order.total.toLocaleString()}</p>
                      <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{pct}% complete · {order.buyerName}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SandboxOrders;

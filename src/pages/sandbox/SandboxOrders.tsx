import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, ArrowLeft, Globe } from "lucide-react";
import {
  getSandboxLiveOrders,
  SandboxLiveOrder,
  sandboxOrderToMockMilestones,
  updateSandboxMilestoneStatus,
} from "./sandboxIndustryData";
import { toast } from "sonner";
import MilestoneTimeline from "@/components/shared/MilestoneTimeline";
import MilestoneProgress from "@/components/shared/MilestoneProgress";
import MilestoneWorkOrderPanel from "@/components/shared/MilestoneWorkOrderPanel";
import MilestoneNegotiation, { type MilestoneDraft } from "@/components/shared/MilestoneNegotiation";
import TransactionDocuments from "@/components/shared/TransactionDocuments";
import IndustryBlueprintCard from "@/components/shared/IndustryBlueprintCard";
import ExternalFeeSummary from "@/components/shared/ExternalFeeSummary";
import OrderStepGuide from "@/components/shared/OrderStepGuide";
import type { MockMilestone } from "@/hooks/useTestnetData";

const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
};

const statusToMainnet = (s: string) => {
  if (s === "escrow_locked") return "locked";
  if (s === "in_progress") return "shipped";
  if (s === "completed") return "released";
  return s;
};

const SandboxOrders = () => {
  const session = useOutletContext<{ role: string; name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<SandboxLiveOrder[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedId = searchParams.get("detail");

  // Milestone negotiation state (per order, keyed by order id)
  const [negotiationStatus, setNegotiationStatus] = useState<Record<string, "drafting" | "proposed" | "agreed">>({});
  const [negotiationProposer, setNegotiationProposer] = useState<Record<string, "buyer" | "vendor">>({});
  const [negotiationMilestones, setNegotiationMilestones] = useState<Record<string, MilestoneDraft[]>>({});

  const refreshOrders = useCallback(() => {
    const all = getSandboxLiveOrders();
    if (session.role === "buyer") {
      setOrders(all.filter(o => o.claimedByBuyer));
    } else {
      setOrders(all);
    }
  }, [session.role]);

  useEffect(() => {
    refreshOrders();
    const id = setInterval(refreshOrders, 3000);
    return () => clearInterval(id);
  }, [refreshOrders]);

  const selectedOrder = orders.find(o => o.id === selectedId);

  // ── Testnet-style callbacks for MilestoneWorkOrderPanel ──

  const handleUpdateStatus = useCallback((milestoneId: string, status: MockMilestone["status"]) => {
    if (!selectedId) return;
    updateSandboxMilestoneStatus(selectedId, milestoneId, status);
    refreshOrders();
    setRefreshKey(k => k + 1);
    if (status === "completed") toast.success("Milestone completed!");
  }, [selectedId, refreshOrders]);

  const handleSaveNote = useCallback((_milestoneId: string, note: string) => {
    toast.success("Note saved (sandbox demo)");
  }, []);

  const handleAddDocument = useCallback((_milestoneId: string, doc: { name: string; url: string }) => {
    toast.success(`Document "${doc.name}" attached (sandbox demo)`);
  }, []);

  const handleInviteObserver = useCallback((_milestoneId: string, name: string, _email: string) => {
    toast.success(`Observer "${name}" invited (sandbox demo)`);
    return `obs-${crypto.randomUUID().slice(0, 8)}`;
  }, []);

  const handleRelease = useCallback((milestoneId: string) => {
    if (!selectedId) return;
    updateSandboxMilestoneStatus(selectedId, milestoneId, "completed");
    refreshOrders();
    setRefreshKey(k => k + 1);
    toast.success("Milestone payment released!");
  }, [selectedId, refreshOrders]);

  const handleAddGps = useCallback((_milestoneId: string, lat: number, lng: number, accuracy: number, _address?: string, _city?: string, _country?: string) => {
    toast.success(`GPS captured: ${lat.toFixed(4)}, ${lng.toFixed(4)} ±${accuracy.toFixed(0)}m`);
  }, []);

  // ── Order Detail View (matching testnet/mainnet layout) ──
  if (selectedOrder) {
    const completedPct = selectedOrder.milestones
      .filter(m => m.status === "completed")
      .reduce((s, m) => s + m.percentage, 0);

    const mockMilestones = sandboxOrderToMockMilestones(selectedOrder);
    const mappedStatus = statusToMainnet(selectedOrder.status);

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

        {/* Order Summary */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">Buyer</p><p className="font-medium">{selectedOrder.buyerName}</p></div>
              <div><p className="text-muted-foreground">Vendor</p><p className="font-medium">{selectedOrder.vendorName}</p></div>
              <div><p className="text-muted-foreground">Industry</p><p className="font-medium capitalize">{selectedOrder.industryLabel}</p></div>
              <div><p className="text-muted-foreground">Payment</p><p className="font-medium">{selectedOrder.paymentMethod}</p></div>
              <div><p className="text-muted-foreground">Date</p><p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p></div>
              <div><p className="text-muted-foreground">Order #</p><p className="font-medium font-mono">{selectedOrder.orderNumber}</p></div>
            </div>
            <Separator />
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>{item.qty} {item.unit} — {item.name}</span>
                <span>${(item.qty * item.unitPrice).toLocaleString()}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>${selectedOrder.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">TrustLock Fee</span><span>${selectedOrder.fee.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold"><span>Total</span><span>${selectedOrder.total.toLocaleString()}</span></div>
          </CardContent>
        </Card>

        {/* Step Guide */}
        <OrderStepGuide status={mappedStatus} role={session.role as "buyer" | "vendor"} industry={selectedOrder.industryKey} />

        {/* Industry Blueprint */}
        <IndustryBlueprintCard industry={selectedOrder.industryKey} />

        {/* Milestone Timeline (visual Gantt) */}
        <MilestoneTimeline industry={selectedOrder.industryKey} status={mappedStatus} />

        {/* Milestone list format (collapsible) */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">View list format</summary>
          <MilestoneProgress industry={selectedOrder.industryKey} status={mappedStatus} />
        </details>

        {/* Full Work Order Panel */}
        <MilestoneWorkOrderPanel
          key={refreshKey}
          role={session.role as "buyer" | "vendor"}
          txId={selectedOrder.orderNumber}
          transactionId={null}
          industry={selectedOrder.industryKey}
          transactionStatus={mappedStatus}
          isTestnet={true}
          testnetMilestones={mockMilestones}
          onTestnetUpdateStatus={handleUpdateStatus}
          onTestnetSaveNote={handleSaveNote}
          onTestnetAddDocument={handleAddDocument}
          onTestnetInviteObserver={handleInviteObserver}
          onTestnetRelease={handleRelease}
          onTestnetAddGps={handleAddGps}
        />

        {/* External Fee Summary */}
        <ExternalFeeSummary transactionId={selectedOrder.id} escrowAmount={selectedOrder.subtotal} />

        {/* Transaction Documents */}
        <TransactionDocuments
          tx={{
            txId: selectedOrder.orderNumber,
            vendorName: selectedOrder.vendorName,
            buyerName: selectedOrder.buyerName,
            item: selectedOrder.items[0]?.name || "Order",
            amount: selectedOrder.subtotal,
            date: new Date(selectedOrder.createdAt).toLocaleDateString(),
            status: mappedStatus,
            industry: selectedOrder.industryKey,
          }}
        />

        {/* Required Documents Reference */}
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Order List View ──
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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

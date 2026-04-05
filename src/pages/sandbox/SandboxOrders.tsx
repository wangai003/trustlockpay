import { useState, useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Circle, Clock, FileText, ArrowLeft, ChevronRight } from "lucide-react";
import { getSandboxLiveOrders, completeSandboxMilestone, SandboxLiveOrder } from "./sandboxIndustryData";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
};

const SandboxOrders = () => {
  const session = useOutletContext<{ role: string; name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<SandboxLiveOrder[]>([]);
  const selectedId = searchParams.get("detail");

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

  const handleAdvanceMilestone = (orderId: string, milestoneIdx: number) => {
    const updated = completeSandboxMilestone(orderId, milestoneIdx);
    if (updated) {
      toast.success(`Milestone "${updated.milestones[milestoneIdx].title}" completed!`);
      if (updated.status === "completed") {
        toast.success("🎉 Order completed! Funds released.");
      }
      refreshOrders();
    }
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SANDBOX_ORDERS, statusLabels, milestoneStatusColors, type SandboxOrder } from "./sandboxData";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SandboxOrders = () => {
  const ctx = useOutletContext<{ role: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const detailId = searchParams.get("detail");
  const [orders, setOrders] = useState(SANDBOX_ORDERS);
  const [releasing, setReleasing] = useState<string | null>(null);

  const selectedOrder = detailId ? orders.find(o => o.id === detailId) : null;

  const handleAdvanceMilestone = (orderId: string, milestoneId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const ms = o.milestones.map(m => {
        if (m.id === milestoneId && m.status === "in_progress") return { ...m, status: "completed" as const };
        return m;
      });
      // Activate next pending milestone
      const nextPending = ms.findIndex(m => m.status === "pending");
      if (nextPending >= 0) ms[nextPending] = { ...ms[nextPending], status: "in_progress" as const };
      return { ...o, milestones: ms };
    }));
    toast.success("Milestone advanced!");
  };

  const handleReleaseFunds = (orderId: string) => {
    setReleasing(orderId);
    setTimeout(() => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "completed" as const } : o));
      setReleasing(null);
      toast.success("Funds released to vendor! 🎉");
    }, 2000);
  };

  if (selectedOrder) {
    const st = statusLabels[selectedOrder.status] || { label: selectedOrder.status, color: "" };
    const allComplete = selectedOrder.milestones.every(m => m.status === "completed");
    const isBuyer = ctx.role === "buyer";
    const progress = selectedOrder.milestones.filter(m => m.status === "completed").reduce((s, m) => s + m.percentage, 0);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSearchParams({})}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Orders
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{selectedOrder.item}</h2>
            <p className="text-sm text-muted-foreground">{selectedOrder.id}</p>
          </div>
          <Badge variant="outline" className={st.color}>{st.label}</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold">${selectedOrder.amount.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Fee</p><p className="font-bold">${selectedOrder.fee.toFixed(2)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{isBuyer ? "Vendor" : "Buyer"}</p><p className="font-bold text-sm">{selectedOrder.buyer}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Payment</p><p className="font-bold text-sm">{selectedOrder.paymentMethod}</p></CardContent></Card>
        </div>

        {/* Progress bar */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Escrow Progress — {progress}%</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full bg-muted rounded-full h-3 mb-4">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-3">
              {selectedOrder.milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                     m.status === "in_progress" ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" /> :
                     <Circle className="w-4 h-4 text-muted-foreground" />}
                    <span className={`text-sm ${m.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{m.percentage}%</span>
                    {m.status === "in_progress" && !isBuyer && selectedOrder.status === "escrow_locked" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAdvanceMilestone(selectedOrder.id, m.id)}>
                        Mark Done
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Buyer release button */}
        {isBuyer && allComplete && selectedOrder.status === "escrow_locked" && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-green-800 mb-3">All milestones complete. Ready to release funds to the vendor.</p>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleReleaseFunds(selectedOrder.id)}
                disabled={releasing === selectedOrder.id}
              >
                {releasing === selectedOrder.id ? "Releasing…" : "Release Funds ($" + selectedOrder.amount.toFixed(2) + ")"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => {
          const st = statusLabels[order.status] || { label: order.status, color: "" };
          return (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSearchParams({ detail: order.id })}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{order.item}</p>
                  <p className="text-xs text-muted-foreground">{order.buyer} · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-semibold">${order.amount.toFixed(2)}</p>
                  <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SandboxOrders;

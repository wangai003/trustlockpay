import { useState } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

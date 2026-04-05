import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Package, CheckCircle, Globe, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSandboxLiveOrders, claimSandboxOrder, SandboxLiveOrder } from "./sandboxIndustryData";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
};

const SandboxBuyerOverview = () => {
  const [orders, setOrders] = useState<SandboxLiveOrder[]>([]);
  const [claimCode, setClaimCode] = useState("");

  useEffect(() => {
    setOrders(getSandboxLiveOrders().filter(o => o.claimedByBuyer));
    const id = setInterval(() => setOrders(getSandboxLiveOrders().filter(o => o.claimedByBuyer)), 3000);
    return () => clearInterval(id);
  }, []);

  const handleClaim = () => {
    if (!claimCode.trim()) return;
    const result = claimSandboxOrder(claimCode.trim().toUpperCase());
    if (result) {
      toast.success(`Order ${result.orderNumber} claimed successfully!`);
      setClaimCode("");
      setOrders(getSandboxLiveOrders().filter(o => o.claimedByBuyer));
    } else {
      toast.error("Order not found. Check the order number and try again.");
    }
  };

  const escrowTotal = orders.filter(o => o.status !== "completed").reduce((s, o) => s + o.total, 0);
  const completedCount = orders.filter(o => o.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Buyer Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your escrow-protected purchases</p>
      </div>

      {/* Claim Order */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-foreground mb-2">📦 Enter Order Number to Track</p>
          <div className="flex gap-2">
            <Input
              value={claimCode}
              onChange={e => setClaimCode(e.target.value)}
              placeholder="SBX-5001"
              className="font-mono"
              onKeyDown={e => e.key === "Enter" && handleClaim()}
            />
            <Button onClick={handleClaim} size="sm" disabled={!claimCode.trim()}>
              <Search className="w-3 h-3 mr-1" /> Claim
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Copy the order number from your checkout confirmation</p>
        </CardContent>
      </Card>

      {orders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No orders claimed yet</p>
            <p className="text-xs text-muted-foreground mb-3">Go to the demo store, complete a checkout, then enter your order number above.</p>
            <Link to="/sandbox/store">
              <Badge className="cursor-pointer">Browse Demo Store →</Badge>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Active Orders</span></div>
          <p className="text-2xl font-bold">{orders.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-yellow-600" /><span className="text-xs text-muted-foreground">Protected in Escrow</span></div>
          <p className="text-2xl font-bold">${escrowTotal.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs text-muted-foreground">Completed</span></div>
          <p className="text-2xl font-bold">{completedCount}</p>
        </CardContent></Card>
      </div>

      {orders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Orders</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {orders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: "" };
                return (
                  <Link to={`/sandbox/buyer/orders?detail=${order.id}`} key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.items[0]?.name}</p>
                      <p className="text-xs text-muted-foreground">{order.vendorName} · {order.orderNumber}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">${order.total.toLocaleString()}</p>
                      <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SandboxBuyerOverview;

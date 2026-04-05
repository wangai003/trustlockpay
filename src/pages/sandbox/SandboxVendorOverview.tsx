import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, Shield, TrendingUp, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { getSandboxLiveOrders, SandboxLiveOrder } from "./sandboxIndustryData";

const statusLabels: Record<string, { label: string; color: string }> = {
  escrow_locked: { label: "Escrow Locked", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  in_progress: { label: "In Progress", color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  disputed: { label: "Disputed", color: "text-red-600 bg-red-50 border-red-200" },
};

const SandboxVendorOverview = () => {
  const [orders, setOrders] = useState<SandboxLiveOrder[]>([]);

  useEffect(() => {
    setOrders(getSandboxLiveOrders());
    const id = setInterval(() => setOrders(getSandboxLiveOrders()), 3000);
    return () => clearInterval(id);
  }, []);

  const escrowTotal = orders.filter(o => o.status === "escrow_locked" || o.status === "in_progress").reduce((s, o) => s + o.total, 0);
  const completedTotal = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.total, 0);
  const totalFees = orders.reduce((s, o) => s + o.fee, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Vendor Dashboard</h1>
        <p className="text-sm text-muted-foreground">All sandbox orders across industries</p>
      </div>

      {orders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No orders yet</p>
            <p className="text-xs text-muted-foreground mb-3">Orders created from the demo store will appear here.</p>
            <Link to="/sandbox/store">
              <Badge className="cursor-pointer">Browse Demo Store →</Badge>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Orders</span></div>
          <p className="text-2xl font-bold">{orders.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-yellow-600" /><span className="text-xs text-muted-foreground">In Escrow</span></div>
          <p className="text-2xl font-bold">${escrowTotal.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-600" /><span className="text-xs text-muted-foreground">Released</span></div>
          <p className="text-2xl font-bold">${completedTotal.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Fees</span></div>
          <p className="text-2xl font-bold">${totalFees.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      {orders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Orders</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {orders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: "" };
                return (
                  <Link to={`/sandbox/vendor/orders?detail=${order.id}`} key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{order.items[0]?.name}</p>
                      <p className="text-xs text-muted-foreground">{order.buyerName} · {order.orderNumber} · {order.industryLabel}</p>
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

export default SandboxVendorOverview;

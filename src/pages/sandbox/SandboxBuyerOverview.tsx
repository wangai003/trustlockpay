import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Package, DollarSign, CheckCircle } from "lucide-react";
import { SANDBOX_ORDERS, statusLabels } from "./sandboxData";
import { Link } from "react-router-dom";

const SandboxBuyerOverview = () => {
  const escrowTotal = SANDBOX_ORDERS.filter(o => o.status === "escrow_locked").reduce((s, o) => s + o.amount, 0);
  const completedCount = SANDBOX_ORDERS.filter(o => o.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Buyer Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your escrow-protected purchases</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Orders</span>
            </div>
            <p className="text-2xl font-bold">{SANDBOX_ORDERS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground">Protected in Escrow</span>
            </div>
            <p className="text-2xl font-bold">${escrowTotal.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your Orders</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {SANDBOX_ORDERS.map((order) => {
              const st = statusLabels[order.status] || { label: order.status, color: "" };
              return (
                <Link to={`/sandbox/buyer/orders?detail=${order.id}`} key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.item}</p>
                    <p className="text-xs text-muted-foreground">From: Kente Craft Ltd · {order.id}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold">${order.amount.toFixed(2)}</p>
                    <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SandboxBuyerOverview;

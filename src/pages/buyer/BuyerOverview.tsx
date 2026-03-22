import { motion } from "framer-motion";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { useBuyer } from "@/contexts/BuyerContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, DollarSign, Clock, CheckCircle, AlertTriangle, Eye, ShieldCheck } from "lucide-react";

const recentOrders = [
  { id: "TL-2026-0891", vendor: "Kente Craft Ltd", amount: "$200.00", status: "locked" as const, date: "Mar 18", item: "Kente Cloth Set", delivery: "Awaiting shipment" },
  { id: "TL-2026-0896", vendor: "Mombasa Textiles", amount: "$350.00", status: "shipped" as const, date: "Mar 21", item: "Traditional Beads", delivery: "In transit — ETA Mar 28" },
  { id: "TL-2026-0892", vendor: "Kente Craft Ltd", amount: "$4,500.00", status: "delivered" as const, date: "Mar 20", item: "Bulk Textiles", delivery: "Confirm delivery to release funds" },
  { id: "TL-2026-0889", vendor: "Kente Craft Ltd", amount: "$120.00", status: "released" as const, date: "Mar 17", item: "Handwoven Basket", delivery: "Completed" },
  { id: "TL-2026-0894", vendor: "GreenFarm Co", amount: "$680.00", status: "disputed" as const, date: "Mar 15", item: "Custom Fabric Order", delivery: "Under review" },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Package },
  delivered: { label: "Confirm Delivery", color: "bg-accent text-accent-foreground", icon: CheckCircle },
  released: { label: "Completed", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const BuyerOverview = () => {
  const { buyer } = useBuyer();

  return (
    <div>
      <BuyerHeader title="Dashboard" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <h2 className="font-heading text-base sm:text-xl font-bold">Welcome, {buyer.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your purchases are protected by TrustLock escrow</p>
              <div className="flex items-center gap-2 mt-3">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[10px] sm:text-xs text-primary font-medium">All funds held securely until you confirm delivery</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Active Orders", value: "3", icon: Package },
            { label: "Funds in Escrow", value: "$5,050", icon: Clock },
            { label: "Completed", value: "8", icon: CheckCircle },
            { label: "Open Disputes", value: "1", icon: AlertTriangle },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Required */}
        {recentOrders.some((o) => o.status === "delivered") && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Action Required</p>
                <p className="text-xs text-muted-foreground">You have orders awaiting delivery confirmation. Confirm to release funds to vendor.</p>
              </div>
              <Button size="sm">Review Now</Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">View All →</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Vendor</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Item</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const cfg = statusConfig[order.status];
                    return (
                      <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-mono text-xs">{order.id}</td>
                        <td className="p-4">{order.vendor}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{order.item}</td>
                        <td className="p-4 text-right font-semibold">{order.amount}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {order.status === "delivered" && <Button size="sm" className="text-xs">Confirm</Button>}
                            {order.status === "shipped" && <Button variant="outline" size="sm" className="text-xs">Track</Button>}
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuyerOverview;

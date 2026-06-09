import { motion } from "framer-motion";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { useBuyer } from "@/contexts/BuyerContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, DollarSign, Clock, CheckCircle, AlertTriangle, Eye, ShieldCheck, Truck } from "lucide-react";
import { useTransactions, useConfirmDelivery } from "@/hooks/useSupabaseData";
import { useNavigate } from "react-router-dom";
import OnboardingTaskCard from "@/components/shared/OnboardingTaskCard";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Package },
  delivered: { label: "Confirm Delivery", color: "bg-accent text-accent-foreground", icon: CheckCircle },
  released: { label: "Completed", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const BuyerOverview = () => {
  const { buyer } = useBuyer();
  const navigate = useNavigate();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const confirmDelivery = useConfirmDelivery();

  const recentOrders = transactions.slice(0, 5).map(tx => ({
    id: tx.tx_id,
    vendor: tx.vendor_name || "Unknown",
    amount: `$${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    status: tx.status,
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    item: tx.item || "—",
  }));

  const escrowStatuses = ["locked", "shipped", "delivered", "disputed", "kyc_hold", "compliance_hold"];
  const activeOrders = transactions.filter(t => ["locked", "shipped", "delivered"].includes(t.status)).length;
  const fundsInEscrow = transactions.filter(t => escrowStatuses.includes(t.status)).reduce((s, t) => s + Number(t.amount), 0);
  const completed = transactions.filter(t => t.status === "released").length;
  const openDisputes = transactions.filter(t => t.status === "disputed").length;

  const statCards = [
    { label: "Active Orders", value: String(activeOrders), icon: Package, color: "text-accent" },
    { label: "Funds in Escrow", value: `$${fundsInEscrow.toLocaleString()}`, icon: Clock, color: "text-accent" },
    { label: "Completed", value: String(completed), icon: CheckCircle, color: "text-primary" },
    { label: "Open Disputes", value: String(openDisputes), icon: AlertTriangle, color: openDisputes > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <div>
      <BuyerHeader title="Dashboard" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <OnboardingTaskCard role="buyer" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" />
            <CardContent className="p-4 sm:p-6 relative">
              <h2 className="font-heading text-base sm:text-xl font-bold">Welcome, {buyer.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Your purchases are protected by TrustLock escrow</p>
              <div className="flex items-center gap-2 mt-3">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[10px] sm:text-xs text-primary font-medium">All funds held securely until you confirm delivery</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"
        >
          {txLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-xl" />
            ))
          ) : (
            statCards.map((stat) => (
              <motion.div key={stat.label} variants={item}>
                <Card className="group hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(152,52%,24%/0.08)]">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <stat.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <div className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {recentOrders.some((o) => o.status === "delivered") && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs hover:text-primary" onClick={() => navigate("/trustlock/buyer/orders")}>
                  View All →
                </Button>
            </CardHeader>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No orders yet</p>
                  <p className="text-xs mt-1">Your purchase activity will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs">ID</th>
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs">Vendor</th>
                        <th className="text-left p-4 font-semibold text-muted-foreground text-xs hidden md:table-cell">Item</th>
                        <th className="text-right p-4 font-semibold text-muted-foreground text-xs">Amount</th>
                        <th className="text-center p-4 font-semibold text-muted-foreground text-xs">Status</th>
                        <th className="text-center p-4 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const cfg = statusConfig[order.status] || statusConfig.locked;
                        return (
                          <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="p-4 font-mono text-xs">{order.id}</td>
                            <td className="p-4 text-sm">{order.vendor}</td>
                            <td className="p-4 hidden md:table-cell text-muted-foreground text-sm">{order.item}</td>
                            <td className="p-4 text-right font-semibold">{order.amount}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                <cfg.icon className="w-3 h-3" /> {cfg.label}
                              </span>
                            </td>
                            <td className="p-4 text-center hidden sm:table-cell">
                              <div className="flex items-center justify-center gap-1">
                                {order.status === "delivered" && <Button size="sm" className="text-xs" onClick={() => confirmDelivery.mutate(order.id)}>Confirm</Button>}
                                {order.status === "shipped" && <Button variant="outline" size="sm" className="text-xs">Track</Button>}
                                <Button variant="ghost" size="sm" className="hover:text-primary"><Eye className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default BuyerOverview;

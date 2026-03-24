import { useState } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Clock, CheckCircle, AlertTriangle, Package, Truck, MapPin } from "lucide-react";
import { useTransactions, useConfirmDelivery, useOpenDispute } from "@/hooks/useSupabaseData";

type OrderStatus = "all" | "locked" | "shipped" | "delivered" | "released" | "disputed";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  delivered: { label: "Confirm Delivery", color: "bg-accent text-accent-foreground", icon: CheckCircle },
  released: { label: "Completed", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const BuyerOrders = () => {
  const [filter, setFilter] = useState<OrderStatus>("all");
  const [search, setSearch] = useState("");
  const { data: rawTransactions = [] } = useTransactions();
  const confirmDelivery = useConfirmDelivery();
  const openDispute = useOpenDispute();

  const allOrders = rawTransactions.map(tx => ({
    id: tx.tx_id,
    vendor: tx.vendor_name || "Unknown",
    amount: `$${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    status: tx.status,
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    item: tx.item || "—",
    tracking: tx.tracking || null,
  }));

  const filtered = allOrders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => o.id.toLowerCase().includes(search.toLowerCase()) || o.vendor.toLowerCase().includes(search.toLowerCase()) || o.item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <BuyerHeader title="My Orders" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "locked", "shipped", "delivered", "released", "disputed"] as OrderStatus[]).map((s) => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize">
                {s === "all" ? "All" : statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((order) => {
            const cfg = statusConfig[order.status] || statusConfig.locked;
            return (
              <Card key={order.id} className={order.status === "delivered" ? "border-accent/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold">{order.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm"><strong>{order.item}</strong> from <span className="text-muted-foreground">{order.vendor}</span></p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Amount: {order.amount}</span>
                        <span>Date: {order.date}</span>
                        {order.tracking && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.tracking}</span>
                        )}
                      </div>
                    </div>

                    <div className="lg:w-64">
                      <div className="flex items-center gap-1">
                        {["Paid", "Shipped", "Delivered", "Released"].map((step, i) => {
                          const stepIndex = { locked: 0, shipped: 1, delivered: 2, released: 3, disputed: -1 }[order.status] ?? -1;
                          const isComplete = i <= stepIndex;
                          const isCurrent = i === stepIndex;
                          return (
                            <div key={step} className="flex items-center gap-1 flex-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                isComplete ? "bg-primary text-primary-foreground" : isCurrent ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                              }`}>
                                {isComplete ? "✓" : i + 1}
                              </div>
                              {i < 3 && <div className={`flex-1 h-0.5 ${isComplete && i < stepIndex ? "bg-primary" : "bg-muted"}`} />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                        <span>Paid</span><span>Shipped</span><span>Delivered</span><span>Released</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {order.status === "delivered" && <Button size="sm" onClick={() => confirmDelivery.mutate(order.id)}>Confirm Delivery</Button>}
                      {order.status === "shipped" && <Button variant="outline" size="sm">Track</Button>}
                      {(order.status === "locked" || order.status === "shipped" || order.status === "delivered") && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => openDispute.mutate({ txId: order.id })}>Dispute</Button>
                      )}
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BuyerOrders;

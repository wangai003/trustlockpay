import { useState } from "react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Clock, CheckCircle, AlertTriangle, Package, Truck, MapPin, ChevronDown, ChevronUp, PackagePlus, Loader2 } from "lucide-react";
import { useTransactions, useConfirmDelivery, useOpenDispute } from "@/hooks/useSupabaseData";
import MilestoneProgress from "@/components/shared/MilestoneProgress";
import MilestoneTimeline from "@/components/shared/MilestoneTimeline";
import TransactionDocuments from "@/components/shared/TransactionDocuments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const queryClient = useQueryClient();
  const { data: rawTransactions = [] } = useTransactions();
  const confirmDelivery = useConfirmDelivery();
  const openDispute = useOpenDispute();

  const handleClaimOrder = async () => {
    const code = claimCode.trim();
    if (!code) {
      toast.error("Please enter an order number or confirmation code");
      return;
    }
    setClaiming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to claim an order");
        setClaiming(false);
        return;
      }

      // Try matching by order_number first, then by confirmation_code in order_carbon_copies
      let matched = false;

      // Check transactions table by order_number
      const orderNum = parseInt(code, 10);
      if (!isNaN(orderNum)) {
        const { data: txByNum } = await supabase
          .from("transactions")
          .select("id, buyer_id")
          .eq("order_number", orderNum)
          .maybeSingle();

        if (txByNum) {
          if (txByNum.buyer_id === user.id) {
            toast.info("This order is already linked to your account");
            matched = true;
          } else if (!txByNum.buyer_id) {
            const { error } = await supabase
              .from("transactions")
              .update({ buyer_id: user.id })
              .eq("id", txByNum.id);
            if (!error) {
              toast.success("Order claimed successfully!");
              matched = true;
            }
          } else {
            toast.error("This order belongs to another account");
            matched = true;
          }
        }
      }

      // Check order_carbon_copies by confirmation_code
      if (!matched) {
        const { data: ccMatch } = await supabase
          .from("order_carbon_copies")
          .select("id, transaction_id, buyer_id, confirmation_code")
          .or(`confirmation_code.eq.${code},order_number.eq.${code}`)
          .maybeSingle();

        if (ccMatch) {
          if (ccMatch.buyer_id === user.id) {
            toast.info("This order is already linked to your account");
            matched = true;
          } else if (!ccMatch.buyer_id) {
            const { error } = await supabase
              .from("order_carbon_copies")
              .update({ buyer_id: user.id })
              .eq("id", ccMatch.id);
            if (!error) {
              // Also link the main transaction
              if (ccMatch.transaction_id) {
                await supabase
                  .from("transactions")
                  .update({ buyer_id: user.id })
                  .eq("id", ccMatch.transaction_id);
              }
              toast.success("Order claimed successfully!");
              matched = true;
            }
          } else {
            toast.error("This order belongs to another account");
            matched = true;
          }
        }
      }

      // Check by tx_id as last resort
      if (!matched) {
        const { data: txByTxId } = await supabase
          .from("transactions")
          .select("id, buyer_id")
          .eq("tx_id", code)
          .maybeSingle();

        if (txByTxId) {
          if (txByTxId.buyer_id === user.id) {
            toast.info("This order is already linked to your account");
          } else if (!txByTxId.buyer_id) {
            const { error } = await supabase
              .from("transactions")
              .update({ buyer_id: user.id })
              .eq("id", txByTxId.id);
            if (!error) toast.success("Order claimed successfully!");
          } else {
            toast.error("This order belongs to another account");
          }
        } else {
          toast.error("No order found with that number. Please check and try again.");
        }
      }

      setClaimCode("");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to claim order");
    } finally {
      setClaiming(false);
    }
  };

  const allOrders = rawTransactions.map(tx => ({
    id: tx.tx_id,
    vendor: tx.vendor_name || "Unknown",
    amount: `$${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    status: tx.status,
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    item: tx.item || "—",
    tracking: tx.tracking || null,
    industry: tx.industry || null,
  }));

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filtered = allOrders
    .filter((o) => filter === "all" || o.status === filter)
    .filter((o) => o.id.toLowerCase().includes(search.toLowerCase()) || o.vendor.toLowerCase().includes(search.toLowerCase()) || o.item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <BuyerHeader title="My Orders" />
      <div className="p-6 space-y-6">
        {/* Claim Order Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <PackagePlus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Claim Your Order</h3>
                  <p className="text-xs text-muted-foreground">Enter the order number or confirmation code from your checkout receipt</p>
                </div>
              </div>
              <div className="flex gap-2 flex-1 w-full sm:w-auto">
                <Input
                  placeholder="e.g. 100234 or TL-CONF-ABC123"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleClaimOrder()}
                  className="flex-1 bg-background"
                />
                <Button onClick={handleClaimOrder} disabled={claiming || !claimCode.trim()} size="sm" className="shrink-0">
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {claiming ? "Claiming..." : "Claim"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No orders yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Use the claim box above to add your first order</p>
              </CardContent>
            </Card>
          )}
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
                      <Button variant="ghost" size="sm" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {expandedOrder === order.id && (
                    <div className="mt-3 border-t border-border pt-3 space-y-2">
                      <MilestoneTimeline industry={order.industry} status={order.status} />
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View list format</summary>
                        <MilestoneProgress industry={order.industry} status={order.status} />
                      </details>
                    </div>
                  )}
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

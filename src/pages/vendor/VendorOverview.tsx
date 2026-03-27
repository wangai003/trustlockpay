import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, DollarSign, Clock, TrendingUp, CheckCircle,
  AlertTriangle, Eye, Lock, ArrowUpCircle, Shield, PenLine, Check, X
} from "lucide-react";
import { getVendorPlanState, PLANS, getOrderRangeLabel } from "@/hooks/useVendorPlan";
import { useTransactions } from "@/hooks/useSupabaseData";
import OnboardingTaskCard from "@/components/shared/OnboardingTaskCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  locked: "bg-accent/15 text-accent-foreground",
  released: "bg-primary/15 text-primary",
  disputed: "bg-destructive/15 text-destructive",
};

const VendorOverview = () => {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const { user } = useAuth();
  const planState = getVendorPlanState();
  const isUnlimited = planState.orderMax === -1;
  const planConfig = PLANS[planState.currentPlan];
  const { data: transactions = [] } = useTransactions();

  // Work Log: pending contracts
  const [pendingContracts, setPendingContracts] = useState<any[]>([]);
  const [workLogLoading, setWorkLogLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchWorkLog = async () => {
      setWorkLogLoading(true);
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-work-log`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
          }
        );
        const data = await resp.json();
        setPendingContracts(data.contracts || []);
      } catch {
        // silent
      }
      setWorkLogLoading(false);
    };
    fetchWorkLog();
  }, [user]);

  const handleWorkLogAction = async (action: string, contractId?: string, reason?: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vendor-work-log`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action,
            contract_id: contractId,
            typed_name: vendor.name,
            reason,
          }),
        }
      );
      const result = await resp.json();
      if (result.success || result.signed !== undefined) {
        toast.success(action === "accept_all" ? `Signed ${result.signed} contracts` : action === "reject" ? "Contract declined" : "Contract signed");
        setPendingContracts(prev => prev.filter(c => action === "accept_all" ? false : c.id !== contractId));
      } else {
        toast.error(result.error || "Action failed");
      }
    } catch {
      toast.error("Failed to process action");
    }
  };

  const recentTx = transactions.slice(0, 5).map((tx, i) => ({
    id: tx.tx_id,
    buyer: tx.buyer_name || "Unknown",
    amount: `$${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    status: tx.status as "locked" | "released" | "disputed",
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    item: tx.item || "—",
    order: (tx.order_number ?? i + 1),
  }));

  const activeEscrows = transactions.filter(t => t.status === "locked").length;
  const totalReleased = transactions.filter(t => t.status === "released").reduce((s, t) => s + Number(t.amount), 0);
  const pendingPayout = transactions.filter(t => t.status === "locked").reduce((s, t) => s + Number(t.amount), 0);
  const orderCount = transactions.length;

  return (
    <div>
      <VendorHeader title="Dashboard" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <OnboardingTaskCard role="vendor" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <h2 className="font-heading text-base sm:text-xl font-bold">Welcome back, {vendor.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Here's your escrow activity summary</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="secondary" className="capitalize text-[10px] sm:text-xs">{vendor.type} vendor</Badge>
                <Badge className="bg-primary/15 text-primary text-[10px]">KYC Tier {vendor.kycTier}</Badge>
                <Badge variant="outline" className="text-[10px]">{vendor.sites.length} site{vendor.sites.length > 1 ? "s" : ""} connected</Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Shield className="w-2.5 h-2.5" />
                  {planConfig.name} · {getOrderRangeLabel(planConfig)} orders/mo
                </Badge>
                {!planState.trustlockPayEnabled && (
                  <Badge variant="destructive" className="text-[10px]">Widget Off</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Active Escrows", value: String(activeEscrows), icon: Clock, change: "+3 this week" },
            { label: "Total Released", value: `$${totalReleased.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: DollarSign, change: "+$2,400 this month" },
            { label: "Pending Payout", value: `$${pendingPayout.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: TrendingUp, change: "Next payout in 2d" },
            { label: "Plan Usage", value: isUnlimited ? "∞" : `${orderCount}/${planState.orderMax}`, icon: ArrowUpCircle, change: isUnlimited ? "Unlimited orders" : `${Math.round((orderCount / planState.orderMax) * 100)}% of limit used` },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/trustlock/vendor/transactions")}>View All →</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Item</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => {
                    const grayed = !isUnlimited && tx.order > planState.orderMax;
                    return (
                      <tr key={tx.id} className={`border-b border-border last:border-0 transition-colors ${grayed ? "opacity-40 bg-muted/10" : "hover:bg-muted/20"}`}>
                        <td className="p-4 font-mono text-xs">{tx.id}</td>
                        <td className="p-4">{tx.buyer}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{tx.item}</td>
                        <td className="p-4 text-right font-semibold">{tx.amount}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[tx.status] || ""}`}>
                            {tx.status === "locked" && <Clock className="w-3 h-3" />}
                            {tx.status === "released" && <CheckCircle className="w-3 h-3" />}
                            {tx.status === "disputed" && <AlertTriangle className="w-3 h-3" />}
                            {tx.status}
                          </span>
                          {grayed && (
                            <Badge variant="outline" className="ml-1 text-[8px] border-accent/30 text-accent">Over Limit</Badge>
                          )}
                        </td>
                        <td className="p-4 text-center hidden sm:table-cell">
                          {grayed ? (
                            <Button variant="outline" size="sm" className="text-xs text-accent" onClick={() => navigate("/trustlock/vendor/pricing")}>
                              <Lock className="w-3 h-3 mr-1" /> Upgrade
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          )}
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

export default VendorOverview;

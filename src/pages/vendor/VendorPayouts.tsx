import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, CheckCircle, TrendingUp, Download, ArrowRight } from "lucide-react";
import { usePayouts } from "@/hooks/useSupabaseData";
import TLId from "@/components/shared/TLId";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  completed: { label: "Completed", color: "bg-primary/15 text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  processing: { label: "Processing", color: "bg-accent/15 text-accent-foreground", icon: ArrowRight },
};

const VendorPayouts = () => {
  const { data: rawPayouts = [] } = usePayouts();

  const payouts = rawPayouts.map(p => ({
    id: p.payout_id,
    amount: `$${Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    txId: p.tx_id || "—",
    method: p.method || "Bank Transfer",
    status: (p.status || "pending") as "completed" | "pending" | "processing",
    date: p.completed_at ? new Date(p.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    eta: p.eta || null,
  }));

  const totalEarned = rawPayouts.filter(p => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmount = rawPayouts.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
  const processingAmount = rawPayouts.filter(p => p.status === "processing").reduce((s, p) => s + Number(p.amount), 0);
  const thisMonth = rawPayouts.filter(p => {
    const d = new Date(p.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <VendorHeader title="Payouts" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Earned", value: `$${totalEarned.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: DollarSign },
            { label: "Pending Payout", value: `$${pendingAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: Clock },
            { label: "In Processing", value: `$${processingAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: TrendingUp },
            { label: "This Month", value: `$${thisMonth.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: CheckCircle },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payout History</CardTitle>
            <Button variant="outline" size="sm"><Download className="w-3 h-3 mr-1" /> Export</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Payout ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Transaction</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Method</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden sm:table-cell">Date / ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => {
                    const cfg = statusConfig[p.status] || statusConfig.pending;
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-4 font-mono text-xs">{p.id}</td>
                        <td className="p-4 hidden md:table-cell font-mono text-xs text-muted-foreground">{p.txId}</td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground">{p.method}</td>
                        <td className="p-4 text-right font-semibold">{p.amount}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground text-xs">{p.date !== "—" ? p.date : `ETA: ${p.eta}`}</td>
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

export default VendorPayouts;

import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle, TrendingUp, Download, ArrowRight } from "lucide-react";

const payouts = [
  { id: "PAY-101", amount: "$4,500.00", txId: "TL-2026-0892", method: "Bank Transfer", status: "completed" as const, date: "Mar 20, 2026", eta: null },
  { id: "PAY-102", amount: "$120.00", txId: "TL-2026-0889", method: "Mobile Money", status: "completed" as const, date: "Mar 18, 2026", eta: null },
  { id: "PAY-103", amount: "$200.00", txId: "TL-2026-0891", method: "Bank Transfer", status: "pending" as const, date: "—", eta: "Mar 24, 2026" },
  { id: "PAY-104", amount: "$350.00", txId: "TL-2026-0896", method: "Crypto (USDC)", status: "processing" as const, date: "—", eta: "Mar 23, 2026" },
];

const statusConfig = {
  completed: { label: "Completed", color: "bg-primary/15 text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  processing: { label: "Processing", color: "bg-accent/15 text-accent-foreground", icon: ArrowRight },
};

const VendorPayouts = () => {
  return (
    <div>
      <VendorHeader title="Payouts" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Earned", value: "$14,200", icon: DollarSign },
            { label: "Pending Payout", value: "$550", icon: Clock },
            { label: "In Processing", value: "$350", icon: TrendingUp },
            { label: "This Month", value: "$5,170", icon: CheckCircle },
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
                    const cfg = statusConfig[p.status];
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

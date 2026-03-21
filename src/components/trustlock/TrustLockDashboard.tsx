import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";

type TxStatus = "all" | "locked" | "released" | "disputed";

const mockTransactions = [
  { id: "TL-2024-0847", buyer: "James O. (Chicago)", vendor: "Kente Craft Ltd (Accra)", amount: "$200.00", status: "released" as const, date: "Mar 18, 2026", industry: "Retail" },
  { id: "TL-2024-0851", buyer: "Adaeze N. (London)", vendor: "Apex Builders (Lagos)", amount: "$4,500.00", status: "locked" as const, date: "Mar 20, 2026", industry: "Construction" },
  { id: "TL-2024-0855", buyer: "Kofi M. (Toronto)", vendor: "Safari Dreams (Nairobi)", amount: "$1,200.00", status: "locked" as const, date: "Mar 21, 2026", industry: "Tourism" },
  { id: "TL-2024-0839", buyer: "Amara D. (Houston)", vendor: "GreenFarm Co (Kumasi)", amount: "$680.00", status: "disputed" as const, date: "Mar 15, 2026", industry: "Agriculture" },
  { id: "TL-2024-0842", buyer: "Fatima B. (Paris)", vendor: "Lagos Realty (Lagos)", amount: "$12,000.00", status: "released" as const, date: "Mar 16, 2026", industry: "Real Estate" },
  { id: "TL-2024-0860", buyer: "Emmanuel K. (NYC)", vendor: "Mombasa Textiles (Mombasa)", amount: "$350.00", status: "locked" as const, date: "Mar 21, 2026", industry: "Retail" },
];

const statusConfig = {
  locked: { label: "Funds Locked", color: "bg-accent/20 text-accent-foreground", icon: Clock },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const TrustLockDashboard = () => {
  const [filter, setFilter] = useState<TxStatus>("all");

  const filtered = filter === "all" ? mockTransactions : mockTransactions.filter((t) => t.status === filter);
  const lockedTotal = mockTransactions.filter((t) => t.status === "locked").reduce((sum, t) => sum + parseFloat(t.amount.replace(/[$,]/g, "")), 0);
  const releasedTotal = mockTransactions.filter((t) => t.status === "released").reduce((sum, t) => sum + parseFloat(t.amount.replace(/[$,]/g, "")), 0);

  return (
    <section id="dashboard" className="py-20 lg:py-28 bg-muted/50">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Escrow Management Dashboard
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Full visibility into every escrow transaction, dispute, and release.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-14 max-w-6xl mx-auto"
        >
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Transactions", value: mockTransactions.length.toString(), icon: Shield, accent: false },
              { label: "Funds in Escrow", value: `$${lockedTotal.toLocaleString()}`, icon: Clock, accent: true },
              { label: "Released", value: `$${releasedTotal.toLocaleString()}`, icon: DollarSign, accent: false },
              { label: "Active Disputes", value: mockTransactions.filter((t) => t.status === "disputed").length.toString(), icon: AlertTriangle, accent: false },
            ].map((stat) => (
              <Card key={stat.label} className={stat.accent ? "border-accent/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="mt-1 text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(["all", "locked", "released", "disputed"] as TxStatus[]).map((s) => (
              <Button
                key={s}
                variant={filter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(s)}
                className="capitalize"
              >
                {s === "all" ? "All" : statusConfig[s].label}
              </Button>
            ))}
          </div>

          {/* Transaction table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Vendor</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Industry</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tx) => {
                      const cfg = statusConfig[tx.status];
                      return (
                        <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="p-4 font-mono text-xs">{tx.id}</td>
                          <td className="p-4">{tx.buyer}</td>
                          <td className="p-4 hidden md:table-cell">{tx.vendor}</td>
                          <td className="p-4 hidden lg:table-cell">
                            <Badge variant="secondary" className="text-xs">{tx.industry}</Badge>
                          </td>
                          <td className="p-4 text-right font-semibold">{tx.amount}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                              <cfg.icon className="w-3 h-3" />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="p-4 text-center hidden sm:table-cell">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockDashboard;

import { useState } from "react";
import { motion } from "framer-motion";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt, CheckCircle, Clock, AlertTriangle, CreditCard, Minus
} from "lucide-react";

type BillStatus = "all" | "paid" | "pending" | "overdue";

interface BillPayment {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  fee: number;
  deductions: number;
  netAmount: number;
  status: "paid" | "pending" | "overdue";
  method: string;
  reference: string;
}

const mockBillPayments: BillPayment[] = [
  {
    id: "BBILL-2026-001",
    date: "2026-03-02",
    description: "Analytics Report Download — Transaction Summary Q1",
    category: "Reports",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "paid",
    method: "Wallet",
    reference: "RPT-BYR-0302",
  },
  {
    id: "BBILL-2026-002",
    date: "2026-03-08",
    description: "TrustLock Assist AI — 10 queries (Dispute Research)",
    category: "AI Usage",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "paid",
    method: "Wallet",
    reference: "AI-BYR-0308",
  },
  {
    id: "BBILL-2026-003",
    date: "2026-03-12",
    description: "Financial Analysis — Spending Breakdown Report",
    category: "Financial Analysis",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "paid",
    method: "Wallet",
    reference: "FIN-ANL-0312",
  },
  {
    id: "BBILL-2026-004",
    date: "2026-03-18",
    description: "Dispute Evidence Archive — Case #DSP-2026-003",
    category: "Documents",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "paid",
    method: "Wallet",
    reference: "DOC-ARC-0318",
  },
  {
    id: "BBILL-2026-005",
    date: "2026-03-22",
    description: "TrustLock Assist AI — 8 queries (Order Tracking)",
    category: "AI Usage",
    amount: 0.40,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.41,
    status: "paid",
    method: "Wallet",
    reference: "AI-BYR-0322",
  },
  {
    id: "BBILL-2026-006",
    date: "2026-04-01",
    description: "Analytics Report Download — Vendor Comparison Q1",
    category: "Reports",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "pending",
    method: "Wallet",
    reference: "RPT-BYR-0401",
  },
];

const statusConfig = {
  paid: { label: "Paid", color: "bg-primary/15 text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  overdue: { label: "Overdue", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const BuyerBillPayments = () => {
  const [filter, setFilter] = useState<BillStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const isTestnet = localStorage.getItem("tl_buyer_network") !== "mainnet";
  const bills = mockBillPayments;

  const filtered = bills.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (dateFrom && b.date < dateFrom) return false;
    if (dateTo && b.date > dateTo) return false;
    return true;
  });

  const totalPaid = bills.filter(b => b.status === "paid").reduce((s, b) => s + b.netAmount, 0);
  const totalPending = bills.filter(b => b.status === "pending").reduce((s, b) => s + b.netAmount, 0);
  const totalFees = bills.reduce((s, b) => s + b.fee, 0);
  const totalDeductions = bills.reduce((s, b) => s + b.deductions, 0);
  const categories = [...new Set(bills.map(b => b.category))];

  return (
    <div>
      <BuyerHeader title="Bill Payments" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Info banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Pay-as-you-go services.</strong> As a buyer, you're only charged for data services you use — analytics reports, AI queries, financial analysis, and document archives. No subscription required.
            </p>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total Paid", value: `$${totalPaid.toFixed(2)}`, icon: CheckCircle, accent: false },
            { label: "Pending", value: `$${totalPending.toFixed(2)}`, icon: Clock, accent: true },
            { label: "Service Fees", value: `$${totalFees.toFixed(2)}`, icon: CreditCard, accent: false },
            { label: "Deductions", value: `$${totalDeductions.toFixed(2)}`, icon: Minus, accent: false },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={stat.accent ? "border-accent/30" : ""}>
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Status</label>
                <div className="flex gap-1">
                  {(["all", "paid", "pending", "overdue"] as BillStatus[]).map(s => (
                    <Button
                      key={s}
                      variant={filter === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter(s)}
                      className="capitalize text-xs"
                    >
                      {s === "all" ? "All" : statusConfig[s].label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">From</label>
                <Input type="date" className="h-8 text-xs w-[140px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">To</label>
                <Input type="date" className="h-8 text-xs w-[140px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Service Payment History
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{filtered.length} records</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Description</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Fee</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Total</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden sm:table-cell">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bill) => {
                    const cfg = statusConfig[bill.status];
                    return (
                      <tr key={bill.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(bill.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-foreground text-xs sm:text-sm">{bill.description}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{bill.reference}</div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <Badge variant="secondary" className="text-[10px]">{bill.category}</Badge>
                        </td>
                        <td className="p-4 text-right font-semibold">${bill.amount.toFixed(2)}</td>
                        <td className="p-4 text-right text-muted-foreground hidden lg:table-cell">${bill.fee.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold">${bill.netAmount.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-xs text-muted-foreground">{bill.method}</td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                        No service payments found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {isTestnet && (
          <Card className="border-accent/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-accent" />
                <strong>Testnet Mode:</strong> Showing simulated service payment data. In mainnet, this will reflect your actual charges for reports, AI queries, and financial analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BuyerBillPayments;

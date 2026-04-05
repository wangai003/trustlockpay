import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt, DollarSign, Calendar, Filter, Download, CheckCircle,
  Clock, AlertTriangle, CreditCard, Minus
} from "lucide-react";
import { useVendorBills, usePayBill, type VendorBill } from "@/hooks/useVendorBilling";

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
    id: "BILL-2026-001",
    date: "2026-03-01",
    description: "TrustLock OS — Starter Plan (Monthly)",
    category: "Subscription",
    amount: 5.00,
    fee: 0.15,
    deductions: 0,
    netAmount: 5.15,
    status: "paid",
    method: "Wallet",
    reference: "PAY-7A3b-0301",
  },
  {
    id: "BILL-2026-002",
    date: "2026-03-01",
    description: "Widget Installation Fee (One-Time)",
    category: "Installation",
    amount: 5.00,
    fee: 0,
    deductions: 0,
    netAmount: 5.00,
    status: "paid",
    method: "Charged with plan",
    reference: "WGT-INST-0301",
  },
  {
    id: "BILL-2026-003",
    date: "2026-03-05",
    description: "TrustLock Assist AI — 15 queries",
    category: "AI Usage",
    amount: 0.75,
    fee: 0.02,
    deductions: 0,
    netAmount: 0.77,
    status: "paid",
    method: "Wallet",
    reference: "AI-QRY-0305",
  },
  {
    id: "BILL-2026-004",
    date: "2026-03-10",
    description: "Analytics Report Download — Q1 Summary",
    category: "Reports",
    amount: 0.50,
    fee: 0.01,
    deductions: 0,
    netAmount: 0.51,
    status: "paid",
    method: "Wallet",
    reference: "RPT-DL-0310",
  },
  {
    id: "BILL-2026-005",
    date: "2026-03-15",
    description: "Escrow Transaction Fee — Order #TL-2024-0851",
    category: "Escrow Fee",
    amount: 4.50,
    fee: 0,
    deductions: 1.20,
    netAmount: 3.30,
    status: "paid",
    method: "Auto-deducted",
    reference: "ESC-FEE-0851",
  },
  {
    id: "BILL-2026-006",
    date: "2026-03-20",
    description: "Widget Restoration Fee (Re-install)",
    category: "Installation",
    amount: 5.00,
    fee: 0,
    deductions: 0,
    netAmount: 5.00,
    status: "pending",
    method: "Next billing cycle",
    reference: "WGT-REST-0320",
  },
  {
    id: "BILL-2026-007",
    date: "2026-04-01",
    description: "TrustLock OS — Starter Plan (Monthly)",
    category: "Subscription",
    amount: 5.00,
    fee: 0.15,
    deductions: 0,
    netAmount: 5.15,
    status: "pending",
    method: "Wallet",
    reference: "PAY-7A3b-0401",
  },
];

const statusConfig = {
  paid: { label: "Paid", color: "bg-primary/15 text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  overdue: { label: "Overdue", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const VendorBillPayments = () => {
  const { vendor } = useVendor();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<BillStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const payBill = usePayBill();

  const isTestnet = localStorage.getItem("tl_vendor_network") !== "mainnet";
  const { data: dbBills = [] } = useVendorBills();

  // Merge DB bills with mock data for testnet display
  const dbBillsMapped: BillPayment[] = dbBills.map((b) => ({
    id: b.id,
    date: b.created_at,
    description: b.description || b.bill_type,
    category: b.bill_type === "widget_install" ? "Installation" : b.bill_type === "widget_restore" ? "Installation" : b.bill_type === "plan_subscription" ? "Subscription" : "Other",
    amount: Number(b.amount),
    fee: 0,
    deductions: 0,
    netAmount: Number(b.amount),
    status: b.status as "paid" | "pending" | "overdue",
    method: b.status === "paid" ? "OS Pay" : "Pending",
    reference: b.id.slice(0, 8).toUpperCase(),
  }));

  const bills = isTestnet && dbBillsMapped.length === 0 ? mockBillPayments : [...dbBillsMapped, ...(isTestnet ? mockBillPayments : [])];

  const filtered = bills.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    if (dateFrom && b.date < dateFrom) return false;
    if (dateTo && b.date > dateTo) return false;
    return true;
  });

  const totalPaid = bills.filter(b => b.status === "paid").reduce((s, b) => s + b.netAmount, 0);
  const totalPending = bills.filter(b => b.status === "pending" || b.status === "overdue").reduce((s, b) => s + b.netAmount, 0);
  const totalDeductions = bills.reduce((s, b) => s + b.deductions, 0);
  const totalFees = bills.reduce((s, b) => s + b.fee, 0);

  const categories = [...new Set(bills.map(b => b.category))];

  const handlePayBill = (bill: BillPayment) => {
    // Route to OS Pay with bill details
    navigate(`/trustlock/vendor/os-pay?service=${encodeURIComponent(bill.description)}&amount=${bill.amount.toFixed(2)}&bill_id=${bill.id}`);
  };

  return (
    <div>
      <VendorHeader title="Bill Payments" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Total Paid", value: `$${totalPaid.toFixed(2)}`, icon: CheckCircle, accent: false },
            { label: "Pending", value: `$${totalPending.toFixed(2)}`, icon: Clock, accent: true },
            { label: "Total Fees", value: `$${totalFees.toFixed(2)}`, icon: CreditCard, accent: false },
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

        {/* Bill Payments Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-4 h-4" /> Bill Payment History
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
                    <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Deductions</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Net</th>
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
                        <td className="p-4 text-right text-muted-foreground hidden lg:table-cell">
                          {bill.deductions > 0 ? `-$${bill.deductions.toFixed(2)}` : "—"}
                        </td>
                        <td className="p-4 text-right font-bold">${bill.netAmount.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-xs text-muted-foreground">
                          {bill.status === "pending" || bill.status === "overdue" ? (
                            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handlePayBill(bill)}>
                              <DollarSign className="w-3 h-3" /> Pay Now
                            </Button>
                          ) : bill.method}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                        No bill payments found for the selected filters.
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
                <strong>Testnet Mode:</strong> Showing simulated bill payment data. In mainnet, this will reflect your actual charges, fees, and deductions.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VendorBillPayments;

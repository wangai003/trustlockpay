import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Download, FileText, Calendar, TrendingUp, DollarSign, Package,
  Clock, Archive, Shield, Search
} from "lucide-react";
import { toast } from "sonner";
import { useVendor } from "@/contexts/VendorContext";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useTransactions, useArchivedReports } from "@/hooks/useSupabaseData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const VendorAnalytics = () => {
  const { vendor } = useVendor();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-22");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<string | null>(null);

  const { data: transactions = [] } = useTransactions();
  const { data: rawArchives = [] } = useArchivedReports("vendor");

  // Compute revenue data from transactions
  const revenueData = (() => {
    const months: Record<string, { revenue: number; orders: number }> = {};
    transactions.forEach(tx => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!months[key]) months[key] = { revenue: 0, orders: 0 };
      months[key].revenue += Number(tx.amount);
      months[key].orders += 1;
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  })();

  const escrowData = (() => {
    const months: Record<string, { locked: number; released: number }> = {};
    transactions.forEach(tx => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (!months[key]) months[key] = { locked: 0, released: 0 };
      if (tx.status === "locked") months[key].locked += Number(tx.amount);
      if (tx.status === "released") months[key].released += Number(tx.amount);
    });
    return Object.entries(months).map(([month, data]) => ({ month, ...data }));
  })();

  const totalRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const totalOrders = transactions.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const archivedReports = rawArchives.map(r => ({
    id: r.id,
    name: r.name,
    date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: r.file_type || "PDF",
    size: r.file_size || "—",
  }));

  const handleDownloadClick = (reportName: string) => {
    setPendingReport(reportName);
    setPayDialogOpen(true);
  };

  const handlePaymentComplete = () => {
    setPayDialogOpen(false);
    if (pendingReport) {
      toast.success(`📄 ${pendingReport} for ${vendor.name} downloaded successfully.`);
      setPendingReport(null);
    }
  };

  const filteredArchives = archivedReports.filter(r =>
    r.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    r.date.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <div>
      <VendorHeader title="Analytics & Reports" />
      <div className="p-3 sm:p-6 space-y-6">
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="archives">Archives</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign },
                { label: "Total Orders", value: String(totalOrders), icon: Package },
                { label: "Avg Order Value", value: `$${avgOrderValue}`, icon: TrendingUp },
                { label: "Avg Escrow Duration", value: "2.3 days", icon: Clock },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Revenue Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={chartStyle} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(152,52%,24%)" fill="hsl(152,52%,24%)" fillOpacity={0.15} name="Revenue ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Escrow Flow</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={escrowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="locked" fill="hsl(43,80%,48%)" radius={[4,4,0,0]} name="Locked" />
                      <Bar dataKey="released" fill="hsl(152,52%,24%)" radius={[4,4,0,0]} name="Released" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate and download branded reports. Each report includes the TrustLock Pay logo and is personalized with your business name.</p>

            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Revenue Statement", desc: "Complete revenue breakdown with escrow details, fees, and net payouts.", icon: DollarSign },
                { name: "Transaction Summary", desc: "All transactions within the selected date range with status and amounts.", icon: Package },
                { name: "Order History Export", desc: "CSV export of all orders for accounting and record-keeping.", icon: FileText },
                { name: "Payout Report", desc: "Detailed payout history with dates, amounts, and settlement methods.", icon: TrendingUp },
              ].map(r => (
                <Card key={r.name}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <r.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className="text-[9px]">
                          <Shield className="w-2.5 h-2.5 mr-1" /> TrustLock Pay
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">For: {vendor.name}</Badge>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => handleDownloadClick(r.name)}>
                      <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Reports are generated with the TrustLock Pay logo in the header. $0.50 per download applies on paid plans.
            </p>
          </TabsContent>

          <TabsContent value="archives" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4" /> Report Archives</p>
                <p className="text-[10px] text-muted-foreground">Reports are auto-archived after 90 days. Deleted permanently after 12 months.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or date..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="pl-9 text-xs" />
              </div>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            <div className="space-y-2">
              {filteredArchives.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.date} · {r.type} · {r.size}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadClick(r.name)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* OS Pay Dialog for report downloads */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Pay for Report Download</DialogTitle>
          <TrustLockOSPay
            role="vendor"
            prefillService={pendingReport ? `Report: ${pendingReport}` : ""}
            prefillAmount="0.50"
            onComplete={handlePaymentComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorAnalytics;

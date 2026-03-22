import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, FileText, Calendar, TrendingUp, DollarSign, Package,
  Clock, Archive, Shield, Search
} from "lucide-react";
import { toast } from "sonner";
import { useVendor } from "@/contexts/VendorContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from "recharts";

const revenueData = [
  { month: "Oct", revenue: 3200, orders: 12 },
  { month: "Nov", revenue: 4800, orders: 18 },
  { month: "Dec", revenue: 6100, orders: 22 },
  { month: "Jan", revenue: 5400, orders: 19 },
  { month: "Feb", revenue: 7200, orders: 26 },
  { month: "Mar", revenue: 8950, orders: 31 },
];

const escrowData = [
  { month: "Oct", locked: 1200, released: 2000 },
  { month: "Nov", locked: 1800, released: 3000 },
  { month: "Dec", locked: 2400, released: 3700 },
  { month: "Jan", locked: 2100, released: 3300 },
  { month: "Feb", locked: 2800, released: 4400 },
  { month: "Mar", locked: 3500, released: 5450 },
];

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const archivedReports = [
  { id: "r1", name: "Revenue Statement", date: "Mar 15, 2026", type: "PDF", size: "124 KB" },
  { id: "r2", name: "Transaction Summary", date: "Feb 28, 2026", type: "PDF", size: "98 KB" },
  { id: "r3", name: "Order History Export", date: "Feb 15, 2026", type: "CSV", size: "45 KB" },
  { id: "r4", name: "Revenue Statement", date: "Jan 31, 2026", type: "PDF", size: "112 KB" },
  { id: "r5", name: "Payout Report", date: "Jan 15, 2026", type: "PDF", size: "67 KB" },
  { id: "r6", name: "Transaction Summary", date: "Dec 31, 2025", type: "PDF", size: "88 KB" },
];

const VendorAnalytics = () => {
  const { vendor } = useVendor();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-22");
  const [archiveSearch, setArchiveSearch] = useState("");

  const handleDownload = (reportName: string) => {
    toast.success(`📄 ${reportName} for ${vendor.name} downloaded successfully.`);
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
            {/* Date filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Revenue", value: "$35,650", icon: DollarSign },
                { label: "Total Orders", value: "128", icon: Package },
                { label: "Avg Order Value", value: "$278", icon: TrendingUp },
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

            {/* Charts */}
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
                    <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => handleDownload(r.name)}>
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
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(r.name)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorAnalytics;

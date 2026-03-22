import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download, FileText, Calendar, Archive, Search, Shield
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const monthlyVolume = [
  { month: "Oct", volume: 48200, count: 124 },
  { month: "Nov", volume: 62400, count: 156 },
  { month: "Dec", volume: 78600, count: 189 },
  { month: "Jan", volume: 91200, count: 210 },
  { month: "Feb", volume: 108500, count: 245 },
  { month: "Mar", volume: 124800, count: 278 },
];

const escrowPerformance = [
  { month: "Oct", avgLock: 3.2 },
  { month: "Nov", avgLock: 2.9 },
  { month: "Dec", avgLock: 2.7 },
  { month: "Jan", avgLock: 2.5 },
  { month: "Feb", avgLock: 2.3 },
  { month: "Mar", avgLock: 2.1 },
];

const vendorByType = [
  { name: "Product", value: 185, color: "hsl(152, 52%, 24%)" },
  { name: "Service", value: 157, color: "hsl(43, 80%, 48%)" },
];

const industryBreakdown = [
  { industry: "Retail", volume: 34200 },
  { industry: "Real Estate", volume: 28900 },
  { industry: "Tourism", volume: 18400 },
  { industry: "Construction", volume: 15600 },
  { industry: "Education", volume: 12300 },
  { industry: "Agriculture", volume: 8900 },
  { industry: "Digital", volume: 6500 },
];

const buyerMetrics = [
  { month: "Oct", repeat: 28, new: 96 },
  { month: "Nov", repeat: 38, new: 118 },
  { month: "Dec", repeat: 52, new: 137 },
  { month: "Jan", repeat: 64, new: 146 },
  { month: "Feb", repeat: 78, new: 167 },
  { month: "Mar", repeat: 92, new: 186 },
];

const revenueData = [
  { month: "Oct", fees: 2410 },
  { month: "Nov", fees: 3120 },
  { month: "Dec", fees: 3930 },
  { month: "Jan", fees: 4560 },
  { month: "Feb", fees: 5425 },
  { month: "Mar", fees: 6240 },
];

const archivedReports = [
  { id: "a1", name: "Platform Summary Report", date: "Mar 15, 2026", type: "PDF", size: "245 KB" },
  { id: "a2", name: "Vendor Performance Report", date: "Feb 28, 2026", type: "PDF", size: "189 KB" },
  { id: "a3", name: "Dispute Resolution Summary", date: "Feb 15, 2026", type: "PDF", size: "134 KB" },
  { id: "a4", name: "Revenue & Fee Report", date: "Jan 31, 2026", type: "PDF", size: "156 KB" },
  { id: "a5", name: "KYC Compliance Report", date: "Jan 15, 2026", type: "PDF", size: "98 KB" },
  { id: "a6", name: "Platform Summary Report", date: "Dec 31, 2025", type: "PDF", size: "210 KB" },
];

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const AdminAnalytics = () => {
  const [dateFrom, setDateFrom] = useState("2025-10-01");
  const [dateTo, setDateTo] = useState("2026-03-22");
  const [archiveSearch, setArchiveSearch] = useState("");

  const handleDownload = (name: string) => {
    toast.success(`📄 ${name} downloaded successfully.`);
  };

  const filteredArchives = archivedReports.filter(r =>
    r.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    r.date.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <div>
      <AdminHeader title="Analytics" />
      <div className="p-6 space-y-6">
        <Tabs defaultValue="analytics" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="archives">Archives</TabsTrigger>
            </TabsList>
            <Badge variant="secondary">Last 6 Months</Badge>
          </div>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            {/* Row 1: Volume + Vendor Types */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Transaction Volume & Count</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="vol" orientation="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar yAxisId="vol" dataKey="volume" fill="hsl(152,52%,24%)" radius={[4,4,0,0]} name="Volume ($)" />
                      <Bar yAxisId="cnt" dataKey="count" fill="hsl(43,80%,48%)" radius={[4,4,0,0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Vendors by Type</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={vendorByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4}>
                        {vendorByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={chartStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    {vendorByType.map((v) => (
                      <div key={v.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                        {v.name}: <strong>{v.value}</strong>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Row 2: Escrow + Revenue */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Escrow Lock Duration (Avg Days)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={escrowPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartStyle} />
                      <Line type="monotone" dataKey="avgLock" stroke="hsl(152,52%,24%)" strokeWidth={2} name="Avg Lock Days" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Fee Revenue Trend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                      <Tooltip contentStyle={chartStyle} />
                      <Area type="monotone" dataKey="fees" stroke="hsl(43,80%,48%)" fill="hsl(43,80%,48%)" fillOpacity={0.15} name="Fee Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Industry + Buyer Metrics */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Volume by Industry</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={industryBreakdown} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="industry" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="volume" fill="hsl(152,52%,24%)" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Buyer Activity — New vs Repeat</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={buyerMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="new" fill="hsl(152,52%,24%)" radius={[4,4,0,0]} name="New Buyers" />
                      <Bar dataKey="repeat" fill="hsl(43,80%,48%)" radius={[4,4,0,0]} name="Repeat Buyers" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Platform Health */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Transaction Success Rate", value: "98.2%" },
                { label: "Webhook Delivery Rate", value: "99.7%" },
                { label: "Avg Confirmation Speed", value: "1.8 days" },
                { label: "Repeat Buyer Rate", value: "33.1%" },
              ].map((m) => (
                <Card key={m.label}>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-foreground">{m.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate and download platform reports with TrustLock Pay branding.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Platform Summary", desc: "Overview of all transactions, disputes, vendors, and buyers." },
                { name: "Revenue & Fee Report", desc: "Breakdown of transaction fees, OS license revenue, and AI query revenue." },
                { name: "Vendor Performance", desc: "Vendor activity, plan distribution, KYC compliance status." },
                { name: "Dispute Resolution", desc: "Emmanuel AI accuracy, resolution times, and outcome breakdown." },
                { name: "KYC Compliance", desc: "Vendor verification status, pending reviews, and risk flags." },
                { name: "Buyer Activity", desc: "New vs repeat buyers, spending patterns, and dispute rates." },
              ].map(r => (
                <Card key={r.name}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
                      <Badge variant="outline" className="text-[9px] mt-2"><Shield className="w-2.5 h-2.5 mr-1" /> TrustLock Pay</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => handleDownload(r.name)}>
                      <Download className="w-3 h-3 mr-1" /> PDF
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="archives" className="space-y-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4" /> Report Archives</p>
              <p className="text-[10px] text-muted-foreground">Auto-archived after 90 days. Retained for 12 months before permanent deletion.</p>
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
                    <div className="flex-1">
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

export default AdminAnalytics;

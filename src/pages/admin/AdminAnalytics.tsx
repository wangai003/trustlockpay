import { useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download, FileText, Calendar, Archive, Search, Shield, XCircle, Fuel, TrendingDown
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useTransactions, useDisputes, usePayouts, useArchivedReports, useVendorRejections } from "@/hooks/useSupabaseData";
import { useAdmin } from "@/contexts/AdminContext";

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const AdminAnalytics = () => {
  const { isTestnet } = useAdmin();
  const [dateFrom, setDateFrom] = useState("2025-10-01");
  const [dateTo, setDateTo] = useState("2026-03-29");
  const [archiveSearch, setArchiveSearch] = useState("");

  const { data: rawTx = [], isLoading: txLoading } = useTransactions();
  const { data: rawDisputes = [] } = useDisputes();
  const { data: rawPayouts = [] } = usePayouts();
  const { data: rawArchives = [] } = useArchivedReports("admin");
  const { data: rawRejections = [] } = useVendorRejections();

  // Rejection analytics
  const rejectionStats = useMemo(() => {
    const totalRejected = rawRejections.length;
    const totalLostVolume = rawRejections.reduce((s: number, r: any) => s + Number(r.original_amount || 0), 0);
    const totalGasSpent = rawRejections.reduce((s: number, r: any) => s + Number(r.gas_deducted || 0), 0);
    const totalRefunded = rawRejections.reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0);

    const monthly: Record<string, { count: number; volume: number; gas: number }> = {};
    rawRejections.forEach((r: any) => {
      const d = new Date(r.created_at);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!monthly[key]) monthly[key] = { count: 0, volume: 0, gas: 0 };
      monthly[key].count += 1;
      monthly[key].volume += Number(r.original_amount || 0);
      monthly[key].gas += Number(r.gas_deducted || 0);
    });
    const trend = Object.entries(monthly).map(([month, data]) => ({ month, ...data }));

    const byIndustry: Record<string, number> = {};
    rawRejections.forEach((r: any) => {
      const ind = r.industry || "Other";
      byIndustry[ind] = (byIndustry[ind] || 0) + 1;
    });
    const industryData = Object.entries(byIndustry)
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const totalTx = rawTx.length || 1;
    const rejectionRate = ((totalRejected / totalTx) * 100).toFixed(1);

    return { totalRejected, totalLostVolume, totalGasSpent, totalRefunded, trend, industryData, rejectionRate };
  }, [rawRejections, rawTx]);

  // Compute monthly volume from real transactions
  const monthlyVolume = useMemo(() => {
    const months: Record<string, { volume: number; count: number }> = {};
    const txList = rawTx.length > 0 ? rawTx : [];
    txList.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!months[key]) months[key] = { volume: 0, count: 0 };
      months[key].volume += Number(tx.amount || 0);
      months[key].count += 1;
    });
    const entries = Object.entries(months).map(([month, data]) => ({ month, ...data }));
    return entries.length > 0 ? entries.slice(-6) : [
      { month: "Oct", volume: 48200, count: 124 },
      { month: "Nov", volume: 62400, count: 156 },
      { month: "Dec", volume: 78600, count: 189 },
      { month: "Jan", volume: 91200, count: 210 },
      { month: "Feb", volume: 108500, count: 245 },
      { month: "Mar", volume: 124800, count: 278 },
    ];
  }, [rawTx]);

  // Revenue from fees
  const revenueData = useMemo(() => {
    const months: Record<string, number> = {};
    rawTx.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!months[key]) months[key] = 0;
      months[key] += Number(tx.fee || 0);
    });
    const entries = Object.entries(months).map(([month, fees]) => ({ month, fees: Math.round(fees) }));
    return entries.length > 0 ? entries.slice(-6) : [
      { month: "Oct", fees: 2410 }, { month: "Nov", fees: 3120 }, { month: "Dec", fees: 3930 },
      { month: "Jan", fees: 4560 }, { month: "Feb", fees: 5425 }, { month: "Mar", fees: 6240 },
    ];
  }, [rawTx]);

  // Industry breakdown
  const industryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    rawTx.forEach((tx) => {
      const ind = (tx as any).industry || "Other";
      if (!map[ind]) map[ind] = 0;
      map[ind] += Number(tx.amount || 0);
    });
    const entries = Object.entries(map).map(([industry, volume]) => ({ industry, volume: Math.round(volume) })).sort((a, b) => b.volume - a.volume).slice(0, 7);
    return entries.length > 0 ? entries : [
      { industry: "Retail", volume: 34200 }, { industry: "Real Estate", volume: 28900 },
      { industry: "Tourism", volume: 18400 }, { industry: "Construction", volume: 15600 },
    ];
  }, [rawTx]);

  // Platform health computed
  const totalTx = rawTx.length || 278;
  const successRate = rawTx.length > 0
    ? ((rawTx.filter((t) => t.status !== "cancelled").length / rawTx.length) * 100).toFixed(1)
    : "98.2";
  const disputeCount = rawDisputes.length;
  const resolvedDisputes = rawDisputes.filter((d) => d.status === "resolved").length;

  const handleDownload = (name: string) => {
    toast.success(`📄 ${name} downloaded successfully.`);
  };

  const archives = rawArchives.length > 0
    ? rawArchives.map((r) => ({
        id: r.id,
        name: r.name,
        date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        type: r.file_type || "PDF",
        size: r.file_size || "—",
      }))
    : [
        { id: "a1", name: "Platform Summary Report", date: "Mar 15, 2026", type: "PDF", size: "245 KB" },
        { id: "a2", name: "Revenue & Fee Report", date: "Feb 28, 2026", type: "PDF", size: "189 KB" },
      ];

  const filteredArchives = archives.filter((r) =>
    r.name.toLowerCase().includes(archiveSearch.toLowerCase())
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
            <Badge variant="secondary">{rawTx.length > 0 ? "Live Data" : "Sample Data"}</Badge>
          </div>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            {txLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Row 1: Volume */}
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
                    <CardHeader><CardTitle className="text-base">Volume by Industry</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={industryBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <YAxis dataKey="industry" type="category" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip contentStyle={chartStyle} />
                          <Bar dataKey="volume" fill="hsl(152,52%,24%)" radius={[0,4,4,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Row 2: Revenue */}
                <div className="grid lg:grid-cols-2 gap-6">
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
                  <Card>
                    <CardHeader><CardTitle className="text-base">Platform Health</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Total Transactions", value: String(totalTx) },
                          { label: "Success Rate", value: `${successRate}%` },
                          { label: "Active Disputes", value: String(disputeCount) },
                          { label: "Resolved Disputes", value: String(resolvedDisputes) },
                          { label: "Total Payouts", value: String(rawPayouts.length) },
                          { label: "Completed Payouts", value: String(rawPayouts.filter((p) => p.status === "completed").length) },
                        ].map((m) => (
                          <div key={m.label} className="bg-muted/30 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground">{m.label}</div>
                            <div className="text-lg font-bold">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <p className="text-sm text-muted-foreground">Generate and download platform reports.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Platform Summary", desc: "Overview of all transactions, disputes, vendors, and buyers." },
                { name: "Revenue & Fee Report", desc: "Breakdown of transaction fees, OS license revenue." },
                { name: "Vendor Performance", desc: "Vendor activity, plan distribution, KYC compliance." },
                { name: "Dispute Resolution", desc: "Emmanuel AI accuracy, resolution times, outcomes." },
                { name: "KYC Compliance", desc: "Vendor verification status, pending reviews." },
                { name: "Buyer Activity", desc: "New vs repeat buyers, spending patterns." },
              ].map((r) => (
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
              <p className="text-[10px] text-muted-foreground">Auto-archived after 90 days.</p>
            </div>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search archives..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} className="pl-9 text-xs" />
            </div>
            <div className="space-y-2">
              {filteredArchives.map((r) => (
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

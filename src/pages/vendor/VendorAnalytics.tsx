import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Download, FileText, Calendar, TrendingUp, DollarSign, Package,
  Clock, Archive, Shield, Search, Eye, MousePointerClick, ShoppingCart, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { useVendor } from "@/contexts/VendorContext";
import { useAuth } from "@/hooks/useAuth";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useTransactions, useArchivedReports } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import MonetizedDocuments from "@/components/shared/MonetizedDocuments";

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const FUNNEL_COLORS = ["hsl(210,80%,55%)", "hsl(43,80%,48%)", "hsl(152,52%,24%)", "hsl(340,65%,47%)"];

const VendorAnalytics = () => {
  const { vendor } = useVendor();
  const { user } = useAuth();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-04-06");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<string | null>(null);

  // Widget analytics state
  const [widgetEvents, setWidgetEvents] = useState<any[]>([]);
  const [widgetLoading, setWidgetLoading] = useState(false);

  const { data: transactions = [] } = useTransactions();
  const { data: rawArchives = [] } = useArchivedReports("vendor");

  // Load widget analytics
  useEffect(() => {
    if (!user?.id) return;
    setWidgetLoading(true);
    supabase
      .from("widget_analytics")
      .select("event_type, site_id, offering_id, created_at, visitor_fingerprint")
      .eq("vendor_id", user.id)
      .gte("created_at", new Date(dateFrom).toISOString())
      .lte("created_at", new Date(dateTo + "T23:59:59").toISOString())
      .order("created_at", { ascending: true })
      .limit(1000)
      .then(({ data }) => {
        setWidgetEvents(data || []);
        setWidgetLoading(false);
      });
  }, [user?.id, dateFrom, dateTo]);

  // Widget metrics
  const widgetMetrics = useMemo(() => {
    const impressions = widgetEvents.filter(e => e.event_type === "impression").length;
    const opens = widgetEvents.filter(e => e.event_type === "widget_open").length;
    const checkouts = widgetEvents.filter(e => e.event_type === "checkout_start").length;
    const completions = widgetEvents.filter(e => e.event_type === "payment_complete").length;
    const uniqueVisitors = new Set(widgetEvents.map(e => e.visitor_fingerprint)).size;
    const openRate = impressions > 0 ? ((opens / impressions) * 100).toFixed(1) : "0";
    const conversionRate = opens > 0 ? ((completions / opens) * 100).toFixed(1) : "0";
    return { impressions, opens, checkouts, completions, uniqueVisitors, openRate, conversionRate };
  }, [widgetEvents]);

  // Widget daily trend
  const widgetDailyData = useMemo(() => {
    const days: Record<string, { date: string; impressions: number; opens: number; checkouts: number; completions: number }> = {};
    widgetEvents.forEach(e => {
      const day = new Date(e.created_at).toISOString().slice(0, 10);
      if (!days[day]) days[day] = { date: day, impressions: 0, opens: 0, checkouts: 0, completions: 0 };
      if (e.event_type === "impression") days[day].impressions++;
      if (e.event_type === "widget_open") days[day].opens++;
      if (e.event_type === "checkout_start") days[day].checkouts++;
      if (e.event_type === "payment_complete") days[day].completions++;
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [widgetEvents]);

  // Widget funnel
  const widgetFunnel = useMemo(() => [
    { name: "Impressions", value: widgetMetrics.impressions },
    { name: "Widget Opens", value: widgetMetrics.opens },
    { name: "Checkout Starts", value: widgetMetrics.checkouts },
    { name: "Payments", value: widgetMetrics.completions },
  ], [widgetMetrics]);

  // Per-site breakdown
  const widgetBySite = useMemo(() => {
    const sites: Record<string, { impressions: number; opens: number; completions: number }> = {};
    widgetEvents.forEach(e => {
      const s = e.site_id || "unknown";
      if (!sites[s]) sites[s] = { impressions: 0, opens: 0, completions: 0 };
      if (e.event_type === "impression") sites[s].impressions++;
      if (e.event_type === "widget_open") sites[s].opens++;
      if (e.event_type === "payment_complete") sites[s].completions++;
    });
    return Object.entries(sites).map(([site, d]) => ({ site: site.slice(0, 20), ...d }));
  }, [widgetEvents]);

  // Revenue data
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

  const navigate = useNavigate();

  const handleDownloadClick = async (reportName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("archived_reports").insert({
          name: reportName,
          owner_id: user.id,
          owner_role: "vendor",
          file_type: "PDF",
          file_size: "—",
        });
      }
    } catch { /* best effort */ }
    navigate(`/trustlock/vendor/os-pay?service=${encodeURIComponent(`Report: ${reportName}`)}&amount=0.50`);
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
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="widget">Widget</TabsTrigger>
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

          {/* ══════════ Widget Performance Tab ══════════ */}
          <TabsContent value="widget" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
              </div>
              {widgetLoading && <Badge variant="secondary" className="text-[10px]">Loading…</Badge>}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Impressions", value: widgetMetrics.impressions.toLocaleString(), icon: Eye, sub: `${widgetMetrics.uniqueVisitors} unique visitors` },
                { label: "Widget Opens", value: widgetMetrics.opens.toLocaleString(), icon: MousePointerClick, sub: `${widgetMetrics.openRate}% open rate` },
                { label: "Checkout Starts", value: widgetMetrics.checkouts.toLocaleString(), icon: ShoppingCart, sub: "" },
                { label: "Payments", value: widgetMetrics.completions.toLocaleString(), icon: CheckCircle, sub: `${widgetMetrics.conversionRate}% conversion` },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="text-xl font-bold">{s.value}</div>
                    {s.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            {widgetEvents.length === 0 && !widgetLoading ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-8 text-center">
                  <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">No widget data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Analytics will appear here once your TrustLock widget is embedded on a site and receives traffic.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Daily trend */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Daily Widget Activity</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={widgetDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={chartStyle} />
                        <Area type="monotone" dataKey="impressions" stackId="1" stroke="hsl(210,80%,55%)" fill="hsl(210,80%,55%)" fillOpacity={0.15} name="Impressions" />
                        <Area type="monotone" dataKey="opens" stackId="2" stroke="hsl(43,80%,48%)" fill="hsl(43,80%,48%)" fillOpacity={0.15} name="Opens" />
                        <Area type="monotone" dataKey="completions" stackId="3" stroke="hsl(152,52%,24%)" fill="hsl(152,52%,24%)" fillOpacity={0.15} name="Payments" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Conversion funnel */}
                <Card>
                  <CardHeader><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {widgetFunnel.map((step, i) => {
                        const maxVal = widgetFunnel[0].value || 1;
                        const pct = maxVal > 0 ? (step.value / maxVal) * 100 : 0;
                        const dropoff = i > 0 && widgetFunnel[i - 1].value > 0
                          ? ((1 - step.value / widgetFunnel[i - 1].value) * 100).toFixed(0)
                          : null;
                        return (
                          <div key={step.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{step.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{step.value}</span>
                                {dropoff && <Badge variant="outline" className="text-[9px] text-destructive">-{dropoff}%</Badge>}
                              </div>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: FUNNEL_COLORS[i] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Per-site breakdown */}
                {widgetBySite.length > 1 && (
                  <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm">Performance by Site</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={widgetBySite} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis dataKey="site" type="category" tick={{ fontSize: 10 }} width={100} />
                          <Tooltip contentStyle={chartStyle} />
                          <Bar dataKey="impressions" fill="hsl(210,80%,55%)" radius={[0,4,4,0]} name="Impressions" />
                          <Bar dataKey="opens" fill="hsl(43,80%,48%)" radius={[0,4,4,0]} name="Opens" />
                          <Bar dataKey="completions" fill="hsl(152,52%,24%)" radius={[0,4,4,0]} name="Payments" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <MonetizedDocuments role="vendor" />
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

import { useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from "recharts";
import { Activity, DollarSign, Globe, Users, TrendingUp, MousePointerClick, ShoppingCart, ArrowDownToLine } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const AdminPlatformAnalytics = () => {
  const [tab, setTab] = useState("overview");

  // Fetch all transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["admin-platform-tx"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("id, amount, status, transaction_source, vendor_id, buyer_id, industry, created_at, buyer_location");
      return data || [];
    },
  });

  // Fetch widget analytics
  const { data: widgetEvents = [] } = useQuery({
    queryKey: ["admin-widget-events"],
    queryFn: async () => {
      const { data } = await supabase.from("widget_analytics").select("*");
      return data || [];
    },
  });

  // Fetch standalone analytics
  const { data: standaloneEvents = [] } = useQuery({
    queryKey: ["admin-standalone-events"],
    queryFn: async () => {
      const { data } = await supabase.from("standalone_analytics").select("*");
      return data || [];
    },
  });

  // Fetch vendor site configs for adoption
  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["admin-site-configs"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_site_configs").select("id, vendor_id, site_id, created_at");
      return data || [];
    },
  });

  // Fetch standalone links
  const { data: standaloneLinks = [] } = useQuery({
    queryKey: ["admin-standalone-links"],
    queryFn: async () => {
      const { data } = await supabase.from("standalone_links").select("id, vendor_id, created_at, status");
      return data || [];
    },
  });

  // Fetch profiles for geography
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-geo"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, location, entity_type");
      return data || [];
    },
  });

  // === COMPUTED METRICS ===

  const totalVolume = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount || 0), 0), [transactions]);
  const completedTx = transactions.filter(t => ["released", "completed"].includes(t.status));
  const cancelledTx = transactions.filter(t => t.status === "cancelled");

  // Source breakdown
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    transactions.forEach(t => {
      const src = t.transaction_source || "widget";
      if (!map[src]) map[src] = { count: 0, volume: 0 };
      map[src].count++;
      map[src].volume += Number(t.amount || 0);
    });
    return Object.entries(map).map(([source, d]) => ({ source, ...d }));
  }, [transactions]);

  // Widget funnel
  const wImpressions = widgetEvents.filter(e => e.event_type === "impression").length;
  const wOpens = widgetEvents.filter(e => e.event_type === "widget_open").length;
  const wCheckouts = widgetEvents.filter(e => e.event_type === "checkout_start").length;
  const wCompleted = widgetEvents.filter(e => e.event_type === "payment_complete").length;

  // Standalone funnel
  const sImpressions = standaloneEvents.filter(e => e.event_type === "impression").length;
  const sOpens = standaloneEvents.filter(e => e.event_type === "link_open").length;
  const sFormStarts = standaloneEvents.filter(e => e.event_type === "form_start").length;
  const sCompleted = standaloneEvents.filter(e => e.event_type === "payment_complete").length;

  // Vendor adoption
  const vendorsWithWidget = new Set(siteConfigs.map(s => s.vendor_id)).size;
  const vendorsWithStandalone = new Set(standaloneLinks.map(s => s.vendor_id)).size;
  const vendorsWithBoth = useMemo(() => {
    const widgetVendors = new Set(siteConfigs.map(s => s.vendor_id));
    const standaloneVendors = new Set(standaloneLinks.map(s => s.vendor_id));
    return [...widgetVendors].filter(v => standaloneVendors.has(v)).length;
  }, [siteConfigs, standaloneLinks]);

  // Geography
  const geoData = useMemo(() => {
    const map: Record<string, { vendors: Set<string>; txCount: number; volume: number }> = {};
    profiles.forEach(p => {
      const country = p.location || "Unknown";
      if (!map[country]) map[country] = { vendors: new Set(), txCount: 0, volume: 0 };
      map[country].vendors.add(p.id);
    });
    transactions.forEach(t => {
      const country = t.buyer_location || "Unknown";
      if (!map[country]) map[country] = { vendors: new Set(), txCount: 0, volume: 0 };
      map[country].txCount++;
      map[country].volume += Number(t.amount || 0);
    });
    return Object.entries(map)
      .map(([country, d]) => ({ country, vendors: d.vendors.size, txCount: d.txCount, volume: d.volume }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 15);
  }, [profiles, transactions]);

  // Industry breakdown
  const industryData = useMemo(() => {
    const map: Record<string, { count: number; volume: number }> = {};
    transactions.forEach(t => {
      const ind = t.industry || "General";
      if (!map[ind]) map[ind] = { count: 0, volume: 0 };
      map[ind].count++;
      map[ind].volume += Number(t.amount || 0);
    });
    return Object.entries(map)
      .map(([industry, d]) => ({ industry, ...d }))
      .sort((a, b) => b.volume - a.volume);
  }, [transactions]);

  const adoptionPie = [
    { name: "Widget Only", value: vendorsWithWidget - vendorsWithBoth },
    { name: "Standalone Only", value: vendorsWithStandalone - vendorsWithBoth },
    { name: "Both", value: vendorsWithBoth },
  ].filter(d => d.value > 0);

  const fmtMoney = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;
  const pct = (num: number, den: number) => den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "0%";

  return (
    <div>
      <AdminHeader title="Platform Analytics" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Total Volume", value: fmtMoney(totalVolume), sub: `${transactions.length} transactions` },
            { icon: Activity, label: "Completion Rate", value: pct(completedTx.length, transactions.length), sub: `${cancelledTx.length} cancelled` },
            { icon: Users, label: "Vendors Active", value: String(vendorsWithWidget + vendorsWithStandalone - vendorsWithBoth), sub: `${vendorsWithWidget} widget · ${vendorsWithStandalone} standalone` },
            { icon: TrendingUp, label: "Widget Conversion", value: pct(wCompleted, wImpressions), sub: `${wImpressions} impressions → ${wCompleted} paid` },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                </div>
                <div className="text-xl font-bold">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground">{kpi.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Fund Flow</TabsTrigger>
            <TabsTrigger value="funnels">Funnels</TabsTrigger>
            <TabsTrigger value="adoption">Adoption</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="industry">Industry</TabsTrigger>
          </TabsList>

          {/* FUND FLOW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume by Source</CardTitle>
                <CardDescription>Where payment volume originates</CardDescription>
              </CardHeader>
              <CardContent>
                {sourceBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={sourceBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="source" className="text-xs" />
                      <YAxis tickFormatter={(v) => fmtMoney(v)} className="text-xs" />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Volume"]} />
                      <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No transaction data yet</p>
                )}
              </CardContent>
            </Card>

            <div className="grid sm:grid-cols-2 gap-4">
              {sourceBreakdown.map(src => (
                <Card key={src.source}>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 capitalize">{src.source}</Badge>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Transactions</div>
                        <div className="text-lg font-bold">{src.count}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Volume</div>
                        <div className="text-lg font-bold">{fmtMoney(src.volume)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* FUNNELS TAB */}
          <TabsContent value="funnels" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4" /> Widget Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FunnelSteps steps={[
                    { label: "Impressions", value: wImpressions },
                    { label: "Widget Opened", value: wOpens },
                    { label: "Checkout Started", value: wCheckouts },
                    { label: "Payment Complete", value: wCompleted },
                  ]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4" /> Standalone Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FunnelSteps steps={[
                    { label: "Page Views", value: sImpressions },
                    { label: "Link Opened", value: sOpens },
                    { label: "Form Started", value: sFormStarts },
                    { label: "Payment Complete", value: sCompleted },
                  ]} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ADOPTION TAB */}
          <TabsContent value="adoption" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vendor Product Adoption</CardTitle>
                  <CardDescription>How vendors use TrustLock Pay products</CardDescription>
                </CardHeader>
                <CardContent>
                  {adoptionPie.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={adoptionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {adoptionPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No adoption data yet</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold text-sm">Adoption Summary</h3>
                  {[
                    { label: "Widget Installed", value: vendorsWithWidget },
                    { label: "Standalone Created", value: vendorsWithStandalone },
                    { label: "Using Both", value: vendorsWithBoth },
                    { label: "Active Standalone Links", value: standaloneLinks.filter(l => l.is_active).length },
                  ].map(m => (
                    <div key={m.label} className="flex justify-between items-center border-b border-border pb-2 last:border-0">
                      <span className="text-sm text-muted-foreground">{m.label}</span>
                      <span className="font-bold">{m.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* GEOGRAPHY TAB */}
          <TabsContent value="geography" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Top Regions by Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geoData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(280, geoData.length * 32)}>
                    <BarChart data={geoData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} className="text-xs" />
                      <YAxis dataKey="country" type="category" width={100} className="text-xs" />
                      <Tooltip formatter={(v: number, name: string) => [name === "volume" ? `$${v.toLocaleString()}` : v, name === "volume" ? "Volume" : "Transactions"]} />
                      <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No geographic data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INDUSTRY TAB */}
          <TabsContent value="industry" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Volume by Industry
                </CardTitle>
              </CardHeader>
              <CardContent>
                {industryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(280, industryData.length * 32)}>
                    <BarChart data={industryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} className="text-xs" />
                      <YAxis dataKey="industry" type="category" width={120} className="text-xs" />
                      <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Volume"]} />
                      <Bar dataKey="volume" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No industry data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Reusable funnel component
function FunnelSteps({ steps }: { steps: { label: string; value: number }[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const prevValue = i > 0 ? steps[i - 1].value : step.value;
        const dropoff = prevValue > 0 && i > 0 ? ((1 - step.value / prevValue) * 100).toFixed(1) : null;
        const widthPct = steps[0].value > 0 ? Math.max(10, (step.value / steps[0].value) * 100) : 100;
        return (
          <div key={step.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-medium">
                {step.value}
                {dropoff && <span className="text-destructive ml-1">-{dropoff}%</span>}
              </span>
            </div>
            <div className="h-6 bg-muted/30 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                  opacity: 0.7 + (i * 0.1),
                }}
              />
            </div>
          </div>
        );
      })}
      {steps[0]?.value > 0 && steps.length > 1 && (
        <div className="text-xs text-muted-foreground text-center mt-2">
          Overall conversion: <span className="font-bold">{((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export default AdminPlatformAnalytics;

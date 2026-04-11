import { useState, useMemo } from "react";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3, TrendingUp, PieChart, Globe, Gauge, Users, Clock, DollarSign,
  Plus, Download, FileText, Upload, AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RPieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(270, 50%, 55%)",
  "hsl(180, 55%, 45%)",
];

type DisbursementRecord = {
  id: string;
  lender_id: string;
  vendor_id: string | null;
  application_id: string | null;
  amount_usd: number;
  local_currency_code: string | null;
  local_currency_amount: number | null;
  exchange_rate_snapshot: number | null;
  disbursement_date: string | null;
  reference_number: string | null;
  document_url: string | null;
  extraction_confidence: number | null;
  source: string;
  status: string;
  notes: string | null;
  disbursed_at: string;
  created_at: string;
};

const LenderAnalytics = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [timeRange, setTimeRange] = useState("6m");
  const [manualForm, setManualForm] = useState({
    amount_usd: "",
    local_currency_code: "",
    local_currency_amount: "",
    disbursement_date: format(new Date(), "yyyy-MM-dd"),
    reference_number: "",
    notes: "",
    vendor_name: "",
  });

  // Fetch disbursement records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["lender_disbursements", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("lender_disbursement_records")
        .select("*")
        .eq("lender_id", user.id)
        .order("disbursed_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DisbursementRecord[];
    },
    enabled: !!user?.id,
  });

  // Fetch lender profile for tier/exposure
  const { data: lenderProfile } = useQuery({
    queryKey: ["lender_profile_analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("lender_profiles")
        .select("lender_tier, facility_limit, institution_name, logo_url, sector_focus, operating_regions")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch exposure
  const { data: exposure } = useQuery({
    queryKey: ["lender_exposure_analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("lender_exposure")
        .select("total_exposure, exposure_limit, active_facilities")
        .eq("lender_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch financing applications for performance metrics
  const { data: applications = [] } = useQuery({
    queryKey: ["lender_apps_analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("financing_applications")
        .select("id, status, requested_amount, approved_amount, created_at, updated_at, vendor_id")
        .eq("lender_id", user.id);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Manual entry mutation
  const addDisbursement = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("lender_disbursement_records").insert({
        lender_id: user.id,
        amount_usd: parseFloat(manualForm.amount_usd),
        local_currency_code: manualForm.local_currency_code || null,
        local_currency_amount: manualForm.local_currency_amount ? parseFloat(manualForm.local_currency_amount) : null,
        disbursement_date: manualForm.disbursement_date || null,
        reference_number: manualForm.reference_number || null,
        notes: manualForm.notes || null,
        source: "manual",
        status: "confirmed",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lender_disbursements"] });
      setShowManualEntry(false);
      setManualForm({ amount_usd: "", local_currency_code: "", local_currency_amount: "", disbursement_date: format(new Date(), "yyyy-MM-dd"), reference_number: "", notes: "", vendor_name: "" });
      toast.success("Disbursement recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Computed analytics ──
  const confirmedRecords = records.filter(r => r.status === "confirmed");
  const totalDisbursed = confirmedRecords.reduce((s, r) => s + Number(r.amount_usd), 0);
  const autoRecords = confirmedRecords.filter(r => r.source === "auto");
  const manualRecords = confirmedRecords.filter(r => r.source === "manual");
  const totalApproved = applications.filter(a => a.status === "approved").length;
  const totalApps = applications.length;
  const approvalRate = totalApps > 0 ? Math.round((totalApproved / totalApps) * 100) : 0;

  // Monthly trend data (last 6-12 months)
  const monthCount = timeRange === "12m" ? 12 : timeRange === "3m" ? 3 : 6;
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthRecords = confirmedRecords.filter(r => {
        const rd = new Date(r.disbursed_at);
        return rd >= start && rd <= end;
      });
      months.push({
        month: format(d, "MMM yy"),
        total: monthRecords.reduce((s, r) => s + Number(r.amount_usd), 0),
        auto: monthRecords.filter(r => r.source === "auto").reduce((s, r) => s + Number(r.amount_usd), 0),
        manual: monthRecords.filter(r => r.source !== "auto").reduce((s, r) => s + Number(r.amount_usd), 0),
        count: monthRecords.length,
      });
    }
    return months;
  }, [confirmedRecords, monthCount]);

  // Sector concentration (from applications)
  const sectorData = useMemo(() => {
    const sectors: Record<string, number> = {};
    confirmedRecords.forEach(r => {
      const key = r.local_currency_code || "USD";
      sectors[key] = (sectors[key] || 0) + Number(r.amount_usd);
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [confirmedRecords]);

  // Currency exposure
  const currencyData = useMemo(() => {
    const currencies: Record<string, { amount: number; count: number }> = {};
    confirmedRecords.forEach(r => {
      const code = r.local_currency_code || "USD";
      if (!currencies[code]) currencies[code] = { amount: 0, count: 0 };
      currencies[code].amount += Number(r.local_currency_amount || r.amount_usd);
      currencies[code].count += 1;
    });
    return Object.entries(currencies).map(([code, d]) => ({ code, ...d })).sort((a, b) => b.amount - a.amount);
  }, [confirmedRecords]);

  // Facility utilization
  const facilityLimit = lenderProfile?.facility_limit || 0;
  const currentExposure = exposure?.total_exposure || 0;
  const utilizationPct = facilityLimit > 0 ? Math.round((currentExposure / facilityLimit) * 100) : 0;

  const tier = lenderProfile?.lender_tier || 1;
  const tierLabel = tier === 1 ? "Micro" : tier === 2 ? "Standard" : tier === 3 ? "Institutional" : "DFI";

  // CSV Export
  const exportCSV = () => {
    const headers = ["Date", "Amount (USD)", "Currency", "Local Amount", "Source", "Reference", "Status", "Notes"];
    const rows = confirmedRecords.map(r => [
      r.disbursement_date || format(new Date(r.disbursed_at), "yyyy-MM-dd"),
      r.amount_usd,
      r.local_currency_code || "USD",
      r.local_currency_amount || "",
      r.source,
      r.reference_number || "",
      r.status,
      (r.notes || "").replace(/,/g, ";"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustlock-disbursements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (isLoading) {
    return (
      <div>
        <LenderHeader title="Analytics" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <LenderHeader title="Analytics" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Tier {tier} — {tierLabel}</Badge>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">3 months</SelectItem>
                <SelectItem value="6m">6 months</SelectItem>
                <SelectItem value="12m">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setShowManualEntry(true)}>
              <Plus className="w-3.5 h-3.5" /> Log Disbursement
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Disbursed</span>
              </div>
              <p className="text-xl font-bold text-foreground">${totalDisbursed.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{confirmedRecords.length} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Approval Rate</span>
              </div>
              <p className="text-xl font-bold text-foreground">{approvalRate}%</p>
              <p className="text-[10px] text-muted-foreground">{totalApproved}/{totalApps} applications</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Utilization</span>
              </div>
              <p className="text-xl font-bold text-foreground">{utilizationPct}%</p>
              <p className="text-[10px] text-muted-foreground">${currentExposure.toLocaleString()} / ${facilityLimit.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Active Facilities</span>
              </div>
              <p className="text-xl font-bold text-foreground">{exposure?.active_facilities || 0}</p>
              <p className="text-[10px] text-muted-foreground">Active vendor facilities</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="disbursements" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="disbursements" className="text-xs gap-1"><BarChart3 className="w-3 h-3" /> Disbursements</TabsTrigger>
            <TabsTrigger value="portfolio" className="text-xs gap-1"><TrendingUp className="w-3 h-3" /> Portfolio</TabsTrigger>
            <TabsTrigger value="sectors" className="text-xs gap-1"><PieChart className="w-3 h-3" /> Sectors</TabsTrigger>
            <TabsTrigger value="currency" className="text-xs gap-1"><Globe className="w-3 h-3" /> Currency</TabsTrigger>
            <TabsTrigger value="records" className="text-xs gap-1"><FileText className="w-3 h-3" /> Records</TabsTrigger>
          </TabsList>

          {/* 1. Total Funds Disbursed */}
          <TabsContent value="disbursements" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Funds Disbursed</CardTitle>
                <CardDescription className="text-xs">On-platform (auto) vs offline (manual) by month</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {monthlyData.some(m => m.total > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="auto" name="On-Platform" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="manual" name="Offline" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No disbursement data yet. Use "Log Disbursement" to add records.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trend Line */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Disbursement Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Transactions" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Portfolio Performance */}
          <TabsContent value="portfolio" className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Application Breakdown</h4>
                  {["approved", "submitted", "under_review", "rejected", "withdrawn"].map(s => {
                    const count = applications.filter(a => a.status === s).length;
                    return (
                      <div key={s} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{s.replace(/_/g, " ")}</span>
                        <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Source Breakdown</h4>
                  <div className="flex items-center justify-between text-xs">
                    <span>Auto (on-platform)</span>
                    <span className="font-medium">${autoRecords.reduce((s, r) => s + Number(r.amount_usd), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Manual (offline)</span>
                    <span className="font-medium">${manualRecords.reduce((s, r) => s + Number(r.amount_usd), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-border pt-2 mt-2">
                    <span className="font-medium">Total</span>
                    <span className="font-bold">${totalDisbursed.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Facility Utilization Gauge */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4" /> Facility Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Current Exposure</span>
                    <span>${currentExposure.toLocaleString()} / ${facilityLimit.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${utilizationPct > 80 ? "bg-destructive" : utilizationPct > 60 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>0%</span>
                    <span className="font-medium">{utilizationPct}%</span>
                    <span>100%</span>
                  </div>
                  {utilizationPct > 80 && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>High utilization — consider applying for a tier upgrade</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Sector / Currency Concentration */}
          <TabsContent value="sectors" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Currency Concentration</CardTitle>
                <CardDescription className="text-xs">Distribution of disbursements by currency</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {sectorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {sectorData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    </RPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                )}
              </CardContent>
            </Card>
            {sectorData.some(s => s.value / totalDisbursed > 0.4) && totalDisbursed > 0 && (
              <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Concentration Risk Warning</p>
                  <p className="text-[10px] text-muted-foreground">Over 40% of your disbursements are concentrated in a single currency. Consider diversifying your portfolio.</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* 4. Currency Exposure */}
          <TabsContent value="currency" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Currency Exposure</CardTitle>
                <CardDescription className="text-xs">Breakdown of disbursements by currency with transaction counts</CardDescription>
              </CardHeader>
              <CardContent>
                {currencyData.length > 0 ? (
                  <div className="space-y-2">
                    {currencyData.map(c => (
                      <div key={c.code} className="flex items-center justify-between p-2 rounded border border-border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono">{c.code}</Badge>
                          <span className="text-xs text-muted-foreground">{c.count} txns</span>
                        </div>
                        <span className="text-sm font-medium">{c.amount.toLocaleString()} {c.code}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No currency data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Records Table */}
          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Disbursement Records</CardTitle>
                <CardDescription className="text-xs">{confirmedRecords.length} total records</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="min-w-[500px]">
                    <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border font-medium">
                      <span>Date</span>
                      <span>Amount</span>
                      <span>Currency</span>
                      <span>Source</span>
                      <span>Ref</span>
                      <span>Status</span>
                    </div>
                    {records.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No records yet</p>
                    ) : (
                      records.map(r => (
                        <div key={r.id} className="grid grid-cols-6 gap-2 px-4 py-2 text-xs border-b border-border/50 hover:bg-muted/30">
                          <span>{r.disbursement_date || format(new Date(r.disbursed_at), "MMM dd, yy")}</span>
                          <span className="font-medium">${Number(r.amount_usd).toLocaleString()}</span>
                          <span>{r.local_currency_code || "USD"}</span>
                          <Badge variant="secondary" className="text-[9px] w-fit">{r.source}</Badge>
                          <span className="truncate">{r.reference_number || "—"}</span>
                          <Badge variant={r.status === "confirmed" ? "default" : "secondary"} className="text-[9px] w-fit">{r.status}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Log Offline Disbursement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount (USD) *</Label>
              <Input type="number" value={manualForm.amount_usd} onChange={e => setManualForm(p => ({ ...p, amount_usd: e.target.value }))} placeholder="10000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Local Currency Code</Label>
                <Input value={manualForm.local_currency_code} onChange={e => setManualForm(p => ({ ...p, local_currency_code: e.target.value }))} placeholder="NGN" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Local Amount</Label>
                <Input type="number" value={manualForm.local_currency_amount} onChange={e => setManualForm(p => ({ ...p, local_currency_amount: e.target.value }))} placeholder="15000000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Disbursement Date</Label>
                <Input type="date" value={manualForm.disbursement_date} onChange={e => setManualForm(p => ({ ...p, disbursement_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reference Number</Label>
                <Input value={manualForm.reference_number} onChange={e => setManualForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="TRF-2024-001" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={manualForm.notes} onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))} placeholder="Additional details..." className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowManualEntry(false)}>Cancel</Button>
            <Button size="sm" onClick={() => addDisbursement.mutate()} disabled={!manualForm.amount_usd || addDisbursement.isPending}>
              {addDisbursement.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LenderAnalytics;

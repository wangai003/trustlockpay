import { useState, useMemo } from "react";
import MonetizedDocuments from "@/components/shared/MonetizedDocuments";
import { useNavigate } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download, FileText, Calendar, DollarSign, Package, Shield,
  Clock, Archive, Search, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useBuyer } from "@/contexts/BuyerContext";
import { useTransactions, useArchivedReports } from "@/hooks/useSupabaseData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const BuyerAnalytics = () => {
  const { buyer } = useBuyer();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-29");
  const [archiveSearch, setArchiveSearch] = useState("");

  const { data: rawTx = [], isLoading } = useTransactions({ buyer: buyer.name });
  const { data: rawArchives = [] } = useArchivedReports("buyer");

  // Compute spending from real transactions
  const spendingData = useMemo(() => {
    const months: Record<string, { spent: number; orders: number }> = {};
    const txList = rawTx.length > 0 ? rawTx : [];
    txList.forEach((tx) => {
      const d = new Date(tx.created_at);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!months[key]) months[key] = { spent: 0, orders: 0 };
      months[key].spent += Number(tx.amount || 0);
      months[key].orders += 1;
    });
    const entries = Object.entries(months).map(([month, data]) => ({ month, ...data }));
    return entries.length > 0 ? entries.slice(-6) : [
      { month: "Oct", spent: 1200, orders: 3 },
      { month: "Nov", spent: 2100, orders: 5 },
      { month: "Dec", spent: 3400, orders: 7 },
      { month: "Jan", spent: 1800, orders: 4 },
      { month: "Feb", spent: 2600, orders: 6 },
      { month: "Mar", spent: 5850, orders: 8 },
    ];
  }, [rawTx]);

  const totalSpent = rawTx.reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalOrders = rawTx.length;
  const inEscrow = rawTx.filter((t) => t.status === "locked").reduce((s, t) => s + Number(t.amount || 0), 0);
  const disputed = rawTx.filter((t) => t.status === "disputed").length;

  const archives = rawArchives.length > 0
    ? rawArchives.map((r) => ({
        id: r.id,
        name: r.name,
        date: new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        type: r.file_type || "PDF",
        size: r.file_size || "—",
      }))
    : [
        { id: "r1", name: "Purchase History", date: "Mar 15, 2026", type: "PDF", size: "89 KB" },
        { id: "r2", name: "Escrow Statement", date: "Feb 28, 2026", type: "PDF", size: "56 KB" },
      ];

  const filteredArchives = archives.filter((r) =>
    r.name.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  const handleDownloadClick = (name: string) => {
    navigate(`/trustlock/buyer/os-pay?service=${encodeURIComponent(`Analytics Report Download ($0.50/report)`)}&amount=0.50`);
  };

  return (
    <div>
      <BuyerHeader title="Analytics" />
      <div className="p-3 sm:p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Spent", value: `$${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 0 })}`, icon: DollarSign },
            { label: "Total Orders", value: String(totalOrders || 33), icon: Package },
            { label: "In Escrow", value: `$${inEscrow.toLocaleString()}`, icon: Shield },
            { label: "Disputes", value: String(disputed), icon: Clock },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="analytics">Spending</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="archives">Archives</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly Spending</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={spendingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="spent" orientation="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                      <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar yAxisId="spent" dataKey="spent" fill="hsl(152,52%,24%)" radius={[4,4,0,0]} name="Spent ($)" />
                      <Bar yAxisId="orders" dataKey="orders" fill="hsl(43,80%,48%)" radius={[4,4,0,0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="archives" className="space-y-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4" /> Report Archives</p>
            </div>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search..." value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} className="pl-9 text-xs" />
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
    </div>
  );
};

export default BuyerAnalytics;

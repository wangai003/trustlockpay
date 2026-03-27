import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Download, FileText, Calendar, DollarSign, Package, Shield,
  Clock, Archive, Search, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { useBuyer } from "@/contexts/BuyerContext";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const spendingData = [
  { month: "Oct", spent: 1200, orders: 3 },
  { month: "Nov", spent: 2100, orders: 5 },
  { month: "Dec", spent: 3400, orders: 7 },
  { month: "Jan", spent: 1800, orders: 4 },
  { month: "Feb", spent: 2600, orders: 6 },
  { month: "Mar", spent: 5850, orders: 8 },
];

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const archivedReports = [
  { id: "r1", name: "Purchase History", date: "Mar 15, 2026", type: "PDF", size: "89 KB" },
  { id: "r2", name: "Escrow Statement", date: "Feb 28, 2026", type: "PDF", size: "56 KB" },
  { id: "r3", name: "Dispute Summary", date: "Feb 15, 2026", type: "PDF", size: "34 KB" },
  { id: "r4", name: "Purchase History", date: "Jan 31, 2026", type: "PDF", size: "78 KB" },
];

const BuyerAnalytics = () => {
  const { buyer } = useBuyer();
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-22");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [pendingReport, setPendingReport] = useState<string | null>(null);

  const handleDownloadClick = (name: string) => {
    navigate(`/trustlock/buyer/os-pay?service=${encodeURIComponent(`Analytics Report Download ($0.50/report)`)}&amount=0.50`);
  };

  const handlePaymentComplete = () => {
    setPayDialogOpen(false);
    if (pendingReport) {
      toast.success(`📄 ${pendingReport} for ${buyer.name} downloaded.`);
      setPendingReport(null);
    }
  };

  const filteredArchives = archivedReports.filter(r =>
    r.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    r.date.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <div>
      <BuyerHeader title="Analytics & Reports" />
      <div className="p-3 sm:p-6 space-y-6">
        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="archives">Archives</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Spent", value: "$16,950", icon: DollarSign },
                { label: "Total Orders", value: "33", icon: Package },
                { label: "Avg Order Value", value: "$514", icon: TrendingUp },
                { label: "Avg Delivery Time", value: "3.1 days", icon: Clock },
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

            <Card>
              <CardHeader><CardTitle className="text-sm">Spending Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={spendingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(1)}k`} />
                    <Tooltip contentStyle={chartStyle} />
                    <Area type="monotone" dataKey="spent" stroke="hsl(152,52%,24%)" fill="hsl(152,52%,24%)" fillOpacity={0.15} name="Spent ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <p className="text-sm text-muted-foreground">Download branded reports personalized with your name.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { name: "Purchase History", desc: "Complete list of all your purchases with amounts and statuses.", icon: Package },
                { name: "Escrow Statement", desc: "Details of funds held, released, and refunded through escrow.", icon: DollarSign },
                { name: "Dispute Summary", desc: "Summary of all disputes filed, resolutions, and outcomes.", icon: FileText },
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
                        <Badge variant="outline" className="text-[9px]"><Shield className="w-2.5 h-2.5 mr-1" /> TrustLock Pay</Badge>
                        <Badge variant="outline" className="text-[9px]">For: {buyer.name}</Badge>
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
              Reports include the TrustLock Pay logo. $0.50 per download.
            </p>
          </TabsContent>

          <TabsContent value="archives" className="space-y-4">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4" /> Report Archives</p>
              <p className="text-[10px] text-muted-foreground">Auto-archived after 90 days. Deleted after 12 months.</p>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="pl-9 text-xs" />
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
            role="buyer"
            prefillService={pendingReport ? `Report: ${pendingReport}` : ""}
            prefillAmount="0.50"
            onComplete={handlePaymentComplete}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerAnalytics;

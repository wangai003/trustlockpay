import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  { month: "Oct", avgLock: 3.2, autoRelease: 62, manual: 38 },
  { month: "Nov", avgLock: 2.9, autoRelease: 65, manual: 35 },
  { month: "Dec", avgLock: 2.7, autoRelease: 68, manual: 32 },
  { month: "Jan", avgLock: 2.5, autoRelease: 71, manual: 29 },
  { month: "Feb", avgLock: 2.3, autoRelease: 74, manual: 26 },
  { month: "Mar", avgLock: 2.1, autoRelease: 76, manual: 24 },
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

const geoData = [
  { region: "West Africa", transactions: 456 },
  { region: "East Africa", transactions: 289 },
  { region: "North America", transactions: 234 },
  { region: "Europe", transactions: 178 },
  { region: "Southern Africa", transactions: 90 },
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

const chartStyle = {
  background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px",
};

const AdminAnalytics = () => {
  return (
    <div>
      <AdminHeader title="Analytics" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold">Comprehensive Platform Analytics</h2>
            <p className="text-sm text-muted-foreground">Aggregated insights — no sensitive PII displayed</p>
          </div>
          <Badge variant="secondary">Last 6 Months</Badge>
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

        {/* Row 2: Escrow Performance + Revenue */}
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

        {/* Row 3: Industry + Geography */}
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
            <CardHeader><CardTitle className="text-base">Geographic Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={geoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(45,10%,90%)" />
                  <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={chartStyle} />
                  <Bar dataKey="transactions" fill="hsl(43,80%,48%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Buyer Metrics */}
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
      </div>
    </div>
  );
};

export default AdminAnalytics;

import { motion } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight, DollarSign, Clock, AlertTriangle, Users, Shield,
  TrendingUp, TrendingDown, CheckCircle, Bot
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const volumeData = [
  { month: "Oct", transactions: 124, volume: 48200 },
  { month: "Nov", transactions: 156, volume: 62400 },
  { month: "Dec", transactions: 189, volume: 78600 },
  { month: "Jan", transactions: 210, volume: 91200 },
  { month: "Feb", transactions: 245, volume: 108500 },
  { month: "Mar", transactions: 278, volume: 124800 },
];

const disputeData = [
  { name: "Auto-Resolved", value: 42, color: "hsl(152, 52%, 40%)" },
  { name: "Admin Resolved", value: 28, color: "hsl(43, 80%, 48%)" },
  { name: "Pending", value: 8, color: "hsl(0, 84%, 60%)" },
  { name: "Escalated", value: 4, color: "hsl(160, 15%, 40%)" },
];

const recentTx = [
  { id: "TL-2026-0891", buyerId: "BYR-2026-0102", vendorId: "VND-2026-0041", buyer: "James O.", vendor: "Kente Craft Ltd", amount: "$200.00", status: "locked" },
  { id: "TL-2026-0892", buyerId: "BYR-2026-0108", vendorId: "VND-2026-0047", buyer: "Adaeze N.", vendor: "Apex Builders", amount: "$4,500.00", status: "released" },
  { id: "TL-2026-0893", buyerId: "BYR-2026-0145", vendorId: "VND-2026-0052", buyer: "Kofi M.", vendor: "Safari Dreams", amount: "$1,200.00", status: "disputed" },
  { id: "TL-2026-0894", buyerId: "BYR-2026-0142", vendorId: "VND-2026-0060", buyer: "Fatima B.", vendor: "Lagos Realty", amount: "$12,000.00", status: "locked" },
  { id: "TL-2026-0895", buyerId: "BYR-2026-0115", vendorId: "VND-2026-0055", buyer: "Emmanuel K.", vendor: "Mombasa Textiles", amount: "$350.00", status: "released" },
];

const statusColors: Record<string, string> = {
  locked: "bg-accent/15 text-accent-foreground",
  released: "bg-primary/15 text-primary",
  disputed: "bg-destructive/15 text-destructive",
};

const stats = [
  { label: "Total Transactions", value: "1,247", change: "+12.5%", up: true, icon: ArrowLeftRight },
  { label: "Funds in Escrow", value: "$284,600", change: "+8.3%", up: true, icon: Clock },
  { label: "Total Released", value: "$1.2M", change: "+15.7%", up: true, icon: DollarSign },
  { label: "Active Disputes", value: "12", change: "-23%", up: false, icon: AlertTriangle },
  { label: "Active Vendors", value: "342", change: "+5.2%", up: true, icon: Users },
  { label: "AI Accuracy", value: "94.2%", change: "+1.8%", up: true, icon: Bot },
];

const AdminOverview = () => {
  return (
    <div>
      <AdminHeader title="Dashboard Overview" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                    <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.label}</span>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className={`flex items-center gap-1 text-xs mt-1 ${stat.up ? "text-primary" : "text-destructive"}`}>
                    {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change} from last month
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Transaction Volume Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Transaction Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 10%, 90%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(45, 10%, 90%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="transactions" fill="hsl(152, 52%, 24%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Dispute Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={disputeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                    {disputeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0, 0%, 100%)",
                      border: "1px solid hsl(45, 10%, 90%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {disputeData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Badge variant="secondary" className="text-xs">Live</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Vendor</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono text-xs">{tx.id}</td>
                      <td className="p-4">{tx.buyer}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{tx.vendor}</td>
                      <td className="p-4 text-right font-semibold">{tx.amount}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[tx.status]}`}>
                          {tx.status === "locked" && <Clock className="w-3 h-3" />}
                          {tx.status === "released" && <CheckCircle className="w-3 h-3" />}
                          {tx.status === "disputed" && <AlertTriangle className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Emmanuel AI Summary */}
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Emmanuel AI — Status</CardTitle>
              <p className="text-xs text-muted-foreground">Dispute resolution intelligence</p>
            </div>
            <Badge className="ml-auto bg-primary/15 text-primary">Online</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Cases Analyzed Today", value: "14" },
                { label: "Auto-Resolved", value: "9" },
                { label: "Pending Review", value: "3" },
                { label: "Accuracy (30d)", value: "94.2%" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;

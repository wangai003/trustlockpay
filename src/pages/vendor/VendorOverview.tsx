import { motion } from "framer-motion";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, DollarSign, Clock, TrendingUp, CheckCircle,
  AlertTriangle, Package, Eye
} from "lucide-react";

const recentTx = [
  { id: "TL-2026-0891", buyer: "James O.", amount: "$200.00", status: "locked" as const, date: "Mar 18", item: "Kente Cloth Set" },
  { id: "TL-2026-0896", buyer: "Emmanuel K.", amount: "$350.00", status: "locked" as const, date: "Mar 21", item: "Traditional Beads Collection" },
  { id: "TL-2026-0892", buyer: "Adaeze N.", amount: "$4,500.00", status: "released" as const, date: "Mar 20", item: "Bulk Order - Textiles" },
  { id: "TL-2026-0889", buyer: "Grace A.", amount: "$120.00", status: "released" as const, date: "Mar 17", item: "Handwoven Basket" },
  { id: "TL-2026-0894", buyer: "Amara D.", amount: "$680.00", status: "disputed" as const, date: "Mar 15", item: "Custom Fabric Order" },
];

const statusColors: Record<string, string> = {
  locked: "bg-accent/15 text-accent-foreground",
  released: "bg-primary/15 text-primary",
  disputed: "bg-destructive/15 text-destructive",
};

const VendorOverview = () => {
  const { vendor } = useVendor();

  return (
    <div>
      <VendorHeader title="Dashboard" />
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <h2 className="font-heading text-base sm:text-xl font-bold">Welcome back, {vendor.name}</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Here's your escrow activity summary</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="secondary" className="capitalize text-[10px] sm:text-xs">{vendor.type} vendor</Badge>
                <Badge className="bg-primary/15 text-primary text-[10px]">KYC Tier {vendor.kycTier}</Badge>
                <Badge variant="outline" className="text-[10px]">{vendor.sites.length} site{vendor.sites.length > 1 ? "s" : ""} connected</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: "Active Escrows", value: "8", icon: Clock, change: "+3 this week" },
            { label: "Total Released", value: "$14,200", icon: DollarSign, change: "+$2,400 this month" },
            { label: "Pending Payout", value: "$5,050", icon: TrendingUp, change: "Next payout in 2d" },
            { label: "Disputes", value: "1", icon: AlertTriangle, change: "Under review" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">View All →</Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Item</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-mono text-xs">{tx.id}</td>
                      <td className="p-4">{tx.buyer}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{tx.item}</td>
                      <td className="p-4 text-right font-semibold">{tx.amount}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[tx.status]}`}>
                          {tx.status === "locked" && <Clock className="w-3 h-3" />}
                          {tx.status === "released" && <CheckCircle className="w-3 h-3" />}
                          {tx.status === "disputed" && <AlertTriangle className="w-3 h-3" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-center hidden sm:table-cell">
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorOverview;

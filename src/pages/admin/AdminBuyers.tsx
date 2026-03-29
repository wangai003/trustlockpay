import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, UserCheck, Users, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useProfilesByRole, useTransactions } from "@/hooks/useSupabaseData";
import { useAdmin } from "@/contexts/AdminContext";

const statusColors: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  paused: "bg-destructive/15 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

const MOCK_BUYERS = [
  { id: "B-001", name: "James O.", location: "Chicago, USA", transactions: 12, volume: "$3,400", status: "active" },
  { id: "B-002", name: "Adaeze N.", location: "London, UK", transactions: 8, volume: "$18,200", status: "active" },
  { id: "B-003", name: "Kofi M.", location: "Toronto, Canada", transactions: 5, volume: "$6,100", status: "active" },
  { id: "B-004", name: "Fatima B.", location: "Paris, France", transactions: 15, volume: "$42,600", status: "active" },
  { id: "B-005", name: "Emmanuel K.", location: "New York, USA", transactions: 3, volume: "$1,050", status: "active" },
];

const AdminBuyers = () => {
  const { isTestnet } = useAdmin();
  const [search, setSearch] = useState("");
  const { data: profiles = [], isLoading } = useProfilesByRole("buyer");
  const { data: allTx = [] } = useTransactions();

  const buyers = isTestnet
    ? MOCK_BUYERS
    : profiles.map((p) => {
        const buyerTx = allTx.filter((t) => t.buyer_id === p.id);
        const volume = buyerTx.reduce((s, t) => s + Number(t.amount || 0), 0);
        return {
          id: p.id.slice(0, 8).toUpperCase(),
          name: p.full_name || p.email,
          location: p.location || "—",
          transactions: buyerTx.length,
          volume: `$${volume.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
          status: p.status || "active",
        };
      });

  const filtered = buyers.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));
  const totalBuyers = buyers.length;
  const activeCount = buyers.filter((b) => b.status === "active").length;
  const totalVolume = isTestnet ? 71350 : allTx.filter((t) => t.buyer_id).reduce((s, t) => s + Number(t.amount || 0), 0);
  const avgSpend = totalBuyers > 0 ? Math.round(totalVolume / totalBuyers) : 0;

  return (
    <div>
      <AdminHeader title="Buyer Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Buyers", value: String(totalBuyers), icon: Users },
            { label: "Active", value: String(activeCount), icon: UserCheck },
            { label: "Total Volume", value: `$${totalVolume.toLocaleString()}`, icon: TrendingUp },
            { label: "Avg Spend", value: `$${avgSpend.toLocaleString()}`, icon: DollarSign },
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

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search buyers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading && !isTestnet ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Location</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Transactions</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">Volume</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-4 font-mono text-xs">{b.id.slice(0, 8)}</td>
                        <td className="p-4 font-medium">{b.name}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">{b.location}</td>
                        <td className="p-4 hidden lg:table-cell text-right">{b.transactions}</td>
                        <td className="p-4 text-right font-semibold">{b.volume}</td>
                        <td className="p-4 text-center">
                          <Badge className={`text-[10px] capitalize ${statusColors[b.status] || ""}`}>{b.status}</Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No buyers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBuyers;

import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, UserCheck, Users, DollarSign, TrendingUp } from "lucide-react";
import { useState } from "react";

const mockBuyers = [
  { id: "B-001", name: "James O.", location: "Chicago, USA", transactions: 12, volume: "$3,400", avgConfirm: "1.2 days", kyc: "basic" as const, status: "active" as const },
  { id: "B-002", name: "Adaeze N.", location: "London, UK", transactions: 8, volume: "$18,200", avgConfirm: "0.8 days", kyc: "full" as const, status: "active" as const },
  { id: "B-003", name: "Kofi M.", location: "Toronto, Canada", transactions: 5, volume: "$6,100", avgConfirm: "2.1 days", kyc: "basic" as const, status: "active" as const },
  { id: "B-004", name: "Fatima B.", location: "Paris, France", transactions: 15, volume: "$42,600", avgConfirm: "1.5 days", kyc: "full" as const, status: "active" as const },
  { id: "B-005", name: "Emmanuel K.", location: "New York, USA", transactions: 3, volume: "$1,050", avgConfirm: "3.2 days", kyc: "none" as const, status: "flagged" as const },
];

const kycColors = { none: "bg-muted text-muted-foreground", basic: "bg-accent/15 text-accent-foreground", full: "bg-primary/15 text-primary" };
const statusColors = { active: "bg-primary/15 text-primary", flagged: "bg-destructive/15 text-destructive" };

const AdminBuyers = () => {
  const [search, setSearch] = useState("");
  const filtered = mockBuyers.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <AdminHeader title="Buyer Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Buyers", value: "1,089", icon: Users },
            { label: "Active (30d)", value: "342", icon: UserCheck },
            { label: "Repeat Rate", value: "33.1%", icon: TrendingUp },
            { label: "Avg Spend", value: "$449", icon: DollarSign },
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Location</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Transactions</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Volume</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden md:table-cell">Avg Confirm</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">KYC</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-4 font-mono text-xs">{b.id}</td>
                      <td className="p-4 font-medium">{b.name}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">{b.location}</td>
                      <td className="p-4 hidden lg:table-cell text-right">{b.transactions}</td>
                      <td className="p-4 text-right font-semibold">{b.volume}</td>
                      <td className="p-4 hidden md:table-cell text-center text-muted-foreground">{b.avgConfirm}</td>
                      <td className="p-4 hidden sm:table-cell text-center">
                        <Badge className={`text-[10px] capitalize ${kycColors[b.kyc]}`}>{b.kyc}</Badge>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`text-[10px] capitalize ${statusColors[b.status]}`}>{b.status}</Badge>
                      </td>
                      <td className="p-4 text-center">
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

export default AdminBuyers;

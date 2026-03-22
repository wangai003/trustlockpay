import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Users, Store, Wrench, CheckCircle, Clock, XCircle } from "lucide-react";
import { useState } from "react";

const mockVendors = [
  { id: "V-001", name: "Kente Craft Ltd", type: "product" as const, location: "Accra, Ghana", kyc: "tier2" as const, transactions: 48, volume: "$14,200", status: "active" as const, sites: 2 },
  { id: "V-002", name: "Apex Builders", type: "service" as const, subType: "Project-Based / Milestones", location: "Lagos, Nigeria", kyc: "tier2" as const, transactions: 23, volume: "$52,800", status: "active" as const, sites: 1 },
  { id: "V-003", name: "Safari Dreams", type: "service" as const, subType: "Booking-Based", location: "Nairobi, Kenya", kyc: "tier1" as const, transactions: 67, volume: "$38,400", status: "active" as const, sites: 3 },
  { id: "V-004", name: "GreenFarm Co", type: "product" as const, location: "Kumasi, Ghana", kyc: "tier1" as const, transactions: 31, volume: "$8,900", status: "suspended" as const, sites: 1 },
  { id: "V-005", name: "Lagos Realty", type: "service" as const, subType: "Asset-Transfer", location: "Lagos, Nigeria", kyc: "tier3" as const, transactions: 12, volume: "$144,000", status: "active" as const, sites: 1 },
  { id: "V-006", name: "TechSkills Academy", type: "service" as const, subType: "Subscription-Based", location: "Accra, Ghana", kyc: "tier1" as const, transactions: 89, volume: "$22,300", status: "pending" as const, sites: 1 },
];

const kycColors = {
  tier0: "bg-muted text-muted-foreground",
  tier1: "bg-accent/15 text-accent-foreground",
  tier2: "bg-primary/15 text-primary",
  tier3: "bg-primary text-primary-foreground",
};

const statusColors = {
  active: "bg-primary/15 text-primary",
  suspended: "bg-destructive/15 text-destructive",
  pending: "bg-accent/15 text-accent-foreground",
};

const AdminVendors = () => {
  const [search, setSearch] = useState("");

  const filtered = mockVendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) || v.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <AdminHeader title="Vendor Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Vendors", value: "342", icon: Users },
            { label: "Product Vendors", value: "185", icon: Store },
            { label: "Service Vendors", value: "157", icon: Wrench },
            { label: "Pending Approval", value: "14", icon: Clock },
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
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Vendor</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Type</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Location</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden md:table-cell">KYC</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Transactions</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Volume</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground hidden sm:table-cell">Sites</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="p-4 font-mono text-xs">{v.id}</td>
                      <td className="p-4">
                        <div className="font-medium">{v.name}</div>
                        {v.type === "service" && v.subType && (
                          <div className="text-[10px] text-muted-foreground">{v.subType}</div>
                        )}
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs capitalize">{v.type}</Badge>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">{v.location}</td>
                      <td className="p-4 hidden md:table-cell text-center">
                        <Badge className={`text-[10px] ${kycColors[v.kyc]}`}>{v.kyc.toUpperCase()}</Badge>
                      </td>
                      <td className="p-4 hidden lg:table-cell text-right">{v.transactions}</td>
                      <td className="p-4 text-right font-semibold">{v.volume}</td>
                      <td className="p-4 hidden sm:table-cell text-center">{v.sites}</td>
                      <td className="p-4 text-center">
                        <Badge className={`text-[10px] capitalize ${statusColors[v.status]}`}>{v.status}</Badge>
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

export default AdminVendors;

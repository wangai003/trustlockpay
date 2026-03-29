import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Eye, Users, Store, Wrench, Clock } from "lucide-react";
import { useState } from "react";
import { useProfilesByRole, useTransactions, useKycDocuments } from "@/hooks/useSupabaseData";
import { useAdmin } from "@/contexts/AdminContext";

const kycColors: Record<string, string> = {
  tier0: "bg-muted text-muted-foreground",
  tier1: "bg-accent/15 text-accent-foreground",
  tier2: "bg-primary/15 text-primary",
  tier3: "bg-primary text-primary-foreground",
};

const statusColors: Record<string, string> = {
  active: "bg-primary/15 text-primary",
  paused: "bg-destructive/15 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

const MOCK_VENDORS = [
  { id: "V-001", name: "Kente Craft Ltd", location: "Accra, Ghana", transactions: 48, volume: "$14,200", kyc: "tier2", status: "active" },
  { id: "V-002", name: "Apex Builders", location: "Lagos, Nigeria", transactions: 23, volume: "$52,800", kyc: "tier2", status: "active" },
  { id: "V-003", name: "Safari Dreams", location: "Nairobi, Kenya", transactions: 67, volume: "$38,400", kyc: "tier1", status: "active" },
  { id: "V-004", name: "GreenFarm Co", location: "Kumasi, Ghana", transactions: 31, volume: "$8,900", kyc: "tier1", status: "paused" },
  { id: "V-005", name: "Lagos Realty", location: "Lagos, Nigeria", transactions: 12, volume: "$144,000", kyc: "tier3", status: "active" },
];

const AdminVendors = () => {
  const { isTestnet } = useAdmin();
  const [search, setSearch] = useState("");
  const { data: profiles = [], isLoading } = useProfilesByRole("vendor");
  const { data: allTx = [] } = useTransactions();
  const { data: allKyc = [] } = useKycDocuments();

  // Build vendor list from real data
  const vendors = isTestnet
    ? MOCK_VENDORS
    : profiles.map((p) => {
        const vendorTx = allTx.filter((t) => t.vendor_id === p.id);
        const volume = vendorTx.reduce((s, t) => s + Number(t.amount || 0), 0);
        const kycDocs = allKyc.filter((d) => d.vendor_id === p.id);
        const approvedCount = kycDocs.filter((d) => d.status === "approved").length;
        const kyc = approvedCount >= 3 ? "tier3" : approvedCount >= 2 ? "tier2" : approvedCount >= 1 ? "tier1" : "tier0";
        return {
          id: p.id.slice(0, 8).toUpperCase(),
          name: p.full_name || p.email,
          location: p.location || "—",
          transactions: vendorTx.length,
          volume: `$${volume.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
          kyc,
          status: p.status || "active",
        };
      });

  const filtered = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) || v.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalVendors = vendors.length;
  const activeCount = vendors.filter((v) => v.status === "active").length;
  const pendingKyc = isTestnet ? 14 : allKyc.filter((d) => d.status === "pending").length;

  return (
    <div>
      <AdminHeader title="Vendor Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Vendors", value: String(totalVendors), icon: Users },
            { label: "Active", value: String(activeCount), icon: Store },
            { label: "With Transactions", value: String(vendors.filter((v) => v.transactions > 0).length), icon: Wrench },
            { label: "Pending KYC", value: String(pendingKyc), icon: Clock },
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
                      <th className="text-left p-4 font-semibold text-muted-foreground">Vendor</th>
                      <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Location</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground hidden lg:table-cell">Transactions</th>
                      <th className="text-right p-4 font-semibold text-muted-foreground">Volume</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground hidden md:table-cell">KYC</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v) => (
                      <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-4 font-mono text-xs">{v.id.slice(0, 8)}</td>
                        <td className="p-4 font-medium">{v.name}</td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">{v.location}</td>
                        <td className="p-4 hidden lg:table-cell text-right">{v.transactions}</td>
                        <td className="p-4 text-right font-semibold">{v.volume}</td>
                        <td className="p-4 hidden md:table-cell text-center">
                          <Badge className={`text-[10px] ${kycColors[v.kyc] || ""}`}>{v.kyc.toUpperCase()}</Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className={`text-[10px] capitalize ${statusColors[v.status] || ""}`}>{v.status}</Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No vendors found</td></tr>
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

export default AdminVendors;

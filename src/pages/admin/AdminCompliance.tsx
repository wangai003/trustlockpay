import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, CheckCircle, Clock, Eye, UserCheck, XCircle } from "lucide-react";

const kycQueue = [
  { id: "KYC-041", vendor: "NaijaFoods Ltd", tier: "Tier 1 → Tier 2", docs: "Business license, address proof", submitted: "Mar 20, 2026", status: "pending" as const },
  { id: "KYC-042", vendor: "TechBuild Solutions", tier: "Tier 0 → Tier 1", docs: "ID + selfie", submitted: "Mar 21, 2026", status: "pending" as const },
  { id: "KYC-039", vendor: "Safari Dreams", tier: "Tier 1 → Tier 2", docs: "Business registration", submitted: "Mar 18, 2026", status: "approved" as const },
  { id: "KYC-040", vendor: "Quick Loans Africa", tier: "Tier 2 → Tier 3", docs: "Bank verification, due diligence", submitted: "Mar 19, 2026", status: "rejected" as const },
];

const flaggedActivity = [
  { id: "FLAG-012", type: "Rapid Transactions", desc: "Vendor 'FastCash Ltd' processed 8 transactions in 10 minutes totaling $4,200", severity: "high" as const, date: "Mar 21, 2026" },
  { id: "FLAG-013", type: "Threshold Structuring", desc: "Buyer 'J. Smith' made 5 transactions of $240 each (just under $250 KYC threshold)", severity: "critical" as const, date: "Mar 21, 2026" },
  { id: "FLAG-011", type: "Sanctions Match", desc: "Vendor name partial match with OFAC SDN list — requires manual review", severity: "critical" as const, date: "Mar 20, 2026" },
  { id: "FLAG-010", type: "Unusual Geography", desc: "Transaction initiated from VPN-flagged IP in a high-risk jurisdiction", severity: "medium" as const, date: "Mar 19, 2026" },
];

const severityColors = {
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: XCircle },
};

const AdminCompliance = () => {
  return (
    <div>
      <AdminHeader title="Compliance & KYC" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending KYC Reviews", value: "8", icon: Clock },
            { label: "Approved (30d)", value: "34", icon: CheckCircle },
            { label: "Rejected (30d)", value: "3", icon: XCircle },
            { label: "Active Flags", value: "4", icon: AlertTriangle },
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

        {/* KYC Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">KYC Verification Queue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Vendor</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Tier Change</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Documents</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {kycQueue.map((kyc) => {
                    const cfg = statusConfig[kyc.status];
                    return (
                      <tr key={kyc.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-4 font-mono text-xs">{kyc.id}</td>
                        <td className="p-4 font-medium">{kyc.vendor}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">{kyc.tier}</td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground text-xs">{kyc.docs}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Flagged Activity */}
        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-base">Flagged Activity Monitor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flaggedActivity.map((flag) => (
                <div key={flag.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <Badge className={`text-[10px] shrink-0 mt-0.5 ${severityColors[flag.severity]}`}>
                    {flag.severity.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{flag.id}</span>
                      <span className="text-sm font-semibold">{flag.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{flag.desc}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{flag.date}</p>
                  </div>
                  <Button variant="outline" size="sm">Investigate</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCompliance;

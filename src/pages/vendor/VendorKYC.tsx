import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Upload, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useKycDocuments, useUploadKyc } from "@/hooks/useSupabaseData";

const tiers = [
  { tier: 0, label: "Unverified", limit: "Cannot transact", status: "completed" as const },
  { tier: 1, label: "Basic", limit: "Up to $500/tx", status: "completed" as const },
  { tier: 2, label: "Enhanced", limit: "Up to $10,000/tx", status: "current" as const },
  { tier: 3, label: "Enterprise", limit: "Unlimited", status: "locked" as const },
];

const docStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  approved: { label: "Approved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const VendorKYC = () => {
  const { vendor } = useVendor();
  const { data: rawDocs = [] } = useKycDocuments();
  const uploadKyc = useUploadKyc();

  const documents = rawDocs.map(d => ({
    name: d.name,
    status: (d.status || "pending") as "approved" | "pending" | "rejected",
    date: d.reviewed_at ? new Date(d.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
  }));

  const handleUpload = async () => {
    const name = prompt("Document name (e.g., Bank Verification):");
    if (name) {
      await uploadKyc.mutateAsync({ documentName: name });
    }
  };

  return (
    <div>
      <VendorHeader title="KYC & Verification" />
      <div className="p-6 space-y-6">
        {/* Tier Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Verification Tier</CardTitle>
                <CardDescription>Current: Tier {vendor.kycTier} — Enhanced</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {tiers.map((t, i) => (
                <div key={t.tier} className="flex items-center gap-2 flex-1">
                  <div className={`flex flex-col items-center flex-1 ${t.status === "locked" ? "opacity-40" : ""}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      t.status === "completed" ? "bg-primary text-primary-foreground" :
                      t.status === "current" ? "bg-accent text-accent-foreground ring-2 ring-accent" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {t.status === "completed" ? <CheckCircle className="w-5 h-5" /> : t.tier}
                    </div>
                    <span className="text-xs font-medium mt-2">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground">{t.limit}</span>
                  </div>
                  {i < tiers.length - 1 && <div className={`h-0.5 flex-1 mt-[-20px] ${t.status === "completed" ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Submitted Documents</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleUpload}><Upload className="w-3 h-3" /> Upload New</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => {
                const cfg = docStatusConfig[doc.status] || docStatusConfig.pending;
                return (
                  <div key={doc.name} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <cfg.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{doc.name}</span>
                      <p className="text-xs text-muted-foreground">{doc.date}</p>
                    </div>
                    <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
          <strong>To reach Tier 3 (Enterprise):</strong> Submit bank verification documents and complete the due diligence review. This unlocks unlimited transaction amounts.
        </div>
      </div>
    </div>
  );
};

export default VendorKYC;

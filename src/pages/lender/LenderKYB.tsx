import { useState, useEffect } from "react";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShieldCheck, Upload, CheckCircle2, Clock, XCircle, FileText, Loader2 } from "lucide-react";

const TIER_INFO = [
  { tier: 1, label: "Tier 1 — Micro-Lender", limit: "≤ $50,000", docs: "Business registration + license" },
  { tier: 2, label: "Tier 2 — Standard", limit: "≤ $500,000", docs: "Full KYB + audited financials + regulatory license + AML policy" },
  { tier: 3, label: "Tier 3 — Institutional", limit: "≤ $5,000,000", docs: "Enhanced KYB + capital adequacy + external audit + insurance" },
  { tier: 4, label: "Tier 4 — DFI / Sovereign", limit: "Unlimited", docs: "Custom KYB negotiated with TrustLock compliance" },
];

const DOC_TYPES = [
  { key: "business_registration", label: "Business Registration Certificate", required: true },
  { key: "lending_license", label: "Lending / Regulatory License", required: true },
  { key: "audited_financials", label: "Audited Financial Statements", required: false },
  { key: "aml_policy", label: "AML / Compliance Policy Document", required: false },
  { key: "board_resolution", label: "Board Resolution (for Tier 3+)", required: false },
  { key: "capital_adequacy", label: "Capital Adequacy Proof", required: false },
  { key: "insurance_coverage", label: "Insurance Coverage Certificate", required: false },
  { key: "external_audit", label: "External Audit Report", required: false },
];

const LenderKYB = () => {
  const { user } = useAuth();
  const [kybEntry, setKybEntry] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadKYB();
  }, [user]);

  const loadKYB = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lender_kyb_queue")
      .select("*")
      .eq("lender_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setKybEntry(data);
      setDocs((data.submitted_documents as Record<string, string>) || {});
    }
    setLoading(false);
  };

  const handleUpload = async (docKey: string, file: File) => {
    if (!user) return;
    setUploading(docKey);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/kyb/${docKey}.${ext}`;

    const { error } = await supabase.storage.from("lender-assets").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(null); return; }

    const { data: urlData } = await supabase.storage.from("lender-assets").createSignedUrl(path, 60 * 60 * 24 * 365);

    setDocs(prev => ({ ...prev, [docKey]: urlData?.signedUrl || path }));
    toast.success(`${docKey.replace(/_/g, " ")} uploaded`);
    setUploading(null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const requiredMissing = DOC_TYPES.filter(d => d.required && !docs[d.key]);
    if (requiredMissing.length > 0) {
      toast.error(`Missing required: ${requiredMissing.map(d => d.label).join(", ")}`);
      return;
    }

    setSubmitting(true);

    if (kybEntry) {
      await supabase
        .from("lender_kyb_queue")
        .update({ submitted_documents: docs as any, status: "pending" })
        .eq("id", kybEntry.id);
    } else {
      await supabase
        .from("lender_kyb_queue")
        .insert({ lender_id: user.id, submitted_documents: docs as any, status: "pending" });
    }

    toast.success("KYB documents submitted for review");
    setSubmitting(false);
    loadKYB();
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
    if (status === "rejected") return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1 text-xs"><XCircle className="w-3 h-3" />Rejected</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1 text-xs"><Clock className="w-3 h-3" />Pending Review</Badge>;
  };

  if (loading) return <div><LenderHeader title="KYB Verification" /><div className="p-6 text-center text-sm text-muted-foreground">Loading...</div></div>;

  return (
    <div>
      <LenderHeader title="KYB Verification" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-foreground">Know Your Business</h2>
          {kybEntry && statusBadge(kybEntry.status)}
          {kybEntry?.approved_tier && (
            <Badge variant="outline" className="text-xs">Tier {kybEntry.approved_tier}</Badge>
          )}
        </div>

        {kybEntry?.status === "rejected" && kybEntry.review_notes && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 text-sm">
              <p className="font-medium text-destructive mb-1">Rejection Reason:</p>
              <p className="text-muted-foreground">{kybEntry.review_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Tier Overview */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tier System</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIER_INFO.map(t => (
                <div key={t.tier} className={`p-3 rounded-lg border border-border ${kybEntry?.approved_tier === t.tier ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
                  <p className="text-xs font-medium text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">Limit: {t.limit}</p>
                  <p className="text-[10px] text-muted-foreground">{t.docs}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        {kybEntry?.status !== "approved" && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Upload KYB Documents</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {DOC_TYPES.map(doc => (
                <div key={doc.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{doc.label}</span>
                    {doc.required && <Badge variant="destructive" className="text-[8px] px-1 py-0">Required</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {docs[doc.key] ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-1" />Uploaded
                      </Badge>
                    ) : null}
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleUpload(doc.key, e.target.files[0])}
                        disabled={uploading === doc.key}
                      />
                      <Button variant="outline" size="sm" className="text-xs h-7 pointer-events-none" asChild>
                        <span>
                          {uploading === doc.key ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                          {docs[doc.key] ? "Replace" : "Upload"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              ))}

              <Button className="w-full mt-4" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {kybEntry ? "Resubmit KYB Documents" : "Submit for Verification"}
              </Button>
            </CardContent>
          </Card>
        )}

        {kybEntry?.status === "approved" && (
          <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">KYB Verified</h3>
              <p className="text-sm text-muted-foreground">Your institution has been verified and assigned <strong>{TIER_INFO.find(t => t.tier === kybEntry.approved_tier)?.label || `Tier ${kybEntry.approved_tier}`}</strong>.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LenderKYB;

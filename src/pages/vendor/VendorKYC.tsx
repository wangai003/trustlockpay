import { useState, useEffect, useRef, useCallback } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Upload, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TLId from "@/components/shared/TLId";

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

interface KycDoc {
  id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
  file_url: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const MOCK_DOCS: KycDoc[] = [
  { id: "m1", name: "Government ID", status: "approved", file_url: null, created_at: "2026-01-15T00:00:00Z", reviewed_at: "2026-01-16T00:00:00Z" },
  { id: "m2", name: "Business Registration", status: "approved", file_url: null, created_at: "2026-02-01T00:00:00Z", reviewed_at: "2026-02-03T00:00:00Z" },
  { id: "m3", name: "Bank Statement", status: "pending", file_url: null, created_at: "2026-03-10T00:00:00Z", reviewed_at: null },
];

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const VendorKYC = () => {
  const { vendor } = useVendor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<KycDoc[]>([]);
  const [isMainnet, setIsMainnet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchDocs = useCallback(async (uid: string) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-kyc`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: "get_vendor_kyc" }),
        }
      );
      const data = await res.json();
      if (data.success && data.documents) {
        setDocuments(
          data.documents.map((d: any) => ({
            id: d.id,
            name: d.name,
            status: (d.status || "pending") as KycDoc["status"],
            file_url: d.file_url,
            created_at: d.created_at,
            reviewed_at: d.reviewed_at,
          }))
        );
      }
    } catch {
      // Fallback to direct query
      const { data, error } = await supabase
        .from("kyc_documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setDocuments(
          data.map((d) => ({
            id: d.id,
            name: d.name,
            status: (d.status || "pending") as KycDoc["status"],
            file_url: d.file_url,
            created_at: d.created_at,
            reviewed_at: d.reviewed_at,
          }))
        );
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsMainnet(true);
        setUserId(session.user.id);
        await fetchDocs(session.user.id);
      } else {
        setDocuments(MOCK_DOCS);
      }
    };
    init();
  }, [fetchDocs]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPEG, and PNG files are accepted.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 10MB limit.");
      return;
    }

    const docName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");

    if (!isMainnet || !userId) {
      // Testnet mock
      const newDoc: KycDoc = {
        id: `mock-${Date.now()}`,
        name: docName,
        status: "pending",
        file_url: null,
        created_at: new Date().toISOString(),
        reviewed_at: null,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      toast.success("Document submitted (testnet)");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. Upload to storage bucket
      const filePath = `${userId}/${Date.now()}-${file.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(60);

      // 2. Get public URL (signed since bucket is private)
      const { data: urlData } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = urlData?.signedUrl || filePath;
      setUploadProgress(80);

      // 3. Call manage-kyc submit_document
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-kyc`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: "submit_document",
            document_name: docName,
            file_url: fileUrl,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed");

      setUploadProgress(100);
      toast.success("Document submitted for review");

      // Refresh list
      await fetchDocs(userId);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
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

        {/* Upload Progress */}
        {uploading && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium mb-1">Uploading document…</p>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Submitted Documents</CardTitle>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleUpload} disabled={uploading}>
                <Upload className="w-3 h-3" /> Upload New
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => {
                const cfg = docStatusConfig[doc.status] || docStatusConfig.pending;
                const dateStr = doc.reviewed_at
                  ? new Date(doc.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                return (
                  <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                    <cfg.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{doc.name}</span>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
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

import { useState, useEffect, useRef, useCallback } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldCheck, Upload, CheckCircle, Clock, AlertTriangle, Loader2,
  Camera, CreditCard, User, Video, HelpCircle, FileText, Building2, Users, Plus, Trash2
} from "lucide-react";
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

const selfieMatchColors: Record<string, string> = {
  match: "bg-primary/15 text-primary",
  mismatch: "bg-destructive/15 text-destructive",
  pending: "bg-accent/15 text-accent-foreground",
};

interface KycDoc {
  id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
  file_url: string | null;
  created_at: string;
  reviewed_at: string | null;
  document_category?: string;
  selfie_match_status?: string;
}

const MOCK_DOCS: KycDoc[] = [
  { id: "m1", name: "Government ID", status: "approved", file_url: null, created_at: "2026-01-15T00:00:00Z", reviewed_at: "2026-01-16T00:00:00Z", document_category: "government_id" },
  { id: "m2", name: "Selfie with ID", status: "approved", file_url: null, created_at: "2026-01-15T00:00:00Z", reviewed_at: "2026-01-16T00:00:00Z", document_category: "selfie_with_id", selfie_match_status: "match" },
  { id: "m3", name: "Business Registration", status: "approved", file_url: null, created_at: "2026-02-01T00:00:00Z", reviewed_at: "2026-02-03T00:00:00Z", document_category: "business_registration" },
  { id: "m4", name: "Bank Statement", status: "pending", file_url: null, created_at: "2026-03-10T00:00:00Z", reviewed_at: null, document_category: "bank_statement" },
];

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type UploadCategory = "government_id" | "selfie_with_id" | "business_registration" | "bank_statement" | "other";

const UPLOAD_CATEGORIES: { key: UploadCategory; label: string; icon: typeof CreditCard; desc: string }[] = [
  { key: "government_id", label: "Government ID", icon: CreditCard, desc: "Passport, national ID, or driver's license" },
  { key: "selfie_with_id", label: "Selfie Holding ID", icon: Camera, desc: "Take a photo of yourself holding your ID next to your face" },
  { key: "business_registration", label: "Business Registration", icon: FileText, desc: "Certificate of incorporation or business license" },
  { key: "bank_statement", label: "Bank Statement", icon: FileText, desc: "Recent bank statement (within 3 months)" },
];

const VendorKYC = () => {
  const { vendor } = useVendor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<KycDoc[]>([]);
  const [isMainnet, setIsMainnet] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<UploadCategory | null>(null);

  // Knowledge-based verification
  const [showVerification, setShowVerification] = useState(false);
  const [verificationAnswers, setVerificationAnswers] = useState({
    id_number: "",
    date_of_birth: "",
    full_name_on_id: "",
  });
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  // Business KYC state
  const [businessProfile, setBusinessProfile] = useState({
    company_legal_name: "",
    trading_name: "",
    registration_number: "",
    tax_id: "",
    incorporation_date: "",
    jurisdiction: "",
    business_type: "limited_company",
    registered_address: "",
    business_activity_description: "",
    signatory_name: "",
    signatory_title: "",
  });
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null);
  const [businessSaved, setBusinessSaved] = useState(false);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [ubos, setUbos] = useState<{ id?: string; full_name: string; nationality: string; date_of_birth: string; ownership_percentage: number; address: string }[]>([]);
  const [uboSaving, setUboSaving] = useState(false);
  const sigFileRef = useRef<HTMLInputElement>(null);

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
            document_category: d.document_category || "other",
            selfie_match_status: d.selfie_match_status || "pending",
          }))
        );
      }
    } catch {
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
            document_category: (d as any).document_category || "other",
            selfie_match_status: (d as any).selfie_match_status || "pending",
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

  const handleCategoryUpload = (category: UploadCategory) => {
    setSelectedCategory(category);
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

    const category = selectedCategory || "other";
    const categoryLabels: Record<string, string> = {
      government_id: "Government ID",
      selfie_with_id: "Selfie with ID",
      business_registration: "Business Registration",
      bank_statement: "Bank Statement",
      other: file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
    };
    const docName = categoryLabels[category] || file.name;

    if (!isMainnet || !userId) {
      const newDoc: KycDoc = {
        id: `mock-${Date.now()}`,
        name: docName,
        status: "pending",
        file_url: null,
        created_at: new Date().toISOString(),
        reviewed_at: null,
        document_category: category,
        selfie_match_status: category === "selfie_with_id" ? "pending" : undefined,
      };
      setDocuments((prev) => [newDoc, ...prev]);
      toast.success("Document submitted (testnet)");

      // Show verification questions after ID + selfie uploaded
      if (category === "selfie_with_id") {
        setShowVerification(true);
      }
      setSelectedCategory(null);
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      const filePath = `${userId}/${Date.now()}-${category}-${file.name}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      setUploadProgress(60);

      const { data: urlData } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      const fileUrl = urlData?.signedUrl || filePath;
      setUploadProgress(80);

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
            document_category: category,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed");

      setUploadProgress(100);
      toast.success("Document submitted for review");

      if (category === "selfie_with_id") {
        setShowVerification(true);
      }

      await fetchDocs(userId);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedCategory(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleVerificationSubmit = async () => {
    const { id_number, date_of_birth, full_name_on_id } = verificationAnswers;
    if (!id_number.trim() || !date_of_birth.trim() || !full_name_on_id.trim()) {
      toast.error("Please fill in all verification fields.");
      return;
    }

    if (isMainnet && userId) {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-kyc`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              action: "submit_verification_answers",
              answers: verificationAnswers,
            }),
          }
        );
      } catch {
        // Non-blocking — answers stored regardless
      }
    }

    setVerificationSubmitted(true);
    toast.success("Verification answers submitted. Admin will cross-check against your documents.");
  };

  const hasGovId = documents.some(d => d.document_category === "government_id");
  const hasSelfie = documents.some(d => d.document_category === "selfie_with_id");
  const missingRequired = !hasGovId || !hasSelfie;

  const categoryIcon = (cat?: string) => {
    switch (cat) {
      case "government_id": return <CreditCard className="w-4 h-4 text-primary" />;
      case "selfie_with_id": return <Camera className="w-4 h-4 text-accent-foreground" />;
      case "business_registration": return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "bank_statement": return <FileText className="w-4 h-4 text-muted-foreground" />;
      default: return <FileText className="w-4 h-4 text-muted-foreground" />;
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

        {/* Required Documents Checklist */}
        {missingRequired && (
          <Card className="border-accent/30 bg-accent/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent-foreground" />
                <CardTitle className="text-sm">Required for Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                {hasGovId ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className={hasGovId ? "text-primary" : ""}>Government-issued Photo ID</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {hasSelfie ? <CheckCircle className="w-3.5 h-3.5 text-primary" /> : <Clock className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className={hasSelfie ? "text-primary" : ""}>Selfie holding your ID next to your face</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Both documents are mandatory. The selfie must clearly show your face and the ID side-by-side.
              </p>
            </CardContent>
          </Card>
        )}

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

        {/* Upload by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Documents</CardTitle>
            <CardDescription className="text-xs">Select a document type below to upload</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPLOAD_CATEGORIES.map(cat => {
                const alreadyUploaded = documents.some(d => d.document_category === cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryUpload(cat.key)}
                    disabled={uploading}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                      alreadyUploaded
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      alreadyUploaded ? "bg-primary/15" : "bg-muted"
                    }`}>
                      <cat.icon className={`w-4 h-4 ${alreadyUploaded ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{cat.label}</span>
                        {alreadyUploaded && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={onFileChange}
            />
          </CardContent>
        </Card>

        {/* Knowledge-Based Verification */}
        {(showVerification || (hasGovId && hasSelfie)) && !verificationSubmitted && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Identity Verification Questions</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Answer these questions based on the ID you uploaded. Admin will cross-check your answers against the document.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name_on_id" className="text-xs">Full legal name (exactly as shown on your ID)</Label>
                <Input
                  id="full_name_on_id"
                  placeholder="e.g. John Kwame Mensah"
                  value={verificationAnswers.full_name_on_id}
                  onChange={e => setVerificationAnswers(p => ({ ...p, full_name_on_id: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_number" className="text-xs">ID / Passport number</Label>
                <Input
                  id="id_number"
                  placeholder="e.g. GHA-1234567890"
                  value={verificationAnswers.id_number}
                  onChange={e => setVerificationAnswers(p => ({ ...p, id_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-xs">Date of birth (as on your ID)</Label>
                <Input
                  id="dob"
                  type="date"
                  value={verificationAnswers.date_of_birth}
                  onChange={e => setVerificationAnswers(p => ({ ...p, date_of_birth: e.target.value }))}
                />
              </div>
              <Button onClick={handleVerificationSubmit} className="w-full gap-2">
                <ShieldCheck className="w-4 h-4" /> Submit Verification Answers
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Your answers are encrypted and only visible to compliance administrators.
              </p>
            </CardContent>
          </Card>
        )}

        {verificationSubmitted && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Verification answers submitted</p>
                <p className="text-[10px] text-muted-foreground">Admin will cross-check your answers against your uploaded documents.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submitted Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Submitted Documents</CardTitle>
              <TLId code="TL-V-KYC-BTN-SUBMIT" inline>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                  setSelectedCategory("other");
                  fileInputRef.current?.click();
                }} disabled={uploading}>
                  <Upload className="w-3 h-3" /> Upload Other
                </Button>
              </TLId>
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
                    {categoryIcon(doc.document_category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{doc.name}</span>
                        {doc.document_category === "selfie_with_id" && doc.selfie_match_status && (
                          <Badge className={`text-[9px] ${selfieMatchColors[doc.selfie_match_status] || ""}`}>
                            {doc.selfie_match_status === "match" ? "✓ Face Match" :
                             doc.selfie_match_status === "mismatch" ? "✗ Mismatch" : "Pending Review"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{dateStr}</p>
                    </div>
                    <Badge className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Video Call Info for Tier 3 */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Video Call Verification (Tier 3)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  For Enterprise tier or transactions above $25,000, admin may schedule a brief video call where you show your ID on camera. You'll receive a notification when this is requested.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">To reach Tier 3 (Enterprise):</strong> Submit all required documents, complete the selfie verification, and pass the due diligence review.
              </p>
              <Button
                size="sm"
                className="mt-2"
                disabled={uploading || documents.filter(d => d.status === "approved").length < 3}
                onClick={async () => {
                  try {
                    const session = (await supabase.auth.getSession()).data.session;
                    if (!session) {
                      toast.info("Tier upgrade request submitted (testnet simulation)");
                      return;
                    }
                    const res = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-kyc`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ action: "request_tier_upgrade", target_tier: "tier3" }),
                      }
                    );
                    const data = await res.json();
                    if (data.success) {
                      toast.success("Tier 3 upgrade request submitted for admin review.");
                    } else {
                      toast.error(data.error || "Upgrade request failed");
                    }
                  } catch {
                    toast.error("Failed to submit upgrade request");
                  }
                }}
              >
                Request Tier 3 Upgrade
              </Button>
              {documents.filter(d => d.status === "approved").length < 3 && (
                <p className="text-[10px] text-muted-foreground mt-1">You need at least 3 approved documents to request a tier upgrade.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorKYC;

import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck, AlertTriangle, CheckCircle, Clock, Eye, UserCheck, XCircle,
  Shield, Search, Globe, Ban, FileWarning, Activity, ThumbsUp, ThumbsDown, Loader2,
  FileText, ExternalLink, ChevronDown, ChevronUp, Camera, Video, HelpCircle, User,
  Building2, Users,
} from "lucide-react";
import { useKycQueue, useComplianceFlags, useSanctionsScreeningLogs, useKycDocuments } from "@/hooks/useSupabaseData";
import { useAdmin } from "@/contexts/AdminContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const severityColors: Record<string, string> = {
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  approved: { label: "Approved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: XCircle },
};

const screeningResultColors: Record<string, string> = {
  clear: "bg-primary/15 text-primary",
  blocked: "bg-destructive text-destructive-foreground",
  edd_required: "bg-accent/15 text-accent-foreground",
  flagged: "bg-destructive/15 text-destructive",
};

const selfieMatchColors: Record<string, string> = {
  match: "bg-primary/15 text-primary",
  mismatch: "bg-destructive/15 text-destructive",
  pending: "bg-accent/15 text-accent-foreground",
};

const TESTNET_SCREENING_LOGS = [
  {
    id: "SCR-7K2M9X",
    timestamp: "2026-03-26T09:14:00Z",
    type: "checkout" as const,
    buyer: "Kwame Mensah",
    buyerCountry: "GH",
    vendor: "DubaGold Exports Ltd",
    vendorCountry: "AE",
    amount: 24500,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "clear" as const,
    eddTriggered: true,
    notes: "Amount exceeds $3,000 EDD threshold. KYC on file. Cleared.",
  },
  {
    id: "SCR-3F8NQP",
    timestamp: "2026-03-25T15:42:00Z",
    type: "standalone" as const,
    buyer: "Unknown (P2P Link)",
    buyerCountry: "IR",
    vendor: "Sahara Minerals Co.",
    vendorCountry: "ZA",
    amount: 8700,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "blocked" as const,
    eddTriggered: false,
    notes: "BLOCKED — Iran (IR) is on the OFAC/EU/UN sanctions list. Transaction denied. Logged for audit.",
  },
  {
    id: "SCR-9A1LVD",
    timestamp: "2026-03-25T11:05:00Z",
    type: "checkout" as const,
    buyer: "Jean-Pierre Kabila",
    buyerCountry: "CD",
    vendor: "AgriTrade Kenya",
    vendorCountry: "KE",
    amount: 1250,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "flagged" as const,
    eddTriggered: false,
    notes: "DR Congo (CD) partial sanctions — flagged for manual review. Amount below EDD threshold.",
  },
  {
    id: "SCR-5H7BWX",
    timestamp: "2026-03-24T08:33:00Z",
    type: "checkout" as const,
    buyer: "Sarah Johnson",
    buyerCountry: "US",
    vendor: "TechParts Nigeria",
    vendorCountry: "NG",
    amount: 450,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "clear" as const,
    eddTriggered: false,
    notes: "All lists clear. Standard transaction.",
  },
  {
    id: "SCR-2C6RYZ",
    timestamp: "2026-03-23T17:20:00Z",
    type: "standalone" as const,
    buyer: "Alexei Petrov",
    buyerCountry: "RU",
    vendor: "GoldVault LLC",
    vendorCountry: "AE",
    amount: 52000,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "blocked" as const,
    eddTriggered: false,
    notes: "BLOCKED — Russia (RU) is on OFAC/EU sanctions list. High-value ($52,000) transaction denied. Escalation required.",
  },
  {
    id: "SCR-8D4KMT",
    timestamp: "2026-03-22T13:55:00Z",
    type: "checkout" as const,
    buyer: "Mohammed Al-Rashid",
    buyerCountry: "AE",
    vendor: "Cape Town Agri",
    vendorCountry: "ZA",
    amount: 15800,
    listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
    result: "edd_required" as const,
    eddTriggered: true,
    notes: "Amount exceeds $10,000 high-value threshold. EDD completed. Monitoring active. Approved after review.",
  },
];

const AdminCompliance = () => {
  const { isTestnet } = useAdmin();
  const { data: rawKyc = [] } = useKycQueue();
  const { data: rawFlags = [] } = useComplianceFlags();
  const { data: rawScreenings = [] } = useSanctionsScreeningLogs();
  const { data: allKycDocs = [] } = useKycDocuments();
  const [screeningFilter, setScreeningFilter] = useState<string>("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [selfieDecisions, setSelfieDecisions] = useState<Record<string, string>>({});
  const [videoCallNotes, setVideoCallNotes] = useState<Record<string, string>>({});
  const [businessProfiles, setBusinessProfiles] = useState<Record<string, any>>({});
  const [ubosByBiz, setUbosByBiz] = useState<Record<string, any[]>>({});
  const queryClient = useQueryClient();

  // Fetch business KYC profiles when a vendor row is expanded
  const fetchBusinessKyc = async (vendorId: string) => {
    if (businessProfiles[vendorId]) return;
    const { data: biz } = await supabase.from("business_kyc_profiles").select("*").eq("vendor_id", vendorId).maybeSingle();
    if (biz) {
      setBusinessProfiles(p => ({ ...p, [vendorId]: biz }));
      const { data: uboData } = await supabase.from("ubo_declarations").select("*").eq("business_kyc_id", biz.id);
      if (uboData) setUbosByBiz(p => ({ ...p, [vendorId]: uboData }));
    } else {
      setBusinessProfiles(p => ({ ...p, [vendorId]: null }));
    }
  };

  const handleKycDecision = async (queueId: string, decision: "approved" | "rejected") => {
    setReviewingId(queueId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-kyc", {
        body: { action: "review_document", queue_id: queueId, decision },
      });
      if (error) throw error;
      toast.success(`KYC ${decision === "approved" ? "approved ✅" : "rejected ❌"} — user and held transactions updated.`);
      queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update KYC status");
    } finally {
      setReviewingId(null);
    }
  };

  const handleSelfieDecision = async (docId: string, status: "match" | "mismatch") => {
    setSelfieDecisions(p => ({ ...p, [docId]: "loading" }));
    try {
      const { error } = await supabase
        .from("kyc_documents")
        .update({ selfie_match_status: status } as any)
        .eq("id", docId);
      if (error) throw error;
      setSelfieDecisions(p => ({ ...p, [docId]: status }));
      toast.success(status === "match" ? "Selfie confirmed as matching ✅" : "Selfie flagged as mismatch ❌");
      queryClient.invalidateQueries({ queryKey: ["kyc-documents"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update selfie status");
      setSelfieDecisions(p => ({ ...p, [docId]: "" }));
    }
  };

  const handleRequestVideoCall = async (queueId: string, vendorName: string) => {
    try {
      const { error } = await supabase
        .from("kyc_queue")
        .update({ video_call_requested: true } as any)
        .eq("id", queueId);
      if (error) throw error;
      toast.success(`Video call requested for ${vendorName}. User will be notified.`);
      queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to request video call");
    }
  };

  const handleCompleteVideoCall = async (queueId: string) => {
    const notes = videoCallNotes[queueId] || "";
    try {
      const { error } = await supabase
        .from("kyc_queue")
        .update({
          video_call_completed_at: new Date().toISOString(),
          video_call_notes: notes,
        } as any)
        .eq("id", queueId);
      if (error) throw error;
      toast.success("Video call marked as completed ✅");
      queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update video call status");
    }
  };

  const kycQueue = rawKyc.map(k => ({
    id: k.kyc_id,
    queueId: k.id,
    vendorId: k.vendor_id,
    vendor: k.vendor_name || "Unknown",
    tier: k.tier_change || "—",
    docs: k.documents || "—",
    submitted: new Date(k.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: (k.status || "pending") as "pending" | "approved" | "rejected",
    videoCallRequested: (k as any).video_call_requested || false,
    videoCallCompletedAt: (k as any).video_call_completed_at || null,
    videoCallNotes: (k as any).video_call_notes || "",
    verificationMethod: (k as any).verification_method || "standard",
  }));

  const flaggedActivity = rawFlags.map(f => ({
    id: f.flag_id,
    type: f.type,
    desc: f.description || "—",
    severity: (f.severity || "medium") as "medium" | "high" | "critical",
    date: new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }));

  const screeningLogs = (!isTestnet && rawScreenings.length > 0)
    ? rawScreenings.map(s => ({
        id: s.id.slice(0, 10).toUpperCase(),
        timestamp: s.created_at,
        type: "checkout" as const,
        buyer: s.full_name,
        buyerCountry: s.country,
        vendor: "—",
        vendorCountry: "—",
        amount: Number(s.risk_score || 0),
        listsChecked: ["OFAC SDN", "EU Consolidated", "UN Security Council"],
        result: s.result as "clear" | "blocked" | "edd_required" | "flagged",
        eddTriggered: s.result === "edd_required",
        notes: (s as any).admin_notes || `Screening result: ${s.result}`,
      }))
    : TESTNET_SCREENING_LOGS;

  const pendingCount = kycQueue.filter(k => k.status === "pending").length;
  const approvedCount = kycQueue.filter(k => k.status === "approved").length;
  const rejectedCount = kycQueue.filter(k => k.status === "rejected").length;

  const filteredScreenings = screeningFilter === "all"
    ? screeningLogs
    : screeningLogs.filter(s => s.result === screeningFilter);

  const blockedCount = screeningLogs.filter(s => s.result === "blocked").length;
  const eddCount = screeningLogs.filter(s => s.eddTriggered).length;
  const clearCount = screeningLogs.filter(s => s.result === "clear").length;

  return (
    <div>
      <AdminHeader title="Compliance & KYC" />
      <div className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending KYC Reviews", value: String(pendingCount), icon: Clock },
            { label: "Approved (30d)", value: String(approvedCount), icon: CheckCircle },
            { label: "Rejected (30d)", value: String(rejectedCount), icon: XCircle },
            { label: "Active Flags", value: String(flaggedActivity.length), icon: AlertTriangle },
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

        <Tabs defaultValue="screening" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="screening" className="gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5" /> AML & Sanctions Gate
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-1.5 text-xs">
              <UserCheck className="w-3.5 h-3.5" /> KYC Queue
            </TabsTrigger>
            <TabsTrigger value="flags" className="gap-1.5 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Flagged Activity
            </TabsTrigger>
          </TabsList>

          {/* ─── AML & Sanctions Screening Gate ─── */}
          <TabsContent value="screening" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">AML & Sanctions Screening Gate</CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Every checkout & standalone link is auto-screened against OFAC, EU, and UN lists before payment.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">TESTNET</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Screenings", value: TESTNET_SCREENING_LOGS.length, icon: Activity, color: "text-primary" },
                    { label: "Cleared", value: clearCount, icon: ShieldCheck, color: "text-primary" },
                    { label: "Blocked", value: blockedCount, icon: Ban, color: "text-destructive" },
                    { label: "EDD Triggered", value: eddCount, icon: FileWarning, color: "text-accent-foreground" },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="text-lg font-bold">{s.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "all", label: "All" },
                    { key: "clear", label: "Cleared" },
                    { key: "blocked", label: "Blocked" },
                    { key: "edd_required", label: "EDD Required" },
                    { key: "flagged", label: "Flagged" },
                  ].map(f => (
                    <Button
                      key={f.key}
                      variant={screeningFilter === f.key ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setScreeningFilter(f.key)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>

                <div className="space-y-3">
                  {filteredScreenings.map(s => (
                    <div
                      key={s.id}
                      className={`rounded-lg border p-4 space-y-2.5 transition-colors ${
                        s.result === "blocked"
                          ? "border-destructive/30 bg-destructive/5"
                          : s.result === "flagged"
                          ? "border-destructive/20 bg-destructive/[0.02]"
                          : s.result === "edd_required"
                          ? "border-accent/30 bg-accent/5"
                          : "border-border hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{s.id}</span>
                          <Badge className={`text-[10px] ${screeningResultColors[s.result]}`}>
                            {s.result === "clear" ? "CLEARED" : s.result === "blocked" ? "BLOCKED" : s.result === "edd_required" ? "EDD REQUIRED" : "FLAGGED"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {s.type === "checkout" ? "Widget Checkout" : "Standalone Link"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.timestamp).toLocaleString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Buyer:</span>
                          <span className="font-medium">{s.buyer}</span>
                          <Badge variant="outline" className={`text-[9px] ${
                            ["IR","RU","KP","SY","CU","BY","MM","SD","SO","YE","LY","CF","CD","LB"].includes(s.buyerCountry)
                              ? "border-destructive/40 text-destructive" : ""
                          }`}>{s.buyerCountry}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Vendor:</span>
                          <span className="font-medium">{s.vendor}</span>
                          <Badge variant="outline" className="text-[9px]">{s.vendorCountry}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm font-bold">${s.amount.toLocaleString()}</span>
                        <div className="flex gap-1.5">
                          {s.listsChecked.map(l => (
                            <span key={l} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>

                      {s.eddTriggered && (
                        <div className="flex items-center gap-1.5 text-[10px] text-accent-foreground">
                          <FileWarning className="w-3 h-3" />
                          Enhanced Due Diligence triggered (amount &gt; $3,000)
                        </div>
                      )}

                      <div className="p-2 rounded bg-muted/40 border border-border">
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-semibold">System Log: </span>{s.notes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" /> TrustLock Offline Protocol
                  </p>
                  <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
                    <li><strong>Blocked transactions</strong> are logged and the user account is flagged for review. No manual admin action required — the gate prevents payment.</li>
                    <li><strong>Flagged/EDD transactions</strong> proceed but are monitored. Admin may be required to review evidence if a dispute arises.</li>
                    <li><strong>Repeat offenders</strong> (3+ blocked attempts) trigger automatic account suspension and regulatory filing notification.</li>
                    <li>All screening data is automatically stored in the compliance audit trail — no manual input needed.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── KYC Queue Tab ─── */}
          <TabsContent value="kyc">
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
                        const cfg = statusConfig[kyc.status] || statusConfig.pending;
                        const vendorDocs = allKycDocs.filter(d => d.vendor_id === kyc.vendorId);
                        const isExpanded = expandedVendor === kyc.queueId;
                        const selfieDocs = vendorDocs.filter(d => (d as any).document_category === "selfie_with_id");
                        const govIdDocs = vendorDocs.filter(d => (d as any).document_category === "government_id");
                        const hasSelfie = selfieDocs.length > 0;
                        const hasGovId = govIdDocs.length > 0;

                        return (
                          <>
                            <tr key={kyc.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                              <td className="p-4 font-mono text-xs">{kyc.id}</td>
                              <td className="p-4">
                                <div>
                                  <span className="font-medium">{kyc.vendor}</span>
                                  <div className="flex items-center gap-1 mt-1">
                                    {hasGovId && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                        <FileText className="w-2.5 h-2.5" /> ID
                                      </span>
                                    )}
                                    {hasSelfie && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground">
                                        <Camera className="w-2.5 h-2.5" /> Selfie
                                      </span>
                                    )}
                                    {kyc.videoCallRequested && (
                                      <span className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded ${
                                        kyc.videoCallCompletedAt ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"
                                      }`}>
                                        <Video className="w-2.5 h-2.5" /> {kyc.videoCallCompletedAt ? "Call Done" : "Call Pending"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 hidden md:table-cell text-muted-foreground text-xs">{kyc.tier}</td>
                              <td className="p-4 hidden lg:table-cell">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5 text-xs text-muted-foreground"
                                  onClick={() => { const next = isExpanded ? null : kyc.queueId; setExpandedVendor(next); if (next && kyc.vendorId) fetchBusinessKyc(kyc.vendorId); }}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  {vendorDocs.length} file{vendorDocs.length !== 1 ? "s" : ""}
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </Button>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                                  <cfg.icon className="w-3 h-3" /> {cfg.label}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                {kyc.status === "pending" ? (
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="gap-1 text-xs"
                                      disabled={reviewingId === kyc.queueId}
                                      onClick={() => handleKycDecision(kyc.queueId, "approved")}
                                    >
                                      {reviewingId === kyc.queueId ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="gap-1 text-xs"
                                      disabled={reviewingId === kyc.queueId}
                                      onClick={() => handleKycDecision(kyc.queueId, "rejected")}
                                    >
                                      {reviewingId === kyc.queueId ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
                                      Reject
                                    </Button>
                                    {!kyc.videoCallRequested && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1 text-xs"
                                        onClick={() => handleRequestVideoCall(kyc.queueId, kyc.vendor)}
                                      >
                                        <Video className="w-3 h-3" /> Video Call
                                      </Button>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">{kyc.status}</Badge>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${kyc.id}-docs`} className="bg-muted/10">
                                <td colSpan={6} className="p-4">
                                  {vendorDocs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center">No documents uploaded yet.</p>
                                  ) : (
                                    <div className="space-y-4">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Documents & Verification</p>
                                      
                                      {/* Document grid */}
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {vendorDocs.map(doc => {
                                          const category = (doc as any).document_category || "other";
                                          const isSelfie = category === "selfie_with_id";
                                          const currentSelfieStatus = selfieDecisions[doc.id] || (doc as any).selfie_match_status || "pending";

                                          return (
                                            <div key={doc.id} className={`p-3 rounded-lg border bg-background space-y-2 ${
                                              isSelfie ? "border-accent/30" : "border-border"
                                            }`}>
                                              <div className="flex items-center gap-3">
                                                {isSelfie ? <Camera className="w-4 h-4 text-accent-foreground shrink-0" /> :
                                                 category === "government_id" ? <FileText className="w-4 h-4 text-primary shrink-0" /> :
                                                 <FileText className="w-4 h-4 text-muted-foreground shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-xs font-medium truncate">{doc.name}</p>
                                                  <p className="text-[10px] text-muted-foreground">
                                                    {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    {" · "}
                                                    <Badge variant="outline" className="text-[9px] ml-1">
                                                      {category.replace(/_/g, " ")}
                                                    </Badge>
                                                  </p>
                                                </div>
                                                {doc.file_url && (
                                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                                    <Button variant="outline" size="sm" className="gap-1 text-xs">
                                                      <ExternalLink className="w-3 h-3" /> View
                                                    </Button>
                                                  </a>
                                                )}
                                              </div>

                                              {/* Selfie match controls */}
                                              {isSelfie && (
                                                <div className="pt-2 border-t border-border space-y-2">
                                                  <p className="text-[10px] font-semibold text-muted-foreground">
                                                    <Camera className="w-3 h-3 inline mr-1" />
                                                    Does the selfie match the Government ID photo?
                                                  </p>
                                                  {currentSelfieStatus === "loading" ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                  ) : currentSelfieStatus === "match" || currentSelfieStatus === "mismatch" ? (
                                                    <Badge className={`text-[10px] ${selfieMatchColors[currentSelfieStatus]}`}>
                                                      {currentSelfieStatus === "match" ? "✓ Confirmed Match" : "✗ Mismatch Flagged"}
                                                    </Badge>
                                                  ) : (
                                                    <div className="flex gap-2">
                                                      <Button size="sm" variant="default" className="gap-1 text-xs" onClick={() => handleSelfieDecision(doc.id, "match")}>
                                                        <CheckCircle className="w-3 h-3" /> Match
                                                      </Button>
                                                      <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => handleSelfieDecision(doc.id, "mismatch")}>
                                                        <XCircle className="w-3 h-3" /> Mismatch
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Verification answers preview */}
                                      {vendorDocs.some(d => (d as any).verification_answers && Object.keys((d as any).verification_answers).length > 0) && (
                                        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                                          <p className="text-[10px] font-semibold text-primary flex items-center gap-1">
                                            <HelpCircle className="w-3 h-3" /> Knowledge-Based Verification Answers
                                          </p>
                                          {vendorDocs.filter(d => (d as any).verification_answers && Object.keys((d as any).verification_answers).length > 0).map(d => {
                                            const answers = (d as any).verification_answers || {};
                                            return (
                                              <div key={`ans-${d.id}`} className="text-xs space-y-1">
                                                {answers.full_name_on_id && <p><span className="text-muted-foreground">Name on ID:</span> <strong>{answers.full_name_on_id}</strong></p>}
                                                {answers.id_number && <p><span className="text-muted-foreground">ID Number:</span> <strong>{answers.id_number}</strong></p>}
                                                {answers.date_of_birth && <p><span className="text-muted-foreground">DOB:</span> <strong>{answers.date_of_birth}</strong></p>}
                                              </div>
                                            );
                                          })}
                                          <p className="text-[9px] text-muted-foreground">Cross-check these against the uploaded ID document before approving.</p>
                                        </div>
                                      )}

                                      {/* Video call section */}
                                      {kyc.videoCallRequested && (
                                        <div className="p-3 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
                                          <p className="text-[10px] font-semibold text-accent-foreground flex items-center gap-1">
                                            <Video className="w-3 h-3" /> Video Call Verification
                                          </p>
                                          {kyc.videoCallCompletedAt ? (
                                            <div className="space-y-1">
                                              <Badge className="text-[10px] bg-primary/15 text-primary">✓ Completed</Badge>
                                              {kyc.videoCallNotes && <p className="text-xs text-muted-foreground">{kyc.videoCallNotes}</p>}
                                            </div>
                                          ) : (
                                            <div className="space-y-2">
                                              <p className="text-xs text-muted-foreground">Video call requested. After completing the call, add notes below:</p>
                                              <Textarea
                                                placeholder="Notes from video call (e.g., ID confirmed, face matches, concerns...)"
                                                className="text-xs min-h-[60px]"
                                                value={videoCallNotes[kyc.queueId] || ""}
                                                onChange={e => setVideoCallNotes(p => ({ ...p, [kyc.queueId]: e.target.value }))}
                                              />
                                              <Button size="sm" className="gap-1 text-xs" onClick={() => handleCompleteVideoCall(kyc.queueId)}>
                                                <CheckCircle className="w-3 h-3" /> Mark Call Complete
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Flagged Activity Tab ─── */}
          <TabsContent value="flags">
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
                      <Badge className={`text-[10px] shrink-0 mt-0.5 ${severityColors[flag.severity] || ""}`}>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminCompliance;

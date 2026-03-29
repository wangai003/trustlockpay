import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink, Clock, Eye, Shield, Handshake, FolderArchive, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentUpload from "@/components/shared/DocumentUpload";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TLId from "@/components/shared/TLId";

const docs = [
  { title: "Buyer Protection Policy", desc: "How TrustLock escrow protects your funds. Auto-release rules, dispute rights, and refund procedures.", updated: "Mar 2026" },
  { title: "How Escrow Works", desc: "Step-by-step guide: pay → funds locked → vendor ships → you confirm → funds released.", updated: "Mar 2026" },
  { title: "Dispute Filing Guide", desc: "How to file a dispute, what evidence to provide, and expected timelines for resolution.", updated: "Mar 2026" },
  { title: "Auto-Release Disclosure", desc: "If you don't confirm or dispute within 48 hours of delivery, funds auto-release to the vendor.", updated: "Mar 2026" },
  { title: "Fee Schedule", desc: "Buyer fees: 0% on most transactions. Premium insurance available for high-value purchases.", updated: "Feb 2026" },
];

const BuyerDocuments = () => {
  const navigate = useNavigate();
  const [showAckPreview, setShowAckPreview] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [previewIndustry, setPreviewIndustry] = useState("default");

  const handleDownloadForm = () => {
    navigate(`/trustlock/buyer/os-pay?service=${encodeURIComponent(`Acknowledgement Form Download`)}&amount=0.50`);
  };

  return (
    <div>
      <BuyerHeader title="Documents" />
      <div className="p-3 sm:p-6 space-y-6">
        <TLId code="TL-B-DOC-UPL-MAIN">
        <DocumentUpload label="Upload Documents (Receipts, Photos, Evidence)" />
        </TLId>

        {/* ── Acknowledgement Form Preview ─── */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-sm">Escrow Acknowledgement Form</CardTitle>
                  <CardDescription className="text-[10px]">Preview the form you'll sign before your funds are locked.</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <TLId code="TL-B-DOC-BTN-ACK-PDF" inline>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadForm}>
                  <Download className="w-3 h-3" /> PDF <Badge variant="secondary" className="text-[9px] ml-1">$0.50</Badge>
                </Button>
                </TLId>
                <TLId code="TL-B-DOC-BTN-ACK-PREVIEW" inline>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAckPreview(!showAckPreview)}>
                  <Eye className="w-3 h-3" />
                  {showAckPreview ? "Hide" : "Preview"}
                </Button>
                </TLId>
              </div>
                </Button>
              </div>
            </div>
          </CardHeader>
          {showAckPreview && (
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Industry:</span>
                <Select value={previewIndustry} onValueChange={setPreviewIndustry}>
                  <SelectTrigger className="w-44 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">General</SelectItem>
                    <SelectItem value="e-commerce">E-Commerce</SelectItem>
                    <SelectItem value="real-estate">Real Estate</SelectItem>
                    <SelectItem value="professional-services">Professional Services</SelectItem>
                    <SelectItem value="agriculture-cargo">Agriculture & Cargo</SelectItem>
                    <SelectItem value="mining-minerals">Mining & Minerals</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="logistics-freight">Logistics & Freight</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-[10px]">Preview</Badge>
              </div>
              <AcknowledgementForm
                industry={previewIndustry}
                orderAmount={5000}
                buyerName="You"
                vendorName="Sample Vendor"
                txId="TL-PREVIEW"
                onAccept={() => {}}
              />
            </CardContent>
          )}
        </Card>

        {/* ── Pre-Order Signatory Contract ─── */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake className="w-5 h-5 text-primary" />
                <div>
                  <CardTitle className="text-sm">Pre-Order Signatory Contract</CardTitle>
                  <CardDescription className="text-[10px]">The contract you sign before each purchase — view a sample.</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowContractPreview(!showContractPreview)}>
                <Eye className="w-3 h-3" />
                {showContractPreview ? "Hide" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          {showContractPreview && (
            <CardContent>
              <PreOrderSignatoryContract
                industry="default"
                orderAmount={5000}
                buyerName="You"
                vendorName="Sample Vendor"
                txId="TL-PREVIEW"
                isAutoSigned
                onBothSigned={() => {}}
                previewMode
              />
            </CardContent>
          )}
        </Card>

        {/* ── My Protection Documents ─── */}
        <ProtectionDocsSection role="buyer" />

        {/* Reference Library */}
        <div>
          <h2 className="font-heading text-lg font-bold">Buyer Reference Library</h2>
          <p className="text-sm text-muted-foreground">Policies, guides, and disclosures about your buyer protections</p>
        </div>
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.title}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{doc.desc}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                    <Clock className="w-3 h-3" /> Updated {doc.updated}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const docTypeLabel: Record<string, string> = {
  escrow_acknowledgement: "Legal",
  pre_order_contract: "Contract",
  aml_certificate: "Compliance",
  payout_reconciliation: "Financial",
  dispute_evidence_package: "Evidence",
  vendor_consent: "Legal",
  ack_form: "Legal",
  account_pause_record: "Audit",
  account_deletion_archive: "Compliance",
};

function ProtectionDocsSection({ role }: { role: string }) {
  const [searchVal, setSearchVal] = useState("");
  const [debounced, setDebounced] = useState("");

  const handleSearch = (val: string) => {
    setSearchVal(val);
    clearTimeout((window as any).__buyerProtDocTimer);
    (window as any).__buyerProtDocTimer = setTimeout(() => setDebounced(val), 300);
  };

  const { data: docs, isLoading } = useQuery({
    queryKey: ["my-protection-documents", role, debounced],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let query = supabase
        .from("protection_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (debounced) {
        query = query.ilike("title", `%${debounced}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getRetention = (createdAt: string, years: number) => {
    const expiry = new Date(createdAt);
    expiry.setFullYear(expiry.getFullYear() + years);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { label: "Expired", color: "bg-destructive/15 text-destructive" };
    const y = Math.floor(diffDays / 365);
    const m = Math.floor((diffDays % 365) / 30);
    if (y > 5) return { label: `${y}y ${m}m left`, color: "bg-primary/15 text-primary" };
    if (y > 1) return { label: `${y}y ${m}m left`, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
    return { label: `${diffDays}d left`, color: "bg-destructive/15 text-destructive" };
  };

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <FolderArchive className="w-5 h-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-sm">My Protection Documents</CardTitle>
            <CardDescription className="text-[10px]">
              Auto-generated transaction records — {isLoading ? "loading..." : `${(docs || []).length} records`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchVal}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading && [1, 2].map(i => (
            <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2 w-1/2" /></div>
            </div>
          ))}
          {!isLoading && (docs || []).length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <FileText className="w-6 h-6 mx-auto mb-1 opacity-40" />
              <p className="text-xs">No protection documents yet.</p>
            </div>
          )}
          {!isLoading && (docs || []).map(doc => {
            const retention = getRetention(doc.created_at, doc.retention_years || 7);
            const typeLabel = docTypeLabel[doc.document_type] || doc.document_type;
            return (
              <div key={doc.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold">{doc.title}</h4>
                    <Badge variant="outline" className="text-[9px]">{typeLabel}</Badge>
                    <Badge className={`text-[9px] ${retention.color}`}>
                      <Clock className="w-2.5 h-2.5 mr-0.5" />{retention.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {doc.industry && <span className="text-[10px] text-muted-foreground">{doc.industry}</span>}
                    <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"><Eye className="w-3 h-3" /></Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default BuyerDocuments;

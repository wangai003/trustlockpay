import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Scale, Lock, BookOpen, Download, ExternalLink, Clock, Eye, ChevronDown, PenLine, Handshake, FolderArchive, Search, Loader2, AlertTriangle, CheckCircle, XCircle, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import VendorConsentForm from "@/components/shared/VendorConsentForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePdfGeneration } from "@/hooks/usePdfGeneration";

const pinnedDocs = [
  {
    title: "TrustLock OS Playbook v1.0",
    desc: "The complete 17-page reference guide covering escrow workflows, dynamic milestones, fee structure, payout architecture, dispute resolution, tax handling, smart contracts, SOPs, and edge cases across all industries.",
    updated: "Mar 2026",
    type: "PDF",
    pinned: true,
  },
];

// Protection documents are now fetched from the database

const documents = [
  {
    category: "📌 Pinned — System Playbook",
    icon: BookOpen,
    items: pinnedDocs,
  },
  {
    category: "Security & Authentication",
    icon: Lock,
    items: [
      { title: "Admin 2FA Setup Manual", desc: "Step-by-step TOTP setup with Google Authenticator/Authy. Covers backup codes, lockout recovery, and re-enrollment.", updated: "Mar 2026", type: "PDF" },
      { title: "Security Incident Response Plan", desc: "Procedures for breach detection, containment, notification, and post-incident review.", updated: "Mar 2026", type: "PDF" },
      { title: "Password & Access Policy", desc: "Password complexity requirements, session timeout rules, and IP whitelisting procedures.", updated: "Feb 2026", type: "PDF" },
    ],
  },
  {
    category: "Compliance & Legal",
    icon: Scale,
    items: [
      { title: "AML/KYC Policy", desc: "Anti-Money Laundering and Know Your Customer procedures. Covers tiered verification, sanctions screening, and SAR filing.", updated: "Mar 2026", type: "PDF" },
      { title: "GDPR Compliance Guide", desc: "Data protection obligations, user rights (access, erasure, portability), and data processing agreements.", updated: "Feb 2026", type: "PDF" },
      { title: "HIPAA Guidelines (Health Vendors)", desc: "Applies when health-related service vendors process protected health information via the platform.", updated: "Jan 2026", type: "PDF" },
      { title: "PCI-DSS Summary", desc: "Payment Card Industry standards overview for handling card data and maintaining secure environments.", updated: "Feb 2026", type: "PDF" },
      { title: "Sanctions & Embargo List Reference", desc: "OFAC, EU, UN sanctions lists and how the platform screens against them.", updated: "Mar 2026", type: "PDF" },
    ],
  },
  {
    category: "Standard Operating Procedures",
    icon: BookOpen,
    items: [
      { title: "Dispute Resolution SOP", desc: "Step-by-step process for handling disputes: AI triage → admin review → resolution → payout.", updated: "Mar 2026", type: "PDF" },
      { title: "Vendor Onboarding SOP", desc: "Verification workflow from registration through KYC tiers to full platform access.", updated: "Mar 2026", type: "PDF" },
      { title: "Escrow Release SOP", desc: "Auto-release countdown rules, manual release procedures, and 2FA confirmation requirements.", updated: "Mar 2026", type: "PDF" },
      { title: "Payout Processing SOP", desc: "Fiat and crypto payout procedures, reconciliation steps, and exception handling.", updated: "Feb 2026", type: "PDF" },
      { title: "Refund & Split Payout SOP", desc: "How to process full refunds, partial refunds, and dispute-based split payouts with audit trail.", updated: "Mar 2026", type: "PDF" },
    ],
  },
  {
    category: "Platform Disclosures",
    icon: Shield,
    items: [
      { title: "Buyer Auto-Release Disclosure", desc: "If a buyer does not confirm or dispute within 48 hours of delivery confirmation, funds auto-release to vendor.", updated: "Mar 2026", type: "Notice" },
      { title: "Dispute Window Policy", desc: "Buyers have a 14-day window from delivery to open a dispute. After this window, escrow is considered final.", updated: "Mar 2026", type: "Notice" },
      { title: "Smart Contract Transparency Notice", desc: "All escrow funds are held in auditable smart contracts on Polygon. Contract addresses are visible per transaction.", updated: "Mar 2026", type: "Notice" },
      { title: "Fee Schedule Disclosure", desc: "Platform fee structure: 2.5% for product transactions, 3% for service transactions. Volume discounts available.", updated: "Mar 2026", type: "Notice" },
    ],
  },
];

const AdminDocuments = () => {
  const [showAckPreview, setShowAckPreview] = useState(false);
  const [showConsentPreview, setShowConsentPreview] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [previewIndustry, setPreviewIndustry] = useState("default");
  const [protectionSearch, setProtectionSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [debouncedContractSearch, setDebouncedContractSearch] = useState("");
  const { generateAndDownload, generateBatch, generating } = usePdfGeneration();
  const queryClient = useQueryClient();
  const handleContractSearchChange = (val: string) => {
    setContractSearch(val);
    clearTimeout((window as any).__contractSearchTimer);
    (window as any).__contractSearchTimer = setTimeout(() => setDebouncedContractSearch(val), 300);
  };

  // Fetch pre_order_contracts
  const { data: contractDocs, isLoading: contractsLoading } = useQuery({
    queryKey: ["pre-order-contracts-admin", debouncedContractSearch],
    queryFn: async () => {
      let query = supabase
        .from("pre_order_contracts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (debouncedContractSearch) {
        query = query.or(`order_number.ilike.%${debouncedContractSearch}%,buyer_typed_name.ilike.%${debouncedContractSearch}%,vendor_typed_name.ilike.%${debouncedContractSearch}%,industry.ilike.%${debouncedContractSearch}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Debounce search
  const handleSearchChange = (val: string) => {
    setProtectionSearch(val);
    clearTimeout((window as any).__protDocSearchTimer);
    (window as any).__protDocSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  // Fetch real protection documents from DB
  const { data: realDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["protection-documents", debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("protection_documents")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (debouncedSearch) {
        query = query.ilike("title", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const getRetentionCountdown = (createdAt: string, retentionYears: number) => {
    const created = new Date(createdAt);
    const expiry = new Date(created);
    expiry.setFullYear(expiry.getFullYear() + retentionYears);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    if (diffMs <= 0) return { label: "Expired", color: "bg-destructive/15 text-destructive" };
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    if (years > 5) return { label: `${years}y ${months}m left`, color: "bg-primary/15 text-primary" };
    if (years > 1) return { label: `${years}y ${months}m left`, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
    return { label: `${diffDays}d left`, color: "bg-destructive/15 text-destructive" };
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
    milestone_completion: "Certificate",
  };

  return (
    <div>
      <AdminHeader title="Document Library" />
      <div className="p-6 space-y-6">

        {/* ── Acknowledgement Form Preview ─── */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Escrow Acknowledgement Form</CardTitle>
                  <CardDescription className="text-xs">Dynamic legal form — adapts by industry. Preview any variant below.</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAckPreview(!showAckPreview)}>
                <Eye className="w-3.5 h-3.5" />
                {showAckPreview ? "Hide" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          {showAckPreview && (
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Industry:</span>
                <Select value={previewIndustry} onValueChange={setPreviewIndustry}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">General Transaction</SelectItem>
                    <SelectItem value="e-commerce">E-Commerce / Retail</SelectItem>
                    <SelectItem value="real-estate">Real Estate & Property</SelectItem>
                    <SelectItem value="professional-services">Professional Services</SelectItem>
                    <SelectItem value="agriculture-cargo">Agriculture & Cargo</SelectItem>
                    <SelectItem value="mining-minerals">Mining & Minerals</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="logistics-freight">Logistics & Freight</SelectItem>
                    <SelectItem value="hospitality">Hospitality & Travel</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-[10px]">Read-Only Preview</Badge>
              </div>
              <AcknowledgementForm
                industry={previewIndustry}
                orderAmount={25000}
                buyerName="Sample Buyer"
                vendorName="Sample Vendor"
                txId="TL-PREVIEW"
                milestoneCount={4}
                onAccept={() => {}}
              />
            </CardContent>
          )}
        </Card>

        {/* ── Vendor Consent Form Preview ─── */}
        <Card className="border-amber-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Vendor Automated Consent Form</CardTitle>
                  <CardDescription className="text-xs">One-time consent enabling auto-signature protocol for vendors.</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowConsentPreview(!showConsentPreview)}>
                <Eye className="w-3.5 h-3.5" />
                {showConsentPreview ? "Hide" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          {showConsentPreview && (
            <CardContent>
              <VendorConsentForm vendorName="Sample Vendor" vendorPlan="growth" onConsent={() => {}} previewMode />
            </CardContent>
          )}
        </Card>

        {/* ── Pre-Order Signatory Contract Preview ─── */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Pre-Order Signatory Contract</CardTitle>
                  <CardDescription className="text-xs">Per-transaction binding contract signed by both parties at checkout.</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowContractPreview(!showContractPreview)}>
                <Eye className="w-3.5 h-3.5" />
                {showContractPreview ? "Hide" : "Preview"}
              </Button>
            </div>
          </CardHeader>
          {showContractPreview && (
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Industry:</span>
                <Select value={previewIndustry} onValueChange={setPreviewIndustry}>
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">General Transaction</SelectItem>
                    <SelectItem value="e-commerce">E-Commerce / Retail</SelectItem>
                    <SelectItem value="real-estate">Real Estate & Property</SelectItem>
                    <SelectItem value="professional-services">Professional Services</SelectItem>
                    <SelectItem value="agriculture-cargo">Agriculture & Cargo</SelectItem>
                    <SelectItem value="mining-minerals">Mining & Minerals</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="logistics-freight">Logistics & Freight</SelectItem>
                    <SelectItem value="hospitality">Hospitality & Travel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <PreOrderSignatoryContract
                industry={previewIndustry}
                orderAmount={25000}
                buyerName="Sample Buyer"
                vendorName="Sample Vendor"
                txId="TL-PREVIEW"
                milestoneCount={4}
                isAutoSigned
                onBothSigned={() => {}}
                previewMode
              />
            </CardContent>
          )}
        </Card>

        {/* ── Signed Pre-Order Contracts ─── */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Handshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">📝 Signed Pre-Order Contracts</CardTitle>
                  <CardDescription className="text-xs">
                    All pre-order signatory contracts — {contractsLoading ? "loading..." : `${(contractDocs || []).length} records`}. Immutable storage (no deletion).
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">Immutable</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search contracts by order number, buyer, vendor, or industry..."
                value={contractSearch}
                onChange={(e) => handleContractSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {contractsLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!contractsLoading && (contractDocs || []).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Handshake className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No contracts found{contractSearch ? ` matching "${contractSearch}"` : ""}.</p>
                  <p className="text-[10px] mt-1">Contracts are created when orders go through the checkout flow.</p>
                </div>
              )}
              {!contractsLoading && (contractDocs || []).map((c) => {
                const statusIcon = c.status === "fully_signed" ? <CheckCircle className="w-4 h-4 text-primary" /> :
                  c.status === "declined" ? <XCircle className="w-4 h-4 text-destructive" /> :
                  <Clock className="w-4 h-4 text-muted-foreground" />;
                const statusColor = c.status === "fully_signed" ? "bg-primary/15 text-primary" :
                  c.status === "declined" ? "bg-destructive/15 text-destructive" :
                  "bg-muted text-muted-foreground";
                return (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {statusIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold">Contract {c.order_number ? `#${c.order_number}` : "—"}</h4>
                        <Badge className={`text-[9px] capitalize ${statusColor}`}>{c.status?.replace(/_/g, " ")}</Badge>
                        {c.is_vendor_auto_signed && <Badge variant="outline" className="text-[9px]">Auto-Signed</Badge>}
                        {c.industry && <Badge variant="secondary" className="text-[9px]">{c.industry}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
                        <span>${Number(c.order_amount || 0).toLocaleString()}</span>
                        {c.buyer_typed_name && <span>Buyer: {c.buyer_typed_name}</span>}
                        {c.vendor_typed_name && <span>Vendor: {c.vendor_typed_name}</span>}
                        <span>v{c.contract_terms_version || "1.0"}</span>
                        <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"><Eye className="w-3 h-3" /></Button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Contracts are immutable — no deletion allowed. Linked to order carbon copies via transaction_id for full audit trail.
            </p>
          </CardContent>
        </Card>

        {/* ── TrustLock Protection Documents Folder ─── */}
        <Card className="border-accent/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <FolderArchive className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-base">🗂️ TrustLock Protection Documents</CardTitle>
                  <CardDescription className="text-xs">
                    Archived protection documents — {docsLoading ? "loading..." : `${(realDocs || []).length} records`}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">Testnet + Mainnet</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search protection documents by title..."
                value={protectionSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {docsLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!docsLoading && (realDocs || []).length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No protection documents found{protectionSearch ? ` matching "${protectionSearch}"` : ""}.</p>
                  <p className="text-[10px] mt-1">Documents are auto-generated when transactions change status.</p>
                </div>
              )}
              {!docsLoading && (realDocs || []).map((doc) => {
                const retention = getRetentionCountdown(doc.created_at, doc.retention_years || 7);
                const typeLabel = docTypeLabel[doc.document_type] || doc.document_type;
                const isExpired = (doc.metadata as any)?.retention_expired === true;
                return (
                  <div key={doc.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isExpired ? "border-destructive/30 bg-destructive/5" : "border-border hover:bg-muted/20"}`}>
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {isExpired ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold">{doc.title}</h4>
                        <Badge variant="outline" className="text-[9px]">{typeLabel}</Badge>
                        <Badge className={`text-[9px] ${retention.color}`}>
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          {retention.label}
                        </Badge>
                        {isExpired && <Badge variant="destructive" className="text-[9px]">Review Required</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {doc.industry && <span className="text-[10px] text-muted-foreground">Industry: {doc.industry}</span>}
                        {doc.signed_by_buyer && <span className="text-[10px] text-muted-foreground">Buyer: ✓</span>}
                        {doc.signed_by_vendor && <span className="text-[10px] text-muted-foreground">Vendor: ✓</span>}
                        <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Download className="w-3 h-3" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Documents are auto-archived when generated per transaction. Search by title. All documents follow 7-year immutable retention for cross-border trade compliance.
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-heading text-lg font-bold">Admin Reference Library</h2>
          <p className="text-sm text-muted-foreground">
            Compliance docs, SOPs, manuals, and platform disclosures. All documents accessible for admin reference.
          </p>
        </div>

        {documents.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">{category.category}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((doc) => (
                  <div
                    key={doc.title}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{doc.title}</h4>
                        <Badge variant="secondary" className="text-[10px]">{doc.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{doc.desc}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                        <Clock className="w-3 h-3" /> Updated {doc.updated}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminDocuments;

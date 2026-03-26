import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield, Scale, Lock, BookOpen, Download, ExternalLink, Clock, Eye, ChevronDown, PenLine, Handshake } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import VendorConsentForm from "@/components/shared/VendorConsentForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";

const pinnedDocs = [
  {
    title: "TrustLock OS Playbook v1.0",
    desc: "The complete 17-page reference guide covering escrow workflows, dynamic milestones, fee structure, payout architecture, dispute resolution, tax handling, smart contracts, SOPs, and edge cases across all industries.",
    updated: "Mar 2026",
    type: "PDF",
    pinned: true,
  },
];

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
  const [previewIndustry, setPreviewIndustry] = useState("default");

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

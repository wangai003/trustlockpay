import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Home, Sprout, Pickaxe, Plane, ShoppingBag, Briefcase, Ship, GraduationCap, ClipboardList,
  Search, CheckSquare, Shield, Bot, FileText, Wallet, BarChart3, AlertTriangle, Globe,
  Download, BookOpen, Upload, Lock, Unlock, UserPlus, Eye
} from "lucide-react";

const industries = [
  {
    id: "construction", name: "Construction", icon: Building2, color: "text-orange-600",
    desc: "Multi-milestone escrow for contractors, subcontractors, and building projects.",
    stages: ["Contract Upload & Dual Acknowledgement", "Foundation Inspection Sign-Off", "Structural Phase Completion", "MEP Verification", "Final Walkthrough & Punch List", "Certificate of Occupancy Upload", "Final Payout Release"],
    buyerCaps: ["Track milestone progress in real-time", "Upload inspection photos per stage", "Dispute individual milestones independently", "Request third-party observer sign-off", "View contractor KYC verification status", "Access acknowledgement forms & contracts", "14-day auto-release with holdback option"],
    vendorCaps: ["Receive staged payouts per milestone", "Upload progress documentation", "Auto-signature protocol for high-volume orders", "Dashboard work log with batch accept", "KYC tier progression (Basic → Premium)", "Standalone payment links for deposit collection", "Bill payment tracking for material suppliers"],
  },
  {
    id: "real-estate", name: "Real Estate", icon: Home, color: "text-blue-600",
    desc: "Escrow protection for land deposits, property purchases, and diaspora housing investments.",
    stages: ["Purchase Agreement Upload", "Title Search & Verification", "Deposit Escrow Lock", "Property Inspection", "Legal Review & Conveyancing", "Transfer of Title", "Final Settlement & Key Handover"],
    buyerCaps: ["Verify property title before funds release", "Upload surveyor reports per stage", "Track conveyancing progress", "Dispute if title defects discovered", "Observer sign-off from licensed valuers", "Escrow holdback for post-sale defects"],
    vendorCaps: ["Receive deposit into escrow immediately", "Staged payout: deposit → balance", "Upload title deeds and certificates", "Auto-notify buyer at each stage", "KYC verification for property ownership", "Standalone links for international buyers"],
  },
  {
    id: "agriculture", name: "Agriculture", icon: Sprout, color: "text-green-600",
    desc: "Secure commodity purchases from verified farmers with harvest-to-delivery tracking.",
    stages: ["Contract & Pre-Harvest Agreement", "Harvest Confirmation & Quality Assay", "Packaging & Grading Certification", "Logistics & Shipping Documentation", "Customs Clearance (Cross-Border)", "Delivery Confirmation", "Final Quality Inspection & Payout"],
    buyerCaps: ["Track harvest-to-delivery pipeline", "Upload quality test results", "Dispute based on grade discrepancy", "Observer sign-off from agronomists", "Access phytosanitary certificates", "Partial release for partial deliveries"],
    vendorCaps: ["Pre-sell harvests with escrow protection", "Upload grading and certification docs", "Receive advance payments at harvest stage", "Export documentation auto-templates", "Multi-buyer order management", "Seasonal analytics and trend reports"],
  },
  {
    id: "mining", name: "Mining & Minerals", icon: Pickaxe, color: "text-amber-700",
    desc: "High-compliance escrow for gold, diamonds, and mineral exports with assay verification.",
    stages: ["Mining License & Contract Upload", "Assay Report & Certification", "Export License Verification", "Customs Declaration & Inspection", "Logistics & Chain-of-Custody", "Destination Arrival & Re-Assay", "Final Settlement with Observer Sign-Off"],
    buyerCaps: ["Verify assay reports before purchase", "Track chain-of-custody documentation", "Dispute based on re-assay discrepancy", "Bank-level observer sign-off required", "Access Kimberley Process certificates", "Escrow holdback until destination verification"],
    vendorCaps: ["Escrow-protected mineral sales", "Upload mining licenses and permits", "Chain-of-custody documentation trail", "Letter of Credit (LC) workflow support", "Multi-stage payout with holdback", "Compliance dashboard for export tracking"],
  },
  {
    id: "tourism", name: "Tourism & Hospitality", icon: Plane, color: "text-sky-600",
    desc: "Booking-based escrow for tours, hotels, and travel experiences with date-triggered releases.",
    stages: ["Booking Confirmation & Deposit", "Pre-Trip Documentation", "Service Delivery (Check-In)", "Mid-Experience Check", "Service Completion", "Review & Feedback", "Final Payout Release"],
    buyerCaps: ["Book with escrow protection", "Upload travel documents", "Dispute before or after experience", "Rate and review service providers", "Request partial refund for service gaps", "Auto-release after experience completion"],
    vendorCaps: ["Receive confirmed bookings with escrow", "Upload service itineraries", "Date-triggered payout release", "Seasonal pricing tools", "Customer review management", "Analytics on booking trends"],
  },
  {
    id: "retail", name: "Retail & E-Commerce", icon: ShoppingBag, color: "text-purple-600",
    desc: "Atomic escrow for product purchases with shipping-based milestone tracking.",
    stages: ["Order Placement & Payment", "Seller Confirmation", "Packaging & Dispatch", "Shipping & Tracking", "Delivery Confirmation", "Inspection Window (48h)", "Auto-Release or Dispute"],
    buyerCaps: ["Track shipment in real-time", "48-hour inspection window after delivery", "One-click dispute filing", "Photo evidence upload for damaged goods", "Access order carbon copies", "Automatic refund on seller no-show"],
    vendorCaps: ["Instant order notifications", "Upload tracking numbers", "Auto-release after confirmation", "Bulk order management", "Return handling workflow", "Widget installation for any website"],
  },
  {
    id: "freelance", name: "Freelance & Professional Services", icon: Briefcase, color: "text-indigo-600",
    desc: "Milestone-based escrow for project work, consulting, and professional service delivery.",
    stages: ["Scope of Work Agreement", "Milestone 1: Initial Deliverable", "Client Review & Feedback", "Milestone 2: Revision / Next Phase", "Final Deliverable Submission", "Client Acceptance Sign-Off", "Final Payout Release"],
    buyerCaps: ["Define custom milestones at checkout", "Review deliverables per stage", "Request revisions before approval", "Dispute individual milestones", "Observer sign-off for enterprise contracts", "Escrow protection for advance payments"],
    vendorCaps: ["Structured milestone payments", "Upload deliverables per stage", "Track revision requests", "Invoice generation per milestone", "Auto-signature for repeat clients", "Time-based milestone options"],
  },
  {
    id: "logistics", name: "Logistics & Cross-Border Trade", icon: Ship, color: "text-teal-600",
    desc: "End-to-end escrow for import/export with customs documentation and LC support.",
    stages: ["Trade Agreement & LC Issuance", "Goods Inspection at Origin", "Export Customs & Documentation", "Shipping & Bill of Lading", "Import Customs & Duty Payment", "Destination Inspection", "Final Settlement"],
    buyerCaps: ["Track shipment across borders", "Verify customs documentation", "Bank observer sign-off at LC stages", "Access bill of lading copies", "Tariff and duty calculation preview", "Multi-currency escrow holding"],
    vendorCaps: ["Letter of Credit workflow support", "Upload export documentation", "Staged payout per shipping milestone", "Customs broker integration", "Multi-destination order management", "Trade finance documentation"],
  },
  {
    id: "education", name: "Education & Training", icon: GraduationCap, color: "text-rose-600",
    desc: "Subscription and course-based escrow for tuition and training programs.",
    stages: ["Enrollment & Tuition Deposit", "Course Material Access", "Module 1 Completion", "Mid-Program Assessment", "Module 2+ Progression", "Final Assessment & Certification", "Certificate Issuance & Payout"],
    buyerCaps: ["Escrow-protected tuition payments", "Track course module progress", "Dispute if content not delivered", "Access certificates and transcripts", "Partial refund for incomplete programs", "Auto-release per module completion"],
    vendorCaps: ["Structured tuition collection", "Upload course materials per module", "Student progress tracking", "Certificate generation tools", "Multi-cohort management", "Subscription billing support"],
  },
  {
    id: "project-management", name: "Project Management", icon: ClipboardList, color: "text-cyan-600",
    desc: "Multi-stakeholder escrow for PM-led projects with milestone tracking, observer sign-offs, and Gantt-style progress.",
    stages: ["Project Charter & SOW Upload", "Kick-Off & Team Assignment", "Phase 1 Deliverables", "Mid-Project Review & Change Orders", "Phase 2 Deliverables", "UAT / Client Acceptance Testing", "Project Close-Out & Final Payout"],
    buyerCaps: ["Track project milestones on a visual timeline", "Approve/reject deliverables per phase", "Request change orders with escrow adjustment", "Observer sign-off from QA or third-party auditors", "Dispute individual phases independently", "View PM credentials and team composition", "14-day auto-release with holdback option"],
    vendorCaps: ["Structured milestone-based payments", "Upload deliverables and progress reports per phase", "Change order workflow with buyer co-sign", "Team role assignment (PM, Lead, Assistant)", "Gantt-style timeline dashboard view", "Auto-signature protocol for repeat engagements", "Risk register and issue log integration"],
  },
];

// ─── Map playbook industry IDs → MilestoneEditor template keys ───
type DocumentMode = "none" | "optional" | "required";
interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: DocumentMode;
  description: string;
  requiresObserver: boolean;
}

const INDUSTRY_MILESTONE_MAP: Record<string, MilestoneTemplate[]> = {
  "construction": [
    { name: "Contract Upload & Dual Acknowledgement", percentage: 5, documents: ["Construction Contract", "Subcontractor Agreements"], documentMode: "required", description: "Both parties sign and upload the construction contract", requiresObserver: false },
    { name: "Foundation Inspection", percentage: 15, documents: ["Foundation Inspection Report", "Soil Test Results"], documentMode: "required", description: "Independent inspector verifies foundation work", requiresObserver: true },
    { name: "Structural Phase", percentage: 25, documents: ["Structural Engineer Report", "Progress Photos"], documentMode: "required", description: "Walls, roofing, and structural elements completed", requiresObserver: true },
    { name: "MEP Verification", percentage: 20, documents: ["Electrical Certification", "Plumbing Test Report"], documentMode: "required", description: "Mechanical, electrical, and plumbing systems verified", requiresObserver: true },
    { name: "Final Walkthrough & Punch List", percentage: 15, documents: ["Punch List", "Walkthrough Report"], documentMode: "optional", description: "Final inspection with buyer to identify remaining items", requiresObserver: false },
    { name: "Certificate of Occupancy", percentage: 10, documents: ["Certificate of Occupancy"], documentMode: "required", description: "Government-issued occupancy certificate obtained", requiresObserver: true },
    { name: "Final Payout Release", percentage: 10, documents: ["Completion Certificate"], documentMode: "optional", description: "All milestones fulfilled, final escrow release", requiresObserver: false },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Property Survey"], documentMode: "required", description: "Legal review and property verification", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], documentMode: "optional", description: "Physical property inspection", requiresObserver: false },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], documentMode: "required", description: "Independent property valuation", requiresObserver: true },
    { name: "Closing", percentage: 60, documents: ["Closing Documents", "Transfer Agreement"], documentMode: "required", description: "Final transfer and key handover", requiresObserver: true },
  ],
  "agriculture": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract", "Export License"], documentMode: "required", description: "Trade agreement executed", requiresObserver: true },
    { name: "Harvest & Quality Assay", percentage: 15, documents: ["Quality Certificate", "Grading Report"], documentMode: "required", description: "Harvest confirmed with quality testing", requiresObserver: true },
    { name: "Packaging & Certification", percentage: 15, documents: ["Phytosanitary Certificate", "Packaging Report"], documentMode: "required", description: "Goods packaged and certified for export", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading", "Insurance Certificate"], documentMode: "required", description: "Goods in transit", requiresObserver: true },
    { name: "Customs Clearance", percentage: 15, documents: ["Certificate of Origin", "Customs Declaration"], documentMode: "required", description: "Import clearance completed", requiresObserver: true },
    { name: "Delivery & Acceptance", percentage: 20, documents: ["Delivery Receipt", "Quality Report"], documentMode: "optional", description: "Goods received and accepted", requiresObserver: false },
  ],
  "mining": [
    { name: "Assay & Certification", percentage: 10, documents: ["Assay Report", "Purity Certificate (LBMA)"], documentMode: "required", description: "Independent assay lab certifies mineral purity and weight", requiresObserver: true },
    { name: "Export License", percentage: 5, documents: ["Mining License", "Export Permit", "Tax Clearance"], documentMode: "required", description: "Government export authorization obtained", requiresObserver: true },
    { name: "Insurance & Packaging", percentage: 10, documents: ["Insurance Certificate", "Secure Packaging Report"], documentMode: "required", description: "Goods insured and sealed in tamper-proof packaging", requiresObserver: false },
    { name: "Customs (Origin)", percentage: 15, documents: ["Customs Declaration", "Certificate of Origin", "AML Declaration"], documentMode: "required", description: "Origin country customs clearance and AML check", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Air Waybill / Bill of Lading", "Tracking Manifest"], documentMode: "required", description: "Secure transit via freight", requiresObserver: true },
    { name: "Destination Clearance", percentage: 20, documents: ["Import Declaration", "Hallmarking Certificate"], documentMode: "required", description: "Destination customs clearance and verification", requiresObserver: true },
    { name: "Delivery & Fund Release", percentage: 15, documents: ["Delivery Receipt", "Buyer Acceptance Form"], documentMode: "required", description: "Physical delivery confirmed, escrow funds released", requiresObserver: false },
  ],
  "tourism": [
    { name: "Booking Confirmed", percentage: 50, documents: ["Booking Confirmation"], documentMode: "optional", description: "Reservation secured with deposit", requiresObserver: false },
    { name: "Service Completed", percentage: 50, documents: ["Checkout Confirmation", "Review Form"], documentMode: "optional", description: "Stay/experience completed", requiresObserver: false },
  ],
  "retail": [
    { name: "Order & Payment", percentage: 100, documents: [], documentMode: "none", description: "Full payment locked in escrow upon order", requiresObserver: false },
  ],
  "freelance": [
    { name: "Discovery & Scope", percentage: 20, documents: ["Scope Document"], documentMode: "optional", description: "Requirements gathering and project scoping", requiresObserver: false },
    { name: "Draft Delivery", percentage: 30, documents: ["Draft Deliverable"], documentMode: "optional", description: "First draft or prototype delivered", requiresObserver: false },
    { name: "Revision Round", percentage: 20, documents: [], documentMode: "none", description: "Client feedback and revisions", requiresObserver: false },
    { name: "Final Delivery", percentage: 30, documents: ["Final Deliverable", "Sign-off Form"], documentMode: "required", description: "Approved final work product", requiresObserver: false },
  ],
  "logistics": [
    { name: "LC Issuance / Trade Agreement", percentage: 5, documents: ["Letter of Credit", "Trade Contract"], documentMode: "required", description: "Issuing bank opens the LC or trade agreement signed", requiresObserver: true },
    { name: "Origin Inspection", percentage: 15, documents: ["Inspection Certificate", "Quality Report"], documentMode: "required", description: "Goods inspected at origin", requiresObserver: true },
    { name: "Export Customs", percentage: 15, documents: ["Customs Declaration", "Export License"], documentMode: "required", description: "Origin country customs clearance", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading", "Insurance Certificate"], documentMode: "required", description: "Goods in transit", requiresObserver: true },
    { name: "Import Customs", percentage: 15, documents: ["Import Declaration", "Duty Receipt"], documentMode: "required", description: "Destination customs processing", requiresObserver: true },
    { name: "Destination Inspection", percentage: 10, documents: ["Delivery Receipt", "POD"], documentMode: "optional", description: "Final inspection at destination", requiresObserver: false },
    { name: "Final Settlement", percentage: 15, documents: ["Bank Payment Confirmation"], documentMode: "required", description: "Escrow released upon confirmed delivery", requiresObserver: true },
  ],
  "education": [
    { name: "Enrollment & Deposit", percentage: 25, documents: ["Enrollment Form"], documentMode: "optional", description: "Student enrolled, tuition deposited in escrow", requiresObserver: false },
    { name: "Course Access", percentage: 25, documents: ["Course Materials"], documentMode: "optional", description: "Access to learning materials provided", requiresObserver: false },
    { name: "Assessment", percentage: 25, documents: ["Assessment Results"], documentMode: "optional", description: "Mid-program or final assessment completed", requiresObserver: false },
    { name: "Certification & Payout", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certificate issued, final payout released", requiresObserver: false },
  ],
  "project-management": [
    { name: "Project Charter & SOW", percentage: 10, documents: ["Project Charter", "Statement of Work"], documentMode: "required", description: "Project scope, objectives, and deliverables defined and signed", requiresObserver: false },
    { name: "Kick-Off & Resource Plan", percentage: 5, documents: ["Resource Plan", "RACI Matrix"], documentMode: "optional", description: "Team assigned, kick-off meeting completed", requiresObserver: false },
    { name: "Phase 1 Deliverables", percentage: 25, documents: ["Phase 1 Report", "Progress Photos"], documentMode: "required", description: "First major deliverable milestone completed", requiresObserver: true },
    { name: "Mid-Project Review", percentage: 10, documents: ["Status Report", "Change Order Log"], documentMode: "required", description: "Formal review, budget check, and scope validation", requiresObserver: true },
    { name: "Phase 2 Deliverables", percentage: 25, documents: ["Phase 2 Report", "Test Results"], documentMode: "required", description: "Second major deliverable milestone completed", requiresObserver: true },
    { name: "UAT / Acceptance Testing", percentage: 15, documents: ["UAT Sign-Off", "Punch List"], documentMode: "required", description: "Client acceptance testing and sign-off", requiresObserver: false },
    { name: "Project Close-Out", percentage: 10, documents: ["Close-Out Report", "Lessons Learned"], documentMode: "optional", description: "Final documentation, handover, and escrow release", requiresObserver: false },
  ],
};

const platformTools = [
  { icon: Search, name: "Universal Search (Cmd+K)", desc: "Live database search across transactions, disputes, orders" },
  { icon: Bot, name: "AI Assistants", desc: "Emmanuel (Admin), Amani (Vendor), Zawadi (Buyer)" },
  { icon: FileText, name: "Document Archive", desc: "7-year retention, searchable contracts & evidence" },
  { icon: BarChart3, name: "Analytics Dashboard", desc: "Revenue charts, volume metrics, CSV/PDF exports" },
  { icon: Shield, name: "Compliance Engine", desc: "4-tier KYC, OFAC/EU/UN sanctions screening" },
  { icon: Wallet, name: "Multi-Rail Payouts", desc: "Bank, mobile money, crypto (USDC on Polygon)" },
  { icon: AlertTriangle, name: "Dispute Resolution", desc: "AI-assisted analysis with confidence scoring" },
  { icon: Globe, name: "Widget & Standalone Links", desc: "Embeddable checkout + P2P payment links" },
];

const IndustryPlaybookView = () => {
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const filtered = industries.filter(ind =>
    ind.name.toLowerCase().includes(search.toLowerCase()) ||
    ind.desc.toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedIndustry ? industries.find(i => i.id === selectedIndustry) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Industry Capabilities Playbook</h2>
          <p className="text-sm text-muted-foreground">Dynamic escrow workflows across 10 emerging market industries</p>
        </div>
        <a
          href="/__l5e/documents/TrustLock_Industry_Capabilities_Playbook_v1.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download Full PDF
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Platform Tools Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Platform Tools Available to All Industries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platformTools.map(tool => (
              <div key={tool.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <tool.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{tool.name}</p>
                  <p className="text-[10px] text-muted-foreground">{tool.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry Grid or Detail */}
      {selected ? (
        <div className="space-y-4">
          <button onClick={() => setSelectedIndustry(null)} className="text-sm text-primary hover:underline">
            ← Back to all industries
          </button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <selected.icon className={`w-8 h-8 ${selected.color}`} />
                <div>
                  <CardTitle>{selected.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.desc}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="milestones">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="milestones">Milestone Template</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow Stages</TabsTrigger>
                  <TabsTrigger value="buyer">Buyer Capabilities</TabsTrigger>
                  <TabsTrigger value="vendor">Vendor Capabilities</TabsTrigger>
                </TabsList>
                <TabsContent value="milestones" className="space-y-3">
                  {(INDUSTRY_MILESTONE_MAP[selected.id] || []).length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Document-gated escrow milestones with fund allocation. Each stage can require uploads before funds release.
                      </p>
                      {INDUSTRY_MILESTONE_MAP[selected.id].map((ms, i) => (
                        <Card key={i} className="border-border/60">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="shrink-0 text-xs font-mono">{i + 1}</Badge>
                                <span className="text-sm font-semibold">{ms.name}</span>
                              </div>
                              <Badge className="bg-primary/10 text-primary text-xs">{ms.percentage}%</Badge>
                            </div>
                            <Progress value={ms.percentage} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">{ms.description}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {/* Document Mode */}
                              <Badge variant={ms.documentMode === "required" ? "destructive" : ms.documentMode === "optional" ? "secondary" : "outline"} className="text-[10px] gap-1">
                                {ms.documentMode === "required" ? <Lock className="w-3 h-3" /> : ms.documentMode === "optional" ? <Unlock className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                Docs: {ms.documentMode}
                              </Badge>
                              {/* Observer */}
                              {ms.requiresObserver && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Eye className="w-3 h-3" />
                                  Observer Required
                                </Badge>
                              )}
                            </div>
                            {/* Required Documents */}
                            {ms.documents.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ms.documents.map((doc, di) => (
                                  <Badge key={di} variant="outline" className="text-[10px] gap-1 font-normal">
                                    <Upload className="w-2.5 h-2.5" />
                                    {doc}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">
                        <strong>Total allocation:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].reduce((s, m) => s + m.percentage, 0)}% •
                        <strong> Doc-gated stages:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].filter(m => m.documentMode === "required").length} •
                        <strong> Observer stages:</strong> {INDUSTRY_MILESTONE_MAP[selected.id].filter(m => m.requiresObserver).length}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No structured milestone template for this industry yet.</p>
                  )}
                </TabsContent>
                <TabsContent value="workflow" className="space-y-2">
                  {selected.stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                      <Badge variant="outline" className="shrink-0 text-xs">{i + 1}</Badge>
                      <span className="text-sm">{stage}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="buyer" className="space-y-2">
                  {selected.buyerCaps.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="vendor" className="space-y-2">
                  {selected.vendorCaps.map((cap, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ind => (
            <Card
              key={ind.id}
              className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
              onClick={() => setSelectedIndustry(ind.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ind.icon className={`w-6 h-6 ${ind.color}`} />
                  <h3 className="font-bold text-sm text-foreground">{ind.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{ind.desc}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{ind.stages.length} Stages</Badge>
                  <Badge variant="outline" className="text-[10px]">{ind.buyerCaps.length + ind.vendorCaps.length} Capabilities</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndustryPlaybookView;

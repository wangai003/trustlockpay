import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Building2, Home, Sprout, Pickaxe, Plane, ShoppingBag, Briefcase, Ship, GraduationCap,
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
];

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
          <p className="text-sm text-muted-foreground">Dynamic escrow workflows across 9 emerging market industries</p>
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
              <Tabs defaultValue="workflow">
                <TabsList className="mb-4">
                  <TabsTrigger value="workflow">Workflow Stages</TabsTrigger>
                  <TabsTrigger value="buyer">Buyer Capabilities</TabsTrigger>
                  <TabsTrigger value="vendor">Vendor Capabilities</TabsTrigger>
                </TabsList>
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

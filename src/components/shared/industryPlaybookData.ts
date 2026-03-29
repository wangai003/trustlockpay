import {
  Building2, Home, Sprout, Pickaxe, Plane, ShoppingBag, Briefcase, Ship, GraduationCap, ClipboardList,
  Fuel, Pill, Radio, Factory, Sun, Shirt, Fish, Car, Droplets, Film,
  PlaneTakeoff, Shield, Scale, UtensilsCrossed, Recycle,
  Search, Bot, FileText, BarChart3, Wallet, AlertTriangle, Globe, BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DocumentMode = "none" | "optional" | "required";

export interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: DocumentMode;
  description: string;
  requiresObserver: boolean;
}

export interface IndustryEntry {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  desc: string;
  stages: string[];
  buyerCaps: string[];
  vendorCaps: string[];
}

export const industries: IndustryEntry[] = [
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
    id: "energy", name: "Energy / Oil & Gas", icon: Fuel, color: "text-yellow-700",
    desc: "Upstream, midstream, and downstream oil & gas services including equipment procurement, drilling, and petrochemical exports.",
    stages: ["Contract & LC / PO Upload", "Equipment Inspection at Origin", "Export License & NNPC/Regulatory Clearance", "Shipping & Freight Documentation", "Import Customs & Duty Settlement", "Installation & Commissioning", "Final Acceptance & Payout"],
    buyerCaps: ["Track equipment from origin to installation", "Verify API compliance certificates", "Observer sign-off from commissioning engineers", "Dispute based on performance test failures", "Access HSE documentation", "Escrow holdback until commissioning complete"],
    vendorCaps: ["Milestone-based payments for large projects", "Upload API/IOGP compliance docs", "LC replacement workflow", "Multi-phase drilling project support", "Insurance verification gates", "Equipment warranty escrow"],
  },
  {
    id: "pharmaceuticals", name: "Pharmaceuticals & Healthcare", icon: Pill, color: "text-red-600",
    desc: "Drug imports, medical equipment, vaccine distribution, and healthcare supply chain management.",
    stages: ["Purchase Order & Regulatory Pre-Approval", "GMP Audit & Batch Certification", "Cold Chain Preparation & Packaging", "Export & Customs Documentation", "Shipping with Temperature Monitoring", "Import Clearance & NAFDAC/FDA Release", "Delivery Verification & Payout"],
    buyerCaps: ["Verify WHO prequalification before payment", "Monitor cold chain temperature in real-time", "Dispute based on temperature excursion", "Access batch analysis and GMP certificates", "Regulatory compliance dashboard", "Partial release for partial shipments"],
    vendorCaps: ["Escrow-protected pharmaceutical sales", "Upload GMP and batch certifications", "Cold chain documentation trail", "Multi-country regulatory tracking", "Controlled substance permit management", "Warranty and recall handling"],
  },
  {
    id: "telecommunications", name: "Telecommunications & ICT", icon: Radio, color: "text-violet-600",
    desc: "Tower construction, fiber rollouts, network equipment procurement, and managed ICT services.",
    stages: ["Contract & Scope of Work", "Equipment Procurement & Testing", "Site Preparation & Civil Works", "Equipment Installation", "Network Integration & Testing", "Regulatory Compliance & License", "Acceptance & Final Payout"],
    buyerCaps: ["Track site build progress with GPS", "Verify RF coverage test results", "Observer sign-off from RF engineers", "Dispute based on KPI benchmark failures", "Access spectrum and license documentation", "Multi-site project dashboard"],
    vendorCaps: ["Milestone payments per site completion", "Upload factory acceptance test reports", "Civil works documentation trail", "Network KPI benchmark dashboard", "Multi-vendor equipment coordination", "Warranty and SLA management"],
  },
  {
    id: "manufacturing", name: "Manufacturing & Equipment", icon: Factory, color: "text-gray-700",
    desc: "Factory equipment imports, industrial machinery installation, and manufacturing line commissioning.",
    stages: ["Purchase Order & Technical Spec Review", "Factory Acceptance Test (FAT)", "Packaging & Shipping Preparation", "Shipping & Customs Clearance", "Site Installation", "Commissioning & Performance Test", "Final Acceptance & Warranty Activation"],
    buyerCaps: ["Verify equipment specs before shipment", "Attend virtual FAT sessions", "Observer sign-off from OEM engineers", "Dispute based on performance test failure", "Access calibration and QC records", "Warranty period escrow holdback"],
    vendorCaps: ["Staged payments from FAT to commissioning", "Upload FAT reports and certifications", "Installation documentation trail", "Performance test benchmark reports", "Training completion tracking", "Warranty activation management"],
  },
  {
    id: "renewable-energy", name: "Renewable Energy / Solar", icon: Sun, color: "text-amber-500",
    desc: "Solar panel procurement, wind turbine installation, mini-grid commissioning, and clean energy project financing.",
    stages: ["EPC Contract & Feasibility Study", "Equipment Procurement & IEC Certification", "Shipping & Import Clearance", "Civil Works & Mounting", "Electrical Installation & Grid Connection", "Commissioning & Performance Ratio Test", "Handover & Final Payout"],
    buyerCaps: ["Track system performance vs simulation", "Verify IEC certifications before shipment", "Observer sign-off from solar engineers", "Dispute based on performance ratio", "Access duty exemption documentation", "O&M period escrow holdback"],
    vendorCaps: ["EPC milestone-based payments", "Upload IEC compliance certificates", "Performance ratio documentation", "Grid connection approval tracking", "Green energy incentive management", "25-year warranty documentation"],
  },
  {
    id: "textiles", name: "Textiles & Apparel", icon: Shirt, color: "text-pink-600",
    desc: "Fabric sourcing, garment manufacturing, fair trade compliance, and fashion export logistics.",
    stages: ["Purchase Order & Design Approval", "Raw Material Sourcing & Certification", "Production Sampling & QC", "Bulk Production & Mid-Line Inspection", "Final Inspection & Packaging", "Shipping & Customs", "Delivery & Payment Release"],
    buyerCaps: ["Approve fabric swatches digitally", "Track AQL inspection results", "Observer sign-off from QC inspectors", "Dispute based on quality defects", "Access GOTS/Fair Trade certificates", "Partial release for partial deliveries"],
    vendorCaps: ["Pre-production sample approval workflow", "Upload AQL and inspection reports", "Fair trade documentation trail", "AGOA preferential tariff management", "Multi-buyer production scheduling", "Labeling compliance tracking"],
  },
  {
    id: "marine-fisheries", name: "Marine & Fisheries", icon: Fish, color: "text-cyan-700",
    desc: "Commercial fishing, seafood export, aquaculture, and marine resource management with catch certification.",
    stages: ["Fishing License & Vessel Registration", "Catch Documentation & IUU Compliance", "Cold Chain Processing & HACCP", "Health Certificate & Export Clearance", "Shipping & Reefer Container Monitoring", "Import Inspection & Release", "Delivery & Final Settlement"],
    buyerCaps: ["Verify catch certificates before payment", "Monitor reefer temperature data", "Observer sign-off from fisheries inspectors", "Dispute based on weight discrepancy", "Access IUU compliance documentation", "Partial release for partial consignments"],
    vendorCaps: ["Escrow-protected seafood exports", "Upload catch and vessel documentation", "HACCP compliance trail", "Reefer temperature monitoring integration", "Multi-species order management", "Seasonal quota tracking"],
  },
  {
    id: "automotive-import", name: "Automotive & Vehicle Import", icon: Car, color: "text-slate-700",
    desc: "New and used vehicle imports, spare parts procurement, and roadworthiness certification.",
    stages: ["Purchase Agreement & Vehicle Selection", "Pre-Shipment Inspection (PSI)", "Export Documentation", "Shipping & Marine Insurance", "Import Customs & Duty Payment", "Local Registration & Roadworthiness", "Delivery & Payout Release"],
    buyerCaps: ["Verify VIN and vehicle specs remotely", "Access PSI reports before shipment", "Track shipping via container GPS", "Dispute based on condition discrepancy", "Access duty calculation preview", "Registration assistance tracking"],
    vendorCaps: ["Escrow-protected vehicle sales", "Upload PSI and roadworthiness reports", "De-registration documentation trail", "Shipping and insurance management", "Multi-vehicle batch exports", "Age restriction compliance tracking"],
  },
  {
    id: "water-sanitation", name: "Water & Sanitation", icon: Droplets, color: "text-blue-500",
    desc: "Borehole drilling, water treatment plants, pipeline construction, and WASH program implementation.",
    stages: ["Contract & Hydrogeological Survey", "Mobilization & Site Preparation", "Drilling / Excavation Phase", "Infrastructure Installation", "Water Quality Testing", "Community Handover & Training", "Defects Liability & Final Payout"],
    buyerCaps: ["Track drilling progress with logs", "Verify WHO water quality results", "Observer sign-off from hydrogeologists", "Dispute based on flow rate shortfall", "Access environmental impact assessments", "Defects liability period protection"],
    vendorCaps: ["Milestone payments per construction phase", "Upload drilling logs and geological data", "Water quality documentation trail", "Community training completion tracking", "Multi-site project management", "Defects liability escrow holdback"],
  },
  {
    id: "media-entertainment", name: "Media, Film & Entertainment", icon: Film, color: "text-rose-500",
    desc: "Film production, music licensing, content distribution, IP royalty escrow, and creative project milestones.",
    stages: ["Deal Memo & IP Agreement", "Pre-Production & Script Lockdown", "Principal Photography / Recording", "Post-Production & Edit Lock", "Classification & Regulatory Clearance", "Delivery & Distribution", "Royalty Settlement & Final Payout"],
    buyerCaps: ["Track production milestones", "Review content per deliverable stage", "Dispute based on IP rights issues", "Access classification certificates", "Royalty statement verification", "Revenue share escrow"],
    vendorCaps: ["Milestone-based production financing", "Upload dailies and progress reports", "IP rights documentation trail", "Music clearance tracking", "Multi-territory distribution management", "Royalty calculation and split"],
  },
  {
    id: "aviation", name: "Aviation & Aerospace", icon: PlaneTakeoff, color: "text-sky-700",
    desc: "Aircraft parts, MRO services, charter contracts, airport infrastructure, and aviation equipment procurement.",
    stages: ["Contract & Airworthiness Compliance", "Parts Procurement & Traceability", "Incoming Inspection & Certification", "Installation / MRO Work", "Quality Assurance & NDT Testing", "Return to Service & Airworthiness", "Final Acceptance & Payout"],
    buyerCaps: ["Verify parts traceability chain", "Access EASA/FAA Form 8130-3", "Observer sign-off from airworthiness engineers", "Dispute based on NDT test failures", "Track part lifecycle (TSN/CSN)", "Warranty period protection"],
    vendorCaps: ["Milestone-based MRO payments", "Upload trace documentation and certs", "NDT testing documentation trail", "Certificate of Release to Service", "Multi-aircraft project management", "Warranty and rotable tracking"],
  },
  {
    id: "insurance", name: "Insurance & Reinsurance", icon: Shield, color: "text-emerald-600",
    desc: "Premium escrow, claims settlement, reinsurance treaty payments, and insurance-linked securities.",
    stages: ["Policy Proposal & Underwriting", "Premium Escrow & Policy Issuance", "Claim Notification & Documentation", "Claims Investigation & Assessment", "Claims Adjudication", "Settlement Payment", "Policy Close-Out"],
    buyerCaps: ["Premium escrow protection", "Track claims investigation progress", "Access assessor and survey reports", "Dispute adjudication decisions", "No-claims certificate access", "Renewal offer management"],
    vendorCaps: ["Premium escrow collection", "Upload underwriting documentation", "Claims investigation trail", "Adjudication workflow management", "Settlement calculation tools", "Reinsurance treaty management"],
  },
  {
    id: "legal-services", name: "Legal & Professional Services", icon: Scale, color: "text-indigo-700",
    desc: "Retainer escrow, case-based milestone payments, expert witness fees, and professional engagement management.",
    stages: ["Engagement Letter & Retainer Deposit", "Initial Research & Case Assessment", "Document Drafting / Filing", "Negotiation / Mediation Phase", "Court Proceedings / Hearing", "Resolution & Outcome", "Final Billing & Payout"],
    buyerCaps: ["Retainer escrow protection", "Track case milestone progress", "Access court filings and transcripts", "Dispute billing discrepancies", "Time sheet verification", "Disbursement tracking"],
    vendorCaps: ["Structured retainer management", "Upload case documents and filings", "Billable hours tracking", "Mediation/arbitration workflow", "Multi-matter management", "Trust account compliance"],
  },
  {
    id: "food-beverage", name: "Food & Beverage (Processed)", icon: UtensilsCrossed, color: "text-orange-500",
    desc: "Processed food exports, beverage manufacturing, HACCP compliance, and international food trade.",
    stages: ["Purchase Order & Compliance Pre-Check", "Factory Audit & HACCP Verification", "Production & Batch Testing", "Labeling Compliance & Packaging", "Export Documentation & Health Certificate", "Shipping & Cold Chain", "Import Clearance & Delivery"],
    buyerCaps: ["Verify HACCP and ISO 22000 before payment", "Monitor cold chain for perishables", "Access nutritional analysis reports", "Dispute based on quality test failure", "Allergen declaration verification", "Shelf life tracking"],
    vendorCaps: ["Escrow-protected food exports", "Upload HACCP and batch test reports", "Labeling compliance documentation", "Multi-market regulatory tracking", "Halal/Kosher certification management", "Seasonal production planning"],
  },
  {
    id: "waste-management", name: "Waste Management & Recycling", icon: Recycle, color: "text-lime-700",
    desc: "E-waste recycling, scrap metal exports, hazardous waste disposal, and environmental compliance.",
    stages: ["Contract & Waste Characterization", "Collection & Segregation", "Processing & Treatment", "Environmental Compliance Audit", "Export Documentation (if cross-border)", "Delivery to End Processor / Smelter", "Final Report & Payout"],
    buyerCaps: ["Track waste processing progress", "Verify environmental compliance audits", "Observer sign-off from environmental auditors", "Access Basel Convention documentation", "Certificate of destruction verification", "Revenue share from recycled materials"],
    vendorCaps: ["Milestone-based processing payments", "Upload waste characterization reports", "Environmental compliance documentation", "Basel Convention notification management", "Multi-facility processing coordination", "Revenue share calculation tools"],
  },
  // Original industries kept below
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

export const INDUSTRY_MILESTONE_MAP: Record<string, MilestoneTemplate[]> = {
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
  "energy": [
    { name: "Contract & LC / PO Upload", percentage: 5, documents: ["Service Contract", "Purchase Order", "LC (if applicable)"], documentMode: "required", description: "Trade agreement and financial instrument uploaded and co-signed", requiresObserver: false },
    { name: "Equipment Inspection at Origin", percentage: 10, documents: ["Equipment Inspection Report", "Manufacturer Certificate", "API Compliance Certificate"], documentMode: "required", description: "Third-party inspection of equipment or materials before dispatch", requiresObserver: true },
    { name: "Export License & Regulatory Clearance", percentage: 10, documents: ["Export License", "NNPC Approval", "Environmental Impact Assessment"], documentMode: "required", description: "Government and regulatory body clearance for export", requiresObserver: true },
    { name: "Shipping & Freight Documentation", percentage: 20, documents: ["Bill of Lading", "Marine Insurance Certificate", "Dangerous Goods Declaration"], documentMode: "required", description: "Goods dispatched with full freight documentation", requiresObserver: true },
    { name: "Import Customs & Duty Settlement", percentage: 15, documents: ["Import Declaration", "Duty Receipt", "Pre-Arrival Assessment Report"], documentMode: "required", description: "Destination country customs processing and duty payment", requiresObserver: true },
    { name: "Installation & Commissioning", percentage: 25, documents: ["Installation Report", "Commissioning Certificate", "Safety Compliance Report"], documentMode: "required", description: "Equipment installed, tested, and commissioned on-site", requiresObserver: true },
    { name: "Final Acceptance & Payout", percentage: 15, documents: ["Acceptance Certificate", "Performance Test Report", "Warranty Documentation"], documentMode: "required", description: "Client acceptance testing passed, escrow funds released", requiresObserver: true },
  ],
  "pharmaceuticals": [
    { name: "Regulatory Pre-Approval", percentage: 5, documents: ["NAFDAC/SAHPRA Import Permit", "WHO Prequalification"], documentMode: "required", description: "Regulatory approval obtained before procurement", requiresObserver: true },
    { name: "GMP Audit & Batch Certification", percentage: 15, documents: ["GMP Certificate", "Batch Analysis Report", "Certificate of Pharmaceutical Product"], documentMode: "required", description: "Manufacturing facility audited, batch quality verified", requiresObserver: true },
    { name: "Cold Chain Preparation", percentage: 10, documents: ["Cold Chain Protocol", "Temperature Logger Calibration"], documentMode: "required", description: "Temperature-sensitive goods prepared with validated cold chain", requiresObserver: true },
    { name: "Export & Customs", percentage: 15, documents: ["Export License", "Customs Declaration", "Controlled Substance Permit"], documentMode: "required", description: "Export clearance with controlled substance tracking", requiresObserver: true },
    { name: "Shipping with Temp Monitoring", percentage: 20, documents: ["Air Waybill", "Temperature Log Data", "Insurance Certificate"], documentMode: "required", description: "Goods in transit with continuous temperature monitoring", requiresObserver: true },
    { name: "Import Clearance & Release", percentage: 20, documents: ["Import Declaration", "NAFDAC Release Certificate", "Quality Re-Test Report"], documentMode: "required", description: "Destination regulatory body releases goods", requiresObserver: true },
    { name: "Delivery & Payout", percentage: 15, documents: ["Delivery Receipt", "End-User Certificate", "Temperature Compliance Report"], documentMode: "required", description: "Goods delivered within spec, escrow released", requiresObserver: true },
  ],
  "telecommunications": [
    { name: "Contract & Site Survey", percentage: 5, documents: ["Service Contract", "Technical Specifications", "Site Survey Report"], documentMode: "required", description: "Project scope defined with site survey completed", requiresObserver: false },
    { name: "Equipment Procurement & FAT", percentage: 15, documents: ["Equipment PO", "Factory Acceptance Test Report", "CE/FCC Certification"], documentMode: "required", description: "Network equipment procured and factory-tested", requiresObserver: true },
    { name: "Site Preparation & Civil Works", percentage: 15, documents: ["Civil Works Report", "Foundation Certification", "Environmental Clearance"], documentMode: "required", description: "Tower site or fiber route prepared", requiresObserver: true },
    { name: "Equipment Installation", percentage: 25, documents: ["Installation Report", "RF Coverage Test", "Power System Commissioning"], documentMode: "required", description: "Equipment mounted, connected, and powered", requiresObserver: true },
    { name: "Network Integration & Testing", percentage: 20, documents: ["Integration Test Report", "Drive Test Results", "KPI Benchmark Report"], documentMode: "required", description: "Network live and meeting performance KPIs", requiresObserver: true },
    { name: "Regulatory License", percentage: 5, documents: ["NCC/CA License", "Spectrum Assignment", "Type Approval Certificate"], documentMode: "required", description: "Regulatory body approval for operation", requiresObserver: true },
    { name: "Acceptance & Payout", percentage: 15, documents: ["Site Acceptance Certificate", "Warranty Agreement", "As-Built Documentation"], documentMode: "required", description: "Client accepts site, escrow released", requiresObserver: true },
  ],
  "manufacturing": [
    { name: "PO & Technical Spec Review", percentage: 5, documents: ["Purchase Order", "Technical Specifications", "CE/ISO Certificate"], documentMode: "required", description: "Equipment specifications reviewed and order confirmed", requiresObserver: false },
    { name: "Factory Acceptance Test", percentage: 15, documents: ["FAT Report", "Quality Control Certificate", "Calibration Records"], documentMode: "required", description: "Equipment tested at manufacturer facility", requiresObserver: true },
    { name: "Packaging & Shipping Prep", percentage: 10, documents: ["Packing List", "Insurance Certificate", "Fumigation Certificate"], documentMode: "required", description: "Equipment secured for international transit", requiresObserver: false },
    { name: "Shipping & Customs", percentage: 20, documents: ["Bill of Lading", "Import Declaration", "SON Certificate"], documentMode: "required", description: "Equipment cleared through destination customs", requiresObserver: true },
    { name: "Site Installation", percentage: 25, documents: ["Installation Report", "Foundation Certificate", "Electrical Compliance"], documentMode: "required", description: "Equipment installed at buyer facility", requiresObserver: true },
    { name: "Commissioning & Performance", percentage: 15, documents: ["Commissioning Report", "Performance Test Results", "OEM Sign-Off"], documentMode: "required", description: "Equipment tested under operating conditions", requiresObserver: true },
    { name: "Final Acceptance & Warranty", percentage: 10, documents: ["Acceptance Certificate", "Warranty Card", "Training Completion"], documentMode: "required", description: "Buyer accepts equipment, warranty begins", requiresObserver: true },
  ],
  "renewable-energy": [
    { name: "EPC Contract & Feasibility", percentage: 5, documents: ["EPC Contract", "Feasibility Study", "Environmental Impact Assessment"], documentMode: "required", description: "Engineering, procurement, construction agreement signed", requiresObserver: false },
    { name: "Equipment & IEC Certification", percentage: 15, documents: ["Panel/Turbine Specs", "IEC 61215/61730 Certificate", "Inverter Datasheet"], documentMode: "required", description: "Equipment sourced with international certification", requiresObserver: true },
    { name: "Shipping & Import", percentage: 15, documents: ["Bill of Lading", "Import Declaration", "Duty Exemption Certificate"], documentMode: "required", description: "Equipment imported (may qualify for green energy duty exemption)", requiresObserver: true },
    { name: "Civil Works & Mounting", percentage: 20, documents: ["Foundation Report", "Structural Analysis", "Mounting Photos"], documentMode: "required", description: "Site prepared and mounting structures installed", requiresObserver: true },
    { name: "Electrical & Grid Connection", percentage: 20, documents: ["Electrical Installation Report", "Grid Connection Approval", "Safety Certification"], documentMode: "required", description: "Panels/turbines connected to electrical system", requiresObserver: true },
    { name: "Commissioning & PR Test", percentage: 15, documents: ["Commissioning Certificate", "Performance Ratio Report"], documentMode: "required", description: "System commissioned with verified performance output", requiresObserver: true },
    { name: "Handover & Payout", percentage: 10, documents: ["O&M Manual", "Warranty Certificate", "Training Record"], documentMode: "required", description: "System handed to client with documentation", requiresObserver: true },
  ],
  "textiles": [
    { name: "PO & Design Approval", percentage: 5, documents: ["Purchase Order", "Design Spec Sheet", "Fabric Swatch Approval"], documentMode: "required", description: "Design specifications confirmed and fabric approved", requiresObserver: false },
    { name: "Raw Material Sourcing", percentage: 10, documents: ["GOTS Certificate", "Fair Trade Certificate", "Fabric Test Report"], documentMode: "required", description: "Raw materials sourced with sustainability certification", requiresObserver: true },
    { name: "Sampling & QC", percentage: 15, documents: ["Pre-Production Sample", "AQL Inspection Report"], documentMode: "required", description: "Sample approved, production quality benchmarked", requiresObserver: true },
    { name: "Bulk Production", percentage: 25, documents: ["Mid-Line Inspection Report", "Production Progress Photos"], documentMode: "required", description: "Bulk production with quality checks", requiresObserver: true },
    { name: "Final Inspection & Packaging", percentage: 15, documents: ["Final Random Inspection", "Packaging Compliance", "Labeling Check"], documentMode: "required", description: "Finished goods inspected and packed", requiresObserver: true },
    { name: "Shipping & Customs", percentage: 20, documents: ["Bill of Lading", "Certificate of Origin", "Customs Declaration"], documentMode: "required", description: "Goods exported with trade documentation", requiresObserver: true },
    { name: "Delivery & Payment Release", percentage: 10, documents: ["Delivery Receipt", "Quality Acceptance Note"], documentMode: "optional", description: "Goods received, escrow released", requiresObserver: false },
  ],
  "marine-fisheries": [
    { name: "Fishing License & Registration", percentage: 5, documents: ["Fishing License", "Vessel Registration", "Crew Manifest"], documentMode: "required", description: "Licensed vessel with registered crew", requiresObserver: false },
    { name: "Catch Documentation & IUU", percentage: 15, documents: ["Catch Certificate", "IUU Declaration", "Logbook Extract"], documentMode: "required", description: "Catch documented per FAO/EU IUU regulations", requiresObserver: true },
    { name: "Cold Chain & HACCP", percentage: 20, documents: ["HACCP Certificate", "Processing Plant Audit", "Temperature Records"], documentMode: "required", description: "Seafood processed in certified facility", requiresObserver: true },
    { name: "Health Certificate & Export", percentage: 15, documents: ["Health Certificate", "Veterinary Certificate", "Export Permit"], documentMode: "required", description: "Government clears goods for export", requiresObserver: true },
    { name: "Shipping & Reefer Monitoring", percentage: 20, documents: ["Bill of Lading", "Reefer Temperature Log", "Insurance Certificate"], documentMode: "required", description: "Seafood shipped in monitored container", requiresObserver: true },
    { name: "Import Inspection & Release", percentage: 15, documents: ["Import Health Check", "FDA/EU Border Inspection"], documentMode: "required", description: "Destination country inspects and releases", requiresObserver: true },
    { name: "Delivery & Settlement", percentage: 10, documents: ["Delivery Receipt", "Weight Verification"], documentMode: "required", description: "Goods delivered, escrow released", requiresObserver: false },
  ],
  "automotive-import": [
    { name: "Purchase & Vehicle Selection", percentage: 5, documents: ["Purchase Agreement", "Vehicle Spec Sheet", "VIN Documentation"], documentMode: "required", description: "Vehicle selected with verified identification", requiresObserver: false },
    { name: "Pre-Shipment Inspection", percentage: 15, documents: ["PSI Certificate", "Roadworthiness Report", "Emissions Test"], documentMode: "required", description: "Vehicle inspected at origin for standards compliance", requiresObserver: true },
    { name: "Export Documentation", percentage: 10, documents: ["Export Certificate", "De-Registration Certificate"], documentMode: "required", description: "Vehicle de-registered and cleared for export", requiresObserver: false },
    { name: "Shipping & Insurance", percentage: 20, documents: ["Bill of Lading", "Marine Insurance", "Container Loading Photos"], documentMode: "required", description: "Vehicle shipped via RoRo or container", requiresObserver: true },
    { name: "Import Customs & Duty", percentage: 25, documents: ["Import Declaration", "Duty Assessment", "SON/KEBS Certificate"], documentMode: "required", description: "Vehicle cleared through customs with duty paid", requiresObserver: true },
    { name: "Registration & Roadworthiness", percentage: 15, documents: ["Registration Certificate", "Local Roadworthiness", "Insurance Policy"], documentMode: "required", description: "Vehicle registered in destination country", requiresObserver: false },
    { name: "Delivery & Payout", percentage: 10, documents: ["Delivery Receipt", "Key Handover Confirmation"], documentMode: "optional", description: "Vehicle delivered, escrow released", requiresObserver: false },
  ],
  "water-sanitation": [
    { name: "Contract & Survey", percentage: 5, documents: ["Construction Contract", "Hydrogeological Survey", "EIA"], documentMode: "required", description: "Site surveyed and contract signed", requiresObserver: true },
    { name: "Mobilization", percentage: 10, documents: ["Mobilization Report", "Permit Approvals", "Safety Plan"], documentMode: "required", description: "Equipment mobilized and site prepared", requiresObserver: false },
    { name: "Drilling / Excavation", percentage: 25, documents: ["Drilling Log", "Geological Sample Analysis", "Progress Photos"], documentMode: "required", description: "Primary construction phase completed", requiresObserver: true },
    { name: "Infrastructure Installation", percentage: 20, documents: ["Pump Installation Report", "Pipeline Test", "Tank Completion"], documentMode: "required", description: "Pumps, pipes, storage installed", requiresObserver: true },
    { name: "Water Quality Testing", percentage: 15, documents: ["WHO Water Quality Report", "Lab Analysis Certificate", "Flow Rate Test"], documentMode: "required", description: "Water tested against WHO/national standards", requiresObserver: true },
    { name: "Community Handover", percentage: 15, documents: ["Handover Certificate", "O&M Training Report", "Community Agreement"], documentMode: "required", description: "System handed to community with training", requiresObserver: true },
    { name: "Defects Liability & Payout", percentage: 10, documents: ["Defects Inspection Report", "Final Acceptance Certificate"], documentMode: "required", description: "Defects liability period passed, escrow released", requiresObserver: false },
  ],
  "media-entertainment": [
    { name: "Deal Memo & IP Agreement", percentage: 10, documents: ["Deal Memo", "IP License Agreement", "Distribution Rights"], documentMode: "required", description: "Creative deal terms and IP rights agreed", requiresObserver: false },
    { name: "Pre-Production", percentage: 10, documents: ["Approved Script", "Budget Breakdown", "Insurance Certificate"], documentMode: "required", description: "Script finalized, budget approved", requiresObserver: false },
    { name: "Principal Photography/Recording", percentage: 30, documents: ["Daily Production Reports", "Call Sheets", "Footage Log"], documentMode: "required", description: "Main content creation phase", requiresObserver: true },
    { name: "Post-Production", percentage: 20, documents: ["Edit Lock Confirmation", "VFX/Sound Mix Report", "Music Clearance"], documentMode: "required", description: "Editing, VFX, sound design completed", requiresObserver: false },
    { name: "Classification & Clearance", percentage: 10, documents: ["Film Classification Certificate", "Broadcast License"], documentMode: "required", description: "Content rated and cleared for distribution", requiresObserver: true },
    { name: "Delivery & Distribution", percentage: 10, documents: ["Delivery Confirmation", "Platform Upload Receipt"], documentMode: "required", description: "Final deliverable sent to distributor", requiresObserver: false },
    { name: "Royalty Settlement", percentage: 10, documents: ["Revenue Report", "Royalty Statement"], documentMode: "optional", description: "Revenue share calculated, escrow released", requiresObserver: false },
  ],
  "aviation": [
    { name: "Contract & Airworthiness", percentage: 5, documents: ["Service Contract", "Airworthiness Directive", "Part 145 Certificate"], documentMode: "required", description: "MRO or parts contract with regulatory compliance", requiresObserver: true },
    { name: "Parts Procurement & Trace", percentage: 15, documents: ["Parts PO", "EASA/FAA Form 8130-3", "Trace Documentation"], documentMode: "required", description: "Aviation parts with full traceability chain", requiresObserver: true },
    { name: "Incoming Inspection", percentage: 15, documents: ["Incoming Inspection Report", "Material Certificate", "Shelf Life Verification"], documentMode: "required", description: "Parts inspected and certified upon receipt", requiresObserver: true },
    { name: "Installation / MRO Work", percentage: 25, documents: ["Work Order", "Engineering Order", "Progress Photos"], documentMode: "required", description: "Parts installed or maintenance performed", requiresObserver: true },
    { name: "QA & NDT Testing", percentage: 15, documents: ["QA Inspection Report", "NDT Test Results", "Release Certificate"], documentMode: "required", description: "Non-destructive testing and quality sign-off", requiresObserver: true },
    { name: "Return to Service", percentage: 15, documents: ["Certificate of Release to Service", "Airworthiness Review Certificate"], documentMode: "required", description: "Aircraft returned to service with documentation", requiresObserver: true },
    { name: "Final Acceptance & Payout", percentage: 10, documents: ["Customer Acceptance", "Warranty Certificate"], documentMode: "required", description: "Client accepts work, escrow released", requiresObserver: true },
  ],
  "insurance": [
    { name: "Proposal & Underwriting", percentage: 10, documents: ["Proposal Form", "Risk Assessment Report", "Underwriting Decision"], documentMode: "required", description: "Risk assessed and policy terms proposed", requiresObserver: false },
    { name: "Premium Escrow & Policy", percentage: 20, documents: ["Premium Receipt", "Policy Document", "Schedule of Benefits"], documentMode: "required", description: "Premium deposited, policy issued", requiresObserver: false },
    { name: "Claim Notification", percentage: 10, documents: ["Claim Form", "Loss Report"], documentMode: "required", description: "Claim filed with supporting documentation", requiresObserver: false },
    { name: "Claims Investigation", percentage: 20, documents: ["Assessor Report", "Survey Report"], documentMode: "required", description: "Independent assessment of claim validity", requiresObserver: true },
    { name: "Claims Adjudication", percentage: 15, documents: ["Adjudication Decision", "Calculation Sheet"], documentMode: "required", description: "Claim approved or denied with rationale", requiresObserver: true },
    { name: "Settlement Payment", percentage: 15, documents: ["Settlement Offer", "Acceptance Letter"], documentMode: "required", description: "Settlement amount released from escrow", requiresObserver: false },
    { name: "Policy Close-Out", percentage: 10, documents: ["Close-Out Report", "No-Claims Certificate"], documentMode: "optional", description: "Policy period ended, final reconciliation", requiresObserver: false },
  ],
  "legal-services": [
    { name: "Engagement & Retainer", percentage: 15, documents: ["Engagement Letter", "Fee Agreement", "Conflict Check"], documentMode: "required", description: "Terms agreed, retainer deposited", requiresObserver: false },
    { name: "Research & Assessment", percentage: 15, documents: ["Research Memo", "Case Assessment Report"], documentMode: "required", description: "Initial legal research and strategy", requiresObserver: false },
    { name: "Document Drafting / Filing", percentage: 20, documents: ["Draft Documents", "Court Filing Receipt"], documentMode: "required", description: "Key documents drafted and filed", requiresObserver: false },
    { name: "Negotiation / Mediation", percentage: 15, documents: ["Negotiation Summary", "Mediation Report"], documentMode: "optional", description: "Active negotiation or mediation", requiresObserver: true },
    { name: "Court Proceedings", percentage: 15, documents: ["Court Order", "Hearing Transcript"], documentMode: "required", description: "Court appearances completed", requiresObserver: true },
    { name: "Resolution & Outcome", percentage: 10, documents: ["Judgment/Settlement Agreement"], documentMode: "required", description: "Case resolved with documented outcome", requiresObserver: false },
    { name: "Final Billing & Payout", percentage: 10, documents: ["Final Invoice", "Time Sheet Summary"], documentMode: "required", description: "Final fees calculated, escrow released", requiresObserver: false },
  ],
  "food-beverage": [
    { name: "PO & Compliance Pre-Check", percentage: 5, documents: ["Purchase Order", "NAFDAC/FDA Registration"], documentMode: "required", description: "Product registration and dietary compliance verified", requiresObserver: false },
    { name: "Factory Audit & HACCP", percentage: 15, documents: ["HACCP Certificate", "Factory Audit Report", "ISO 22000 Certificate"], documentMode: "required", description: "Manufacturing facility audited for food safety", requiresObserver: true },
    { name: "Production & Batch Testing", percentage: 20, documents: ["Batch Test Report", "Nutritional Analysis", "Shelf Life Study"], documentMode: "required", description: "Production batch tested for quality and safety", requiresObserver: true },
    { name: "Labeling & Packaging", percentage: 10, documents: ["Label Approval", "Allergen Declaration", "Packaging Compliance"], documentMode: "required", description: "Labels meet destination country requirements", requiresObserver: false },
    { name: "Export & Health Certificate", percentage: 15, documents: ["Health Certificate", "Certificate of Origin"], documentMode: "required", description: "Government clears for export", requiresObserver: true },
    { name: "Shipping & Cold Chain", percentage: 20, documents: ["Bill of Lading", "Temperature Log", "Insurance Certificate"], documentMode: "required", description: "Goods shipped with temperature control", requiresObserver: true },
    { name: "Import Clearance & Delivery", percentage: 15, documents: ["Import Declaration", "FDA/NAFDAC Release", "Delivery Receipt"], documentMode: "required", description: "Goods cleared and delivered, escrow released", requiresObserver: true },
  ],
  "waste-management": [
    { name: "Contract & Waste Characterization", percentage: 5, documents: ["Service Contract", "Waste Characterization Report", "Basel Convention Notification"], documentMode: "required", description: "Waste classified and notification filed", requiresObserver: true },
    { name: "Collection & Segregation", percentage: 15, documents: ["Collection Manifest", "Segregation Report", "Weight Tickets"], documentMode: "required", description: "Waste collected, sorted, and documented", requiresObserver: false },
    { name: "Processing & Treatment", percentage: 25, documents: ["Processing Report", "Emissions Monitoring", "Residue Analysis"], documentMode: "required", description: "Waste processed at licensed facility", requiresObserver: true },
    { name: "Environmental Compliance Audit", percentage: 15, documents: ["Environmental Audit Report", "ISO 14001 Certificate"], documentMode: "required", description: "Facility passes environmental audit", requiresObserver: true },
    { name: "Export Documentation", percentage: 15, documents: ["Basel Convention Consent", "Export License", "Customs Declaration"], documentMode: "required", description: "Cross-border movement authorized", requiresObserver: true },
    { name: "Delivery to End Processor", percentage: 15, documents: ["Delivery Receipt", "Assay Report", "Certificate of Destruction"], documentMode: "required", description: "Material delivered to final processor", requiresObserver: true },
    { name: "Final Report & Payout", percentage: 10, documents: ["Completion Certificate", "Environmental Clearance"], documentMode: "required", description: "Project completed, escrow released", requiresObserver: false },
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
    { name: "Enrollment & Deposit", percentage: 25, documents: ["Enrollment Form"], documentMode: "optional", description: "Student enrolled, tuition deposited", requiresObserver: false },
    { name: "Course Access", percentage: 25, documents: ["Course Materials"], documentMode: "optional", description: "Access to learning materials provided", requiresObserver: false },
    { name: "Assessment", percentage: 25, documents: ["Assessment Results"], documentMode: "optional", description: "Mid-program or final assessment completed", requiresObserver: false },
    { name: "Certification & Payout", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certificate issued, payout released", requiresObserver: false },
  ],
  "project-management": [
    { name: "Project Charter & SOW", percentage: 10, documents: ["Project Charter", "Statement of Work"], documentMode: "required", description: "Scope, objectives, and deliverables defined", requiresObserver: false },
    { name: "Kick-Off & Resource Plan", percentage: 5, documents: ["Resource Plan", "RACI Matrix"], documentMode: "optional", description: "Team assigned, kick-off completed", requiresObserver: false },
    { name: "Phase 1 Deliverables", percentage: 25, documents: ["Phase 1 Report", "Progress Photos"], documentMode: "required", description: "First major deliverable completed", requiresObserver: true },
    { name: "Mid-Project Review", percentage: 10, documents: ["Status Report", "Change Order Log"], documentMode: "required", description: "Formal review and scope validation", requiresObserver: true },
    { name: "Phase 2 Deliverables", percentage: 25, documents: ["Phase 2 Report", "Test Results"], documentMode: "required", description: "Second major deliverable completed", requiresObserver: true },
    { name: "UAT / Acceptance Testing", percentage: 15, documents: ["UAT Sign-Off", "Punch List"], documentMode: "required", description: "Client acceptance testing", requiresObserver: false },
    { name: "Project Close-Out", percentage: 10, documents: ["Close-Out Report", "Lessons Learned"], documentMode: "optional", description: "Final documentation and escrow release", requiresObserver: false },
  ],
};

export const platformTools = [
  { icon: Search, name: "Universal Search (Cmd+K)", desc: "Live database search across transactions, disputes, orders" },
  { icon: Bot, name: "AI Assistants", desc: "Emmanuel (Admin), Amani (Vendor), Zawadi (Buyer)" },
  { icon: FileText, name: "Document Archive", desc: "7-year retention, searchable contracts & evidence" },
  { icon: BarChart3, name: "Analytics Dashboard", desc: "Revenue charts, volume metrics, CSV/PDF exports" },
  { icon: Shield, name: "Compliance Engine", desc: "4-tier KYC, OFAC/EU/UN sanctions screening" },
  { icon: Wallet, name: "Multi-Rail Payouts", desc: "Bank, mobile money, crypto (USDC on Polygon)" },
  { icon: AlertTriangle, name: "Dispute Resolution", desc: "AI-assisted analysis with confidence scoring" },
  { icon: Globe, name: "Widget & Standalone Links", desc: "Embeddable checkout + P2P payment links" },
];

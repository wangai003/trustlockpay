import type { MockMilestone } from "@/hooks/useTestnetData";

export type OrderType = "simple" | "milestone" | "hybrid";
export type LayoutMode = "linear" | "single" | "inspection" | "offline";
export type ActionVisual = "submit" | "confirm" | "sign" | "release";

export interface MilestoneWorkOrderPanelProps {
  transactionId?: string | null;
  txId: string;
  industry?: string | null;
  role: "buyer" | "vendor" | "admin";
  transactionStatus?: string;
  orderType?: OrderType;
  isTestnet?: boolean;
  testnetMilestones?: MockMilestone[];
  onTestnetUpdateStatus?: (milestoneId: string, status: MockMilestone["status"]) => void;
  onTestnetSaveNote?: (milestoneId: string, note: string) => void;
  onTestnetAddDocument?: (milestoneId: string, doc: { name: string; url: string }) => void;
  onTestnetInviteObserver?: (milestoneId: string, name: string, email: string) => string | void;
  onTestnetRelease?: (milestoneId: string) => void;
  onTestnetAddGps?: (milestoneId: string, lat: number, lng: number, accuracy: number, address?: string, city?: string, country?: string) => void;
}

export interface MilestoneTemplate {
  name: string; percentage: number; documents: string[];
  documentMode: "none" | "optional" | "required";
  description: string; requiresObserver: boolean;
  owner: "vendor" | "buyer" | "both";
  vendorAction?: string;
  buyerAction?: string;
  documentOwners?: Record<string, "vendor" | "buyer" | "either">;
}

export const FUNDS_LOCKED_STATUSES = new Set([
  "locked", "shipped", "delivered", "released", "disputed",
  "compliance_hold", "compliance_review", "blocked",
]);

export const INDUSTRY_LAYOUT: Record<string, LayoutMode> = {
  "oil-gas": "inspection", "oil_gas": "inspection", "energy": "inspection",
  "renewable-energy": "inspection", "renewable_energy": "inspection",
  "mining": "inspection", "pharma": "inspection", "pharmaceutical": "inspection",
  "agriculture": "inspection", "marine": "inspection",
  "water-wash": "inspection", "water_wash": "inspection",
  "food-beverage": "inspection", "food_beverage": "inspection",
  "waste-recycling": "inspection", "waste_recycling": "inspection", "aviation": "inspection",
  "real-estate": "offline", "real_estate": "offline", "legal": "offline",
  "insurance": "offline", "construction": "offline",
  "ecommerce": "single", "e-commerce": "single", "tourism": "single",
  "hospitality-travel": "single", "hospitality_travel": "single",
  "freelance": "linear", "digital-services": "linear", "digital_services": "linear",
  "professional-services": "linear", "professional_services": "linear",
  "education": "linear", "manufacturing": "linear", "textiles": "linear",
  "automotive": "linear", "telecom": "linear", "telecommunications": "linear",
  "media": "linear", "media-entertainment": "linear", "media_entertainment": "linear",
  "logistics": "linear",
};

export function resolveLayoutMode(industry?: string | null, orderType?: OrderType): LayoutMode {
  if (orderType === "simple") return "single";
  if (industry && INDUSTRY_LAYOUT[industry]) return INDUSTRY_LAYOUT[industry];
  if (orderType === "milestone") return "linear";
  return "linear";
}

export const OBSERVER_FREE_INDUSTRIES = new Set([
  "ecommerce", "tourism", "freelance", "education",
  "e-commerce", "digital-services", "hospitality-travel", "professional-services",
]);

export const statusLabel: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Fulfilled",
  released: "Released", deleted: "Removed",
};

export const LAYOUT_MODE_LABELS: Record<LayoutMode, { title: string; description: string }> = {
  linear: { title: "Milestone Work Order", description: "Progressive milestone delivery" },
  single: { title: "Escrow Release", description: "Single release upon delivery" },
  inspection: { title: "Inspection-Gated Work Order", description: "Observer-verified milestones" },
  offline: { title: "Offline Confirmation", description: "Digital confirmation of offline steps" },
};

export const LAYOUT_MODE_ICONS: Record<LayoutMode, string> = {
  linear: "📋", single: "🔒", inspection: "🔍", offline: "💼",
};

export function classifyAction(label: string): ActionVisual {
  const l = label.toLowerCase();
  if (/release|approve.*release|sign.*off.*release/.test(l)) return "release";
  if (/sign|countersign|execute|accept.*sign/.test(l)) return "sign";
  if (/submit|upload|grant|issue/.test(l)) return "submit";
  return "confirm";
}

import { Upload, PenLine, Banknote, PackageCheck } from "lucide-react";
import type React from "react";

export const ACTION_STYLES: Record<ActionVisual, { icon: React.ElementType; className: string }> = {
  submit:  { icon: Upload,       className: "border-2 border-primary text-primary bg-primary/5 hover:bg-primary/15 shadow-sm" },
  confirm: { icon: PackageCheck, className: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" },
  sign:    { icon: PenLine,      className: "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 shadow-sm" },
  release: { icon: Banknote,     className: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg ring-1 ring-amber-400/30" },
};

export const INDUSTRY_MILESTONES: Record<string, MilestoneTemplate[]> = {
  "construction": [
    { name: "Contract Upload", percentage: 5, documents: ["Construction Contract"], documentMode: "required", description: "Both parties sign the contract", requiresObserver: false, owner: "both", vendorAction: "Upload Contract", buyerAction: "Countersign Contract", documentOwners: { "Construction Contract": "either" } },
    { name: "Foundation Inspection", percentage: 15, documents: ["Inspection Report", "Soil Test"], documentMode: "required", description: "Inspector verifies foundation", requiresObserver: true, owner: "vendor", vendorAction: "Submit Inspection", documentOwners: { "Inspection Report": "vendor", "Soil Test": "vendor" } },
    { name: "Structural Phase", percentage: 25, documents: ["Engineer Report"], documentMode: "required", description: "Walls, roofing completed", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Structural Complete", documentOwners: { "Engineer Report": "vendor" } },
    { name: "MEP Verification", percentage: 20, documents: ["Electrical Cert", "Plumbing Report"], documentMode: "required", description: "Systems verified", requiresObserver: true, owner: "vendor", vendorAction: "Submit MEP Verification", documentOwners: { "Electrical Cert": "vendor", "Plumbing Report": "vendor" } },
    { name: "Walkthrough", percentage: 15, documents: ["Punch List"], documentMode: "optional", description: "Final inspection with buyer", requiresObserver: false, owner: "both", vendorAction: "Schedule Walkthrough", buyerAction: "Approve Walkthrough", documentOwners: { "Punch List": "buyer" } },
    { name: "Certificate of Occupancy", percentage: 10, documents: ["Occupancy Certificate"], documentMode: "required", description: "Government cert obtained", requiresObserver: true, owner: "vendor", vendorAction: "Submit Occupancy Cert", documentOwners: { "Occupancy Certificate": "vendor" } },
    { name: "Final Release", percentage: 10, documents: [], documentMode: "none", description: "Escrow released", requiresObserver: false, owner: "buyer", buyerAction: "Approve & Release" },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Survey"], documentMode: "required", description: "Legal review", requiresObserver: true, owner: "buyer", buyerAction: "Confirm Due Diligence", documentOwners: { "Title Deed": "vendor", "Survey": "buyer" } },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], documentMode: "optional", description: "Property inspection", requiresObserver: false, owner: "buyer", buyerAction: "Accept Inspection", documentOwners: { "Inspection Report": "buyer" } },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], documentMode: "required", description: "Property valuation", requiresObserver: true, owner: "both", vendorAction: "Submit Appraisal", buyerAction: "Accept Valuation", documentOwners: { "Appraisal Report": "vendor" } },
    { name: "Closing", percentage: 60, documents: ["Transfer Agreement"], documentMode: "required", description: "Key handover", requiresObserver: true, owner: "both", vendorAction: "Execute Transfer", buyerAction: "Confirm Possession", documentOwners: { "Transfer Agreement": "either" } },
  ],
  "agriculture": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract"], documentMode: "required", description: "Trade agreement", requiresObserver: true, owner: "both", vendorAction: "Sign Trade Contract", buyerAction: "Countersign Contract", documentOwners: { "Purchase Contract": "either" } },
    { name: "Harvest & Assay", percentage: 15, documents: ["Quality Certificate"], documentMode: "required", description: "Quality testing", requiresObserver: true, owner: "vendor", vendorAction: "Submit Assay Results", documentOwners: { "Quality Certificate": "vendor" } },
    { name: "Packaging", percentage: 15, documents: ["Phytosanitary Cert"], documentMode: "required", description: "Export certified", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Packaging", documentOwners: { "Phytosanitary Cert": "vendor" } },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Shipment", documentOwners: { "Bill of Lading": "vendor" } },
    { name: "Customs", percentage: 15, documents: ["Customs Declaration"], documentMode: "required", description: "Cleared", requiresObserver: true, owner: "vendor", vendorAction: "Submit Customs Clearance", documentOwners: { "Customs Declaration": "vendor" } },
    { name: "Delivery", percentage: 20, documents: ["Delivery Receipt"], documentMode: "optional", description: "Accepted", requiresObserver: false, owner: "buyer", buyerAction: "Confirm Delivery Received", documentOwners: { "Delivery Receipt": "buyer" } },
  ],
  "mining": [
    { name: "Assay & Cert", percentage: 10, documents: ["Assay Report"], documentMode: "required", description: "Purity certified", requiresObserver: true, owner: "vendor", vendorAction: "Submit Assay Report", documentOwners: { "Assay Report": "vendor" } },
    { name: "Export License", percentage: 5, documents: ["Export Permit"], documentMode: "required", description: "Authorized", requiresObserver: true, owner: "vendor", vendorAction: "Upload Export License", documentOwners: { "Export Permit": "vendor" } },
    { name: "Insurance", percentage: 10, documents: ["Insurance Cert"], documentMode: "required", description: "Insured & sealed", requiresObserver: false, owner: "vendor", vendorAction: "Confirm Insurance", documentOwners: { "Insurance Cert": "vendor" } },
    { name: "Customs (Origin)", percentage: 15, documents: ["AML Declaration"], documentMode: "required", description: "Origin clearance", requiresObserver: true, owner: "vendor", vendorAction: "Clear Origin Customs", documentOwners: { "AML Declaration": "vendor" } },
    { name: "Shipping", percentage: 25, documents: ["Air Waybill"], documentMode: "required", description: "In transit", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Dispatch", documentOwners: { "Air Waybill": "vendor" } },
    { name: "Destination", percentage: 20, documents: ["Import Declaration"], documentMode: "required", description: "Dest. clearance", requiresObserver: true, owner: "buyer", buyerAction: "Clear Import Customs", documentOwners: { "Import Declaration": "buyer" } },
    { name: "Delivery", percentage: 15, documents: ["Acceptance Form"], documentMode: "required", description: "Released", requiresObserver: false, owner: "buyer", buyerAction: "Accept & Sign Off", documentOwners: { "Acceptance Form": "buyer" } },
  ],
  "logistics": [
    { name: "Trade Agreement", percentage: 5, documents: ["Trade Contract"], documentMode: "required", description: "Agreement signed", requiresObserver: true, owner: "buyer", buyerAction: "Sign Trade Agreement", documentOwners: { "Trade Contract": "buyer" } },
    { name: "Origin Inspection", percentage: 15, documents: ["Inspection Cert"], documentMode: "required", description: "Inspected", requiresObserver: true, owner: "vendor", vendorAction: "Submit Inspection", documentOwners: { "Inspection Cert": "vendor" } },
    { name: "Export Customs", percentage: 15, documents: ["Export License"], documentMode: "required", description: "Cleared", requiresObserver: true, owner: "vendor", vendorAction: "Clear Export", documentOwners: { "Export License": "vendor" } },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Shipping", documentOwners: { "Bill of Lading": "vendor" } },
    { name: "Import Customs", percentage: 15, documents: ["Duty Receipt"], documentMode: "required", description: "Processed", requiresObserver: true, owner: "buyer", buyerAction: "Clear Import Duties", documentOwners: { "Duty Receipt": "buyer" } },
    { name: "Delivery", percentage: 10, documents: ["POD"], documentMode: "optional", description: "Delivered", requiresObserver: false, owner: "buyer", buyerAction: "Confirm Receipt", documentOwners: { "POD": "buyer" } },
    { name: "Settlement", percentage: 15, documents: ["Payment Confirmation"], documentMode: "required", description: "Released", requiresObserver: true, owner: "buyer", buyerAction: "Approve Settlement" },
  ],
  "freelance": [
    { name: "Scope", percentage: 20, documents: ["Scope Doc"], documentMode: "optional", description: "Requirements", requiresObserver: false, owner: "both", vendorAction: "Submit Scope", buyerAction: "Approve Scope", documentOwners: { "Scope Doc": "vendor" } },
    { name: "Draft", percentage: 30, documents: ["Draft"], documentMode: "optional", description: "First delivery", requiresObserver: false, owner: "vendor", vendorAction: "Submit Draft", documentOwners: { "Draft": "vendor" } },
    { name: "Revision", percentage: 20, documents: [], documentMode: "none", description: "Feedback round", requiresObserver: false, owner: "both", vendorAction: "Submit Revision", buyerAction: "Approve Revision" },
    { name: "Final", percentage: 30, documents: ["Sign-off Form"], documentMode: "required", description: "Approved", requiresObserver: false, owner: "buyer", buyerAction: "Sign Off & Release", documentOwners: { "Sign-off Form": "buyer" } },
  ],
  "ecommerce": [
    { name: "Payment Locked", percentage: 100, documents: [], documentMode: "none", description: "Full escrow", requiresObserver: false, owner: "vendor", vendorAction: "Confirm & Ship Order" },
  ],
  "tourism": [
    { name: "Booking", percentage: 50, documents: ["Booking Confirmation"], documentMode: "optional", description: "Reserved", requiresObserver: false, owner: "vendor", vendorAction: "Confirm Booking", documentOwners: { "Booking Confirmation": "vendor" } },
    { name: "Completed", percentage: 50, documents: [], documentMode: "none", description: "Service done", requiresObserver: false, owner: "buyer", buyerAction: "Confirm Service Completed" },
  ],
  "education": [
    { name: "Enrollment", percentage: 25, documents: ["Enrollment Form"], documentMode: "optional", description: "Enrolled", requiresObserver: false, owner: "vendor", vendorAction: "Confirm Enrollment", documentOwners: { "Enrollment Form": "vendor" } },
    { name: "Course Access", percentage: 25, documents: [], documentMode: "none", description: "Materials provided", requiresObserver: false, owner: "vendor", vendorAction: "Grant Access" },
    { name: "Assessment", percentage: 25, documents: ["Results"], documentMode: "optional", description: "Assessed", requiresObserver: false, owner: "vendor", vendorAction: "Submit Results", documentOwners: { "Results": "vendor" } },
    { name: "Certification", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certified", requiresObserver: false, owner: "vendor", vendorAction: "Issue Certificate", documentOwners: { "Certificate": "vendor" } },
  ],
  "oil-gas": [
    { name: "Contract & PO", percentage: 5, documents: ["Trade Contract", "Purchase Order"], documentMode: "required", description: "Agreement signed", requiresObserver: true, owner: "both", vendorAction: "Sign Contract", buyerAction: "Confirm Purchase Order", documentOwners: { "Trade Contract": "either", "Purchase Order": "buyer" } },
    { name: "Pre-Shipment Inspection", percentage: 15, documents: ["SGS/Intertek Report"], documentMode: "required", description: "Quality verified", requiresObserver: true, owner: "vendor", vendorAction: "Submit SGS Report", documentOwners: { "SGS/Intertek Report": "vendor" } },
    { name: "Loading", percentage: 20, documents: ["Bill of Lading", "Certificate of Origin"], documentMode: "required", description: "Loaded at terminal", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Loading", documentOwners: { "Bill of Lading": "vendor", "Certificate of Origin": "vendor" } },
    { name: "In Transit", percentage: 20, documents: ["Insurance Cert"], documentMode: "required", description: "Vessel tracking", requiresObserver: false, owner: "vendor", vendorAction: "Confirm Vessel Departure", documentOwners: { "Insurance Cert": "vendor" } },
    { name: "Discharge", percentage: 20, documents: ["Discharge Report"], documentMode: "required", description: "Port arrival", requiresObserver: true, owner: "buyer", buyerAction: "Confirm Discharge", documentOwners: { "Discharge Report": "buyer" } },
    { name: "Final Settlement", percentage: 20, documents: ["Final Invoice"], documentMode: "required", description: "Funds released", requiresObserver: true, owner: "buyer", buyerAction: "Approve Final Settlement", documentOwners: { "Final Invoice": "vendor" } },
  ],
  "pharma": [
    { name: "Order Confirmation", percentage: 10, documents: ["Purchase Order"], documentMode: "required", description: "Order placed", requiresObserver: false, owner: "buyer", buyerAction: "Confirm Purchase Order", documentOwners: { "Purchase Order": "buyer" } },
    { name: "GMP Verification", percentage: 15, documents: ["GMP Certificate", "NAFDAC/WHO Approval"], documentMode: "required", description: "Quality certified", requiresObserver: true, owner: "vendor", vendorAction: "Submit GMP Cert", documentOwners: { "GMP Certificate": "vendor", "NAFDAC/WHO Approval": "vendor" } },
    { name: "Cold Chain Packaging", percentage: 15, documents: ["Temperature Log"], documentMode: "required", description: "Packaged correctly", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Cold Chain", documentOwners: { "Temperature Log": "vendor" } },
    { name: "Shipping", percentage: 25, documents: ["Air Waybill", "Import Permit"], documentMode: "required", description: "In transit", requiresObserver: true, owner: "vendor", vendorAction: "Confirm Shipment", documentOwners: { "Air Waybill": "vendor", "Import Permit": "buyer" } },
    { name: "Customs & Inspection", percentage: 20, documents: ["Customs Release"], documentMode: "required", description: "Cleared", requiresObserver: true, owner: "buyer", buyerAction: "Clear Customs", documentOwners: { "Customs Release": "buyer" } },
    { name: "Delivery & Acceptance", percentage: 15, documents: ["Delivery Receipt"], documentMode: "required", description: "Accepted", requiresObserver: false, owner: "buyer", buyerAction: "Accept Delivery", documentOwners: { "Delivery Receipt": "buyer" } },
  ],
  "manufacturing": [
    { name: "PO Confirmation", percentage: 10, documents: ["Purchase Order"], documentMode: "required", description: "Order confirmed", requiresObserver: false, owner: "buyer", buyerAction: "Issue Purchase Order", documentOwners: { "Purchase Order": "buyer" } },
    { name: "Production Start", percentage: 15, documents: ["Production Plan"], documentMode: "optional", description: "Manufacturing begins", requiresObserver: false, owner: "vendor", vendorAction: "Begin Production", documentOwners: { "Production Plan": "vendor" } },
    { name: "QA Inspection", percentage: 20, documents: ["QA Report", "ISO Cert"], documentMode: "required", description: "Quality checked", requiresObserver: true, owner: "vendor", vendorAction: "Submit QA Report", documentOwners: { "QA Report": "vendor", "ISO Cert": "vendor" } },
    { name: "Packaging & Shipping", percentage: 25, documents: ["Packing List", "Bill of Lading"], documentMode: "required", description: "Shipped", requiresObserver: false, owner: "vendor", vendorAction: "Confirm Shipment", documentOwners: { "Packing List": "vendor", "Bill of Lading": "vendor" } },
    { name: "Delivery", percentage: 15, documents: ["Delivery Note"], documentMode: "optional", description: "Received", requiresObserver: false, owner: "buyer", buyerAction: "Confirm Receipt", documentOwners: { "Delivery Note": "buyer" } },
    { name: "Final Acceptance", percentage: 15, documents: ["Acceptance Certificate"], documentMode: "required", description: "Approved", requiresObserver: true, owner: "buyer", buyerAction: "Sign Acceptance", documentOwners: { "Acceptance Certificate": "buyer" } },
  ],
};

export const getUploadedKeys = (ms: any): Set<string> => {
  const uploadedDocs: any[] = Array.isArray(ms.uploaded_documents) ? ms.uploaded_documents : [];
  const keys = new Set<string>();
  for (const d of uploadedDocs) {
    if (d.document_type && d.document_type !== "general") keys.add(d.document_type.toLowerCase());
    if (d.name) keys.add(d.name.toLowerCase());
  }
  return keys;
};

const PRE_PAYMENT_DOCUMENTS = new Set([
  "letter of credit", "lc", "bank guarantee", "payment guarantee",
  "proforma invoice", "pro-forma invoice", "advance payment guarantee",
]);

export function getDocGateStatus(ms: any, fundsAreLocked: boolean) {
  const mode: "none" | "optional" | "required" = ms.document_mode || "none";
  const requiredDocs: string[] = ms.required_documents || [];
  const uploadedKeys = getUploadedKeys(ms);
  const autoSatisfied: string[] = [];
  const missingRequired: string[] = [];
  for (const doc of requiredDocs) {
    const dl = doc.toLowerCase();
    if (PRE_PAYMENT_DOCUMENTS.has(dl) && fundsAreLocked) {
      autoSatisfied.push(doc);
      continue;
    }
    const isMet = Array.from(uploadedKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
    if (!isMet) missingRequired.push(doc);
  }
  const optionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];
  const missingOptional = optionalDocs.filter((doc: string) => {
    const dl = doc.toLowerCase();
    return !Array.from(uploadedKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
  });
  return {
    mode, satisfied: missingRequired.length === 0,
    missingRequired, missingOptional, autoSatisfied,
  };
}

export function resolveBlueprint(industry?: string | null) {
  const key = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
  return INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;
}

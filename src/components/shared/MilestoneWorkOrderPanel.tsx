import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Copy, FileText, Loader2, MapPin, StickyNote, Trash2,
  UserPlus, X, AlertTriangle, User, ShieldCheck, RotateCcw, FileWarning,
  ChevronDown, ChevronRight, Shield, Layers, Eye, Lock, Unlock, Milestone as MilestoneIcon, Globe, Receipt,
  Upload, PenLine, Banknote, PackageCheck, Send, ClipboardCheck, Scale,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "@/components/shared/DocumentUpload";
import ExternalFeeTracker from "@/components/shared/ExternalFeeTracker";
import { getExternalFeeSuggestions } from "@/lib/externalFeeTemplates";
import { filterDocumentsByScope } from "@/lib/documentScopeFilter";
import TradeScopeSelector, { type TradeScope } from "@/components/shared/TradeScopeSelector";
import OfflineReconciliation from "@/components/shared/OfflineReconciliation";
import TLId from "@/components/shared/TLId";
import { woTLId } from "@/lib/tlIdRegistry";
import { useGeolocation } from "@/hooks/useGeolocation";
import { isGpsRequiredByIndustry } from "@/lib/industryList";
import { useBlockchainAnchor } from "@/hooks/useBlockchainAnchor";
import {
  useAddTransactionObserver,
  useCreateMilestones,
  useReleaseMilestonePayment,
  useTransactionMilestones,
  useTransactionObservers,
  useUpdateMilestone,
} from "@/hooks/useSupabaseData";
import type { MockMilestone } from "@/hooks/useTestnetData";

type OrderType = "simple" | "milestone" | "hybrid";

interface MilestoneWorkOrderPanelProps {
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

const FUNDS_LOCKED_STATUSES = new Set([
  "locked", "shipped", "delivered", "released", "disputed",
  "compliance_hold", "compliance_review", "blocked",
]);

type LayoutMode = "linear" | "single" | "inspection" | "offline";

const INDUSTRY_LAYOUT: Record<string, LayoutMode> = {
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

function resolveLayoutMode(industry?: string | null, orderType?: OrderType): LayoutMode {
  if (orderType === "simple") return "single";
  if (industry && INDUSTRY_LAYOUT[industry]) return INDUSTRY_LAYOUT[industry];
  if (orderType === "milestone") return "linear";
  return "linear";
}

const OBSERVER_FREE_INDUSTRIES = new Set([
  "ecommerce", "tourism", "freelance", "education",
  "e-commerce", "digital-services", "hospitality-travel", "professional-services",
]);

const statusLabel: Record<string, string> = {
  pending: "Pending", in_progress: "In Progress", completed: "Fulfilled",
  released: "Released", deleted: "Removed",
};

const LAYOUT_MODE_LABELS: Record<LayoutMode, { title: string; description: string }> = {
  linear: { title: "Milestone Work Order", description: "Progressive milestone delivery" },
  single: { title: "Escrow Release", description: "Single release upon delivery" },
  inspection: { title: "Inspection-Gated Work Order", description: "Observer-verified milestones" },
  offline: { title: "Offline Confirmation", description: "Digital confirmation of offline steps" },
};

const LAYOUT_MODE_ICONS: Record<LayoutMode, string> = {
  linear: "📋", single: "🔒", inspection: "🔍", offline: "💼",
};

type ActionVisual = "submit" | "confirm" | "sign" | "release";

function classifyAction(label: string): ActionVisual {
  const l = label.toLowerCase();
  if (/release|approve.*release|sign.*off.*release/.test(l)) return "release";
  if (/sign|countersign|execute|accept.*sign/.test(l)) return "sign";
  if (/submit|upload|grant|issue/.test(l)) return "submit";
  return "confirm";
}

const ACTION_STYLES: Record<ActionVisual, { icon: React.ElementType; className: string; }> = {
  submit:  { icon: Upload,         className: "border-2 border-primary text-primary bg-primary/5 hover:bg-primary/15 shadow-sm" },
  confirm: { icon: PackageCheck,   className: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" },
  sign:    { icon: PenLine,        className: "border-2 border-primary bg-primary/10 text-primary hover:bg-primary/20 shadow-sm" },
  release: { icon: Banknote,       className: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg ring-1 ring-amber-400/30" },
};

interface MilestoneTemplate {
  name: string; percentage: number; documents: string[];
  documentMode: "none" | "optional" | "required";
  description: string; requiresObserver: boolean;
  owner: "vendor" | "buyer" | "both";
  vendorAction?: string;
  buyerAction?: string;
  documentOwners?: Record<string, "vendor" | "buyer" | "either">;
}

const INDUSTRY_MILESTONES: Record<string, MilestoneTemplate[]> = {
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

const getUploadedKeys = (ms: any): Set<string> => {
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

function getDocGateStatus(ms: any, fundsAreLocked: boolean) {
  const mode: "none" | "optional" | "required" = ms.document_mode || "none";
  const requiredDocs: string[] = ms.required_documents || [];
  const optionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];
  const uploadedKeys = getUploadedKeys(ms);

  const autoSatisfied: string[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const doc of requiredDocs) {
    if (PRE_PAYMENT_DOCUMENTS.has(doc.toLowerCase()) && fundsAreLocked) {
      autoSatisfied.push(doc);
      continue;
    }
    const docLower = doc.toLowerCase();
    const isMet = Array.from(uploadedKeys).some(k => k.includes(docLower) || docLower.includes(k.replace(/\.[^.]+$/, "")));
    if (!isMet) missingRequired.push(doc);
  }

  for (const doc of optionalDocs) {
    const docLower = doc.toLowerCase();
    const isMet = Array.from(uploadedKeys).some(k => k.includes(docLower) || docLower.includes(k.replace(/\.[^.]+$/, "")));
    if (!isMet) missingOptional.push(doc);
  }

  return {
    mode,
    satisfied: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    autoSatisfied,
  };
}

/* ─── Progress Stepper ─── */
const ProgressStepper = ({ milestones, activeIndex, onStepClick }: { milestones: any[]; activeIndex: number; onStepClick: (idx: number) => void }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        {milestones.map((ms: any, idx: number) => {
          const isDone = ms.status === "completed" || ms.status === "released";
          const isActive = idx === activeIndex;
          const isDeleted = ms.status === "deleted";
          return (
            <button
              key={ms.id}
              onClick={() => onStepClick(idx)}
              className="flex-1 group relative"
              title={`${ms.title} — ${statusLabel[ms.status] || ms.status}`}
            >
              <div className={`h-1.5 rounded-full transition-all ${
                isDeleted ? "bg-muted" :
                isDone ? "bg-primary" :
                isActive ? "bg-primary/60 animate-pulse" :
                "bg-muted-foreground/20"
              } ${isActive ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`} />
              {milestones.length <= 10 && (
                <span className={`block text-center mt-1 text-[8px] leading-tight truncate ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}>
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const BlueprintSummary = ({ industry, layoutMode }: { industry?: string | null; layoutMode: LayoutMode }) => {
  const key = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
  const blueprintMs = INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;
  if (!blueprintMs) return null;
  const reqDocs = blueprintMs.flatMap(m => m.documentMode === "required" ? m.documents : []);
  const observers = blueprintMs.filter(m => m.requiresObserver).length;
  return (
    <div className="grid grid-cols-4 gap-1.5 text-center">
      <div className="rounded-md bg-muted/40 p-1.5">
        <p className="text-sm font-bold text-foreground">{blueprintMs.length}</p>
        <p className="text-[8px] text-muted-foreground">Stages</p>
      </div>
      <div className="rounded-md bg-muted/40 p-1.5">
        <p className="text-sm font-bold text-foreground">{reqDocs.length}</p>
        <p className="text-[8px] text-muted-foreground">Req. Docs</p>
      </div>
      <div className="rounded-md bg-muted/40 p-1.5">
        <p className="text-sm font-bold text-foreground">{observers}</p>
        <p className="text-[8px] text-muted-foreground">Observers</p>
      </div>
      <div className="rounded-md bg-muted/40 p-1.5">
        <p className="text-[10px] font-bold text-foreground capitalize">{layoutMode}</p>
        <p className="text-[8px] text-muted-foreground">Flow</p>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */

const MilestoneWorkOrderPanel = ({
  transactionId, txId, industry, role, transactionStatus, orderType,
  isTestnet = false, testnetMilestones,
  onTestnetUpdateStatus, onTestnetSaveNote, onTestnetAddDocument,
  onTestnetInviteObserver, onTestnetRelease, onTestnetAddGps,
}: MilestoneWorkOrderPanelProps) => {
  const { data: dbMilestones = [] } = useTransactionMilestones(isTestnet ? undefined : (transactionId || undefined));
  const { data: dbObservers = [] } = useTransactionObservers(isTestnet ? undefined : (transactionId || undefined));
  const createMilestones = useCreateMilestones();
  const updateMilestone = useUpdateMilestone();
  const releaseMilestonePayment = useReleaseMilestonePayment();
  const addObserver = useAddTransactionObserver();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [observerName, setObserverName] = useState("");
  const [observerEmail, setObserverEmail] = useState("");
  const [dismissedObserverPrompts, setDismissedObserverPrompts] = useState<Set<string>>(new Set());
  const [pendingDeleteMilestone, setPendingDeleteMilestone] = useState<{ id: string; title: string } | null>(null);
  const [pendingRestoreMilestone, setPendingRestoreMilestone] = useState<{ id: string; title: string } | null>(null);
  const [pendingFeeGateRelease, setPendingFeeGateRelease] = useState<{ id: string; title: string; unverifiedCount: number; unverifiedTotal: number } | null>(null);
  const [milestoneExternalFees, setMilestoneExternalFees] = useState<Record<number, { total: number; unverified: number; unverifiedAmount: number }>>({});
  const [docTypeSelections, setDocTypeSelections] = useState<Record<string, string>>({});
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [reconciliationComplete, setReconciliationComplete] = useState(false);
  const [skippedMilestoneIndices, setSkippedMilestoneIndices] = useState<number[]>([]);
  const [tradeScope, setTradeScope] = useState<TradeScope>("international");
  const { capturePosition, loading: gpsLoading } = useGeolocation();
  const { anchor: anchorProof } = useBlockchainAnchor();
  const navigate = useNavigate();

  const fundsAreLocked = FUNDS_LOCKED_STATUSES.has(transactionStatus || "");
  const layoutMode = resolveLayoutMode(industry, orderType);
  const layoutLabels = LAYOUT_MODE_LABELS[layoutMode];
  const industryNeedsObservers = !OBSERVER_FREE_INDUSTRIES.has(industry || "");
  const rolePrefix = role === "vendor" ? "V" : role === "admin" ? "A" : "B";
  const isAdmin = role === "admin";

  const milestones = isTestnet ? (testnetMilestones || []) : dbMilestones;
  const observers = isTestnet
    ? (testnetMilestones || []).filter(ms => ms.observer_id).map(ms => ({
        id: ms.observer_id, observer_name: ms.observer_name,
        observer_email: ms.observer_email, access_token: ms.observer_access_token,
        milestoneId: ms.id,
      }))
    : dbObservers;

  const activeIndex = useMemo(() => {
    const idx = milestones.findIndex((ms: any) => ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted");
    return idx === -1 ? milestones.length - 1 : idx;
  }, [milestones]);

  const isExpanded = (idx: number) => expandedSteps.has(idx) || idx === activeIndex;
  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  const handleInitializeMilestones = async () => {
    if (isTestnet) { toast.info("Milestones auto-populated from industry template in testnet mode"); return; }
    if (!transactionId) return;
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await createMilestones.mutateAsync({
      transactionId, userId,
      customMilestones: [{ title: `${industry || "General"} fulfillment`, description: "Primary milestone for this work order", is_payment_milestone: true, payment_percentage: 100, required_documents: [], assigned_to: "vendor" }],
    });
  };

  const handleSaveNote = async (milestoneId: string) => {
    if (isTestnet) { onTestnetSaveNote?.(milestoneId, notes[milestoneId] ?? ""); return; }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await updateMilestone.mutateAsync({ milestoneId, userId, description: notes[milestoneId] ?? "" });
  };

  const handleMarkFulfilled = async (milestoneId: string) => {
    const milestone = milestones.find((m: any) => m.id === milestoneId) as any;
    if (milestone) {
      const gate = getDocGateStatus(milestone, fundsAreLocked);
      if (gate.mode === "required" && !gate.satisfied) {
        toast.error(`Cannot fulfill — upload required documents first: ${gate.missingRequired.join(", ")}`);
        return;
      }
      if (gate.autoSatisfied.length > 0) {
        toast.info(`${gate.autoSatisfied.join(", ")} auto-resolved — escrow already funded`, { duration: 4000 });
      }
      if (gate.mode === "optional" && gate.missingOptional.length > 0) {
        toast.warning(`Proceeding without recommended documents: ${gate.missingOptional.join(", ")}`, { duration: 5000 });
      }
    }
    if (isTestnet) {
      const gpsNeeded = isGpsRequiredByIndustry(industry || "");
      if (gpsNeeded) {
        const geo = await capturePosition();
        if (!geo) {
          toast.error("GPS location is required for this industry. Enable location services and try again.", { duration: 6000 });
          return;
        }
        try {
          const result = await anchorProof(
            transactionId || "testnet-sim",
            "gps_verification",
            {
              milestoneId, latitude: geo.latitude, longitude: geo.longitude,
              accuracy: geo.accuracy, capturedAt: geo.capturedAt, capturedBy: role, isTestnet: true,
            }
          );
          const loc = result?.resolvedLocation;
          onTestnetAddGps?.(milestoneId, geo.latitude, geo.longitude, geo.accuracy, loc?.formatted || undefined, loc?.city || undefined, loc?.country || undefined);
          if (loc?.formatted) {
            toast.success(`📍 ${loc.formatted}`, { duration: 6000 });
          } else {
            toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
          }
        } catch {
          onTestnetAddGps?.(milestoneId, geo.latitude, geo.longitude, geo.accuracy);
          toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
        }
      }
      onTestnetUpdateStatus?.(milestoneId, "completed");
      return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");

    const gpsRequired = isGpsRequiredByIndustry(industry || "");
    if (gpsRequired) {
      const geo = await capturePosition();
      if (!geo) {
        toast.error("GPS location is required for this industry. Enable location services and try again.", { duration: 6000 });
        return;
      }
      await supabase.from("transaction_milestones").update({
        gps_latitude: geo.latitude, gps_longitude: geo.longitude,
        gps_accuracy: geo.accuracy, gps_captured_at: geo.capturedAt,
      } as any).eq("id", milestoneId);
      if (transactionId) {
        try {
          const result = await anchorProof(transactionId, "gps_verification", {
            milestoneId, latitude: geo.latitude, longitude: geo.longitude,
            accuracy: geo.accuracy, capturedAt: geo.capturedAt, capturedBy: role,
          });
          const loc = result?.resolvedLocation;
          if (loc?.formatted) {
            toast.success(`📍 ${loc.formatted}`, { duration: 6000 });
            await supabase.from("transaction_milestones").update({
              gps_address: loc.formatted, gps_city: loc.city, gps_country: loc.country,
            } as any).eq("id", milestoneId);
          } else {
            toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
          }
        } catch (e) {
          console.warn("GPS blockchain anchor queued but failed to submit:", e);
          toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
        }
      } else {
        toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
      }
    }
    await updateMilestone.mutateAsync({ milestoneId, userId, status: "completed" });
  };

  const handleReleaseMilestone = async (milestoneId: string, bypassFeeGate = false) => {
    if (isTestnet) { onTestnetRelease?.(milestoneId); return; }
    if (!bypassFeeGate) {
      const msIdx = milestones.findIndex((m: any) => m.id === milestoneId);
      const feeInfo = milestoneExternalFees[msIdx];
      if (feeInfo && feeInfo.unverified > 0) {
        const msTitle = (milestones[msIdx] as any)?.title || `Stage #${msIdx + 1}`;
        setPendingFeeGateRelease({ id: milestoneId, title: msTitle, unverifiedCount: feeInfo.unverified, unverifiedTotal: feeInfo.unverifiedAmount });
        return;
      }
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await releaseMilestonePayment.mutateAsync({ milestoneId, userId });
  };

  const handleInviteObserver = async (milestoneId: string) => {
    if (!observerName.trim() || !observerEmail.trim()) return toast.error("Observer name and email are required");
    if (isTestnet) {
      onTestnetInviteObserver?.(milestoneId, observerName.trim(), observerEmail.trim());
      setObserverName(""); setObserverEmail(""); return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    const response = await addObserver.mutateAsync({
      transactionId, observerName: observerName.trim(), observerEmail: observerEmail.trim(),
      observerRole: "observer", milestoneIds: [milestoneId], userId,
    });
    const token = (response as any)?.accessToken;
    if (token) {
      const inviteLink = `${window.location.origin}/trustlock/audit/${token}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Observer invite link copied");
    }
    setObserverName(""); setObserverEmail("");
  };

  // Empty state
  if (!isTestnet && !transactionId) return null;
  if (milestones.length === 0 && !isTestnet) {
    return (
      <TLId code={`TL-${rolePrefix}-WO-PANEL`}>
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              {layoutLabels.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No records found for {txId} yet.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={handleInitializeMilestones} disabled={createMilestones.isPending}>
              {createMilestones.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {layoutMode === "single" ? "Initialize Escrow" : "Initialize Milestones"}
            </Button>
          </CardContent>
        </Card>
      </TLId>
    );
  }
  if (milestones.length === 0) return null;

  // Offline Reconciliation Gate
  const indKey = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
  const reconciliationTemplates = INDUSTRY_MILESTONES[indKey]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => indKey.includes(k)) || ""]
    || null;

  if (
    !isAdmin && fundsAreLocked && !reconciliationComplete &&
    reconciliationTemplates && reconciliationTemplates.length > 1 && layoutMode !== "single"
  ) {
    return (
      <TLId code={`TL-${rolePrefix}-WO-RECONCILIATION`}>
        <OfflineReconciliation
          role={role} transactionId={transactionId} txId={txId} industry={industry}
          milestoneTemplates={reconciliationTemplates.map(t => ({
            name: t.name, percentage: t.percentage, documents: t.documents, description: t.description,
          }))}
          onReconciliationComplete={(skipped) => {
            setSkippedMilestoneIndices(skipped);
            setReconciliationComplete(true);
            if (skipped.length > 0) {
              toast.success(`Work order adjusted — ${skipped.length} milestone(s) marked as completed offline`);
            }
          }}
          isTestnet={isTestnet}
        />
      </TLId>
    );
  }

  return (
    <>
    <TLId code={`TL-${rolePrefix}-WO-PANEL`}>
      <Card className="border-primary/20">
        <CardHeader className="pb-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{LAYOUT_MODE_ICONS[layoutMode]}</span>
              <div>
                <CardTitle className="text-sm">
                  {layoutLabels.title}
                  {industry && <span className="text-muted-foreground font-normal ml-1 capitalize">— {industry.replace(/-/g, " ")}</span>}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">{layoutLabels.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] capitalize">{layoutMode}</Badge>
              {isTestnet && <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Testnet</Badge>}
            </div>
          </div>

          <BlueprintSummary industry={industry} layoutMode={layoutMode} />

          {/* ── Overall Progress Summary ── */}
          {milestones.length > 1 && (() => {
            const completed = milestones.filter((ms: any) => ms.status === "completed" || ms.status === "released").length;
            const deleted = milestones.filter((ms: any) => ms.status === "deleted").length;
            const total = milestones.length - deleted;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const released = milestones.filter((ms: any) => ms.status === "released").length;
            const releasedAmount = milestones
              .filter((ms: any) => ms.status === "released" && ms.is_payment_milestone)
              .reduce((sum: number, ms: any) => sum + Number(ms.payment_amount || 0), 0);

            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{completed}</span> of <span className="font-semibold text-foreground">{total}</span> stages complete
                  </span>
                  <span className="font-semibold text-primary">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {released > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Banknote className="w-3 h-3 text-primary" />
                      {released} released · ${releasedAmount.toLocaleString()}
                    </span>
                  )}
                  {deleted > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Trash2 className="w-3 h-3" />
                      {deleted} removed
                    </span>
                  )}
                  {(() => {
                    const waiting = milestones.find((ms: any) => ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted");
                    if (!waiting) return null;
                    const template = (() => {
                      const k = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
                      const bp = INDUSTRY_MILESTONES[k] || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(ki => k.includes(ki)) || ""] || null;
                      const wIdx = milestones.indexOf(waiting);
                      return bp?.[wIdx] || null;
                    })();
                    const owner = template?.owner || "vendor";
                    return (
                      <span className="flex items-center gap-0.5 ml-auto">
                        {owner === role ? (
                          <><AlertTriangle className="w-3 h-3 text-accent" /> Your turn</>
                        ) : (
                          <><Lock className="w-3 h-3" /> Waiting on {owner === "both" ? "both" : owner}</>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {!isAdmin && layoutMode !== "single" && (
            <TradeScopeSelector value={tradeScope} onChange={setTradeScope} compact autoSet={false} />
          )}

          {milestones.length > 1 && (
            <ProgressStepper milestones={milestones} activeIndex={activeIndex} onStepClick={toggleStep} />
          )}
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {milestones.map((ms: any, idx: number) => {
            const row = idx + 1;
            const gateStatus = getDocGateStatus(ms, fundsAreLocked);

            const indK = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
            const blueprint = INDUSTRY_MILESTONES[indK]
              || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => indK.includes(k)) || ""]
              || null;
            const template = blueprint?.[idx] || null;
            const stepOwner = template?.owner || "vendor";
            const docOwners = template?.documentOwners || {};

            const isVendorStep = stepOwner === "vendor" || stepOwner === "both";
            const isBuyerStep = stepOwner === "buyer" || stepOwner === "both";
            const canVendorFulfill = role === "vendor" && isVendorStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted";
            const canBuyerAct = role === "buyer" && isBuyerStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted";
            const canBuyerRelease = role === "buyer" && ms.status === "completed" && ms.is_payment_milestone && !ms.payment_released;
            const hasObserver = !!ms.observer_id;

            const vendorActionLabel = template?.vendorAction || (layoutMode === "offline" ? "Confirm Offline Step" : layoutMode === "single" ? "Confirm & Ship Order" : "Mark Fulfilled");
            const buyerActionLabel = template?.buyerAction || "Confirm & Approve";

            const vendorFulfilled = ms.status === "completed" || ms.status === "released";
            const buyerReleased = ms.status === "released";
            const isDisputed = ms.status === "disputed";
            const isDone = ms.status === "completed" || ms.status === "released";
            const isActive = idx === activeIndex;
            const expanded = isExpanded(idx);
            const isDeleted = ms.status === "deleted";
            const uploadedDocs: any[] = ms.uploaded_documents || [];
            const rawRequiredDocs: string[] = ms.required_documents || [];
            const rawOptionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];

            const scopeFiltered = filterDocumentsByScope(rawRequiredDocs, rawOptionalDocs, tradeScope);
            const requiredDocs = scopeFiltered.required;
            const optionalDocs = scopeFiltered.optional;
            const scopeDowngraded = scopeFiltered.scopeDowngraded;

            return (
              <div
                key={ms.id}
                className={`rounded-lg border transition-all ${
                  isDeleted ? "border-muted bg-muted/10 opacity-60" :
                  isActive ? "border-primary/40 bg-primary/[0.02] shadow-sm" :
                  isDone ? "border-primary/20 bg-primary/[0.01]" :
                  "border-border"
                }`}
              >
                {/* ── Collapsed Row ── */}
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/20 transition-colors rounded-lg"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isDeleted ? "bg-muted text-muted-foreground" :
                    ms.status === "released" ? "bg-primary text-primary-foreground" :
                    isDone ? "bg-primary/20 text-primary" :
                    isActive ? "bg-primary/10 text-primary ring-2 ring-primary/30" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isDeleted ? "✕" : isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : row}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {layoutMode === "single" ? "Escrow Delivery" : ms.title}
                      </span>
                      {ms.is_payment_milestone && (
                        <Badge className="text-[8px] h-4 px-1 shrink-0">{ms.payment_percentage || 100}%</Badge>
                      )}
                      {!isDone && !isDeleted && (
                        <Badge variant="outline" className={`text-[7px] h-3.5 px-1 shrink-0 ${
                          stepOwner === "vendor" ? "border-primary/30 text-primary" :
                          stepOwner === "buyer" ? "border-accent/30 text-accent" :
                          "border-muted-foreground/30 text-muted-foreground"
                        }`}>
                          {stepOwner === "both" ? "Both" : stepOwner === "vendor" ? "Vendor" : "Buyer"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[8px] h-4 ${
                        isDone ? "border-primary/30 text-primary" :
                        isActive ? "border-primary/40 text-primary" :
                        "border-border"
                      }`}>
                        {statusLabel[ms.status] || ms.status}
                      </Badge>
                      {uploadedDocs.length > 0 && <span className="text-[9px] text-muted-foreground">{uploadedDocs.length} doc(s)</span>}
                      {ms.gps_latitude && <MapPin className="w-2.5 h-2.5 text-primary" />}
                      {gateStatus.mode === "required" && !gateStatus.satisfied && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
                      {isDisputed && <Badge variant="destructive" className="text-[8px] h-4">Disputed</Badge>}
                      {role === "buyer" && vendorFulfilled && !buyerReleased && (
                        <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Vendor ✅</Badge>
                      )}
                      {role === "buyer" && !vendorFulfilled && !isDisputed && ms.status !== "deleted" && (
                        <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30 text-muted-foreground">Vendor ⏳</Badge>
                      )}
                      {role === "vendor" && vendorFulfilled && !buyerReleased && ms.is_payment_milestone && (
                        <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30 text-muted-foreground">Buyer ⏳</Badge>
                      )}
                      {role === "vendor" && buyerReleased && (
                        <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Buyer ✅</Badge>
                      )}
                      {isAdmin && (
                        <span className="text-[8px] text-muted-foreground">
                          V:{vendorFulfilled ? "✅" : "⏳"} B:{buyerReleased ? "✅" : vendorFulfilled ? "⏳" : "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* ── Expanded Content with Tabs ── */}
                {expanded && !isDeleted && (
                  <div className="px-3 pb-3 border-t border-border/50 pt-3 ml-9">
                    <div className="text-[11px] text-muted-foreground mb-2">
                      Amount: ${Number(ms.payment_amount || 0).toLocaleString()}
                    </div>

                    <Tabs defaultValue="actions" className="w-full">
                      <TabsList className="w-full h-8 grid grid-cols-3 mb-3">
                        <TabsTrigger value="actions" className="text-[10px] h-6 data-[state=active]:text-primary">
                          ⚡ Actions
                        </TabsTrigger>
                        <TabsTrigger value="docs" className="text-[10px] h-6 data-[state=active]:text-primary">
                          📄 Docs
                          {(requiredDocs.length > 0) && (
                            <Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-0.5">
                              {uploadedDocs.length}/{requiredDocs.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="text-[10px] h-6 data-[state=active]:text-primary">
                          📝 Notes
                        </TabsTrigger>
                      </TabsList>

                      {/* ═══ ACTIONS TAB ═══ */}
                      <TabsContent value="actions" className="space-y-3 mt-0">
                        {layoutMode === "offline" && ms.status === "pending" && (
                          <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                            💼 This step happens offline. Once completed, confirm digitally below.
                          </div>
                        )}

                        {/* Enhanced waiting states with nudges */}
                        {role === "vendor" && !isVendorStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted" && (
                          <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Lock className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                              <div>
                                <p className="font-medium text-foreground">Waiting for buyer</p>
                                <p>This step is buyer-driven. They need to: <span className="font-medium text-foreground">{buyerActionLabel}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
                              Notification sent to buyer
                            </div>
                          </div>
                        )}
                        {role === "buyer" && !isBuyerStep && !vendorFulfilled && ms.status !== "deleted" && ms.status !== "released" && (
                          <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Lock className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                              <div>
                                <p className="font-medium text-foreground">Waiting for vendor</p>
                                <p>This step is vendor-driven. They need to: <span className="font-medium text-foreground">{vendorActionLabel}</span></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
                              Notification sent to vendor
                            </div>
                          </div>
                        )}

                        {isAdmin && (
                          <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-1.5">
                            <p className="text-[10px] font-semibold flex items-center gap-1"><Eye className="w-3 h-3" /> Admin View</p>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Vendor:</span>
                                {vendorFulfilled
                                  ? <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Fulfilled ✅</Badge>
                                  : <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30">Pending ⏳</Badge>
                                }
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Buyer:</span>
                                {buyerReleased
                                  ? <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Released ✅</Badge>
                                  : vendorFulfilled
                                    ? <Badge variant="outline" className="text-[8px] h-4 border-accent/30 text-accent">Action Required ⏳</Badge>
                                    : <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30">Waiting —</Badge>
                                }
                              </div>
                            </div>
                            {isDisputed && (
                              <div className="flex items-center gap-1 text-destructive text-[10px] font-medium mt-1">
                                <AlertTriangle className="w-3 h-3" /> Dispute active — review in Disputes tab
                              </div>
                            )}
                            {ms.is_payment_milestone && (
                              <p className="text-[9px] text-muted-foreground">
                                💰 Payment milestone · {ms.payment_percentage || 100}% · ${Number(ms.payment_amount || 0).toLocaleString()}
                              </p>
                            )}
                            <p className="text-[9px] text-muted-foreground">
                              🎯 Step owned by: <span className="font-semibold capitalize">{stepOwner}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-1">
                          {canVendorFulfill && (() => {
                            const actionType = classifyAction(vendorActionLabel);
                            const style = ACTION_STYLES[actionType];
                            const ActionIcon = style.icon;
                            return (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="default" variant="outline"
                                  onClick={() => handleMarkFulfilled(ms.id)}
                                  disabled={gateStatus.mode === "required" && !gateStatus.satisfied}
                                  className={`w-full ${gateStatus.mode === "required" && !gateStatus.satisfied ? "opacity-50 border-muted" : style.className}`}
                                >
                                  <ActionIcon className="w-4 h-4 mr-2" /> {vendorActionLabel}
                                </Button>
                                {gateStatus.mode === "required" && !gateStatus.satisfied && (
                                  <p className="text-[9px] text-destructive flex items-center gap-0.5 justify-center">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Upload {gateStatus.missingRequired.length} required doc(s) to unlock
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {canBuyerAct && !canBuyerRelease && (() => {
                            const actionType = classifyAction(buyerActionLabel);
                            const style = ACTION_STYLES[actionType];
                            const ActionIcon = style.icon;
                            return (
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="default" variant="outline"
                                  onClick={() => handleMarkFulfilled(ms.id)}
                                  disabled={gateStatus.mode === "required" && !gateStatus.satisfied}
                                  className={`w-full ${gateStatus.mode === "required" && !gateStatus.satisfied ? "opacity-50 border-muted" : style.className}`}
                                >
                                  <ActionIcon className="w-4 h-4 mr-2" /> {buyerActionLabel}
                                </Button>
                                {gateStatus.mode === "required" && !gateStatus.satisfied && (
                                  <p className="text-[9px] text-destructive flex items-center gap-0.5 justify-center">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Upload {gateStatus.missingRequired.length} required doc(s) to unlock
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {canBuyerRelease && (
                            <div className="space-y-2">
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-semibold text-amber-700">⚠️ Your Signature Required</p>
                                  <p className="text-amber-600 mt-0.5">Stage #{row} — {ms.title} is fulfilled. Review and release funds.</p>
                                </div>
                              </div>
                              {milestoneExternalFees[idx]?.unverified > 0 && (
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
                                  <Receipt className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-medium text-destructive">{milestoneExternalFees[idx].unverified} unverified external fee(s)</p>
                                    <p className="text-destructive/70 text-[10px] mt-0.5">${milestoneExternalFees[idx].unverifiedAmount.toLocaleString()} in third-party costs not yet confirmed.</p>
                                  </div>
                                </div>
                              )}
                              <Button size="default" className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg ring-1 ring-amber-400/30" onClick={() => handleReleaseMilestone(ms.id)}>
                                <Banknote className="w-4 h-4 mr-2" /> Sign & Release Milestone
                              </Button>
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            {!isAdmin && ms.status === "pending" && !fundsAreLocked && (
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs" onClick={() => setPendingDeleteMilestone({ id: ms.id, title: ms.title })}>
                                <Trash2 className="w-3 h-3 mr-1" /> Remove
                              </Button>
                            )}
                            {!isAdmin && ms.status === "pending" && fundsAreLocked && (
                              <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={() => toast.info("Use milestone negotiation or contact admin for amendments.")}>
                                <FileWarning className="w-3 h-3 mr-1" /> Request Amendment
                              </Button>
                            )}
                            {ms.status === "completed" && role === "vendor" && (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Awaiting buyer release
                              </Badge>
                            )}
                            {ms.status === "released" && (
                              <Badge className="text-[10px] bg-primary/15 text-primary">
                                <CheckCircle2 className="w-3 h-3 mr-0.5" /> Payment Released
                              </Badge>
                            )}
                            {!isAdmin && !isDisputed && ms.status !== "released" && ms.status !== "deleted" && ms.status !== "pending" && (
                              <Button
                                size="sm" variant="ghost"
                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 text-xs ml-auto"
                                onClick={() => {
                                  const disputePath = role === "buyer" ? `/trustlock/buyer/disputes` : `/trustlock/vendor/disputes`;
                                  navigate(`${disputePath}?tx=${encodeURIComponent(txId)}&milestone=${encodeURIComponent(ms.title)}&step=${row}`);
                                  toast.info(`Opening dispute form for milestone "${ms.title}"`);
                                }}
                              >
                                <Scale className="w-3 h-3 mr-1" /> Raise Dispute
                              </Button>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      {/* ═══ DOCS TAB ═══ */}
                      <TabsContent value="docs" className="space-y-3 mt-0">
                        {(requiredDocs.length > 0 || optionalDocs.length > 0) && (
                          <div className="rounded-md border border-border p-2 space-y-2">
                            {gateStatus.autoSatisfied.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5">
                                <Unlock className="w-3 h-3 shrink-0" />
                                <span><strong>{gateStatus.autoSatisfied.length}</strong> pre-payment doc(s) auto-resolved</span>
                              </div>
                            )}
                            {scopeDowngraded.length > 0 && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5">
                                <Globe className="w-3 h-3 shrink-0" />
                                <span><strong>{scopeDowngraded.length}</strong> doc(s) moved to optional for <span className="capitalize font-medium">{tradeScope}</span> trades</span>
                              </div>
                            )}
                            {requiredDocs.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Required
                                  <Badge variant="outline" className={`text-[8px] ml-1 ${gateStatus.missingRequired.length === 0 ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>
                                    {gateStatus.missingRequired.length === 0 ? "All uploaded" : `${gateStatus.missingRequired.length} missing`}
                                  </Badge>
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {requiredDocs.map((doc: string) => {
                                    const uKeys = getUploadedKeys(ms);
                                    const dl = doc.toLowerCase();
                                    const isMet = Array.from(uKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
                                    const isAutoSat = gateStatus.autoSatisfied.includes(doc);
                                    const owner = docOwners[doc] || "either";
                                    return (
                                      <Badge key={doc} variant="outline" className={`text-[8px] ${
                                        isAutoSat ? "border-muted-foreground/30 text-muted-foreground line-through" :
                                        isMet ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"
                                      }`}>
                                        {isAutoSat ? <Unlock className="w-2.5 h-2.5 mr-0.5" /> : isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                                        {doc}
                                        {isAutoSat ? (
                                          <span className="ml-0.5 text-[7px] text-muted-foreground italic">N/A</span>
                                        ) : (
                                          <span className={`ml-0.5 text-[7px] ${owner === "vendor" ? "text-primary" : owner === "buyer" ? "text-accent" : "text-muted-foreground"}`}>
                                            ({owner === "either" ? "V/B" : owner === "vendor" ? "V" : "B"})
                                          </span>
                                        )}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {optionalDocs.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground"><FileWarning className="w-3 h-3" /> Recommended</p>
                                <div className="flex flex-wrap gap-1">
                                  {optionalDocs.map((doc: string) => {
                                    const uKeys = getUploadedKeys(ms);
                                    const dl = doc.toLowerCase();
                                    const isMet = Array.from(uKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
                                    return (
                                      <Badge key={doc} variant="outline" className={`text-[8px] ${isMet ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
                                        {isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <FileWarning className="w-2.5 h-2.5 mr-0.5" />}
                                        {doc}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {uploadedDocs.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold">Uploaded Documents</p>
                            {(() => {
                              const cpDocs = uploadedDocs.filter((d: any) => d.uploaded_by_role && d.uploaded_by_role !== role);
                              const myDocs = uploadedDocs.filter((d: any) => d.uploaded_by_role === role);
                              return cpDocs.length > 0 ? (
                                <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/5 px-2 py-1 text-[10px]">
                                  <Shield className="w-3 h-3 text-accent shrink-0" />
                                  <span className="text-accent font-medium">{cpDocs.length} doc{cpDocs.length > 1 ? "s" : ""} from {role === "vendor" ? "Buyer" : "Vendor"}</span>
                                  {myDocs.length > 0 && <span className="text-muted-foreground ml-auto">{myDocs.length} from you</span>}
                                </div>
                              ) : null;
                            })()}
                            <div className="space-y-1">
                              {uploadedDocs.map((doc: any, i: number) => {
                                const isCp = doc.uploaded_by_role && doc.uploaded_by_role !== role;
                                return (
                                  <div key={i} className={`flex items-center gap-1.5 rounded border p-1.5 text-[10px] ${isCp ? "border-accent/30 bg-accent/5" : "border-border"}`}>
                                    <FileText className={`w-3 h-3 shrink-0 ${isCp ? "text-accent" : "text-muted-foreground"}`} />
                                    <div className="flex-1 min-w-0">
                                      <span className="truncate block">
                                        {doc.document_type && doc.document_type !== "general" && <span className="font-semibold">[{doc.document_type}] </span>}
                                        {doc.name}
                                      </span>
                                      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                        <User className="w-2 h-2" />
                                        {isCp ? <span className="text-accent font-medium">{doc.uploaded_by_role === "vendor" ? "Vendor" : "Buyer"}</span> : <span>You ({doc.uploaded_by_role})</span>}
                                        {doc.uploadedAt && <> · {new Date(doc.uploadedAt).toLocaleDateString()}</>}
                                      </span>
                                    </div>
                                    {doc.url && (
                                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px]" onClick={(e) => { e.stopPropagation(); window.open(doc.url, "_blank"); }}>
                                        <Eye className="w-2.5 h-2.5 mr-0.5" /> View
                                      </Button>
                                    )}
                                    {!isAdmin && !isDone && doc.uploaded_by_role === role && (
                                      <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-destructive hover:text-destructive" onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm(`Remove "${doc.name}"?`)) return;
                                        if (isTestnet) { toast.success(`Document "${doc.name}" removed`); return; }
                                        const userId = await getUserId();
                                        if (!userId) return;
                                        const remaining = uploadedDocs.filter((_: any, j: number) => j !== i);
                                        await supabase.from("transaction_milestones").update({ uploaded_documents: remaining } as any).eq("id", ms.id);
                                        toast.success(`Document "${doc.name}" removed`);
                                      }}>
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {!isAdmin && (() => {
                          const allDocs = [...requiredDocs, ...optionalDocs];
                          if (allDocs.length > 0) {
                            return (
                              <div className="space-y-1">
                                <label className="text-[10px] font-medium">Tag upload as:</label>
                                <Select value={docTypeSelections[ms.id] || ""} onValueChange={(val) => setDocTypeSelections(prev => ({ ...prev, [ms.id]: val }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select document type" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General Evidence</SelectItem>
                                    {requiredDocs.map((doc: string) => <SelectItem key={doc} value={doc}>🔒 {doc}</SelectItem>)}
                                    {optionalDocs.map((doc: string) => <SelectItem key={doc} value={doc}>📎 {doc}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {!isAdmin && (isTestnet ? (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                            const name = `Evidence-${ms.title.replace(/\s/g, "_")}-${Date.now()}.pdf`;
                            onTestnetAddDocument?.(ms.id, { name, url: `testnet://mock/${name}` });
                          }}>
                            <FileText className="w-3 h-3 mr-1" /> Simulate Upload
                          </Button>
                        ) : (
                          <DocumentUpload
                            label="Upload evidence"
                            context={{ bucket: "milestone-documents", transactionId, milestoneId: ms.id }}
                            onUploadComplete={(files) => {
                              void (async () => {
                                const userId = await getUserId();
                                if (!userId) return;
                                const selectedDocType = docTypeSelections[ms.id] || "general";
                                await updateMilestone.mutateAsync({
                                  milestoneId: ms.id, userId,
                                  uploadedDocuments: files.map((file) => ({
                                    name: file.name, url: file.url, path: file.path,
                                    uploadedAt: new Date().toISOString(), uploaded_by: userId,
                                    uploaded_by_role: role, document_type: selectedDocType,
                                  })),
                                });
                                setDocTypeSelections(prev => ({ ...prev, [ms.id]: "" }));
                              })();
                            }}
                          />
                        ))}

                        {uploadedDocs.length === 0 && requiredDocs.length === 0 && optionalDocs.length === 0 && (
                          <p className="text-[11px] text-muted-foreground italic">No documents required for this stage.</p>
                        )}
                      </TabsContent>

                      {/* ═══ NOTES TAB ═══ */}
                      <TabsContent value="notes" className="space-y-3 mt-0">
                        {ms.gps_latitude && (
                          <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
                            <p className="text-[10px] font-semibold flex items-center gap-1 text-primary"><MapPin className="w-3.5 h-3.5" /> GPS Verification</p>
                            {ms.gps_address && <p className="text-[11px] font-medium">{ms.gps_address}</p>}
                            <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                              <span>Lat: {Number(ms.gps_latitude).toFixed(6)}</span>
                              <span>Lng: {Number(ms.gps_longitude).toFixed(6)}</span>
                              {ms.gps_accuracy && <span>Accuracy: ±{Number(ms.gps_accuracy).toFixed(0)}m</span>}
                              {ms.gps_captured_at && <span>Captured: {new Date(ms.gps_captured_at).toLocaleString()}</span>}
                            </div>
                            {ms.gps_city && ms.gps_country && <p className="text-[10px] text-muted-foreground">{ms.gps_city}, {ms.gps_country}</p>}
                          </div>
                        )}

                        {ms.description && <p className="text-[11px] text-muted-foreground italic">{ms.description}</p>}

                        {role === "vendor" && !hasObserver && industryNeedsObservers && !dismissedObserverPrompts.has(ms.id) && (
                          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 space-y-2 relative">
                            <button onClick={() => setDismissedObserverPrompts(prev => new Set(prev).add(ms.id))} className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-amber-500/20" aria-label="Dismiss">
                              <X className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                            <p className="text-[11px] font-medium text-amber-700 pr-5">Observer recommended for this milestone.</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              <Input placeholder="Observer name" value={observerName} onChange={(e) => setObserverName(e.target.value)} />
                              <Input placeholder="Observer email" value={observerEmail} onChange={(e) => setObserverEmail(e.target.value)} />
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleInviteObserver(ms.id)}>
                              <UserPlus className="w-3 h-3 mr-1" /> Invite Observer
                            </Button>
                          </div>
                        )}

                        {(role === "vendor" || isAdmin) && hasObserver && (
                          <div className="rounded-md border border-border p-2 text-[11px] text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">Observer linked</p>
                            {observers.filter((obs: any) => (obs.milestone_ids ? obs.milestone_ids.includes(ms.id) : obs.milestoneId === ms.id)).map((obs: any) => {
                              const link = obs.access_token || obs.observer_access_token
                                ? `${window.location.origin}/trustlock/audit/${obs.access_token || obs.observer_access_token}` : null;
                              return (
                                <div key={obs.id || obs.observer_email} className="flex items-center gap-2 flex-wrap">
                                  <span>{obs.observer_name} ({obs.observer_email})</span>
                                  {link && !isAdmin && (
                                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Observer link copied"); }}>
                                      <Copy className="w-3 h-3 mr-1" /> Copy Link
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isAdmin ? (
                          ms.description && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</label>
                              <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2">{ms.description}</p>
                            </div>
                          )
                        ) : (
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium flex items-center gap-1"><StickyNote className="w-3 h-3" /> Note</label>
                            <Textarea rows={2} value={notes[ms.id] ?? ms.description ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [ms.id]: e.target.value }))} placeholder="Add notes for this milestone" />
                            <Button size="sm" variant="outline" onClick={() => handleSaveNote(ms.id)}>Save Note</Button>
                          </div>
                        )}

                        {!isAdmin && !isDone && (
                          <ExternalFeeTracker
                            transactionId={transactionId} milestoneIndex={idx} milestoneName={ms.title}
                            role={role} tradeScope={tradeScope}
                            industrySuggestions={getExternalFeeSuggestions(industry || "")}
                            isTestnet={isTestnet} totalMilestones={milestones.length}
                            onFeeStatusChange={(info) => setMilestoneExternalFees(prev => ({ ...prev, [idx]: info }))}
                          />
                        )}
                        {isAdmin && (
                          <ExternalFeeTracker
                            transactionId={transactionId} milestoneIndex={idx} milestoneName={ms.title}
                            role={role} tradeScope={tradeScope} industrySuggestions={[]}
                            isTestnet={isTestnet} totalMilestones={milestones.length} readOnly
                          />
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {expanded && isDeleted && !fundsAreLocked && (
                  <div className="px-3 pb-3 ml-9">
                    <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={() => setPendingRestoreMilestone({ id: ms.id, title: ms.title })}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore Stage
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TLId>

    <AlertDialog open={!!pendingDeleteMilestone} onOpenChange={(open) => !open && setPendingDeleteMilestone(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Remove Stage?</AlertDialogTitle>
          <AlertDialogDescription>Remove <strong>"{pendingDeleteMilestone?.title}"</strong>? You can restore it before funds are locked.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
            if (!pendingDeleteMilestone) return;
            if (isTestnet) { onTestnetUpdateStatus?.(pendingDeleteMilestone.id, "released"); toast.success(`"${pendingDeleteMilestone.title}" removed`); setPendingDeleteMilestone(null); return; }
            const userId = await getUserId();
            if (!userId) return toast.error("Sign in required");
            const { error } = await supabase.functions.invoke("escrow-manager", { body: { action: "delete_milestone", milestone_id: pendingDeleteMilestone.id, user_id: userId } });
            if (error) toast.error("Failed to remove"); else toast.success(`"${pendingDeleteMilestone.title}" removed`);
            setPendingDeleteMilestone(null);
          }}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!pendingRestoreMilestone} onOpenChange={(open) => !open && setPendingRestoreMilestone(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-primary" /> Restore Stage?</AlertDialogTitle>
          <AlertDialogDescription>Restore <strong>"{pendingRestoreMilestone?.title}"</strong> to active status?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={async () => {
            if (!pendingRestoreMilestone) return;
            if (isTestnet) { onTestnetUpdateStatus?.(pendingRestoreMilestone.id, "pending"); toast.success(`"${pendingRestoreMilestone.title}" restored`); setPendingRestoreMilestone(null); return; }
            const userId = await getUserId();
            if (!userId) return toast.error("Sign in required");
            const { error } = await supabase.functions.invoke("escrow-manager", { body: { action: "restore_milestone", milestone_id: pendingRestoreMilestone.id, user_id: userId } });
            if (error) toast.error("Failed to restore"); else toast.success(`"${pendingRestoreMilestone.title}" restored`);
            setPendingRestoreMilestone(null);
          }}>Restore</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={!!pendingFeeGateRelease} onOpenChange={(open) => !open && setPendingFeeGateRelease(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><Receipt className="w-4 h-4 text-destructive" /> Unverified External Fees</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p><strong>{pendingFeeGateRelease?.title}</strong> has <strong>{pendingFeeGateRelease?.unverifiedCount}</strong> external fee(s) totaling <strong>${pendingFeeGateRelease?.unverifiedTotal.toLocaleString()}</strong> that have not been verified.</p>
            <p className="text-xs">These are third-party costs logged against this milestone. Confirm all offline costs before releasing funds.</p>
            <p className="text-xs font-medium">Release funds without full fee reconciliation?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Review Fees First</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
            if (!pendingFeeGateRelease) return;
            await handleReleaseMilestone(pendingFeeGateRelease.id, true);
            setPendingFeeGateRelease(null);
          }}>Release Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default MilestoneWorkOrderPanel;

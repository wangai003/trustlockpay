import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Unlock, FileText, Eye, Upload, CheckCircle, Circle, Clock } from "lucide-react";

type DocumentMode = "none" | "optional" | "required";

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: DocumentMode;
  description: string;
  requiresObserver: boolean;
}

const INDUSTRY_MILESTONES: Record<string, MilestoneTemplate[]> = {
  "construction": [
    { name: "Contract Upload", percentage: 5, documents: ["Construction Contract"], documentMode: "required", description: "Both parties sign the contract", requiresObserver: false },
    { name: "Foundation Inspection", percentage: 15, documents: ["Inspection Report", "Soil Test"], documentMode: "required", description: "Inspector verifies foundation", requiresObserver: true },
    { name: "Structural Phase", percentage: 25, documents: ["Engineer Report"], documentMode: "required", description: "Walls, roofing completed", requiresObserver: true },
    { name: "MEP Verification", percentage: 20, documents: ["Electrical Cert", "Plumbing Report"], documentMode: "required", description: "Systems verified", requiresObserver: true },
    { name: "Walkthrough", percentage: 15, documents: ["Punch List"], documentMode: "optional", description: "Final inspection with buyer", requiresObserver: false },
    { name: "Certificate of Occupancy", percentage: 10, documents: ["Occupancy Certificate"], documentMode: "required", description: "Government cert obtained", requiresObserver: true },
    { name: "Final Release", percentage: 10, documents: [], documentMode: "none", description: "Escrow released", requiresObserver: false },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Survey"], documentMode: "required", description: "Legal review", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], documentMode: "optional", description: "Property inspection", requiresObserver: false },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], documentMode: "required", description: "Property valuation", requiresObserver: true },
    { name: "Closing", percentage: 60, documents: ["Transfer Agreement"], documentMode: "required", description: "Key handover", requiresObserver: true },
  ],
  "agriculture": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract"], documentMode: "required", description: "Trade agreement", requiresObserver: true },
    { name: "Harvest & Assay", percentage: 15, documents: ["Quality Certificate"], documentMode: "required", description: "Quality testing", requiresObserver: true },
    { name: "Packaging", percentage: 15, documents: ["Phytosanitary Cert"], documentMode: "required", description: "Export certified", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Customs", percentage: 15, documents: ["Customs Declaration"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Delivery", percentage: 20, documents: ["Delivery Receipt"], documentMode: "optional", description: "Accepted", requiresObserver: false },
  ],
  "mining": [
    { name: "Assay & Cert", percentage: 10, documents: ["Assay Report"], documentMode: "required", description: "Purity certified", requiresObserver: true },
    { name: "Export License", percentage: 5, documents: ["Export Permit"], documentMode: "required", description: "Authorized", requiresObserver: true },
    { name: "Insurance", percentage: 10, documents: ["Insurance Cert"], documentMode: "required", description: "Insured & sealed", requiresObserver: false },
    { name: "Customs (Origin)", percentage: 15, documents: ["AML Declaration"], documentMode: "required", description: "Origin clearance", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Air Waybill"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Destination", percentage: 20, documents: ["Import Declaration"], documentMode: "required", description: "Dest. clearance", requiresObserver: true },
    { name: "Delivery", percentage: 15, documents: ["Acceptance Form"], documentMode: "required", description: "Released", requiresObserver: false },
  ],
  "tourism": [
    { name: "Booking", percentage: 50, documents: ["Booking Confirmation"], documentMode: "optional", description: "Reserved", requiresObserver: false },
    { name: "Completed", percentage: 50, documents: [], documentMode: "none", description: "Service done", requiresObserver: false },
  ],
  "retail": [
    { name: "Payment Locked", percentage: 100, documents: [], documentMode: "none", description: "Full escrow", requiresObserver: false },
  ],
  "freelance": [
    { name: "Scope", percentage: 20, documents: ["Scope Doc"], documentMode: "optional", description: "Requirements", requiresObserver: false },
    { name: "Draft", percentage: 30, documents: ["Draft"], documentMode: "optional", description: "First delivery", requiresObserver: false },
    { name: "Revision", percentage: 20, documents: [], documentMode: "none", description: "Feedback round", requiresObserver: false },
    { name: "Final", percentage: 30, documents: ["Sign-off Form"], documentMode: "required", description: "Approved", requiresObserver: false },
  ],
  "logistics": [
    { name: "LC / Agreement", percentage: 5, documents: ["Trade Contract"], documentMode: "required", description: "LC opened", requiresObserver: true },
    { name: "Origin Inspection", percentage: 15, documents: ["Inspection Cert"], documentMode: "required", description: "Inspected", requiresObserver: true },
    { name: "Export Customs", percentage: 15, documents: ["Export License"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Import Customs", percentage: 15, documents: ["Duty Receipt"], documentMode: "required", description: "Processed", requiresObserver: true },
    { name: "Delivery", percentage: 10, documents: ["POD"], documentMode: "optional", description: "Delivered", requiresObserver: false },
    { name: "Settlement", percentage: 15, documents: ["Payment Confirmation"], documentMode: "required", description: "Released", requiresObserver: true },
  ],
  "education": [
    { name: "Enrollment", percentage: 25, documents: ["Enrollment Form"], documentMode: "optional", description: "Enrolled", requiresObserver: false },
    { name: "Course Access", percentage: 25, documents: [], documentMode: "none", description: "Materials provided", requiresObserver: false },
    { name: "Assessment", percentage: 25, documents: ["Results"], documentMode: "optional", description: "Assessed", requiresObserver: false },
    { name: "Certification", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certified", requiresObserver: false },
  ],
};

// Simulated: which milestone index is "current" based on order status
function getActiveIndex(status: string, totalStages: number): number {
  switch (status) {
    case "locked": return 0;
    case "shipped": return Math.min(Math.floor(totalStages * 0.4), totalStages - 1);
    case "delivered": return totalStages - 2;
    case "released": return totalStages;
    case "disputed": return -1;
    default: return 0;
  }
}

interface MilestoneProgressProps {
  industry?: string | null;
  status: string;
}

const MilestoneProgress = ({ industry, status }: MilestoneProgressProps) => {
  const key = industry?.toLowerCase().replace(/[^a-z]/g, "") || "";
  // Try to match
  const milestones = INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;

  if (!milestones) {
    return (
      <div className="py-3 px-4 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">No industry milestone template assigned to this order.</p>
      </div>
    );
  }

  const activeIdx = getActiveIndex(status, milestones.length);
  const overallProgress = status === "released" ? 100 : status === "disputed" ? 0 : Math.round(((activeIdx + 1) / milestones.length) * 100);

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Milestone Progress — {industry || "Unknown"}</p>
        <Badge variant="outline" className="text-[10px]">{overallProgress}% Complete</Badge>
      </div>
      <Progress value={overallProgress} className="h-1.5" />
      <div className="space-y-1.5">
        {milestones.map((ms, i) => {
          const isComplete = i < activeIdx;
          const isCurrent = i === activeIdx && status !== "released" && status !== "disputed";
          const isPending = i > activeIdx || status === "disputed";

          return (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                isComplete ? "bg-primary/5" : isCurrent ? "bg-accent/10 border border-accent/20" : "bg-muted/20"
              }`}
            >
              {isComplete ? (
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : isCurrent ? (
                <Clock className="w-3.5 h-3.5 text-accent shrink-0 animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span className={`font-medium flex-1 ${isPending ? "text-muted-foreground" : ""}`}>
                {ms.name}
              </span>
              <span className="text-muted-foreground font-mono">{ms.percentage}%</span>
              {ms.documentMode === "required" && (
                <Badge variant="destructive" className="text-[8px] h-4 px-1 gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Docs
                </Badge>
              )}
              {ms.documentMode === "optional" && (
                <Badge variant="secondary" className="text-[8px] h-4 px-1 gap-0.5">
                  <Unlock className="w-2.5 h-2.5" /> Opt
                </Badge>
              )}
              {ms.requiresObserver && (
                <Badge variant="outline" className="text-[8px] h-4 px-1 gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> Obs
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneProgress;

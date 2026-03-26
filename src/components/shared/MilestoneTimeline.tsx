import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Eye, CheckCircle, Circle, Clock, FileText } from "lucide-react";

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
    { name: "Foundation", percentage: 15, documents: ["Inspection Report"], documentMode: "required", description: "Inspector verifies foundation", requiresObserver: true },
    { name: "Structural", percentage: 25, documents: ["Engineer Report"], documentMode: "required", description: "Walls & roofing", requiresObserver: true },
    { name: "MEP", percentage: 20, documents: ["Electrical Cert"], documentMode: "required", description: "Systems verified", requiresObserver: true },
    { name: "Walkthrough", percentage: 15, documents: ["Punch List"], documentMode: "optional", description: "Final inspection", requiresObserver: false },
    { name: "Occupancy Cert", percentage: 10, documents: ["Certificate"], documentMode: "required", description: "Govt cert obtained", requiresObserver: true },
    { name: "Final Release", percentage: 10, documents: [], documentMode: "none", description: "Escrow released", requiresObserver: false },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed"], documentMode: "required", description: "Legal review", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Report"], documentMode: "optional", description: "Property check", requiresObserver: false },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal"], documentMode: "required", description: "Valuation", requiresObserver: true },
    { name: "Closing", percentage: 60, documents: ["Transfer"], documentMode: "required", description: "Key handover", requiresObserver: true },
  ],
  "agriculture": [
    { name: "Contract", percentage: 10, documents: ["Contract"], documentMode: "required", description: "Agreement", requiresObserver: true },
    { name: "Harvest", percentage: 15, documents: ["Quality Cert"], documentMode: "required", description: "Quality test", requiresObserver: true },
    { name: "Packaging", percentage: 15, documents: ["Phyto Cert"], documentMode: "required", description: "Export ready", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Customs", percentage: 15, documents: ["Declaration"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Delivery", percentage: 20, documents: ["Receipt"], documentMode: "optional", description: "Accepted", requiresObserver: false },
  ],
  "mining": [
    { name: "Assay", percentage: 10, documents: ["Assay Report"], documentMode: "required", description: "Purity certified", requiresObserver: true },
    { name: "Export", percentage: 5, documents: ["Permit"], documentMode: "required", description: "Authorized", requiresObserver: true },
    { name: "Insurance", percentage: 10, documents: ["Insurance"], documentMode: "required", description: "Insured", requiresObserver: false },
    { name: "Customs", percentage: 15, documents: ["AML Decl."], documentMode: "required", description: "Origin cleared", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Waybill"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Destination", percentage: 20, documents: ["Import Decl."], documentMode: "required", description: "Dest. cleared", requiresObserver: true },
    { name: "Delivery", percentage: 15, documents: ["Acceptance"], documentMode: "required", description: "Released", requiresObserver: false },
  ],
  "projectmanagement": [
    { name: "Charter", percentage: 10, documents: ["Charter", "SOW"], documentMode: "required", description: "Scope defined", requiresObserver: false },
    { name: "Kick-Off", percentage: 5, documents: ["RACI"], documentMode: "optional", description: "Team assigned", requiresObserver: false },
    { name: "Phase 1", percentage: 25, documents: ["Phase 1 Report"], documentMode: "required", description: "First deliverable", requiresObserver: true },
    { name: "Mid-Review", percentage: 10, documents: ["Status Report"], documentMode: "required", description: "Scope validation", requiresObserver: true },
    { name: "Phase 2", percentage: 25, documents: ["Phase 2 Report"], documentMode: "required", description: "Second deliverable", requiresObserver: true },
    { name: "UAT", percentage: 15, documents: ["UAT Sign-Off"], documentMode: "required", description: "Client testing", requiresObserver: false },
    { name: "Close-Out", percentage: 10, documents: ["Close-Out"], documentMode: "optional", description: "Final release", requiresObserver: false },
  ],
  "freelance": [
    { name: "Scope", percentage: 20, documents: ["Scope Doc"], documentMode: "optional", description: "Requirements", requiresObserver: false },
    { name: "Draft", percentage: 30, documents: ["Draft"], documentMode: "optional", description: "First delivery", requiresObserver: false },
    { name: "Revision", percentage: 20, documents: [], documentMode: "none", description: "Feedback round", requiresObserver: false },
    { name: "Final", percentage: 30, documents: ["Sign-off"], documentMode: "required", description: "Approved", requiresObserver: false },
  ],
  "logistics": [
    { name: "LC/Agreement", percentage: 5, documents: ["Contract"], documentMode: "required", description: "LC opened", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Cert"], documentMode: "required", description: "Inspected", requiresObserver: true },
    { name: "Export", percentage: 15, documents: ["License"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["B/L"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Import", percentage: 15, documents: ["Duty Receipt"], documentMode: "required", description: "Processed", requiresObserver: true },
    { name: "Delivery", percentage: 10, documents: ["POD"], documentMode: "optional", description: "Delivered", requiresObserver: false },
    { name: "Settlement", percentage: 15, documents: ["Confirmation"], documentMode: "required", description: "Released", requiresObserver: true },
  ],
  "tourism": [
    { name: "Booking", percentage: 50, documents: ["Confirmation"], documentMode: "optional", description: "Reserved", requiresObserver: false },
    { name: "Completed", percentage: 50, documents: [], documentMode: "none", description: "Service done", requiresObserver: false },
  ],
  "retail": [
    { name: "Payment Locked", percentage: 100, documents: [], documentMode: "none", description: "Full escrow", requiresObserver: false },
  ],
  "education": [
    { name: "Enrollment", percentage: 25, documents: ["Form"], documentMode: "optional", description: "Enrolled", requiresObserver: false },
    { name: "Course Access", percentage: 25, documents: [], documentMode: "none", description: "Materials", requiresObserver: false },
    { name: "Assessment", percentage: 25, documents: ["Results"], documentMode: "optional", description: "Assessed", requiresObserver: false },
    { name: "Certification", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certified", requiresObserver: false },
  ],
};

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

interface MilestoneTimelineProps {
  industry?: string | null;
  status: string;
}

const MilestoneTimeline = ({ industry, status }: MilestoneTimelineProps) => {
  const key = industry?.toLowerCase().replace(/[^a-z]/g, "") || "";
  const milestones = INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;

  if (!milestones) {
    return (
      <div className="py-3 px-4 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">No timeline template for this industry.</p>
      </div>
    );
  }

  const activeIdx = getActiveIndex(status, milestones.length);
  const overallProgress = status === "released" ? 100 : status === "disputed" ? 0 : Math.round(((activeIdx + 1) / milestones.length) * 100);

  // Cumulative percentage for Gantt-style bar widths
  let cumulative = 0;
  const bars = milestones.map((ms, i) => {
    const start = cumulative;
    cumulative += ms.percentage;
    return { ...ms, start, end: cumulative, index: i };
  });

  return (
    <div className="space-y-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">
          Gantt Timeline — {industry || "Unknown"}
        </p>
        <Badge variant="outline" className="text-[10px]">{overallProgress}% Complete</Badge>
      </div>

      {/* Gantt-style bar */}
      <div className="relative w-full h-8 bg-muted/40 rounded-lg overflow-hidden flex">
        {bars.map((bar) => {
          const isComplete = bar.index < activeIdx;
          const isCurrent = bar.index === activeIdx && status !== "released" && status !== "disputed";
          return (
            <div
              key={bar.index}
              className={`h-full flex items-center justify-center text-[9px] font-medium border-r border-background/50 transition-colors ${
                isComplete
                  ? "bg-primary/70 text-primary-foreground"
                  : isCurrent
                  ? "bg-accent/50 text-accent-foreground animate-pulse"
                  : "bg-muted/60 text-muted-foreground"
              }`}
              style={{ width: `${bar.percentage}%` }}
              title={`${bar.name} — ${bar.percentage}%`}
            >
              {bar.percentage >= 10 ? bar.name : ""}
            </div>
          );
        })}
      </div>

      {/* Percentage ruler */}
      <div className="flex text-[8px] text-muted-foreground font-mono">
        {bars.map((bar) => (
          <div key={bar.index} className="text-center" style={{ width: `${bar.percentage}%` }}>
            {bar.percentage}%
          </div>
        ))}
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {milestones.map((ms, i) => {
          const isComplete = i < activeIdx;
          const isCurrent = i === activeIdx && status !== "released" && status !== "disputed";
          const isPending = i > activeIdx || status === "disputed";

          return (
            <div
              key={i}
              className={`flex items-start gap-2 p-2 rounded-md text-xs border transition-colors ${
                isComplete
                  ? "bg-primary/5 border-primary/20"
                  : isCurrent
                  ? "bg-accent/10 border-accent/30"
                  : "bg-muted/20 border-transparent"
              }`}
            >
              <div className="mt-0.5">
                {isComplete ? (
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-semibold ${isPending ? "text-muted-foreground" : ""}`}>
                    {ms.name}
                  </span>
                  <span className="text-muted-foreground font-mono">{ms.percentage}%</span>
                </div>
                <p className="text-muted-foreground text-[10px]">{ms.description}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {ms.documentMode === "required" && (
                    <Badge variant="destructive" className="text-[8px] h-3.5 px-1 gap-0.5">
                      <Lock className="w-2 h-2" /> Docs
                    </Badge>
                  )}
                  {ms.documentMode === "optional" && (
                    <Badge variant="secondary" className="text-[8px] h-3.5 px-1 gap-0.5">
                      <Unlock className="w-2 h-2" /> Opt
                    </Badge>
                  )}
                  {ms.requiresObserver && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
                      <Eye className="w-2 h-2" /> Observer
                    </Badge>
                  )}
                  {ms.documents.length > 0 && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
                      <FileText className="w-2 h-2" /> {ms.documents.length}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MilestoneTimeline;

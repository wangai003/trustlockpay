import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Eye, CheckCircle, Circle, Clock, FileText, AlertTriangle, CalendarDays, Globe } from "lucide-react";
import { useTransactionMilestones } from "@/hooks/useSupabaseData";
import { format, addDays, differenceInDays, isAfter } from "date-fns";

/* ── Timezone-localized date formatting ── */
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatLocalDate(date: Date, pattern: string): string {
  // Use date-fns format but append timezone abbreviation for full dates
  return format(date, pattern);
}

function formatLocalDateWithTZ(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

type DocumentMode = "none" | "optional" | "required";

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: DocumentMode;
  description: string;
  requiresObserver: boolean;
  estimatedDays: number;
}

const INDUSTRY_MILESTONES: Record<string, MilestoneTemplate[]> = {
  "construction": [
    { name: "Contract Upload", percentage: 5, documents: ["Construction Contract"], documentMode: "required", description: "Both parties sign the contract", requiresObserver: false, estimatedDays: 3 },
    { name: "Foundation", percentage: 15, documents: ["Inspection Report"], documentMode: "required", description: "Inspector verifies foundation", requiresObserver: true, estimatedDays: 21 },
    { name: "Structural", percentage: 25, documents: ["Engineer Report"], documentMode: "required", description: "Walls & roofing", requiresObserver: true, estimatedDays: 30 },
    { name: "MEP", percentage: 20, documents: ["Electrical Cert"], documentMode: "required", description: "Systems verified", requiresObserver: true, estimatedDays: 14 },
    { name: "Walkthrough", percentage: 15, documents: ["Punch List"], documentMode: "optional", description: "Final inspection", requiresObserver: false, estimatedDays: 5 },
    { name: "Occupancy Cert", percentage: 10, documents: ["Certificate"], documentMode: "required", description: "Govt cert obtained", requiresObserver: true, estimatedDays: 14 },
    { name: "Final Release", percentage: 10, documents: [], documentMode: "none", description: "Escrow released", requiresObserver: false, estimatedDays: 3 },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed"], documentMode: "required", description: "Legal review", requiresObserver: true, estimatedDays: 14 },
    { name: "Inspection", percentage: 15, documents: ["Report"], documentMode: "optional", description: "Property check", requiresObserver: false, estimatedDays: 7 },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal"], documentMode: "required", description: "Valuation", requiresObserver: true, estimatedDays: 10 },
    { name: "Closing", percentage: 60, documents: ["Transfer"], documentMode: "required", description: "Key handover", requiresObserver: true, estimatedDays: 7 },
  ],
  "agriculture": [
    { name: "Contract", percentage: 10, documents: ["Contract"], documentMode: "required", description: "Agreement", requiresObserver: true, estimatedDays: 3 },
    { name: "Harvest", percentage: 15, documents: ["Quality Cert"], documentMode: "required", description: "Quality test", requiresObserver: true, estimatedDays: 14 },
    { name: "Packaging", percentage: 15, documents: ["Phyto Cert"], documentMode: "required", description: "Export ready", requiresObserver: true, estimatedDays: 7 },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true, estimatedDays: 21 },
    { name: "Customs", percentage: 15, documents: ["Declaration"], documentMode: "required", description: "Cleared", requiresObserver: true, estimatedDays: 10 },
    { name: "Delivery", percentage: 20, documents: ["Receipt"], documentMode: "optional", description: "Accepted", requiresObserver: false, estimatedDays: 3 },
  ],
  "mining": [
    { name: "Assay", percentage: 10, documents: ["Assay Report"], documentMode: "required", description: "Purity certified", requiresObserver: true, estimatedDays: 7 },
    { name: "Export", percentage: 5, documents: ["Permit"], documentMode: "required", description: "Authorized", requiresObserver: true, estimatedDays: 10 },
    { name: "Insurance", percentage: 10, documents: ["Insurance"], documentMode: "required", description: "Insured", requiresObserver: false, estimatedDays: 5 },
    { name: "Customs", percentage: 15, documents: ["AML Decl."], documentMode: "required", description: "Origin cleared", requiresObserver: true, estimatedDays: 7 },
    { name: "Shipping", percentage: 25, documents: ["Waybill"], documentMode: "required", description: "In transit", requiresObserver: true, estimatedDays: 14 },
    { name: "Destination", percentage: 20, documents: ["Import Decl."], documentMode: "required", description: "Dest. cleared", requiresObserver: true, estimatedDays: 7 },
    { name: "Delivery", percentage: 15, documents: ["Acceptance"], documentMode: "required", description: "Released", requiresObserver: false, estimatedDays: 3 },
  ],
  "projectmanagement": [
    { name: "Charter", percentage: 10, documents: ["Charter", "SOW"], documentMode: "required", description: "Scope defined", requiresObserver: false, estimatedDays: 5 },
    { name: "Kick-Off", percentage: 5, documents: ["RACI"], documentMode: "optional", description: "Team assigned", requiresObserver: false, estimatedDays: 3 },
    { name: "Phase 1", percentage: 25, documents: ["Phase 1 Report"], documentMode: "required", description: "First deliverable", requiresObserver: true, estimatedDays: 21 },
    { name: "Mid-Review", percentage: 10, documents: ["Status Report"], documentMode: "required", description: "Scope validation", requiresObserver: true, estimatedDays: 5 },
    { name: "Phase 2", percentage: 25, documents: ["Phase 2 Report"], documentMode: "required", description: "Second deliverable", requiresObserver: true, estimatedDays: 21 },
    { name: "UAT", percentage: 15, documents: ["UAT Sign-Off"], documentMode: "required", description: "Client testing", requiresObserver: false, estimatedDays: 7 },
    { name: "Close-Out", percentage: 10, documents: ["Close-Out"], documentMode: "optional", description: "Final release", requiresObserver: false, estimatedDays: 3 },
  ],
  "freelance": [
    { name: "Scope", percentage: 20, documents: ["Scope Doc"], documentMode: "optional", description: "Requirements", requiresObserver: false, estimatedDays: 3 },
    { name: "Draft", percentage: 30, documents: ["Draft"], documentMode: "optional", description: "First delivery", requiresObserver: false, estimatedDays: 7 },
    { name: "Revision", percentage: 20, documents: [], documentMode: "none", description: "Feedback round", requiresObserver: false, estimatedDays: 5 },
    { name: "Final", percentage: 30, documents: ["Sign-off"], documentMode: "required", description: "Approved", requiresObserver: false, estimatedDays: 3 },
  ],
  "logistics": [
    { name: "LC/Agreement", percentage: 5, documents: ["Contract"], documentMode: "required", description: "LC opened", requiresObserver: true, estimatedDays: 5 },
    { name: "Inspection", percentage: 15, documents: ["Cert"], documentMode: "required", description: "Inspected", requiresObserver: true, estimatedDays: 7 },
    { name: "Export", percentage: 15, documents: ["License"], documentMode: "required", description: "Cleared", requiresObserver: true, estimatedDays: 5 },
    { name: "Shipping", percentage: 25, documents: ["B/L"], documentMode: "required", description: "In transit", requiresObserver: true, estimatedDays: 21 },
    { name: "Import", percentage: 15, documents: ["Duty Receipt"], documentMode: "required", description: "Processed", requiresObserver: true, estimatedDays: 7 },
    { name: "Delivery", percentage: 10, documents: ["POD"], documentMode: "optional", description: "Delivered", requiresObserver: false, estimatedDays: 3 },
    { name: "Settlement", percentage: 15, documents: ["Confirmation"], documentMode: "required", description: "Released", requiresObserver: true, estimatedDays: 5 },
  ],
  "tourism": [
    { name: "Booking", percentage: 50, documents: ["Confirmation"], documentMode: "optional", description: "Reserved", requiresObserver: false, estimatedDays: 1 },
    { name: "Completed", percentage: 50, documents: [], documentMode: "none", description: "Service done", requiresObserver: false, estimatedDays: 3 },
  ],
  "retail": [
    { name: "Payment Locked", percentage: 100, documents: [], documentMode: "none", description: "Full escrow", requiresObserver: false, estimatedDays: 7 },
  ],
  "education": [
    { name: "Enrollment", percentage: 25, documents: ["Form"], documentMode: "optional", description: "Enrolled", requiresObserver: false, estimatedDays: 3 },
    { name: "Course Access", percentage: 25, documents: [], documentMode: "none", description: "Materials", requiresObserver: false, estimatedDays: 14 },
    { name: "Assessment", percentage: 25, documents: ["Results"], documentMode: "optional", description: "Assessed", requiresObserver: false, estimatedDays: 7 },
    { name: "Certification", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certified", requiresObserver: false, estimatedDays: 5 },
  ],
};

function getActiveIndexFromStatus(status: string, totalStages: number): number {
  switch (status) {
    case "locked": return 0;
    case "shipped": return Math.min(Math.floor(totalStages * 0.4), totalStages - 1);
    case "delivered": return totalStages - 2;
    case "released": return totalStages;
    case "disputed": return -1;
    default: return 0;
  }
}

function getActiveIndexFromMilestones(
  milestoneData: Array<{ status: string | null; position: number; fulfilled_at?: string | null; estimated_days?: number | null }>,
  totalTemplateStages: number
): number {
  if (!milestoneData.length) return -1;
  const completedCount = milestoneData.filter(
    (m) => m.status === "fulfilled" || m.status === "released" || m.status === "completed"
  ).length;
  if (completedCount >= milestoneData.length) return totalTemplateStages;
  const ratio = totalTemplateStages / milestoneData.length;
  return Math.round(completedCount * ratio);
}

interface GanttBar {
  name: string;
  projectedStart: Date;
  projectedEnd: Date;
  actualEnd: Date | null;
  durationDays: number;
  percentage: number;
  index: number;
  isComplete: boolean;
  isCurrent: boolean;
  isOverdue: boolean;
  documentMode: DocumentMode;
  requiresObserver: boolean;
  documents: string[];
  description: string;
}

interface MilestoneTimelineProps {
  industry?: string | null;
  status: string;
  transactionId?: string | null;
  createdAt?: string | null;
}

const MilestoneTimeline = ({ industry, status, transactionId, createdAt }: MilestoneTimelineProps) => {
  const { data: dbMilestones } = useTransactionMilestones(transactionId || undefined);

  const key = industry?.toLowerCase().replace(/[^a-z]/g, "") || "";
  const milestones = INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;

  const ganttData = useMemo(() => {
    if (!milestones) return null;

    const startDate = createdAt ? new Date(createdAt) : new Date();
    const now = new Date();
    const totalDays = milestones.reduce((sum, ms) => sum + ms.estimatedDays, 0);

    const activeIdx = dbMilestones && dbMilestones.length > 0
      ? getActiveIndexFromMilestones(dbMilestones, milestones.length)
      : getActiveIndexFromStatus(status, milestones.length);

    let cumulativeDays = 0;
    const bars: GanttBar[] = milestones.map((ms, i) => {
      // Use DB estimated_days if available, else template
      const dbMs = dbMilestones?.find(d => d.position === i);
      const durationDays = (dbMs as any)?.estimated_days ?? ms.estimatedDays;

      const projectedStart = addDays(startDate, cumulativeDays);
      const projectedEnd = addDays(startDate, cumulativeDays + durationDays);
      cumulativeDays += durationDays;

      const isComplete = i < activeIdx;
      const isCurrent = i === activeIdx && status !== "released" && status !== "disputed";
      const actualEnd = isComplete && dbMs?.completed_at ? new Date(dbMs.completed_at) : null;
      const isOverdue = isCurrent && isAfter(now, projectedEnd);

      return {
        name: ms.name,
        projectedStart,
        projectedEnd,
        actualEnd,
        durationDays,
        percentage: ms.percentage,
        index: i,
        isComplete,
        isCurrent,
        isOverdue,
        documentMode: ms.documentMode,
        requiresObserver: ms.requiresObserver,
        documents: ms.documents,
        description: ms.description,
      };
    });

    const overallProgress = status === "released" ? 100 : status === "disputed" ? 0 : Math.round(((activeIdx + 1) / milestones.length) * 100);
    const projectedCompletion = addDays(startDate, totalDays);
    const overdueCount = bars.filter(b => b.isOverdue).length;

    return { bars, totalDays, overallProgress, projectedCompletion, startDate, activeIdx, overdueCount };
  }, [milestones, dbMilestones, status, createdAt]);

  if (!milestones || !ganttData) {
    return (
      <div className="py-3 px-4 bg-muted/30 rounded-lg">
        <p className="text-xs text-muted-foreground">No timeline template for this industry.</p>
      </div>
    );
  }

  const { bars, totalDays, overallProgress, projectedCompletion, startDate, overdueCount } = ganttData;

  return (
    <div className="space-y-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          Gantt Timeline — {industry || "Unknown"}
        </p>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              {overdueCount} Overdue
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {Math.min(overallProgress, 100)}% Complete
          </Badge>
        </div>
      </div>

      {/* Date axis header */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
        <span title={formatLocalDateWithTZ(startDate)}>{format(startDate, "dd MMM yyyy")}</span>
        <span className="text-foreground font-semibold">{totalDays} days projected</span>
        <span title={formatLocalDateWithTZ(projectedCompletion)}>{format(projectedCompletion, "dd MMM yyyy")}</span>
      </div>

      {/* Gantt bars */}
      <div className="space-y-1">
        {bars.map((bar) => {
          const widthPercent = (bar.durationDays / totalDays) * 100;
          const offsetPercent = (differenceInDays(bar.projectedStart, startDate) / totalDays) * 100;

          return (
            <div key={bar.index} className="relative flex items-center gap-2">
              {/* Label */}
              <div className="w-20 sm:w-24 shrink-0 text-right pr-1">
                <span className={`text-[9px] font-medium truncate block ${
                  bar.isComplete ? "text-primary" : bar.isCurrent ? "text-accent-foreground" : "text-muted-foreground"
                }`}>
                  {bar.name}
                </span>
              </div>

              {/* Bar track */}
              <div className="flex-1 relative h-6 bg-muted/30 rounded overflow-hidden">
                {/* Projected bar */}
                <div
                  className={`absolute top-0 h-full rounded transition-all ${
                    bar.isComplete
                      ? "bg-primary/70"
                      : bar.isOverdue
                      ? "bg-destructive/60 animate-pulse"
                      : bar.isCurrent
                      ? "bg-accent/50"
                      : "bg-muted/60"
                  }`}
                  style={{
                    left: `${offsetPercent}%`,
                    width: `${Math.max(widthPercent, 2)}%`,
                  }}
                >
                  {/* Inner content */}
                  <div className="flex items-center justify-between h-full px-1.5 text-[8px] font-medium">
                    <span className={`truncate ${
                      bar.isComplete ? "text-primary-foreground" : bar.isOverdue ? "text-destructive-foreground" : "text-foreground/70"
                    }`}>
                      {widthPercent > 8 ? `${bar.durationDays}d` : ""}
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      {bar.isComplete && <CheckCircle className="w-2.5 h-2.5 text-primary-foreground" />}
                      {bar.isCurrent && !bar.isOverdue && <Clock className="w-2.5 h-2.5 text-accent-foreground animate-pulse" />}
                      {bar.isOverdue && <AlertTriangle className="w-2.5 h-2.5 text-destructive-foreground" />}
                      {bar.documentMode === "required" && <Lock className="w-2.5 h-2.5 opacity-70" />}
                      {bar.requiresObserver && <Eye className="w-2.5 h-2.5 opacity-70" />}
                    </span>
                  </div>
                </div>

                {/* Today marker */}
                {bar.isCurrent && (() => {
                  const now = new Date();
                  const elapsed = differenceInDays(now, bar.projectedStart);
                  const progress = Math.min(Math.max(elapsed / bar.durationDays, 0), 1);
                  const markerLeft = offsetPercent + widthPercent * progress;
                  return (
                    <div
                      className="absolute top-0 h-full w-px bg-foreground/80 z-10"
                      style={{ left: `${markerLeft}%` }}
                    >
                      <div className="absolute -top-0.5 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-foreground" />
                    </div>
                  );
                })()}
              </div>

              {/* Date range */}
              <div className="hidden sm:block w-28 shrink-0 text-[8px] text-muted-foreground font-mono pl-1" title={`${formatLocalDateWithTZ(bar.projectedStart)} → ${formatLocalDateWithTZ(bar.projectedEnd)}`}>
                {format(bar.projectedStart, "dd MMM")} → {format(bar.projectedEnd, "dd MMM")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[9px] text-muted-foreground pt-1 border-t border-border/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-primary/70" /> Completed
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-accent/50" /> In Progress
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-destructive/60" /> Overdue
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-muted/60" /> Pending
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" /> Doc Gate
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" /> Observer
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {bars.map((bar) => (
          <div
            key={bar.index}
            className={`flex items-start gap-2 p-2 rounded-md text-xs border transition-colors ${
              bar.isComplete
                ? "bg-primary/5 border-primary/20"
                : bar.isOverdue
                ? "bg-destructive/5 border-destructive/20"
                : bar.isCurrent
                ? "bg-accent/10 border-accent/30"
                : "bg-muted/20 border-transparent"
            }`}
          >
            <div className="mt-0.5">
              {bar.isComplete ? (
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
              ) : bar.isOverdue ? (
                <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
              ) : bar.isCurrent ? (
                <Clock className="w-3.5 h-3.5 text-accent animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-semibold ${!bar.isComplete && !bar.isCurrent && !bar.isOverdue ? "text-muted-foreground" : ""}`}>
                  {bar.name}
                </span>
                <span className="text-muted-foreground font-mono">{bar.percentage}% · {bar.durationDays}d</span>
              </div>
              <p className="text-muted-foreground text-[10px]">{bar.description}</p>
              <p className="text-[9px] text-muted-foreground font-mono mt-0.5" title={`${formatLocalDateWithTZ(bar.projectedStart)} → ${formatLocalDateWithTZ(bar.projectedEnd)}`}>
                {format(bar.projectedStart, "dd MMM")} → {format(bar.projectedEnd, "dd MMM yyyy")}
                {bar.isOverdue && (
                  <span className="text-destructive font-semibold ml-1">
                    (+{differenceInDays(new Date(), bar.projectedEnd)}d overdue)
                  </span>
                )}
                {bar.isComplete && bar.actualEnd && (
                  <span className="text-primary ml-1">
                    ✓ {format(bar.actualEnd, "dd MMM")}
                  </span>
                )}
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {bar.documentMode === "required" && (
                  <Badge variant="destructive" className="text-[8px] h-3.5 px-1 gap-0.5">
                    <Lock className="w-2 h-2" /> Docs
                  </Badge>
                )}
                {bar.documentMode === "optional" && (
                  <Badge variant="secondary" className="text-[8px] h-3.5 px-1 gap-0.5">
                    <Unlock className="w-2 h-2" /> Opt
                  </Badge>
                )}
                {bar.requiresObserver && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
                    <Eye className="w-2 h-2" /> Observer
                  </Badge>
                )}
                {bar.documents.length > 0 && (
                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 gap-0.5">
                    <FileText className="w-2 h-2" /> {bar.documents.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MilestoneTimeline;

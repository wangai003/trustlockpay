import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Banknote, CheckCircle2, Lock, Trash2 } from "lucide-react";
import { INDUSTRY_MILESTONES, type LayoutMode } from "./milestoneConstants";

interface ProgressStepperProps {
  milestones: any[];
  activeIndex: number;
  onStepClick: (idx: number) => void;
}

export const ProgressStepper = ({ milestones, activeIndex, onStepClick }: ProgressStepperProps) => {
  return (
    <div className="flex items-center gap-0.5 py-1 overflow-x-auto">
      <div className="flex items-end gap-0.5 w-full">
        {milestones.map((ms: any, idx: number) => {
          const isDone = ms.status === "completed" || ms.status === "released";
          const isActive = idx === activeIndex;
          const isDeleted = ms.status === "deleted";
          return (
            <button
              key={ms.id} onClick={() => onStepClick(idx)}
              className="flex flex-col items-center flex-1 min-w-0 group"
              title={ms.title}
            >
              <div className={`w-full h-1.5 rounded-full transition-all ${
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

interface BlueprintSummaryProps {
  industry?: string | null;
  layoutMode: LayoutMode;
}

export const BlueprintSummary = ({ industry, layoutMode }: BlueprintSummaryProps) => {
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

interface OverallProgressProps {
  milestones: any[];
  industry?: string | null;
  role: "buyer" | "vendor" | "admin";
}

export const OverallProgress = ({ milestones, industry, role }: OverallProgressProps) => {
  if (milestones.length <= 1) return null;
  const completed = milestones.filter((ms: any) => ms.status === "completed" || ms.status === "released").length;
  const deleted = milestones.filter((ms: any) => ms.status === "deleted").length;
  const total = milestones.length - deleted;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const released = milestones.filter((ms: any) => ms.status === "released").length;
  const releasedAmount = milestones
    .filter((ms: any) => ms.status === "released" && ms.is_payment_milestone)
    .reduce((sum: number, ms: any) => sum + Number(ms.payment_amount || 0), 0);

  const waiting = milestones.find((ms: any) => ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted");
  let ownerLabel: string | null = null;
  if (waiting) {
    const k = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
    const bp = INDUSTRY_MILESTONES[k] || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(ki => k.includes(ki)) || ""] || null;
    const wIdx = milestones.indexOf(waiting as any);
    const template = bp?.[wIdx] || null;
    const owner = template?.owner || "vendor";
    ownerLabel = owner === role ? "your_turn" : owner === "both" ? "both" : owner;
  }

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
        {ownerLabel && (
          <span className="flex items-center gap-0.5 ml-auto">
            {ownerLabel === "your_turn" ? (
              <><AlertTriangle className="w-3 h-3 text-accent" /> Your turn</>
            ) : (
              <><Lock className="w-3 h-3" /> Waiting on {ownerLabel}</>
            )}
          </span>
        )}
      </div>
    </div>
  );
};

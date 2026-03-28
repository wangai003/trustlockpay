import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Clock, Upload, Image, AlertTriangle, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskAssignment = {
  id: string;
  member_id: string;
  milestone_key: string;
  milestone_label: string | null;
  instructions: string | null;
  status: string;
  sort_order: number;
  deadline_at?: string | null;
  sla_hours?: number | null;
  evidence_url?: string | null;
};

type MemberInfo = { id: string; display_name: string | null; user_id: string; preferred_language?: string };

interface Props {
  task: TaskAssignment;
  index: number;
  isOwner: boolean;
  isMyTask: boolean;
  canComplete: boolean;
  allPriorDone: boolean;
  member?: MemberInfo;
  workspaceId: string;
  onRefresh: () => void;
}

const LANG_MAP: Record<string, string> = {
  en: "English", fr: "Français", sw: "Kiswahili", pt: "Português", ar: "العربية", es: "Español",
};

const TeamTaskCard = ({ task, index, isOwner, isMyTask, canComplete, allPriorDone, member, workspaceId, onRefresh }: Props) => {
  const [showComplete, setShowComplete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOverdue = task.deadline_at && new Date(task.deadline_at) < new Date() && task.status !== "completed";
  const hoursLeft = task.deadline_at ? Math.max(0, Math.round((new Date(task.deadline_at).getTime() - Date.now()) / 3600000)) : null;

  const completeWithEvidence = async () => {
    setUploading(true);
    let evidenceUrl: string | null = null;

    if (evidenceFile) {
      const path = `${workspaceId}/${task.id}/${evidenceFile.name}`;
      const { error: uploadError } = await supabase.storage.from("team-evidence").upload(path, evidenceFile);
      if (uploadError) { setUploading(false); return toast.error("Upload failed: " + uploadError.message); }
      evidenceUrl = path;
    }

    const { error } = await supabase.functions.invoke("manage-teams", {
      body: { action: "complete_task", task_id: task.id, evidence_url: evidenceUrl },
    });
    setUploading(false);
    if (error) return toast.error("Failed to complete task");
    toast.success("Task completed!");
    setShowComplete(false);
    setEvidenceFile(null);
    onRefresh();
  };

  return (
    <>
      <div className={cn(
        "p-3 sm:p-4 rounded-lg border transition-all",
        isMyTask && task.status === "pending" ? "border-primary bg-primary/5" : "border-border",
        isOverdue && "border-destructive bg-destructive/5"
      )}>
        {/* Mobile-first: stack vertically on small screens */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {isOwner && <span className="text-xs font-bold text-muted-foreground w-5 pt-0.5 shrink-0">{index + 1}</span>}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{task.milestone_label || task.milestone_key}</p>
              {isOwner && member && (
                <p className="text-xs text-muted-foreground truncate">
                  → {member.display_name || "Unknown"}
                  {member.preferred_language && member.preferred_language !== "en" && (
                    <span className="ml-1 inline-flex items-center gap-0.5"><Globe className="w-3 h-3" />{LANG_MAP[member.preferred_language] || member.preferred_language}</span>
                  )}
                </p>
              )}
              {task.instructions && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{task.instructions}</p>}

              {/* Deadline / SLA */}
              {task.deadline_at && (
                <div className={cn("flex items-center gap-1 mt-1 text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                  <Clock className="w-3 h-3" />
                  {isOverdue ? (
                    <span>⚠ Overdue — was due {new Date(task.deadline_at).toLocaleDateString()}</span>
                  ) : (
                    <span>Due {new Date(task.deadline_at).toLocaleDateString()} ({hoursLeft}h left)</span>
                  )}
                </div>
              )}
              {task.sla_hours && !task.deadline_at && (
                <p className="text-xs text-muted-foreground mt-1"><Clock className="w-3 h-3 inline mr-1" />SLA: {task.sla_hours}h</p>
              )}

              {/* Evidence link */}
              {task.evidence_url && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1"><Image className="w-3 h-3" />Evidence attached</p>
              )}

              {/* Sequential gate warning */}
              {!isOwner && !allPriorDone && task.status === "pending" && (
                <p className="text-xs text-amber-600 mt-1">⏳ Waiting for previous task</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {canComplete && (
              <Button size="sm" variant="default" onClick={() => setShowComplete(true)} className="text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
              </Button>
            )}
            <Badge
              variant={task.status === "completed" ? "default" : task.status === "in_progress" ? "secondary" : "outline"}
              className={cn("text-xs", isOverdue && task.status !== "completed" && "bg-destructive text-destructive-foreground")}
            >
              {isOverdue && task.status !== "completed" ? "overdue" : task.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Complete with Evidence Dialog */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Task</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mark <strong>{task.milestone_label || task.milestone_key}</strong> as complete.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Attach Evidence (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload a photo, report, or document as proof of completion.</p>
              <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-1" /> {evidenceFile ? evidenceFile.name : "Choose File"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComplete(false)}>Cancel</Button>
            <Button onClick={completeWithEvidence} disabled={uploading}>
              {uploading ? "Uploading..." : "Confirm Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTaskCard;

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Clock, Upload, Image, Globe, ShieldCheck, RefreshCw, UserCheck } from "lucide-react";
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
  lead_verified_at?: string | null;
  lead_verified_by?: string | null;
  reassigned_from?: string | null;
  transaction_milestone_id?: string | null;
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
  allMembers?: MemberInfo[];
}

const LANG_MAP: Record<string, string> = {
  en: "English", fr: "Français", sw: "Kiswahili", pt: "Português", ar: "العربية", es: "Español",
};

const TeamTaskCard = ({ task, index, isOwner, isMyTask, canComplete, allPriorDone, member, workspaceId, onRefresh, allMembers }: Props) => {
  const [showComplete, setShowComplete] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isOverdue = task.deadline_at && new Date(task.deadline_at) < new Date() && task.status !== "completed";
  const hoursLeft = task.deadline_at ? Math.max(0, Math.round((new Date(task.deadline_at).getTime() - Date.now()) / 3600000)) : null;
  const isVerified = !!task.lead_verified_at;
  const needsVerification = task.status === "completed" && !isVerified;

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

  const verifyTask = async () => {
    setVerifying(true);
    const { error } = await supabase.functions.invoke("manage-teams", {
      body: { action: "verify_task", task_id: task.id },
    });
    setVerifying(false);
    if (error) return toast.error("Failed to verify task");
    toast.success("Task verified! Milestone updated.");
    onRefresh();
  };

  const reassignTask = async () => {
    if (!reassignTo) return toast.error("Select a member");
    const { error } = await supabase.functions.invoke("manage-teams", {
      body: { action: "reassign_task", task_id: task.id, new_member_id: reassignTo },
    });
    if (error) return toast.error("Failed to reassign");
    toast.success("Task reassigned!");
    setShowReassign(false);
    setReassignTo("");
    onRefresh();
  };

  const takeoverTask = async (autoComplete: boolean) => {
    setTakingOver(true);
    const { error } = await supabase.functions.invoke("manage-teams", {
      body: { action: "takeover_task", task_id: task.id, auto_complete: autoComplete },
    });
    setTakingOver(false);
    if (error) return toast.error("Failed to take over task");
    toast.success(autoComplete ? "Task taken over and completed!" : "Task taken over!");
    onRefresh();
  };

  return (
    <>
      <div className={cn(
        "p-3 sm:p-4 rounded-lg border transition-all",
        isMyTask && task.status === "pending" ? "border-primary bg-primary/5" : "border-border",
        isOverdue && "border-destructive bg-destructive/5",
        isVerified && "border-green-500/30 bg-green-500/5"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            {isOwner && <span className="text-xs font-bold text-muted-foreground w-5 pt-0.5 shrink-0">{index + 1}</span>}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{task.milestone_label || task.milestone_key}</p>
              {isOwner && member && (
                <p className="text-xs text-muted-foreground truncate">
                  → {member.display_name || "Unknown"}
                  {task.reassigned_from && <span className="ml-1 text-amber-600">(reassigned)</span>}
                  {member.preferred_language && member.preferred_language !== "en" && (
                    <span className="ml-1 inline-flex items-center gap-0.5"><Globe className="w-3 h-3" />{LANG_MAP[member.preferred_language] || member.preferred_language}</span>
                  )}
                </p>
              )}
              {task.instructions && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{task.instructions}</p>}

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

              {task.evidence_url && (
                <p className="text-xs text-primary mt-1 flex items-center gap-1"><Image className="w-3 h-3" />Evidence attached</p>
              )}

              {isVerified && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Verified by lead — {new Date(task.lead_verified_at!).toLocaleDateString()}</p>
              )}

              {!isOwner && !allPriorDone && task.status === "pending" && (
                <p className="text-xs text-amber-600 mt-1">⏳ Waiting for previous task</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
            {/* Member: complete button */}
            {canComplete && (
              <Button size="sm" variant="default" onClick={() => setShowComplete(true)} className="text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
              </Button>
            )}

            {/* Owner: verify button */}
            {isOwner && needsVerification && (
              <Button size="sm" variant="outline" onClick={verifyTask} disabled={verifying} className="text-xs border-green-500 text-green-700 hover:bg-green-50">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {verifying ? "Verifying..." : "Verify"}
              </Button>
            )}

            {/* Owner: reassign button */}
            {isOwner && task.status === "pending" && allMembers && allMembers.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => setShowReassign(true)} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reassign
              </Button>
            )}

            <Badge
              variant={isVerified ? "default" : task.status === "completed" ? "secondary" : task.status === "in_progress" ? "secondary" : "outline"}
              className={cn("text-xs",
                isOverdue && task.status !== "completed" && "bg-destructive text-destructive-foreground",
                isVerified && "bg-green-600 text-white"
              )}
            >
              {isVerified ? "verified" : isOverdue && task.status !== "completed" ? "overdue" : task.status}
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

      {/* Reassign Dialog */}
      <Dialog open={showReassign} onOpenChange={setShowReassign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reassign Task</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reassign <strong>{task.milestone_label || task.milestone_key}</strong> to another team member.
          </p>
          <div>
            <Label>New Assignee</Label>
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {(allMembers || []).filter(m => m.id !== task.member_id).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassign(false)}>Cancel</Button>
            <Button onClick={reassignTask}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamTaskCard;

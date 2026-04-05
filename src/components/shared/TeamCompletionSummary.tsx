import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PartyPopper, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { TaskAssignment } from "./TeamTaskCard";

interface Props {
  tasks: TaskAssignment[];
  workspaceId: string;
  workspaceTitle: string;
  isOwner: boolean;
  onClose: () => void;
}

const TeamCompletionSummary = ({ tasks, workspaceId, workspaceTitle, isOwner, onClose }: Props) => {
  const [closing, setClosing] = useState(false);
  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const verified = tasks.filter(t => t.lead_verified_at).length;
  const allVerified = totalTasks > 0 && verified === totalTasks;
  const allCompleted = totalTasks > 0 && completed === totalTasks;
  const pendingVerification = completed - verified;

  if (totalTasks === 0 || (!allCompleted && !allVerified)) return null;

  const closeWorkspace = async () => {
    setClosing(true);
    const { error } = await supabase.functions.invoke("manage-teams", {
      body: { action: "close_workspace", workspace_id: workspaceId, close_status: "complete" },
    });
    setClosing(false);
    if (error) return toast.error("Failed to close workspace");
    toast.success("Work order finalized! All members notified.");
    onClose();
  };

  return (
    <Card className={allVerified ? "border-green-500/40 bg-green-500/5" : "border-amber-500/40 bg-amber-500/5"}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {allVerified ? (
            <PartyPopper className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-2">
            <p className="font-semibold text-sm">
              {allVerified ? "All Tasks Verified — Ready to Close" : "All Tasks Completed — Verification Pending"}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{totalTasks} tasks total</Badge>
              <Badge variant="secondary">{completed} completed</Badge>
              <Badge className={verified === totalTasks ? "bg-green-600 text-white" : ""}>{verified} verified</Badge>
              {pendingVerification > 0 && (
                <Badge variant="outline" className="text-amber-700">{pendingVerification} awaiting your review</Badge>
              )}
            </div>

            {allVerified && isOwner && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  All team tasks are verified. Close this workspace to notify all members and finalize the work order.
                </p>
                <Button size="sm" onClick={closeWorkspace} disabled={closing} className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {closing ? "Finalizing..." : "Finalize & Close Workspace"}
                </Button>
              </div>
            )}

            {allCompleted && !allVerified && isOwner && (
              <p className="text-xs text-amber-700">
                Review and verify the remaining {pendingVerification} task(s) before closing this workspace.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamCompletionSummary;

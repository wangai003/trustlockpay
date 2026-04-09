import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Receipt, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MockMilestone } from "@/hooks/useTestnetData";

interface MilestoneDialogsProps {
  isTestnet: boolean;
  pendingDeleteMilestone: { id: string; title: string } | null;
  setPendingDeleteMilestone: (v: { id: string; title: string } | null) => void;
  pendingRestoreMilestone: { id: string; title: string } | null;
  setPendingRestoreMilestone: (v: { id: string; title: string } | null) => void;
  pendingFeeGateRelease: { id: string; title: string; unverifiedCount: number; unverifiedTotal: number } | null;
  setPendingFeeGateRelease: (v: { id: string; title: string; unverifiedCount: number; unverifiedTotal: number } | null) => void;
  onTestnetUpdateStatus?: (milestoneId: string, status: MockMilestone["status"]) => void;
  onReleaseMilestone: (id: string, bypass: boolean) => Promise<void>;
  getUserId: () => Promise<string | null>;
}

const MilestoneDialogs = ({
  isTestnet,
  pendingDeleteMilestone, setPendingDeleteMilestone,
  pendingRestoreMilestone, setPendingRestoreMilestone,
  pendingFeeGateRelease, setPendingFeeGateRelease,
  onTestnetUpdateStatus, onReleaseMilestone, getUserId,
}: MilestoneDialogsProps) => {
  return (
    <>
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
              await onReleaseMilestone(pendingFeeGateRelease.id, true);
              setPendingFeeGateRelease(null);
            }}>Release Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MilestoneDialogs;

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileText, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "@/components/shared/DocumentUpload";
import {
  useCreateMilestones,
  useReleaseMilestonePayment,
  useTransactionMilestones,
  useUpdateMilestone,
} from "@/hooks/useSupabaseData";

interface MilestoneWorkOrderPanelProps {
  transactionId?: string | null;
  txId: string;
  industry?: string | null;
  role: "buyer" | "vendor";
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Fulfilled",
  released: "Released",
};

const MilestoneWorkOrderPanel = ({ transactionId, txId, industry, role }: MilestoneWorkOrderPanelProps) => {
  const { data: milestones = [] } = useTransactionMilestones(transactionId || undefined);
  const createMilestones = useCreateMilestones();
  const updateMilestone = useUpdateMilestone();
  const releaseMilestonePayment = useReleaseMilestonePayment();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  const handleInitializeMilestones = async () => {
    if (!transactionId) return;
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");

    await createMilestones.mutateAsync({
      transactionId,
      userId,
      customMilestones: [
        {
          title: `${industry || "General"} fulfillment`,
          description: "Primary milestone for this work order",
          is_payment_milestone: true,
          payment_percentage: 100,
          required_documents: [],
          assigned_to: "vendor",
        },
      ],
    });
  };

  const handleSaveNote = async (milestoneId: string) => {
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await updateMilestone.mutateAsync({
      milestoneId,
      userId,
      description: notes[milestoneId] ?? "",
    });
  };

  const handleMarkFulfilled = async (milestoneId: string) => {
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await updateMilestone.mutateAsync({
      milestoneId,
      userId,
      status: "completed",
    });
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await releaseMilestonePayment.mutateAsync({ milestoneId, userId });
  };

  if (!transactionId) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Milestone Work Order Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {milestones.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">No milestone records found for {txId} yet.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleInitializeMilestones}
              disabled={createMilestones.isPending}
            >
              {createMilestones.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              Initialize Milestones (Testnet)
            </Button>
          </div>
        )}

        {milestones.map((ms: any, idx) => {
          const canVendorFulfill = role === "vendor" && ms.status !== "completed" && ms.status !== "released";
          const canBuyerRelease =
            role === "buyer" &&
            ms.status === "completed" &&
            ms.is_payment_milestone &&
            !ms.payment_released;

          return (
            <div key={ms.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">#{idx + 1}</span>
                  <span className="text-sm font-medium">{ms.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {statusLabel[ms.status] || ms.status}
                  </Badge>
                  {ms.is_payment_milestone ? (
                    <Badge className="text-[10px]">Payment Milestone</Badge>
                  ) : null}
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground">
                Amount: ${Number(ms.payment_amount || 0).toLocaleString()} · Uploaded docs: {(ms.uploaded_documents || []).length}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium flex items-center gap-1">
                  <StickyNote className="w-3 h-3" /> Milestone note
                </label>
                <Textarea
                  rows={2}
                  value={notes[ms.id] ?? ms.description ?? ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [ms.id]: e.target.value }))}
                  placeholder="Add implementation notes for this milestone"
                />
                <Button size="sm" variant="outline" onClick={() => handleSaveNote(ms.id)}>
                  Save Note
                </Button>
              </div>

              <DocumentUpload
                label="Upload milestone evidence"
                context={{ bucket: "milestone-documents", transactionId, milestoneId: ms.id }}
                onUploadComplete={(files) => {
                  void (async () => {
                    const userId = await getUserId();
                    if (!userId) return;
                    await updateMilestone.mutateAsync({
                      milestoneId: ms.id,
                      userId,
                      uploadedDocuments: files.map((file) => ({
                        name: file.name,
                        url: file.url,
                        path: file.path,
                        uploadedAt: new Date().toISOString(),
                      })),
                    });
                  })();
                }}
              />

              <div className="flex gap-2 flex-wrap">
                {canVendorFulfill ? (
                  <Button size="sm" onClick={() => handleMarkFulfilled(ms.id)}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Fulfilled
                  </Button>
                ) : null}

                {canBuyerRelease ? (
                  <Button size="sm" onClick={() => handleReleaseMilestone(ms.id)}>
                    <FileText className="w-3 h-3 mr-1" /> Release Milestone
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default MilestoneWorkOrderPanel;
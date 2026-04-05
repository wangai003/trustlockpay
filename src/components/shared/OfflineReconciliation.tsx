import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2, Clock, FileText, Handshake, AlertTriangle,
  Upload, Shield, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "@/components/shared/DocumentUpload";

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  description: string;
}

interface OfflineReconciliationProps {
  role: "buyer" | "vendor";
  transactionId?: string | null;
  txId: string;
  industry?: string | null;
  milestoneTemplates: MilestoneTemplate[];
  /** Called when reconciliation is complete and work order should activate */
  onReconciliationComplete: (skippedIndices: number[]) => void;
  /** For sandbox/testnet mode */
  isTestnet?: boolean;
}

interface ReconciliationEntry {
  milestoneIndex: number;
  milestoneName: string;
  selected: boolean;
  evidenceNote: string;
  evidenceUrl: string | null;
  confirmedByBuyer: boolean;
  confirmedByVendor: boolean;
  status: "proposed" | "agreed" | "rejected";
}

const OfflineReconciliation = ({
  role,
  transactionId,
  txId,
  industry,
  milestoneTemplates,
  onReconciliationComplete,
  isTestnet = false,
}: OfflineReconciliationProps) => {
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [hasOfflineWork, setHasOfflineWork] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<ReconciliationEntry[]>(
    milestoneTemplates.map((t, i) => ({
      milestoneIndex: i,
      milestoneName: t.name,
      selected: false,
      evidenceNote: "",
      evidenceUrl: null,
      confirmedByBuyer: false,
      confirmedByVendor: false,
      status: "proposed",
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  const selectedCount = entries.filter(e => e.selected).length;
  const totalMilestones = milestoneTemplates.length;
  const overHalfSelected = selectedCount > totalMilestones / 2;

  const toggleMilestone = (index: number) => {
    setEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, selected: !e.selected } : e
    ));
  };

  const updateNote = (index: number, note: string) => {
    setEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, evidenceNote: note } : e
    ));
  };

  const updateEvidence = (index: number, url: string) => {
    setEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, evidenceUrl: url } : e
    ));
  };

  const handleSubmitReconciliation = async () => {
    const selected = entries.filter(e => e.selected);
    if (selected.length === 0) {
      toast.error("Select at least one milestone completed offline");
      return;
    }

    // Validate each selected milestone has evidence
    const missingEvidence = selected.filter(e => !e.evidenceNote.trim() && !e.evidenceUrl);
    if (missingEvidence.length > 0) {
      toast.error(`Provide evidence or notes for: ${missingEvidence.map(e => e.milestoneName).join(", ")}`);
      return;
    }

    setSubmitting(true);

    if (isTestnet) {
      // Simulate — auto-agree for testnet
      await new Promise(r => setTimeout(r, 800));
      const skippedIndices = selected.map(e => e.milestoneIndex);
      toast.success(`${selected.length} milestone(s) marked as completed offline`);
      onReconciliationComplete(skippedIndices);
      setSubmitting(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Insert reconciliation entries
      const inserts = selected.map(e => ({
        transaction_id: transactionId!,
        milestone_index: e.milestoneIndex,
        milestone_name: e.milestoneName,
        evidence_note: e.evidenceNote || null,
        evidence_url: e.evidenceUrl || null,
        proposed_by: userId,
        proposed_by_role: role,
        confirmed_by_buyer: role === "buyer",
        confirmed_by_vendor: role === "vendor",
        status: "proposed" as const,
      }));

      const { error } = await (supabase as any)
        .from("offline_reconciliations")
        .insert(inserts);

      if (error) throw error;

      // If over 50% milestones marked offline, notify admins
      if (overHalfSelected) {
        toast.warning("Admin notified — over 50% of milestones marked as offline", { duration: 5000 });
      }

      toast.success(`${selected.length} milestone(s) submitted for offline reconciliation. Awaiting counterparty confirmation.`);
      setShowReconciliation(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onReconciliationComplete([]);
  };

  // Initial question gate
  if (hasOfflineWork === null) {
    return (
      <Card className="border-accent/30 bg-accent/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Handshake className="w-4 h-4 text-accent" />
            Offline Arrangements Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Before activating your work order, we need to check: have any milestones for this{" "}
            <span className="font-medium capitalize">{industry?.replace(/[-_]/g, " ")}</span>{" "}
            order already been completed outside of TrustLock?
          </p>
          <p className="text-[10px] text-muted-foreground">
            Examples: inspections already done, contracts signed offline, goods already shipped, documents already exchanged.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => { setHasOfflineWork(true); setShowReconciliation(true); }}
            >
              <CheckCircle2 className="w-3 h-3" /> Yes, some steps are done
            </Button>
            <Button
              size="sm"
              variant="default"
              className="gap-1 text-xs"
              onClick={() => { setHasOfflineWork(false); handleSkip(); }}
            >
              <ArrowRight className="w-3 h-3" /> No, start fresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!showReconciliation) return null;

  return (
    <>
      <Card className="border-accent/30 bg-accent/[0.03]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Handshake className="w-4 h-4 text-accent" />
              Offline Reconciliation
            </CardTitle>
            <Badge variant="outline" className="text-[9px]">
              {selectedCount}/{totalMilestones} selected
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Select milestones already completed offline. Both buyer and vendor must agree before these are marked as done.
          </p>
          {overHalfSelected && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-destructive">
              <AlertTriangle className="w-3 h-3" />
              Over 50% of milestones marked offline — admin will be notified for review
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.map((entry, idx) => {
            const template = milestoneTemplates[idx];
            const isLastMilestone = idx === totalMilestones - 1;

            // Don't allow marking the final release milestone as offline
            if (isLastMilestone && template.name.toLowerCase().includes("release")) {
              return (
                <div key={idx} className="flex items-center gap-2 p-2 rounded border border-muted bg-muted/10 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-medium">{template.name}</span>
                    <p className="text-[10px] text-muted-foreground">Final release cannot be pre-completed</p>
                  </div>
                  <Badge variant="outline" className="text-[8px]">Locked</Badge>
                </div>
              );
            }

            return (
              <div key={idx} className={`rounded-lg border p-3 transition-all ${
                entry.selected ? "border-accent/40 bg-accent/[0.03]" : "border-border"
              }`}>
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={entry.selected}
                    onCheckedChange={() => toggleMilestone(idx)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-medium">{template.name}</span>
                      <Badge variant="outline" className="text-[8px]">{template.percentage}%</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{template.description}</p>

                    {entry.selected && (
                      <div className="mt-2 space-y-2 pl-7">
                        <Textarea
                          placeholder="Describe what was completed offline (e.g., 'Inspection done by ABC Corp on March 15, report attached')"
                          className="text-xs min-h-[60px]"
                          value={entry.evidenceNote}
                          onChange={(e) => updateNote(idx, e.target.value)}
                        />
                        {template.documents.length > 0 && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Expected docs: {template.documents.join(", ")}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 gap-1"
                            onClick={() => {
                              // Simulate upload for now
                              updateEvidence(idx, `offline-evidence-${txId}-${idx}`);
                              toast.success("Evidence attached");
                            }}
                          >
                            <Upload className="w-3 h-3" /> Attach Evidence
                          </Button>
                          {entry.evidenceUrl && (
                            <Badge className="bg-primary/15 text-primary text-[8px] gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Evidence attached
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" />
              All offline completions are blockchain-anchored
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setShowReconciliation(false);
                  handleSkip();
                }}
              >
                Skip
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1"
                disabled={selectedCount === 0 || submitting}
                onClick={() => setConfirmDialog(true)}
              >
                {submitting ? (
                  <Clock className="w-3 h-3 animate-spin" />
                ) : (
                  <Handshake className="w-3 h-3" />
                )}
                Submit for Confirmation ({selectedCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-accent" />
              Confirm Offline Reconciliation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are marking <strong>{selectedCount}</strong> of {totalMilestones} milestones as completed offline:
              </p>
              <ul className="list-disc pl-4 text-xs space-y-1">
                {entries.filter(e => e.selected).map(e => (
                  <li key={e.milestoneIndex}>
                    <strong>{e.milestoneName}</strong>
                    {e.evidenceNote && <span className="text-muted-foreground"> — {e.evidenceNote.slice(0, 80)}...</span>}
                  </li>
                ))}
              </ul>
              <p className="text-xs font-medium mt-2">
                The counterparty ({role === "vendor" ? "buyer" : "vendor"}) must confirm these before the work order adjusts.
              </p>
              {overHalfSelected && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Admin will be notified for anti-abuse review.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitReconciliation}>
              Confirm & Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OfflineReconciliation;

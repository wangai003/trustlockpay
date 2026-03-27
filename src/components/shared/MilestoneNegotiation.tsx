import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Handshake, Plus, Trash2, CheckCircle2, Clock, PenLine,
  AlertTriangle, GitPullRequest, ArrowRight, Percent
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Milestone Negotiation Component ────────────────────
// Either party (buyer or vendor) can draft milestones.
// Counterparty reviews via diff view and approves or requests changes.
// No deadline — stays open until both agree or one cancels.

export interface MilestoneDraft {
  id: string;
  title: string;
  description: string;
  percentage: number;
  documentRequired: boolean;
  documentName: string;
}

interface MilestoneNegotiationProps {
  role: "buyer" | "vendor";
  txId: string;
  industry?: string;
  orderAmount: number;
  buyerName: string;
  vendorName: string;
  /** Current negotiation state */
  status: "drafting" | "proposed" | "agreed";
  /** Who proposed the current draft */
  proposedBy?: "buyer" | "vendor";
  /** Existing milestones (from template or previous draft) */
  existingMilestones?: MilestoneDraft[];
  /** Previous version for diff view */
  previousMilestones?: MilestoneDraft[];
  onSubmitDraft: (milestones: MilestoneDraft[]) => void;
  onApproveDraft: () => void;
  onRequestChanges: (note: string) => void;
}

const generateId = () => `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const emptyMilestone = (): MilestoneDraft => ({
  id: generateId(),
  title: "",
  description: "",
  percentage: 0,
  documentRequired: false,
  documentName: "",
});

const MilestoneNegotiation = ({
  role,
  txId,
  industry,
  orderAmount,
  buyerName,
  vendorName,
  status,
  proposedBy,
  existingMilestones = [],
  previousMilestones,
  onSubmitDraft,
  onApproveDraft,
  onRequestChanges,
}: MilestoneNegotiationProps) => {
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    existingMilestones.length > 0 ? existingMilestones : [emptyMilestone()]
  );
  const [changeNote, setChangeNote] = useState("");
  const [showChangeInput, setShowChangeInput] = useState(false);

  const totalPercentage = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
  const isValid = totalPercentage === 100 && milestones.every(m => m.title.trim().length > 0);
  const isProposer = proposedBy === role;
  const isReviewer = status === "proposed" && !isProposer;
  const canEdit = status === "drafting" || isReviewer;

  const updateMilestone = (id: string, field: keyof MilestoneDraft, value: string | number | boolean) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addMilestone = () => setMilestones(prev => [...prev, emptyMilestone()]);
  const removeMilestone = (id: string) => setMilestones(prev => prev.filter(m => m.id !== id));

  // Diff detection for review mode
  const getDiffStatus = (ms: MilestoneDraft, index: number): "added" | "modified" | "unchanged" => {
    if (!previousMilestones) return "unchanged";
    if (index >= previousMilestones.length) return "added";
    const prev = previousMilestones[index];
    if (prev.title !== ms.title || prev.percentage !== ms.percentage || prev.description !== ms.description) return "modified";
    return "unchanged";
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">Milestone Agreement</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {status === "drafting" && <Badge variant="outline" className="text-amber-600 border-amber-500/30"><PenLine className="h-3 w-3 mr-1" /> Drafting</Badge>}
            {status === "proposed" && (
              <Badge className="bg-blue-600 text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> Proposed by {proposedBy === "buyer" ? buyerName : vendorName}
              </Badge>
            )}
            {status === "agreed" && <Badge className="bg-green-600 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Agreed</Badge>}
            {industry && <Badge variant="secondary" className="text-[10px]">{industry}</Badge>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {status === "drafting" && "Either party can draft the milestone breakdown. Once submitted, the counterparty must review and approve before work begins."}
          {status === "proposed" && isReviewer && "Review the proposed milestones below. You can approve them, or request changes with notes."}
          {status === "proposed" && isProposer && `Waiting for ${isProposer ? (role === "buyer" ? vendorName : buyerName) : ""} to review your proposal.`}
          {status === "agreed" && "Both parties have agreed on the milestone breakdown. Work may begin."}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 text-xs">
          <div>
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">${orderAmount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Stages: </span>
            <span className="font-semibold">{milestones.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Percent className="h-3 w-3 text-muted-foreground" />
            <span className={cn("font-semibold", totalPercentage === 100 ? "text-green-600" : "text-red-500")}>
              {totalPercentage}%
            </span>
            {totalPercentage !== 100 && <AlertTriangle className="h-3 w-3 text-red-500" />}
          </div>
        </div>

        <ScrollArea className="max-h-[400px] pr-2">
          <div className="space-y-3">
            {milestones.map((ms, idx) => {
              const diff = getDiffStatus(ms, idx);
              return (
                <div
                  key={ms.id}
                  className={cn(
                    "p-3 rounded-lg border space-y-2",
                    diff === "added" && "border-green-500/40 bg-green-500/5",
                    diff === "modified" && "border-blue-500/40 bg-blue-500/5",
                    diff === "unchanged" && "border-border bg-muted/20",
                    status === "agreed" && "opacity-80"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>
                      {canEdit ? (
                        <Input
                          placeholder="Stage name (e.g., Foundation Inspection)"
                          value={ms.title}
                          onChange={e => updateMilestone(ms.id, "title", e.target.value)}
                          className="text-sm h-8 flex-1"
                        />
                      ) : (
                        <span className="text-sm font-semibold">{ms.title || "Untitled"}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {diff !== "unchanged" && (
                        <Badge variant="outline" className={cn("text-[9px]", diff === "added" ? "text-green-600" : "text-blue-600")}>
                          {diff}
                        </Badge>
                      )}
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={ms.percentage || ""}
                            onChange={e => updateMilestone(ms.id, "percentage", Number(e.target.value))}
                            className="w-16 h-8 text-xs text-center"
                            placeholder="%"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      )}
                      {!canEdit && (
                        <Badge variant="secondary" className="text-xs">{ms.percentage}%</Badge>
                      )}
                      {canEdit && milestones.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMilestone(ms.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {canEdit ? (
                    <Textarea
                      placeholder="Describe deliverables, acceptance criteria..."
                      value={ms.description}
                      onChange={e => updateMilestone(ms.id, "description", e.target.value)}
                      className="text-xs min-h-[50px]"
                    />
                  ) : ms.description ? (
                    <p className="text-xs text-muted-foreground">{ms.description}</p>
                  ) : null}

                  {/* Fund breakdown */}
                  {ms.percentage > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Release: <span className="font-medium">${((orderAmount * ms.percentage) / 100).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Add milestone button */}
        {canEdit && (
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={addMilestone}>
            <Plus className="h-3.5 w-3.5" /> Add Stage
          </Button>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          {/* Drafter submits */}
          {status === "drafting" && (
            <Button
              onClick={() => onSubmitDraft(milestones)}
              disabled={!isValid}
              className="w-full gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              {isValid
                ? `Submit Proposal to ${role === "buyer" ? vendorName : buyerName}`
                : totalPercentage !== 100
                  ? `Allocation must equal 100% (currently ${totalPercentage}%)`
                  : "Fill in all stage names"
              }
            </Button>
          )}

          {/* Reviewer actions */}
          {isReviewer && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowChangeInput(!showChangeInput)}
              >
                Request Changes
              </Button>
              <Button className="flex-1 gap-1.5" onClick={onApproveDraft}>
                <Handshake className="h-4 w-4" /> Approve & Lock
              </Button>
            </div>
          )}

          {/* Proposer waiting */}
          {status === "proposed" && isProposer && (
            <div className="text-center text-xs text-muted-foreground py-2">
              <Clock className="h-4 w-4 inline mr-1" />
              Waiting for counterparty to review...
            </div>
          )}

          {/* Agreed */}
          {status === "agreed" && (
            <div className="space-y-2">
              <div className="text-center text-xs text-green-600 py-2">
                <CheckCircle2 className="h-4 w-4 inline mr-1" />
                Milestones locked — work may begin
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                onClick={() => setShowChangeInput(true)}
              >
                <PenLine className="h-3.5 w-3.5" />
                Request Post-Agreement Changes
              </Button>
              {showChangeInput && (
                <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <Label className="text-xs">Describe the changes needed (released milestones cannot be modified)</Label>
                  <Textarea
                    placeholder="E.g., 'Extend Phase 2 timeline' or 'Split Stage 4 into two sub-stages'"
                    value={changeNote}
                    onChange={e => setChangeNote(e.target.value)}
                    className="text-xs min-h-[60px]"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!changeNote.trim()}
                    onClick={() => {
                      onRequestChanges(changeNote);
                      setChangeNote("");
                      setShowChangeInput(false);
                    }}
                    className="w-full"
                  >
                    Submit Change Request
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Change request input */}
          {showChangeInput && (
            <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <Label className="text-xs">What changes are needed?</Label>
              <Textarea
                placeholder="E.g., 'Stage 3 percentage should be 30% not 20%' or 'Add an inspection stage after foundation'"
                value={changeNote}
                onChange={e => setChangeNote(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!changeNote.trim()}
                onClick={() => {
                  onRequestChanges(changeNote);
                  setChangeNote("");
                  setShowChangeInput(false);
                }}
                className="w-full"
              >
                Send Change Request
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MilestoneNegotiation;
export { MilestoneNegotiation };

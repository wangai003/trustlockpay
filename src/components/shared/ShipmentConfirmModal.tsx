import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Send, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { INDUSTRY_MILESTONE_MAP } from "@/components/shared/industryPlaybookData";
import { useTransactionMilestones } from "@/hooks/useSupabaseData";
import TransportMethodSelector from "@/components/shared/TransportMethodSelector";
import { type TransportLeg, createEmptyLeg, getIndustryDefaultTransport } from "@/lib/transportMethods";

interface ShipmentConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (trackingNumber: string, transportLegs?: TransportLeg[]) => void;
  txId: string;
  orderNumber?: string | number;
  buyerName?: string;
  amount?: number;
  industry?: string | null;
  isLoading?: boolean;
  transactionId?: string | null;
  tradeScope?: string;
}

/** Collect ALL required documents from every milestone stage up to and including shipping */
interface CumulativeDocGate {
  stages: { name: string; docs: string[]; mode: string }[];
  allRequiredDocs: string[];
}

function getCumulativeDocRequirements(industry: string | null | undefined): CumulativeDocGate {
  if (!industry) return { stages: [], allRequiredDocs: [] };
  const templates = INDUSTRY_MILESTONE_MAP[industry as keyof typeof INDUSTRY_MILESTONE_MAP];
  if (!templates) return { stages: [], allRequiredDocs: [] };

  const stages: CumulativeDocGate["stages"] = [];
  const allRequiredDocs: string[] = [];

  for (const m of templates) {
    if (m.documentMode === "required" && m.documents.length > 0) {
      stages.push({ name: m.name, docs: m.documents, mode: m.documentMode });
      allRequiredDocs.push(...m.documents);
    }
  }

  return { stages, allRequiredDocs };
}

const CONFIRM_PHRASE = "CONFIRM SHIPMENT";

export default function ShipmentConfirmModal({
  open, onClose, onConfirm, txId, orderNumber, buyerName, amount, industry, isLoading, transactionId, tradeScope,
}: ShipmentConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const defaultModes = useMemo(() => getIndustryDefaultTransport(industry), [industry]);
  const [legs, setLegs] = useState<TransportLeg[]>([createEmptyLeg(defaultModes[0])]);

  const { data: dbMilestones } = useTransactionMilestones(transactionId || undefined);

  const { stages, allRequiredDocs } = useMemo(() => getCumulativeDocRequirements(industry), [industry]);
  const hasRequiredDocs = allRequiredDocs.length > 0;
  const isConfirmed = typed.trim().toUpperCase() === CONFIRM_PHRASE;

  const uploadedDocNames = useMemo(() => {
    if (!dbMilestones) return new Set<string>();
    const names = new Set<string>();
    for (const ms of dbMilestones) {
      if (ms.uploaded_documents && Array.isArray(ms.uploaded_documents)) {
        for (const doc of ms.uploaded_documents as Array<{ name?: string }>) {
          if (doc?.name) names.add(doc.name.toLowerCase());
        }
      }
    }
    return names;
  }, [dbMilestones]);

  // Check each required doc across ALL stages
  const missingByStage = useMemo(() => {
    if (!hasRequiredDocs) return [];
    return stages.map((stage) => {
      const missing = stage.docs.filter((doc) => {
        const docLower = doc.toLowerCase();
        for (const uploaded of uploadedDocNames) {
          if (uploaded.includes(docLower) || docLower.includes(uploaded.replace(/\.[^.]+$/, ""))) return false;
        }
        return true;
      });
      return { ...stage, missing };
    }).filter((s) => s.missing.length > 0);
  }, [stages, uploadedDocNames, hasRequiredDocs]);

  const totalMissing = missingByStage.reduce((sum, s) => sum + s.missing.length, 0);
  const isDocGateBlocked = hasRequiredDocs && totalMissing > 0;
  const hasAtLeastOneTracking = legs.some((l) => l.trackingNumber.trim().length > 0);

  const handleClose = () => {
    setTyped("");
    setLegs([createEmptyLeg(defaultModes[0])]);
    onClose();
  };

  const handleSubmit = () => {
    if (!isConfirmed || isDocGateBlocked) return;
    const primaryTracking = legs.find((l) => l.trackingNumber)?.trackingNumber || `MANUAL-${Date.now()}`;
    onConfirm(primaryTracking, legs);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Confirm Shipment / Delivery
          </DialogTitle>
          <DialogDescription>
            Mark order <span className="font-mono font-bold">{txId}</span> as dispatched. Select transport method(s) and provide tracking details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Order Summary */}
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order</span>
              <span className="font-mono font-medium">#{orderNumber || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Buyer</span>
              <span className="font-medium">{buyerName || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold">${amount?.toLocaleString() || "0"}</span>
            </div>
            {industry && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Industry</span>
                <Badge variant="outline" className="capitalize text-xs">{industry.replace(/-/g, " ")}</Badge>
              </div>
            )}
          </div>

          {/* Cumulative Document Gate */}
          {hasRequiredDocs && (
            <div className={`rounded-lg border p-3 space-y-2 ${
              isDocGateBlocked ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"
            }`}>
              <div className="flex items-start gap-2">
                {isDocGateBlocked ? (
                  <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${isDocGateBlocked ? "text-destructive" : "text-primary"}`}>
                    {isDocGateBlocked
                      ? `⛔ Cumulative Document Gate — ${totalMissing} doc${totalMissing > 1 ? "s" : ""} missing`
                      : "✅ All Milestone Documents — Verified"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDocGateBlocked
                      ? "ALL required documents across every milestone stage must be uploaded before dispatch:"
                      : "All required documents across all milestone stages have been uploaded."}
                  </p>
                </div>
              </div>
              {isDocGateBlocked && (
                <div className="space-y-2.5 pl-6">
                  {missingByStage.map((stage) => (
                    <div key={stage.name}>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {stage.name}
                      </p>
                      <div className="space-y-0.5">
                        {stage.docs.map((doc) => {
                          const isMissing = stage.missing.includes(doc);
                          return (
                            <div key={doc} className="flex items-center gap-1.5 text-xs">
                              {isMissing ? <XCircle className="w-3 h-3 text-destructive shrink-0" /> : <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                              <span className={isMissing ? "text-destructive font-medium" : "text-muted-foreground line-through"}>{doc}</span>
                              {isMissing && <Badge variant="destructive" className="text-[8px] h-3.5 px-1">Missing</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transport Method Selector */}
          <TransportMethodSelector
            industry={industry}
            tradeScope={tradeScope}
            legs={legs}
            onLegsChange={setLegs}
            disabled={isDocGateBlocked}
          />

          {/* Typed Confirmation */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Vendor Acknowledgement</p>
                <p className="text-xs text-muted-foreground mt-1">
                  By confirming, you acknowledge that goods/services have been dispatched via the selected transport method(s). This action is recorded with your IP and timestamp for the audit trail.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-type" className="text-xs text-muted-foreground">
                Type <span className="font-mono font-bold text-foreground">{CONFIRM_PHRASE}</span> to proceed
              </Label>
              <Input
                id="confirm-type"
                placeholder={CONFIRM_PHRASE}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className={isConfirmed && !isDocGateBlocked ? "border-primary/50 bg-primary/5" : ""}
                disabled={isDocGateBlocked}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isConfirmed || isLoading || isDocGateBlocked}
            className="gap-2"
          >
            {isDocGateBlocked ? (
              <><ShieldAlert className="w-4 h-4" /> Documents Required</>
            ) : (
              <>
                {isConfirmed && <CheckCircle2 className="w-4 h-4" />}
                {isLoading ? "Processing…" : "Confirm & Dispatch"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

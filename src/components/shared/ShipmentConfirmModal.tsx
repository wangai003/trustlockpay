import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, Send, ShieldAlert, ShieldCheck, Truck, XCircle } from "lucide-react";
import { INDUSTRY_MILESTONE_MAP } from "@/components/shared/industryPlaybookData";
import { useTransactionMilestones } from "@/hooks/useSupabaseData";

interface ShipmentConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (trackingNumber: string) => void;
  txId: string;
  orderNumber?: string | number;
  buyerName?: string;
  amount?: number;
  industry?: string | null;
  isLoading?: boolean;
  transactionId?: string | null;
}

/** Industries whose playbook has a "shipping" milestone with required documents */
function getShippingDocRequirements(industry: string | null | undefined): { docs: string[]; mode: string } {
  if (!industry) return { docs: [], mode: "none" };
  const templates = INDUSTRY_MILESTONE_MAP[industry as keyof typeof INDUSTRY_MILESTONE_MAP];
  if (!templates) return { docs: [], mode: "none" };

  const shippingStage = templates.find(
    (m) =>
      m.name.toLowerCase().includes("ship") ||
      m.name.toLowerCase().includes("dispatch") ||
      m.name.toLowerCase().includes("transit") ||
      m.name.toLowerCase().includes("logistics") ||
      m.name.toLowerCase().includes("export")
  );

  if (!shippingStage) return { docs: [], mode: "none" };
  return { docs: shippingStage.documents, mode: shippingStage.documentMode };
}

const CONFIRM_PHRASE = "CONFIRM SHIPMENT";

export default function ShipmentConfirmModal({
  open, onClose, onConfirm, txId, orderNumber, buyerName, amount, industry, isLoading, transactionId,
}: ShipmentConfirmModalProps) {
  const [tracking, setTracking] = useState("");
  const [typed, setTyped] = useState("");

  const { data: dbMilestones } = useTransactionMilestones(transactionId || undefined);

  const { docs, mode } = useMemo(() => getShippingDocRequirements(industry), [industry]);
  const hasRequiredDocs = mode === "required" && docs.length > 0;
  const isConfirmed = typed.trim().toUpperCase() === CONFIRM_PHRASE;

  // Check which required docs have actually been uploaded to milestone documents
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

  const missingDocs = useMemo(() => {
    if (!hasRequiredDocs) return [];
    return docs.filter((doc) => {
      const docLower = doc.toLowerCase();
      // Check if any uploaded doc name contains the required doc keyword
      for (const uploaded of uploadedDocNames) {
        if (uploaded.includes(docLower) || docLower.includes(uploaded.replace(/\.[^.]+$/, ""))) {
          return false;
        }
      }
      return true;
    });
  }, [docs, uploadedDocNames, hasRequiredDocs]);

  const isDocGateBlocked = hasRequiredDocs && missingDocs.length > 0;

  const handleClose = () => {
    setTracking("");
    setTyped("");
    onClose();
  };

  const handleSubmit = () => {
    if (!isConfirmed || isDocGateBlocked) return;
    onConfirm(tracking.trim() || `MANUAL-${Date.now()}`);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Confirm Shipment
          </DialogTitle>
          <DialogDescription>
            This will mark order <span className="font-mono font-bold">{txId}</span> as shipped and start the buyer's 14-day confirmation window.
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

          {/* Document Gate — HARD BLOCK */}
          {hasRequiredDocs && (
            <div className={`rounded-lg border p-3 space-y-2 ${
              isDocGateBlocked
                ? "border-destructive/40 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
            }`}>
              <div className="flex items-start gap-2">
                {isDocGateBlocked ? (
                  <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${isDocGateBlocked ? "text-destructive" : "text-primary"}`}>
                    {isDocGateBlocked ? "⛔ Document Gate — BLOCKED" : "✅ Document Gate — Passed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isDocGateBlocked
                      ? "You cannot confirm shipment until the following required documents are uploaded to the milestone work order panel:"
                      : "All required shipping documents have been uploaded."
                    }
                  </p>
                </div>
              </div>
              {isDocGateBlocked && (
                <div className="space-y-1 pl-6">
                  {docs.map((doc) => {
                    const isMissing = missingDocs.includes(doc);
                    return (
                      <div key={doc} className="flex items-center gap-1.5 text-xs">
                        {isMissing ? (
                          <XCircle className="w-3 h-3 text-destructive shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                        )}
                        <span className={isMissing ? "text-destructive font-medium" : "text-muted-foreground line-through"}>
                          {doc}
                        </span>
                        {isMissing && (
                          <Badge variant="destructive" className="text-[8px] h-3.5 px-1">Missing</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tracking Number */}
          <div className="space-y-2">
            <Label htmlFor="tracking" className="text-sm flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Tracking Number <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="tracking"
              placeholder="e.g. DHL-1234567890"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              disabled={isDocGateBlocked}
            />
          </div>

          {/* Typed Confirmation */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Vendor Acknowledgement</p>
                <p className="text-xs text-muted-foreground mt-1">
                  By confirming, you acknowledge that goods have been dispatched and this action will be recorded with your IP address and timestamp for the audit trail.
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
              <>
                <ShieldAlert className="w-4 h-4" />
                Documents Required
              </>
            ) : (
              <>
                {isConfirmed && <CheckCircle2 className="w-4 h-4" />}
                {isLoading ? "Processing…" : "Confirm & Ship"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

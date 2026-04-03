import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, FileText, Send, ShieldCheck, Truck } from "lucide-react";
import { INDUSTRY_MILESTONE_MAP } from "@/components/shared/industryPlaybookData";

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
}

/** Industries whose playbook has a "shipping" milestone with required documents */
function getShippingDocRequirements(industry: string | null | undefined): { docs: string[]; mode: string } {
  if (!industry) return { docs: [], mode: "none" };
  const templates = milestoneTemplates[industry as keyof typeof milestoneTemplates];
  if (!templates) return { docs: [], mode: "none" };

  // Find the milestone that relates to shipping/dispatch/transit
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
  open, onClose, onConfirm, txId, orderNumber, buyerName, amount, industry, isLoading,
}: ShipmentConfirmModalProps) {
  const [tracking, setTracking] = useState("");
  const [typed, setTyped] = useState("");

  const { docs, mode } = useMemo(() => getShippingDocRequirements(industry), [industry]);
  const hasRequiredDocs = mode === "required" && docs.length > 0;
  const isConfirmed = typed.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleClose = () => {
    setTracking("");
    setTyped("");
    onClose();
  };

  const handleSubmit = () => {
    if (!isConfirmed) return;
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

          {/* Document Gate Warning */}
          {hasRequiredDocs && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-600">Document Gate — Shipping Stage</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your industry requires the following documents to be uploaded to the shipping milestone before shipment:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-6">
                {docs.map((doc) => (
                  <Badge key={doc} variant="secondary" className="text-[10px] gap-1">
                    <FileText className="w-3 h-3" />
                    {doc}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pl-6">
                Ensure these are uploaded in the Work Order Panel before confirming.
              </p>
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
                className={isConfirmed ? "border-primary/50 bg-primary/5" : ""}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isConfirmed || isLoading}
            className="gap-2"
          >
            {isConfirmed && <CheckCircle2 className="w-4 h-4" />}
            {isLoading ? "Processing…" : "Confirm & Ship"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

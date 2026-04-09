import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import TransportMethodSelector from "@/components/shared/TransportMethodSelector";
import { type TransportLeg, createEmptyLeg, getIndustryDefaultTransport } from "@/lib/transportMethods";

interface TrackingDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tracking: string, legs: TransportLeg[]) => void;
  txId: string;
  industry?: string | null;
  tradeScope?: string;
  isLoading?: boolean;
}

export default function TrackingDetailsModal({
  open, onClose, onSave, txId, industry, tradeScope, isLoading,
}: TrackingDetailsModalProps) {
  const defaultModes = useMemo(() => getIndustryDefaultTransport(industry), [industry]);
  const [legs, setLegs] = useState<TransportLeg[]>([createEmptyLeg(defaultModes[0])]);

  const handleClose = () => {
    setLegs([createEmptyLeg(defaultModes[0])]);
    onClose();
  };

  const handleSave = () => {
    const primary = legs.find((l) => l.trackingNumber)?.trackingNumber || "";
    if (!primary) return;
    onSave(primary, legs);
    handleClose();
  };

  const hasTracking = legs.some((l) => l.trackingNumber.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Add Tracking Details
          </DialogTitle>
          <DialogDescription>
            Add transport and tracking information for order <span className="font-mono font-bold">{txId}</span>. This does not change the order status.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <TransportMethodSelector
            industry={industry}
            tradeScope={tradeScope}
            legs={legs}
            onLegsChange={setLegs}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!hasTracking || isLoading} className="gap-2">
            <Truck className="w-4 h-4" />
            {isLoading ? "Saving…" : "Save Tracking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

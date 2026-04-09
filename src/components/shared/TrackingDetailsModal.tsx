import { useState, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Save } from "lucide-react";
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
  /** Pre-populate with existing legs from DB */
  existingLegs?: TransportLeg[] | null;
  /** True if order is already shipped (update mode) */
  isUpdate?: boolean;
}

export default function TrackingDetailsModal({
  open, onClose, onSave, txId, industry, tradeScope, isLoading, existingLegs, isUpdate,
}: TrackingDetailsModalProps) {
  const defaultModes = useMemo(() => getIndustryDefaultTransport(industry), [industry]);
  const [legs, setLegs] = useState<TransportLeg[]>([createEmptyLeg(defaultModes[0])]);

  // Pre-populate with existing data when modal opens
  useEffect(() => {
    if (open) {
      if (existingLegs && existingLegs.length > 0) {
        setLegs(existingLegs);
      } else {
        setLegs([createEmptyLeg(defaultModes[0])]);
      }
    }
  }, [open, existingLegs, defaultModes]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    const primary = legs.find((l) => l.trackingNumber)?.trackingNumber || "";
    if (!primary) return;
    onSave(primary, legs);
    handleClose();
  };

  // At least ONE leg must have a tracking number — not all of them
  const hasTracking = legs.some((l) => l.trackingNumber.trim().length > 0);
  const filledLegs = legs.filter((l) => l.trackingNumber.trim().length > 0).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            {isUpdate ? "Update Tracking Details" : "Add Tracking Details"}
          </DialogTitle>
          <DialogDescription>
            {isUpdate ? (
              <>Update transport and tracking information for order <span className="font-mono font-bold">{txId}</span>. Changes are saved when you click the button below.</>
            ) : (
              <>Add transport and tracking information for order <span className="font-mono font-bold">{txId}</span>. This does not change the order status.</>
            )}
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

        {legs.length > 1 && (
          <p className="text-[10px] text-muted-foreground">
            Only the legs you add tracking numbers to will be saved. Empty legs are optional.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!hasTracking || isLoading} className="gap-2">
            {isUpdate ? <Save className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
            {isLoading ? "Saving…" : isUpdate ? "Save Changes" : "Save Tracking"}
            {filledLegs > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1">{filledLegs} leg{filledLegs > 1 ? "s" : ""}</Badge>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

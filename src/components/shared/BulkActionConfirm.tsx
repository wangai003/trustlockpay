import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, Lock } from "lucide-react";

interface BulkActionConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: string; // e.g. "Release Funds", "Mark Shipped", "Cancel Orders"
  itemCount: number;
  totalAmount?: number;
  items?: { label: string; amount?: number }[];
}

const HIGH_VALUE_THRESHOLD = 10000;

const BulkActionConfirm = ({ open, onClose, onConfirm, action, itemCount, totalAmount = 0, items = [] }: BulkActionConfirmProps) => {
  const [typed, setTyped] = useState("");
  const isHighValue = totalAmount >= HIGH_VALUE_THRESHOLD;
  const confirmPhrase = isHighValue ? action.toUpperCase().replace(/\s+/g, " ") : "";
  const canConfirm = isHighValue ? typed.trim() === confirmPhrase : true;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    setTyped("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setTyped(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isHighValue ? <AlertTriangle className="w-5 h-5 text-destructive" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
            Confirm Bulk Action
          </DialogTitle>
          <DialogDescription className="text-xs">
            You are about to execute <strong>{action}</strong> on <strong>{itemCount} item(s)</strong>
            {totalAmount > 0 && <> totaling <strong className="text-foreground">${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></>}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Items preview (max 5 shown) */}
          {items.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-lg bg-muted/50">
              {items.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{item.label}</span>
                  {item.amount !== undefined && <span className="font-semibold">${item.amount.toFixed(2)}</span>}
                </div>
              ))}
              {items.length > 5 && (
                <p className="text-[10px] text-muted-foreground text-center">...and {items.length - 5} more</p>
              )}
            </div>
          )}

          {/* High-value confirmation */}
          {isHighValue && (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/5">
                <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> High-Value Confirmation Required
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Type <strong className="text-foreground font-mono">"{confirmPhrase}"</strong> to confirm this action.
                </p>
              </div>
              <Input
                placeholder={`Type "${confirmPhrase}" to confirm`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Action</span>
            <Badge variant={isHighValue ? "destructive" : "default"} className="text-[10px]">{action}</Badge>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTyped(""); onClose(); }}>Cancel</Button>
          <Button size="sm" disabled={!canConfirm} onClick={handleConfirm} className="gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Execute {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkActionConfirm;

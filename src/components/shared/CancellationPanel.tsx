import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Ban, AlertTriangle, Shield, FileText, Check, Scale, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CancellationPanelProps {
  orderId: string;
  orderAmount: number;
  completedMilestones: { name: string; amount: number; released: boolean }[];
  remainingAmount: number;
  role: "admin" | "vendor" | "buyer";
  onCancel?: () => void;
}

const CancellationPanel = ({
  orderId,
  orderAmount,
  completedMilestones,
  remainingAmount,
  role,
  onCancel,
}: CancellationPanelProps) => {
  const [reason, setReason] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const releasedTotal = completedMilestones.filter(m => m.released).reduce((s, m) => s + m.amount, 0);

  const handleCancel = () => {
    if (confirmText !== "CANCEL") {
      toast.error("Type CANCEL to confirm");
      return;
    }
    setCancelled(true);
    setConfirmDialog(false);
    toast.success("Order cancelled — refund for remaining milestones initiated");
    onCancel?.();
  };

  if (cancelled) {
    return (
      <Card className="border-primary/30">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold">Order Cancelled</h3>
          <p className="text-sm text-muted-foreground">
            ${remainingAmount.toFixed(2)} will be refunded. ${releasedTotal.toFixed(2)} from completed milestones has already been released.
          </p>
          <p className="text-[10px] text-muted-foreground">A digital cancellation agreement has been archived for both parties.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Ban className="w-4 h-4" />
            Mid-Order Cancellation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Order Total</span><span className="font-semibold">${orderAmount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Already Released (irreversible)</span><span className="font-semibold text-destructive">${releasedTotal.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-1"><span className="font-bold">Refundable Amount</span><span className="font-bold text-primary">${remainingAmount.toFixed(2)}</span></div>
          </div>

          {/* Completed milestones */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Milestone Status</p>
            {completedMilestones.map((ms, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded border border-border">
                <span className={ms.released ? "text-muted-foreground line-through" : "text-foreground"}>{ms.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">${ms.amount.toFixed(2)}</span>
                  <Badge variant={ms.released ? "default" : "secondary"} className="text-[10px]">
                    {ms.released ? "Released ✓" : "Escrowed"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Label className="text-xs">Reason for Cancellation</Label>
            <Textarea
              placeholder="Explain why this order needs to be cancelled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 text-xs"
              rows={3}
            />
          </div>

          {/* Digital Agreement */}
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground text-xs">Digital Cancellation Agreement</p>
                <p>By proceeding, both parties acknowledge that:</p>
                <p>• Funds from completed milestones (${releasedTotal.toFixed(2)}) are irreversible</p>
                <p>• Remaining escrowed funds (${remainingAmount.toFixed(2)}) will be refunded to the buyer</p>
                <p>• This agreement will be archived and visible in both parties' document sections</p>
                <p>• A record will be logged with the admin for compliance purposes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="agree-cancel"
                checked={agreedTerms}
                onCheckedChange={(c) => setAgreedTerms(!!c)}
              />
              <label htmlFor="agree-cancel" className="text-[10px] text-muted-foreground cursor-pointer">
                I agree to the terms of this cancellation agreement
              </label>
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={!reason.trim() || !agreedTerms}
            onClick={() => setConfirmDialog(true)}
          >
            <Ban className="w-4 h-4" /> Request Cancellation
          </Button>
        </CardContent>
      </Card>

      {/* Arbitration Escalation Banner */}
      {orderAmount >= 10000 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Scale className="w-5 h-5 text-accent mt-0.5 shrink-0" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">Mandatory Arbitration Escalation</p>
              <p className="text-muted-foreground">
                This transaction exceeds $10,000. Any dispute will be automatically escalated to a certified external arbitrator.
                TrustLock admin review serves as a preliminary assessment only.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Badge variant="outline" className="text-[10px]">
                  <Shield className="w-3 h-3 mr-1" /> Tier: External Arbitration
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  Order Value: ${orderAmount.toLocaleString()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Cancellation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to cancel order <strong>{orderId}</strong>. This will refund
                <strong> ${remainingAmount.toFixed(2)}</strong> to the buyer.
                <strong> ${releasedTotal.toFixed(2)}</strong> from completed milestones has already been released and is irreversible.
              </p>
              <div>
                <Label className="text-xs">Type CANCEL to confirm</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="CANCEL"
                  className="mt-1 font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={confirmText !== "CANCEL"}
            >
              Confirm Cancellation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CancellationPanel;

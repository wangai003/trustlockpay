import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Clock, Gavel, Shield, Timer } from "lucide-react";
import { useChiefAdminConfig, useChiefOverrideDispute } from "@/hooks/useAdminMessaging";
import { useDisputes } from "@/hooks/useSupabaseData";

const CountdownTimer = ({ deadline }: { deadline: string }) => {
  const [remaining, setRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setRemaining("EXPIRED");
        setIsExpired(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setRemaining(`${hours}h ${minutes}m ${seconds}s`);
      setIsExpired(false);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className={`font-mono text-sm font-bold ${isExpired ? "text-destructive" : "text-accent-foreground"}`}>
      <Timer className="w-3.5 h-3.5 inline mr-1" />
      {remaining}
    </span>
  );
};

const ChiefAdminOverridePanel = () => {
  const [overrideDialog, setOverrideDialog] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const { data: chiefConfig } = useChiefAdminConfig();
  const { data: disputes = [] } = useDisputes();
  const overrideDispute = useChiefOverrideDispute();

  const currentAdminId = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
      return auth.id;
    } catch { return null; }
  })();

  const isChief = chiefConfig?.admin_id === currentAdminId;

  // Disputes with active overrides (countdown running)
  const activeOverrides = disputes.filter(
    (d: any) => d.override_deadline && new Date(d.override_deadline) > new Date()
  );

  // Resolved disputes that chief can override
  const overrideable = disputes.filter(
    (d: any) => d.status === "resolved" && !d.override_deadline
  );

  const handleOverride = () => {
    if (overrideDialog && overrideReason && chiefConfig) {
      overrideDispute.mutate({
        disputeId: overrideDialog,
        chiefAdminId: chiefConfig.admin_id,
        overrideReason,
        overrideWindowHours: chiefConfig.override_window_hours,
      });
      setOverrideDialog(null);
      setOverrideReason("");
    }
  };

  if (!isChief) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Chief Admin panel is restricted. Only the designated chief admin can access override controls.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Overrides with Countdown */}
      {activeOverrides.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-foreground" /> Active Override Countdowns
          </h3>
          {activeOverrides.map((d: any) => (
            <Card key={d.id} className="border-accent/30">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold">{d.dispute_id}</span>
                      <Badge className="bg-accent/15 text-accent-foreground text-[10px]">OVERRIDE ACTIVE</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Original: <span className="font-medium">{d.original_resolution || "—"}</span> → Reopened for review
                    </p>
                    <p className="text-xs text-foreground">{d.override_reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground mb-1">Time remaining</p>
                    <CountdownTimer deadline={d.override_deadline} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Overrideable Disputes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gavel className="w-4 h-4" /> Resolved Disputes — Available for Override
        </h3>
        {overrideable.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No resolved disputes available for override.</p>
        ) : (
          overrideable.map((d: any) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{d.dispute_id}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {d.resolution || "resolved"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.buyer_name || "Buyer"} vs {d.vendor_name || "Vendor"} — ${Number(d.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 shrink-0"
                    onClick={() => setOverrideDialog(d.id)}
                  >
                    <AlertTriangle className="w-3 h-3" /> Override
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Override Dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-destructive" /> Chief Admin Override
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/10 rounded-lg p-3 text-xs text-destructive space-y-1">
              <p className="font-semibold">⚠️ This action reopens a resolved dispute.</p>
              <p>The original resolution will be saved. You will have {chiefConfig?.override_window_hours || 48} hours to issue a new ruling before the original resolution auto-restores.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Override Reason (Required)</label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Explain why this dispute needs to be reopened..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleOverride} disabled={!overrideReason.trim()}>
              Confirm Override — Start {chiefConfig?.override_window_hours || 48}h Timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChiefAdminOverridePanel;

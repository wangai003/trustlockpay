import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, TimerReset, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useEscrowExtensions, useRequestExtension, useReviewExtension, MAX_EXTENSIONS } from "@/hooks/useEscrowExtension";
import { supabase } from "@/integrations/supabase/client";

interface EscrowExtensionRequestProps {
  transactionId: string;
  txId: string;
  status: string;
}

const statusBadge: Record<string, { label: string; className: string; icon: any }> = {
  pending: { label: "Pending Review", className: "bg-accent/15 text-accent-foreground", icon: Clock },
  approved: { label: "Approved", className: "bg-primary/15 text-primary", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive", icon: XCircle },
};

const EscrowExtensionRequest = ({ transactionId, txId, status }: EscrowExtensionRequestProps) => {
  const { data: extensions = [], isLoading } = useEscrowExtensions(transactionId);
  const requestExtension = useRequestExtension();
  const reviewExtension = useReviewExtension();
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const [reason, setReason] = useState("");

  // Only show for active statuses where auto-release matters
  const eligible = ["shipped", "delivered"].includes(status);
  if (!eligible) return null;

  const extensionCount = extensions.length;
  const canRequest = extensionCount < MAX_EXTENSIONS && !extensions.some(e => e.status === "pending");
  const totalExtraDays = extensions.filter(e => e.status === "approved").reduce((s, e) => s + (e.extra_days || 0), 0);

  const handleSubmit = () => {
    if (!reason.trim()) return;
    requestExtension.mutate(
      { transactionId, txId, reason: reason.trim() },
      { onSuccess: () => { setShowForm(false); setReason(""); } }
    );
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TimerReset className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">Escrow Extension</span>
          <span className="text-[10px] text-muted-foreground">
            {extensionCount}/{MAX_EXTENSIONS} used
            {totalExtraDays > 0 && ` · +${totalExtraDays} days granted`}
          </span>
        </div>
        {canRequest && !showForm && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(true)}>
            <Clock className="w-3 h-3" /> Request Extension
          </Button>
        )}
      </div>

      {/* Previous extensions */}
      {extensions.length > 0 && (
        <div className="space-y-1">
          {extensions.map((ext) => {
            const badge = statusBadge[ext.status] || statusBadge.pending;
            const isCounterparty = userId && ext.requested_by !== userId;
            const canReview = isCounterparty && ext.status === "pending";
            return (
              <div key={ext.id} className="text-xs p-2 rounded bg-background border border-border/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-muted-foreground">{ext.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      +{ext.extra_days} days · {new Date(ext.created_at).toLocaleDateString()}
                      {isCounterparty && ext.status === "pending" && " · awaiting your review"}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${badge.className}`}>
                    <badge.icon className="w-3 h-3 mr-1" /> {badge.label}
                  </Badge>
                </div>
                {canReview && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Button
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={reviewExtension.isPending}
                      onClick={() => reviewExtension.mutate({ extensionId: ext.id, transactionId, decision: "approved" })}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-1"
                      disabled={reviewExtension.isPending}
                      onClick={() => reviewExtension.mutate({ extensionId: ext.id, transactionId, decision: "rejected" })}
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="space-y-2 pt-1">
          <Textarea
            placeholder="Why do you need more time? (e.g., shipment delayed, customs hold)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs min-h-[60px]"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!reason.trim() || requestExtension.isPending}
              onClick={handleSubmit}
            >
              {requestExtension.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Submit (+14 days)
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {MAX_EXTENSIONS - extensionCount} remaining
            </span>
          </div>
        </div>
      )}

      {isLoading && <p className="text-[10px] text-muted-foreground">Loading...</p>}
    </div>
  );
};

export default EscrowExtensionRequest;

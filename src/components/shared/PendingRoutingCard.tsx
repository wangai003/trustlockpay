import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RetryRow {
  id: string;
  transaction_id: string | null;
  action: string;
  amount_principal: number;
  amount_fee_already_taken: number;
  fee_phase: string;
  status: string;
  failure_reason: string | null;
  failure_code: string | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string;
  recipient_address: string | null;
  recipient_method: string | null;
  created_at: string;
}

interface Props {
  surface?: "trustlock_os_pay" | "trustlock_os_payout" | "admin_os_pay";
  userId?: string;
}

export default function PendingRoutingCard({ surface, userId }: Props) {
  const [rows, setRows] = useState<RetryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    let q = supabase
      .from("routing_retry_queue")
      .select("*")
      .in("status", ["queued", "awaiting_update", "manual_required"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (userId) q = q.eq("recipient_user_id", userId);
    if (surface) q = q.eq("surface", surface);
    const { data } = await q;
    setRows((data as RetryRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("routing-retry-card")
      .on("postgres_changes", { event: "*", schema: "public", table: "routing_retry_queue" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [surface, userId]);

  const retryNow = async (id: string) => {
    setRetrying(id);
    const { data, error } = await supabase.functions.invoke("routing-retry-worker", {
      body: { action: "retry_now", retryId: id },
    });
    setRetrying(null);
    if (error) {
      toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: data?.ok ? "Retry succeeded" : "Retry queued again", description: data?.ok ? "Funds routed without additional fees." : "We'll try again automatically." });
    }
    load();
  };

  if (loading || rows.length === 0) return null;

  return (
    <Card className="p-4 border-amber-500/40 bg-amber-500/5 mb-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm">Pending Payment Routing ({rows.length})</h3>
          <p className="text-xs text-muted-foreground">
            These payments didn't complete on the first try. They'll auto-retry when the blocker clears (e.g. wallet saved, KYC approved) — fees already paid are never re-charged.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-md border border-border bg-background/60 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{r.action.replace(/_/g, " ")}</Badge>
                <Badge variant={r.status === "manual_required" ? "destructive" : "secondary"}>
                  {r.status === "manual_required" ? "Manual review" : r.status === "awaiting_update" ? "Awaiting fix" : "Queued"}
                </Badge>
                {r.amount_fee_already_taken > 0 && (
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fee already paid — won't re-charge
                  </Badge>
                )}
              </div>
              <span className="font-mono font-semibold">${Number(r.amount_principal).toFixed(2)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-muted-foreground">
              <span>Attempt {r.attempt_count} / {r.max_attempts}</span>
              <span className="text-right flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" /> Next: {new Date(r.next_retry_at).toUTCString().slice(5, 22)} UTC
              </span>
              <span className="col-span-2 truncate">
                Reason: <span className="text-foreground">{r.failure_reason || "Unknown"}</span>
              </span>
              {r.recipient_address && (
                <span className="col-span-2 truncate font-mono">→ {r.recipient_address}</span>
              )}
            </div>
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" disabled={retrying === r.id} onClick={() => retryNow(r.id)}>
                <RefreshCw className={`h-3 w-3 mr-1 ${retrying === r.id ? "animate-spin" : ""}`} />
                Retry now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

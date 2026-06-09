import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, X, Shield } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  transaction_id: string | null;
  surface: string;
  action: string;
  recipient_user_id: string | null;
  recipient_address: string | null;
  recipient_method: string | null;
  amount_principal: number;
  amount_fee_already_taken: number;
  fee_phase: string;
  failure_reason: string | null;
  failure_code: string | null;
  attempt_count: number;
  max_attempts: number;
  status: string;
  unblocked_by: string | null;
  next_retry_at: string;
  created_at: string;
}

export default function RoutingRetryQueuePanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState("active");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const statuses = tab === "active"
      ? ["queued", "awaiting_update", "retrying"]
      : tab === "manual"
      ? ["manual_required"]
      : ["completed", "abandoned"];
    const { data } = await supabase
      .from("routing_retry_queue")
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as Row[]) || []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-retry-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "routing_retry_queue" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tab]);

  const act = async (action: "retry_now" | "abandon", retryId: string) => {
    setBusy(retryId);
    const { data, error } = await supabase.functions.invoke("routing-retry-worker", {
      body: { action, retryId, reason: action === "abandon" ? "Admin abandoned" : undefined },
    });
    setBusy(null);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: action === "retry_now" ? (data?.ok ? "Retry succeeded" : "Retry attempted") : "Marked abandoned" });
    load();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">Routing Retry Queue</h3>
          <p className="text-xs text-muted-foreground">Failed payment routes auto-retry. Fees already taken are never re-charged. UTC timestamps shown.</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="manual">Manual Review</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="space-y-2 mt-3">
          {rows.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No items.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-xs space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{r.surface.replace(/_/g, " ")}</Badge>
                  <Badge>{r.action.replace(/_/g, " ")}</Badge>
                  <Badge variant={r.status === "manual_required" ? "destructive" : r.status === "completed" ? "default" : "secondary"}>
                    {r.status}
                  </Badge>
                  {r.amount_fee_already_taken > 0 && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">Fee-safe replay</Badge>
                  )}
                  {r.unblocked_by && <Badge variant="outline">Unblocked: {r.unblocked_by}</Badge>}
                </div>
                <span className="font-mono font-semibold">${Number(r.amount_principal).toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                <span>TX: <span className="font-mono text-foreground">{r.transaction_id?.slice(0, 8) ?? "—"}</span></span>
                <span>Attempts: {r.attempt_count}/{r.max_attempts}</span>
                <span>Method: {r.recipient_method || "—"}</span>
                <span>Next retry (UTC): {new Date(r.next_retry_at).toUTCString().slice(5, 22)}</span>
                <span className="col-span-2 truncate">→ {r.recipient_address || "(no address)"}</span>
                <span className="col-span-2 truncate">Reason: <span className="text-foreground">{r.failure_reason || "—"}</span></span>
                <span className="col-span-2">Created (UTC): {new Date(r.created_at).toUTCString()}</span>
              </div>
              {(tab === "active" || tab === "manual") && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => act("retry_now", r.id)}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${busy === r.id ? "animate-spin" : ""}`} /> Retry now
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy === r.id} onClick={() => act("abandon", r.id)}>
                    <X className="h-3 w-3 mr-1" /> Abandon
                  </Button>
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

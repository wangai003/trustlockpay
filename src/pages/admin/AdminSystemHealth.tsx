import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Bug, CheckCircle2, Activity, Clock, Loader2, Heart, Zap, Send } from "lucide-react";
import { toast } from "sonner";

type BugRow = {
  id: string;
  severity: "critical" | "error" | "warning" | "info";
  source: string;
  category: string;
  title: string;
  message: string;
  stack_trace: string | null;
  context: any;
  route: string | null;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  error: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30",
  warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
};

const AdminSystemHealth = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [selected, setSelected] = useState<BugRow | null>(null);
  const [notes, setNotes] = useState("");

  const { data: bugs, isLoading } = useQuery({
    queryKey: ["bug-reports", tab],
    queryFn: async () => {
      const q = supabase
        .from("bug_reports" as any)
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(200);
      const { data, error } = tab === "open"
        ? await q.is("resolved_at", null)
        : await q.not("resolved_at", "is", null);
      if (error) throw error;
      return (data || []) as unknown as BugRow[];
    },
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["system-health-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_system_health_summary" as any);
      if (error) throw error;
      return (data || []) as Array<{
        metric_key: string; metric_label: string;
        value_numeric: number | null; value_text: string | null;
        status: "healthy" | "degraded" | "critical";
        recorded_at: string;
      }>;
    },
    refetchInterval: 30000,
  });

  const refreshMetrics = async () => {
    const { error } = await supabase.functions.invoke("system-health-collector");
    if (error) toast.error("Failed to refresh metrics");
    else { toast.success("Metrics refreshed"); qc.invalidateQueries({ queryKey: ["system-health-metrics"] }); }
  };

  const sendTestAlert = async () => {
    const { error } = await supabase.functions.invoke("bug-sentry-notify", { body: { digest: true } });
    if (error) toast.error("Webhook failed: " + error.message);
    else toast.success("Webhook fired (configured Slack/email destinations notified)");
  };

  const counts = {
    critical: (bugs || []).filter((b) => b.severity === "critical" && !b.resolved_at).length,
    error: (bugs || []).filter((b) => b.severity === "error" && !b.resolved_at).length,
    warning: (bugs || []).filter((b) => b.severity === "warning" && !b.resolved_at).length,
    total: (bugs || []).length,
  };

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("bug_reports" as any)
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bug marked resolved");
      qc.invalidateQueries({ queryKey: ["bug-reports"] });
      setSelected(null);
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bug_reports" as any)
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bug-reports"] }),
  });

  return (
    <div>
      <AdminHeader title="System Health" />
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Bug className="w-5 h-5" /> Bug Sentry
          </h2>
          <p className="text-sm text-muted-foreground">
            Live error stream from frontend, edge functions, and database triggers. Owned by Technical & Engineering.
          </p>
        </div>

        {/* Severity counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { k: "critical", label: "Critical", icon: AlertTriangle },
            { k: "error", label: "Errors", icon: Bug },
            { k: "warning", label: "Warnings", icon: Activity },
            { k: "total", label: "Total", icon: Clock },
          ] as const).map(({ k, label, icon: Icon }) => (
            <Card key={k}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{(counts as any)[k]}</p>
                </div>
                <Icon className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Health Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4" /> System Health Metrics
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={refreshMetrics}>
                <Zap className="w-3 h-3 mr-1" /> Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={sendTestAlert}>
                <Send className="w-3 h-3 mr-1" /> Send Alert Digest
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!metrics || metrics.length === 0 ? (
              <p className="text-xs text-muted-foreground">No metrics recorded yet. Cron runs every 10 minutes — click Refresh to sample now.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {metrics.map((m) => (
                  <div
                    key={m.metric_key}
                    className={`p-2 rounded border text-xs ${
                      m.status === "critical" ? "border-red-500/40 bg-red-500/5" :
                      m.status === "degraded" ? "border-yellow-500/40 bg-yellow-500/5" :
                      "border-border bg-muted/30"
                    }`}
                  >
                    <p className="text-[10px] text-muted-foreground">{m.metric_label}</p>
                    <p className="font-bold text-base">{m.value_numeric ?? m.value_text ?? "—"}</p>
                    <p className="text-[9px] uppercase tracking-wide opacity-70">{m.status}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-2">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}
            {!isLoading && (!bugs || bugs.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {tab === "open" ? "🎉 No open bugs. All systems healthy." : "No resolved bugs yet."}
              </p>
            )}
            {(bugs || []).map((b) => (
              <Card
                key={b.id}
                className={`cursor-pointer transition-colors ${selected?.id === b.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelected(b)}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${SEVERITY_STYLES[b.severity]}`}>
                          {b.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{b.source}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{b.category}</Badge>
                        {b.occurrence_count > 1 && (
                          <Badge variant="destructive" className="text-[10px]">×{b.occurrence_count}</Badge>
                        )}
                        {b.acknowledged_at && !b.resolved_at && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Ack
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1 truncate">{b.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{b.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(b.last_seen_at).toLocaleString()} {b.route && `· ${b.route}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Detail panel */}
        {selected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Bug Detail</span>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <p className="font-medium">{selected.title}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{selected.message}</p>
              </div>
              {selected.stack_trace && (
                <div>
                  <p className="font-medium mb-1">Stack trace</p>
                  <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-48">{selected.stack_trace}</pre>
                </div>
              )}
              {selected.context && Object.keys(selected.context).length > 0 && (
                <div>
                  <p className="font-medium mb-1">Context</p>
                  <pre className="bg-muted p-2 rounded text-[10px] overflow-auto max-h-48">
                    {JSON.stringify(selected.context, null, 2)}
                  </pre>
                </div>
              )}
              {!selected.resolved_at && (
                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    placeholder="Resolution notes (optional)…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    {!selected.acknowledged_at && (
                      <Button size="sm" variant="outline" onClick={() => ackMutation.mutate(selected.id)}>
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => resolveMutation.mutate({ id: selected.id, notes })}
                      disabled={resolveMutation.isPending}
                    >
                      {resolveMutation.isPending ? "Resolving…" : "Mark Resolved"}
                    </Button>
                  </div>
                </div>
              )}
              {selected.resolved_at && (
                <div className="pt-2 border-t text-muted-foreground">
                  <p>✅ Resolved {new Date(selected.resolved_at).toLocaleString()}</p>
                  {selected.resolution_notes && <p className="mt-1">Notes: {selected.resolution_notes}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSystemHealth;

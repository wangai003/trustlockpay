import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertTriangle, Bell, CheckCircle, Clock, Crown, ShieldAlert,
  ArrowRight, Eye, MessageSquare, Zap
} from "lucide-react";
import { toast } from "sonner";

function getAdminAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); } catch { return {}; }
}

const PRIORITY_STYLES: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  critical: "bg-destructive/15 text-destructive",
};

const STATUS_STYLES: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  acknowledged: { label: "Acknowledged", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: Eye },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle },
  overridden: { label: "Overridden by Executive", color: "bg-primary/15 text-primary", icon: Crown },
};

interface DepartmentAlertInboxProps {
  departmentSlug: string;
  departmentName: string;
  /** Show all alerts across departments (for executive view) */
  showAll?: boolean;
}

const DepartmentAlertInbox = ({ departmentSlug, departmentName, showAll }: DepartmentAlertInboxProps) => {
  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const isChief = auth.isChief === true;
  const queryClient = useQueryClient();
  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideNote, setOverrideNote] = useState("");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["dept-alerts", departmentSlug, showAll],
    queryFn: async () => {
      let query = supabase
        .from("admin_cross_department_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!showAll) {
        query = query.eq("target_department", departmentSlug);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`dept-alerts-${departmentSlug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_cross_department_alerts" },
        () => queryClient.invalidateQueries({ queryKey: ["dept-alerts", departmentSlug, showAll] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [departmentSlug, showAll, queryClient]);

  // Acknowledge
  const acknowledge = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("admin_cross_department_alerts")
        .update({ status: "acknowledged", acknowledged_by: adminId, acknowledged_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-alerts"] });
      toast.success("Alert acknowledged");
    },
  });

  // Complete
  const complete = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("admin_cross_department_alerts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-alerts"] });
      toast.success("Alert completed");
    },
  });

  // Executive Override
  const override = useMutation({
    mutationFn: async (alertId: string) => {
      if (!overrideNote.trim()) throw new Error("Override note required");
      const { error } = await supabase
        .from("admin_cross_department_alerts")
        .update({
          status: "overridden",
          override_by: adminId,
          override_at: new Date().toISOString(),
          override_note: overrideNote.trim(),
        })
        .eq("id", alertId);
      if (error) throw error;

      // Log to admin action log
      await supabase.from("admin_action_log").insert({
        admin_id: adminId,
        action_type: "executive_override",
        case_id: alertId,
        case_type: "cross_department_alert",
        justification: overrideNote.trim(),
        is_deviation: true,
        requires_chief_review: false,
        metadata: { alert_id: alertId, override_type: "department_alert" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-alerts"] });
      setOverrideTarget(null);
      setOverrideNote("");
      toast.success("Executive override applied");
    },
  });

  const pendingCount = (alerts || []).filter(a => a.status === "pending").length;
  const criticalCount = (alerts || []).filter(a => a.priority === "critical" && a.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {showAll ? "All Department Alerts" : `${departmentName} Alerts`}
          </span>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-[10px]">{pendingCount} pending</Badge>
        )}
        {criticalCount > 0 && (
          <Badge className="text-[10px] bg-destructive text-destructive-foreground animate-pulse">
            🚨 {criticalCount} critical
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading alerts…</p>
      ) : (alerts || []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-500/30 mb-2" />
            <p className="text-sm text-muted-foreground">No cross-department alerts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(alerts || []).map((alert: any) => {
            const statusCfg = STATUS_STYLES[alert.status] || STATUS_STYLES.pending;
            const isPending = alert.status === "pending";
            const isAcknowledged = alert.status === "acknowledged";
            const isOverridden = alert.status === "overridden";

            return (
              <Card key={alert.id} className={alert.priority === "critical" && isPending ? "border-destructive/40 bg-destructive/5" : ""}>
                <CardContent className="p-3 space-y-2">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {alert.priority === "critical" && <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />}
                        <span className="text-sm font-medium text-foreground">{alert.title}</span>
                      </div>
                      {alert.message && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`text-[9px] ${PRIORITY_STYLES[alert.priority]}`}>
                        {alert.priority}
                      </Badge>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color}`}>
                        <statusCfg.icon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Route info */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Badge variant="outline" className="text-[9px]">{alert.source_department}</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <Badge variant="outline" className="text-[9px]">{alert.target_department}</Badge>
                    <span className="ml-auto">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>

                  {/* Override notice */}
                  {isOverridden && (
                    <div className="bg-primary/10 rounded-md p-2 flex items-start gap-2">
                      <Crown className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-medium text-primary">Overridden by Executive</p>
                        <p className="text-[10px] text-muted-foreground">{alert.override_note}</p>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                          {alert.override_at && new Date(alert.override_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {isPending && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => acknowledge.mutate(alert.id)}>
                        <Eye className="w-3 h-3" /> Acknowledge
                      </Button>
                    )}
                    {isAcknowledged && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1"
                        onClick={() => complete.mutate(alert.id)}>
                        <CheckCircle className="w-3 h-3" /> Mark Complete
                      </Button>
                    )}

                    {/* Executive Override — only for chiefs, only on active alerts */}
                    {isChief && (isPending || isAcknowledged) && (
                      <Dialog open={overrideTarget === alert.id} onOpenChange={open => {
                        if (!open) { setOverrideTarget(null); setOverrideNote(""); }
                      }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => setOverrideTarget(alert.id)}>
                            <Crown className="w-3 h-3" /> Executive Override
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-sm flex items-center gap-2">
                              <Crown className="w-4 h-4 text-primary" /> Executive Override
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            <div className="bg-destructive/10 rounded-md p-3">
                              <p className="text-xs text-destructive font-medium">⚠ This action is final and cannot be reversed.</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                The target department will see "Overridden by Executive" with your note.
                                This will be logged in the accountability system.
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium mb-1">Override Note (required)</p>
                              <Textarea
                                placeholder="Explain the reason for this executive override…"
                                value={overrideNote}
                                onChange={e => setOverrideNote(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <Button
                              onClick={() => override.mutate(alert.id)}
                              disabled={!overrideNote.trim() || override.isPending}
                              className="w-full gap-2"
                              variant="destructive"
                            >
                              <Crown className="w-4 h-4" /> Confirm Override
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentAlertInbox;

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Clock, CheckCircle, AlertTriangle, Loader2, User, Calendar,
  ArrowRight, RotateCw, CircleDot
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getAdminAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); } catch { return {}; }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", icon: ArrowRight },
  completed: { label: "Completed", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: CheckCircle },
  blocked: { label: "Blocked", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-accent/15 text-accent-foreground",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  urgent: "bg-destructive text-destructive-foreground",
};

interface DepartmentWorkflowProps {
  departmentSlug: string;
  departmentName: string;
}

const DepartmentWorkflow = ({ departmentSlug, departmentName }: DepartmentWorkflowProps) => {
  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const isChief = auth.isChief === true;
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "normal", due_date: "" });

  // Fetch department staff
  const { data: staffData } = useQuery({
    queryKey: ["dept-staff", departmentSlug],
    queryFn: () =>
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ action: "list", chiefAdminId: adminId }),
      }).then(r => r.json()),
    select: (data) => {
      const accounts = data?.accounts || [];
      return accounts.filter((a: any) => !a.is_deleted && a.department_slug === departmentSlug);
    },
  });

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["dept-tasks", departmentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_department_tasks")
        .select("*")
        .eq("department_slug", departmentSlug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const ch = supabase
      .channel(`dept-tasks-${departmentSlug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_department_tasks", filter: `department_slug=eq.${departmentSlug}` },
        () => queryClient.invalidateQueries({ queryKey: ["dept-tasks", departmentSlug] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [departmentSlug, queryClient]);

  // Round-robin assignment
  const getNextAssignee = useCallback(async () => {
    const staff = staffData || [];
    if (staff.length === 0) return null;

    const { data: pointer } = await supabase
      .from("admin_department_rr_pointer")
      .select("last_assigned_index")
      .eq("department_slug", departmentSlug)
      .single();

    const lastIdx = pointer?.last_assigned_index || 0;
    const nextIdx = (lastIdx + 1) % staff.length;
    const assignee = staff[nextIdx];

    await supabase.from("admin_department_rr_pointer").upsert({
      department_slug: departmentSlug,
      last_assigned_index: nextIdx,
      updated_at: new Date().toISOString(),
    }, { onConflict: "department_slug" });

    return assignee;
  }, [staffData, departmentSlug]);

  // Create task
  const createTask = useMutation({
    mutationFn: async () => {
      const assignee = await getNextAssignee();
      const { error } = await supabase.from("admin_department_tasks").insert({
        department_slug: departmentSlug,
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        due_date: newTask.due_date || null,
        assigned_to: assignee?.id || null,
        assigned_by: adminId,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dept-tasks", departmentSlug] });
      setNewTask({ title: "", description: "", priority: "normal", due_date: "" });
      setShowCreate(false);
    },
  });

  // Update task status
  const updateStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const update: any = { status };
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { error } = await supabase.from("admin_department_tasks").update(update).eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dept-tasks", departmentSlug] }),
  });

  const staffMap = (staffData || []).reduce((acc: any, s: any) => { acc[s.id] = s; return acc; }, {});
  const pendingCount = (tasks || []).filter((t: any) => t.status === "pending").length;
  const inProgressCount = (tasks || []).filter((t: any) => t.status === "in_progress").length;
  const completedCount = (tasks || []).filter((t: any) => t.status === "completed").length;
  const blockedCount = (tasks || []).filter((t: any) => t.status === "blocked").length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: pendingCount, icon: Clock, color: "text-muted-foreground" },
          { label: "In Progress", count: inProgressCount, icon: ArrowRight, color: "text-blue-500" },
          { label: "Completed", count: completedCount, icon: CheckCircle, color: "text-emerald-500" },
          { label: "Blocked", count: blockedCount, icon: AlertTriangle, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <p className="text-lg font-bold text-foreground">{s.count}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create task */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {departmentName} Tasks
          <span className="text-muted-foreground font-normal ml-2">
            <RotateCw className="w-3 h-3 inline mr-1" />Round-Robin Assignment
          </span>
        </h3>
        {(isChief || (staffData || []).some((s: any) => s.id === adminId && s.is_team_lead)) && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Create Task — {departmentName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Task title" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} />
                <Textarea placeholder="Description (optional)" value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <Button onClick={() => createTask.mutate()} disabled={!newTask.title || createTask.isPending} className="w-full">
                  {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & Auto-Assign"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Task list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading tasks…</p>
      ) : (tasks || []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CircleDot className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No tasks in this department yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(tasks || []).map((task: any) => {
            const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            const assignee = task.assigned_to ? staffMap[task.assigned_to] : null;
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

            return (
              <Card key={task.id} className={isOverdue ? "border-destructive/30" : ""}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      {task.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`text-[9px] ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {assignee && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {assignee.name}
                          {assignee.is_team_lead && <Badge variant="secondary" className="text-[8px] px-1">Lead</Badge>}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue && "⚠ "}
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Status actions */}
                    {task.status !== "completed" && (
                      <div className="flex gap-1">
                        {task.status === "pending" && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2"
                            onClick={() => updateStatus.mutate({ taskId: task.id, status: "in_progress" })}>
                            Start
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2"
                            onClick={() => updateStatus.mutate({ taskId: task.id, status: "completed" })}>
                            Complete
                          </Button>
                        )}
                        {task.status !== "blocked" && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2 text-destructive"
                            onClick={() => updateStatus.mutate({ taskId: task.id, status: "blocked" })}>
                            Block
                          </Button>
                        )}
                        {task.status === "blocked" && (
                          <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2"
                            onClick={() => updateStatus.mutate({ taskId: task.id, status: "in_progress" })}>
                            Unblock
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {task.completed_at && (
                    <p className="text-[10px] text-emerald-500">
                      ✓ Completed {new Date(task.completed_at).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DepartmentWorkflow;

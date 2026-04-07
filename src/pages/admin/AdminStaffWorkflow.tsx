import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Users, Clock, CheckCircle, AlertTriangle, ArrowRight, RotateCw,
  Crown, Star, MessageSquare, Shield, DollarSign, ShieldCheck, GitBranch, Building2
} from "lucide-react";
import { DEPARTMENTS } from "@/lib/adminDepartments";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getAdminAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); } catch { return {}; }
}

const DEPT_ICONS: Record<string, any> = {
  executive: Crown, correspondence: MessageSquare, disputes: Shield,
  finance: DollarSign, compliance: ShieldCheck, operations: GitBranch,
};

const AdminStaffWorkflow = () => {
  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const [selectedDept, setSelectedDept] = useState("all");

  // Fetch all staff
  const { data: staffData } = useQuery({
    queryKey: ["admin-staff-workflow", adminId],
    queryFn: () =>
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ action: "list", chiefAdminId: adminId }),
      }).then(r => r.json()),
    select: d => (d?.accounts || []).filter((a: any) => !a.is_deleted),
  });

  // Fetch all department tasks
  const { data: allTasks } = useQuery({
    queryKey: ["all-dept-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_department_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const staff = staffData || [];
  const tasks = allTasks || [];

  // Per-department stats
  const deptStats = DEPARTMENTS.map(dept => {
    const deptTasks = tasks.filter(t => t.department_slug === dept.slug);
    const deptStaff = staff.filter((s: any) => s.department_slug === dept.slug);
    return {
      ...dept,
      staffCount: deptStaff.length,
      totalTasks: deptTasks.length,
      pending: deptTasks.filter(t => t.status === "pending").length,
      inProgress: deptTasks.filter(t => t.status === "in_progress").length,
      completed: deptTasks.filter(t => t.status === "completed").length,
      blocked: deptTasks.filter(t => t.status === "blocked").length,
      overdue: deptTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length,
      staff: deptStaff,
    };
  });

  // Per-staff stats
  const staffStats = staff.map((s: any) => {
    const myTasks = tasks.filter(t => t.assigned_to === s.id);
    return {
      ...s,
      totalTasks: myTasks.length,
      pending: myTasks.filter(t => t.status === "pending").length,
      inProgress: myTasks.filter(t => t.status === "in_progress").length,
      completed: myTasks.filter(t => t.status === "completed").length,
      blocked: myTasks.filter(t => t.status === "blocked").length,
      completionRate: myTasks.length ? Math.round((myTasks.filter(t => t.status === "completed").length / myTasks.length) * 100) : 0,
    };
  });

  const filteredStaff = selectedDept === "all" ? staffStats : staffStats.filter((s: any) => s.department_slug === selectedDept);

  const totalTasks = tasks.length;
  const totalPending = tasks.filter(t => t.status === "pending").length;
  const totalCompleted = tasks.filter(t => t.status === "completed").length;
  const totalBlocked = tasks.filter(t => t.status === "blocked").length;

  return (
    <div>
      <AdminHeader title="Staff Workflow Monitor" />
      <div className="p-4 sm:p-6 space-y-6">

        {/* Global stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: totalTasks, icon: RotateCw, color: "text-muted-foreground" },
            { label: "Pending", value: totalPending, icon: Clock, color: "text-muted-foreground" },
            { label: "Completed", value: totalCompleted, icon: CheckCircle, color: "text-emerald-500" },
            { label: "Blocked", value: totalBlocked, icon: AlertTriangle, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Department breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Department Task Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deptStats.map(dept => {
                const Icon = DEPT_ICONS[dept.slug] || Building2;
                const completionRate = dept.totalTasks ? Math.round((dept.completed / dept.totalTasks) * 100) : 0;
                return (
                  <div key={dept.slug} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{dept.name}</span>
                      <Badge variant="secondary" className="ml-auto text-[9px]">{dept.staffCount} staff</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[
                        { label: "Pending", val: dept.pending, color: "text-muted-foreground" },
                        { label: "Active", val: dept.inProgress, color: "text-blue-500" },
                        { label: "Done", val: dept.completed, color: "text-emerald-500" },
                        { label: "Blocked", val: dept.blocked, color: "text-destructive" },
                      ].map(m => (
                        <div key={m.label}>
                          <p className={`text-sm font-bold ${m.color}`}>{m.val}</p>
                          <p className="text-[9px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <Progress value={completionRate} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground text-center">{completionRate}% completion</p>
                    {dept.overdue > 0 && (
                      <Badge variant="destructive" className="text-[9px] w-full justify-center">
                        ⚠ {dept.overdue} overdue
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Individual Staff Monitor */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Individual Staff Performance
              </CardTitle>
              <Tabs value={selectedDept} onValueChange={setSelectedDept}>
                <TabsList className="h-7">
                  <TabsTrigger value="all" className="text-[10px] px-2 h-5">All</TabsTrigger>
                  {DEPARTMENTS.map(d => (
                    <TabsTrigger key={d.slug} value={d.slug} className="text-[10px] px-2 h-5 hidden sm:flex">
                      {d.slug.slice(0, 4).toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>
            ) : (
              <div className="space-y-2">
                {filteredStaff.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{s.name?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                        {s.is_chief && <Crown className="w-3 h-3 text-primary" />}
                        {s.is_team_lead && <Star className="w-3 h-3 text-amber-500" />}
                        <Badge variant="outline" className="text-[8px] ml-1">{s.department_slug || "N/A"}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">{s.totalTasks} tasks</span>
                        <span className="text-[10px] text-blue-500">{s.inProgress} active</span>
                        <span className="text-[10px] text-emerald-500">{s.completed} done</span>
                        {s.blocked > 0 && <span className="text-[10px] text-destructive">{s.blocked} blocked</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{s.completionRate}%</p>
                      <Progress value={s.completionRate} className="h-1 w-16 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminStaffWorkflow;

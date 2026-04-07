import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, Crown, MessageSquare, Shield, DollarSign, ShieldCheck, GitBranch, Star } from "lucide-react";
import { DEPARTMENTS } from "@/lib/adminDepartments";
import DepartmentWorkflow from "@/components/admin/DepartmentWorkflow";

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function getChiefAdminId(): string {
  try {
    const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
    return auth.adminId || auth.id || "";
  } catch { return ""; }
}

function isTestnetMode(): boolean {
  return localStorage.getItem("tl_network") === "testnet";
}

const TESTNET_MOCK_STAFF = [
  { id: "a0ac136f", name: "Michael", username: "michael.tl", is_deleted: false, is_chief: true, chief_rank: 1, department_slug: "executive" },
  { id: "staff-david", name: "David", username: "david.tl", is_deleted: false, is_chief: false, chief_rank: null, department_slug: "correspondence" },
  { id: "staff-emmanuel", name: "Emmanuel", username: "emmanuel.tl", is_deleted: false, is_chief: false, chief_rank: null, department_slug: "operations" },
  { id: "staff-sarah", name: "Sarah", username: "sarah.tl", is_deleted: false, is_chief: false, chief_rank: null, department_slug: "compliance" },
];

const DEPT_ICONS: Record<string, any> = {
  executive: Crown,
  correspondence: MessageSquare,
  disputes: Shield,
  finance: DollarSign,
  compliance: ShieldCheck,
  operations: GitBranch,
};

const DEPT_COLORS: Record<string, string> = {
  executive: "bg-primary/10 text-primary border-primary/20",
  correspondence: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  disputes: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  finance: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  compliance: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  operations: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
};

const AdminDepartments = () => {
  const chiefAdminId = getChiefAdminId();
  const isTestnet = isTestnetMode();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff-departments", chiefAdminId],
    queryFn: () =>
      fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ action: "list", chiefAdminId }),
      }).then((r) => r.json()),
    enabled: !!chiefAdminId && !isTestnet,
  });

  const accounts = isTestnet ? TESTNET_MOCK_STAFF : (data?.accounts || []);
  const activeAccounts = accounts.filter((a: any) => !a.is_deleted);

  // Group staff by department
  const deptStaffMap: Record<string, any[]> = {};
  DEPARTMENTS.forEach(d => { deptStaffMap[d.slug] = []; });
  deptStaffMap["unassigned"] = [];

  activeAccounts.forEach((a: any) => {
    const slug = a.department_slug;
    if (slug && deptStaffMap[slug]) {
      deptStaffMap[slug].push(a);
    } else {
      deptStaffMap["unassigned"].push(a);
    }
  });

  const [activeTab, setActiveTab] = useState("directory");

  return (
    <div>
      <AdminHeader title="Departments" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Department Directory</h2>
            <p className="text-sm text-muted-foreground">
              {activeAccounts.length} active staff across {DEPARTMENTS.length} departments
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            {DEPARTMENTS.map(d => (
              <TabsTrigger key={d.slug} value={d.slug} className="hidden sm:flex text-xs">
                {d.name.split(" ")[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="directory" className="mt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENTS.map((dept) => {
            const Icon = DEPT_ICONS[dept.slug] || Building2;
            const colorClass = DEPT_COLORS[dept.slug] || "bg-muted/50 text-muted-foreground";
            const staff = deptStaffMap[dept.slug] || [];

            return (
              <Card key={dept.slug} className="overflow-hidden">
                <CardHeader className={`pb-3 border-b ${colorClass}`}>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Icon className="w-4 h-4" />
                    {dept.name}
                  </CardTitle>
                  <p className="text-[11px] opacity-80">{dept.description}</p>
                </CardHeader>
                <CardContent className="pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Staff Members</span>
                    <Badge variant="secondary" className="text-[10px]">{staff.length}</Badge>
                  </div>

                  {staff.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No staff assigned yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {staff.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                          <div>
                            <p className="text-xs font-medium text-foreground">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">{s.username}</p>
                          </div>
                          <div className="flex gap-1">
                             {s.is_chief && (
                               <Badge variant="default" className="text-[9px] gap-0.5 px-1.5">
                                 <Crown className="w-2.5 h-2.5" />
                                 {s.chief_rank === 1 ? "Chief" : "Promoted"}
                               </Badge>
                             )}
                             {s.is_team_lead && (
                               <Badge variant="secondary" className="text-[9px] gap-0.5 px-1.5">
                                 <Star className="w-2.5 h-2.5" /> Team Lead
                               </Badge>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {dept.canMessageClients && (
                    <div className="pt-1 border-t">
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <MessageSquare className="w-2.5 h-2.5" /> Client Messaging Access
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unassigned staff */}
        {deptStaffMap["unassigned"].length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Unassigned Staff ({deptStaffMap["unassigned"].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {deptStaffMap["unassigned"].map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/20">
                  <div>
                    <p className="text-xs font-medium">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.username}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px]">No Department</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {isLoading && !isTestnet && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading department data…</p>
        )}
      </div>
    </div>
  );
};

export default AdminDepartments;

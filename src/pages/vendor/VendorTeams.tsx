import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendor } from "@/contexts/VendorContext";
import { useTestnetTeams } from "@/hooks/useTestnetTeams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import TeamTemplateManager from "@/components/shared/TeamTemplateManager";
import WorkspaceChat from "@/components/shared/WorkspaceChat";
import TeamBulkImport from "@/components/shared/TeamBulkImport";
import TeamTaskCard, { type TaskAssignment } from "@/components/shared/TeamTaskCard";
import { queueOfflineAction, syncOfflineActions, getPendingActions } from "@/lib/offlineQueue";
import { Plus, Users, Trash2, UserPlus, CheckCircle2, XCircle, AlertTriangle, ClipboardList, WifiOff, Wifi, RotateCcw, MessageSquare, Settings2 } from "lucide-react";
import TestnetTeamsView from "@/components/shared/TestnetTeamsView";
import { cn } from "@/lib/utils";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";

const INDUSTRIES = [
  { key: "mining", label: "Mining" },
  { key: "agriculture", label: "Agriculture" },
  { key: "construction", label: "Construction" },
  { key: "real_estate", label: "Real Estate" },
  { key: "tourism", label: "Tourism" },
  { key: "retail", label: "Retail" },
  { key: "freelance", label: "Freelance" },
  { key: "logistics", label: "Logistics" },
  { key: "education", label: "Education" },
  { key: "project_management", label: "Project Management" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
];

type Workspace = { id: string; title: string; description: string | null; industry: string; status: string; created_at: string; transaction_id: string | null; owner_id: string; invite_code?: string | null };
type Member = { id: string; user_id: string; display_name: string | null; role: string; can_finalize: boolean; removed_at: string | null; preferred_language?: string };
type RolePreset = { id: string; industry: string; role_name: string; role_key: string };

const VendorTeams = () => {
  const { user } = useAuth();
  const { isTestnet } = useVendor();
  const testnet = useTestnetTeams("vendor");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [tab, setTab] = useState("active");
  const [isOwner, setIsOwner] = useState(true);
  const [myMembership, setMyMembership] = useState<Member | null>(null);
  const [rolePresets, setRolePresets] = useState<RolePreset[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIndustry, setNewIndustry] = useState("mining");
  const [newTxId, setNewTxId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberLang, setMemberLang] = useState("en");
  const [memberRolePreset, setMemberRolePreset] = useState("");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [taskLabel, setTaskLabel] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskSlaHours, setTaskSlaHours] = useState("");

  // Online/offline detection + sync
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      const pending = await getPendingActions();
      if (pending.length > 0) {
        const { synced } = await syncOfflineActions(async (action, payload) => {
          const { error } = await supabase.functions.invoke("manage-teams", { body: { action, ...payload } });
          return !error;
        });
        if (synced > 0) toast.success(`Synced ${synced} offline task(s)`);
        setPendingCount(0);
      }
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  useEffect(() => { if (user?.id) fetchWorkspaces(); }, [user?.id]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const { data: owned } = await supabase.from("team_workspaces").select("*").eq("owner_id", user!.id).eq("role", "vendor").order("created_at", { ascending: false });
    const { data: memberOf } = await supabase.from("team_members").select("workspace_id").eq("user_id", user!.id).is("removed_at", null);
    const memberWsIds = (memberOf || []).map((m: any) => m.workspace_id);
    const ownedIds = (owned || []).map((w: any) => w.id);
    const missingIds = memberWsIds.filter((id: string) => !ownedIds.includes(id));
    let allWorkspaces = [...(owned || [])] as Workspace[];
    if (missingIds.length > 0) {
      const { data: extra } = await supabase.from("team_workspaces").select("*").in("id", missingIds);
      allWorkspaces = [...allWorkspaces, ...((extra || []) as Workspace[])];
    }
    setWorkspaces(allWorkspaces);
    setLoading(false);
  };

  const fetchMembers = async (wsId: string) => {
    const { data } = await supabase.from("team_members").select("*").eq("workspace_id", wsId).is("removed_at", null);
    setMembers((data as any[]) || []);
  };

  const fetchTasks = async (wsId: string) => {
    const { data } = await supabase.from("team_task_assignments").select("*").eq("workspace_id", wsId).order("sort_order", { ascending: true });
    setTasks((data as any[]) || []);
  };

  const fetchRolePresets = async (industry: string) => {
    const { data } = await supabase.from("team_role_presets").select("*").eq("industry", industry).order("sort_order", { ascending: true });
    setRolePresets((data as any[]) || []);
  };

  const openWorkspace = async (ws: Workspace) => {
    setSelectedWs(ws);
    const owner = ws.owner_id === user!.id;
    setIsOwner(owner);
    const { data: memberData } = await supabase.from("team_members").select("*").eq("workspace_id", ws.id).is("removed_at", null);
    const mems = (memberData as any[]) || [];
    setMembers(mems);
    setMyMembership(mems.find((m: Member) => m.user_id === user!.id) || null);
    fetchTasks(ws.id);
    fetchRolePresets(ws.industry);
  };

  const createWorkspace = async () => {
    if (!newTitle.trim()) return toast.error("Title is required");
    const { error } = await supabase.from("team_workspaces").insert({ owner_id: user!.id, title: newTitle, description: newDesc || null, industry: newIndustry, role: "vendor", transaction_id: newTxId || null } as any);
    if (error) return toast.error(error.message);
    toast.success("Workspace created");
    setShowCreate(false); setNewTitle(""); setNewDesc(""); fetchWorkspaces();
  };

  const addMember = async () => {
    if (!memberUserId.trim() || !selectedWs) return toast.error("User ID required");
    const displayName = memberRolePreset
      ? `${memberName || "Member"} — ${rolePresets.find(r => r.role_key === memberRolePreset)?.role_name || ""}`
      : memberName || null;
    const { error } = await supabase.from("team_members").insert({ workspace_id: selectedWs.id, user_id: memberUserId, display_name: displayName, preferred_language: memberLang, added_by: user!.id } as any);
    if (error) return toast.error(error.message);
    toast.success("Member added"); setShowAddMember(false); setMemberUserId(""); setMemberName(""); setMemberRolePreset(""); setMemberLang("en"); fetchMembers(selectedWs.id);
  };

  const toggleFinalize = async (memberId: string, current: boolean) => {
    await supabase.from("team_members").update({ can_finalize: !current } as any).eq("id", memberId);
    toast.success(!current ? "Finalizer rights granted" : "Finalizer rights revoked");
    if (selectedWs) fetchMembers(selectedWs.id);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("team_members").update({ removed_at: new Date().toISOString() } as any).eq("id", memberId);
    toast.success("Member removed"); setConfirmAction(null);
    if (selectedWs) fetchMembers(selectedWs.id);
  };

  const assignTask = async () => {
    if (!taskMemberId || !taskKey || !selectedWs) return toast.error("Fill all fields");
    const payload: any = {
      workspace_id: selectedWs.id, member_id: taskMemberId, milestone_key: taskKey,
      milestone_label: taskLabel || taskKey, instructions: taskInstructions || null, sort_order: tasks.length,
    };
    if (taskDeadline) payload.deadline_at = new Date(taskDeadline).toISOString();
    if (taskSlaHours) payload.sla_hours = parseInt(taskSlaHours);
    const { error } = await supabase.from("team_task_assignments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Task assigned"); setShowAssignTask(false); setTaskKey(""); setTaskLabel(""); setTaskInstructions(""); setTaskDeadline(""); setTaskSlaHours(""); fetchTasks(selectedWs.id);
  };

  const updateWorkspaceStatus = async (status: string) => {
    if (!selectedWs) return;
    const update: any = { status, updated_at: new Date().toISOString() };
    if (status === "archived") update.archived_at = new Date().toISOString();
    await supabase.from("team_workspaces").update(update).eq("id", selectedWs.id);
    toast.success(`Work order marked as ${status}`); setConfirmAction(null); setSelectedWs(null); fetchWorkspaces();
  };

  const activeWs = workspaces.filter((w) => w.status === "active");
  const completedWs = workspaces.filter((w) => w.status === "complete");
  const dissolvedWs = workspaces.filter((w) => w.status === "dissolved");

  // Offline banner
  const OfflineBanner = () => !isOnline ? (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
      <WifiOff className="w-4 h-4" /> You're offline. Task completions will sync when connected.
      {pendingCount > 0 && <Badge variant="outline" className="ml-auto">{pendingCount} pending</Badge>}
    </div>
  ) : null;

  // ─── TESTNET MODE ─────────────────────────────────────────
  if (isTestnet) {
    return <TestnetTeamsView testnet={testnet} role="vendor" />;
  }

  if (selectedWs) {
    const visibleTasks = isOwner ? tasks : tasks.filter((t) => myMembership && t.member_id === myMembership.id);

    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
        <OfflineBanner />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedWs(null)}>← Back</Button>
            <h1 className="text-xl sm:text-2xl font-bold mt-2">{selectedWs.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{selectedWs.industry}</Badge>
              <Badge className={selectedWs.status === "active" ? "bg-primary" : selectedWs.status === "complete" ? "bg-green-600" : "bg-destructive"}>{selectedWs.status}</Badge>
            </div>
            {selectedWs.description && <p className="text-sm text-muted-foreground mt-2">{selectedWs.description}</p>}
            {!isOwner && myMembership && (
              <p className="text-xs text-primary font-medium mt-1">You are a team member{myMembership.can_finalize ? " (Finalizer)" : ""}</p>
            )}
          </div>
          {isOwner && selectedWs.status === "active" && (
            <div className="flex gap-2 self-start">
              <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "complete", id: selectedWs.id, label: "Mark as Complete" })}><CheckCircle2 className="w-4 h-4 mr-1" /> Complete</Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: "dissolve", id: selectedWs.id, label: "Dissolve Work Order" })}><XCircle className="w-4 h-4 mr-1" /> Dissolve</Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="tasks" className="flex-1 sm:flex-none gap-1.5 text-xs">
              <ClipboardList className="w-3.5 h-3.5" /> Tasks
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="team" className="flex-1 sm:flex-none gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5" /> Team ({members.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="chat" className="flex-1 sm:flex-none gap-1.5 text-xs">
              <MessageSquare className="w-3.5 h-3.5" /> Chat
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="templates" className="flex-1 sm:flex-none gap-1.5 text-xs">
                <Settings2 className="w-3.5 h-3.5" /> Templates
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{isOwner ? "Task Assignments" : "My Tasks"}</CardTitle>
                {isOwner && selectedWs.status === "active" && <Button size="sm" onClick={() => setShowAssignTask(true)}><ClipboardList className="w-4 h-4 mr-1" /> Assign</Button>}
              </CardHeader>
              <CardContent>
                {visibleTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{isOwner ? "No tasks assigned yet." : "No tasks assigned to you."}</p>
                ) : (
                  <div className="space-y-2">
                    {visibleTasks.map((t, i) => {
                      const member = members.find((m) => m.id === t.member_id);
                      const isMyTask = !!(myMembership && t.member_id === myMembership.id);
                      const allPriorDone = tasks.filter((pt) => pt.sort_order < t.sort_order).every((pt) => pt.status === "completed");
                      const canComplete = isMyTask && t.status === "pending" && allPriorDone && selectedWs.status === "active";
                      return (
                        <TeamTaskCard key={t.id} task={t} index={i} isOwner={isOwner} isMyTask={isMyTask}
                          canComplete={canComplete} allPriorDone={allPriorDone} member={member}
                          workspaceId={selectedWs.id} onRefresh={() => fetchTasks(selectedWs.id)} />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isOwner && (
            <TabsContent value="team">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Team Members</CardTitle>
                  {selectedWs.status === "active" && (
                    <div className="flex gap-2 flex-wrap">
                      <TeamBulkImport workspaceId={selectedWs.id} onImported={() => fetchMembers(selectedWs.id)} disabled={selectedWs.status !== "active"} />
                      <Button size="sm" onClick={() => { setShowAddMember(true); fetchRolePresets(selectedWs.industry); }}><UserPlus className="w-4 h-4 mr-1" /> Add Member</Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? <p className="text-sm text-muted-foreground">No members added yet. Use "Add Member" or "Bulk Import" to get started.</p> : (
                    <div className="space-y-2">
                      {members.map((m, mIdx) => {
                        const row = mIdx + 1;
                        return (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border gap-2">
                          <div>
                            <TLId code={dynTLId("V", "TM", row, "LBL-NAME")} inline>
                              <p className="font-medium text-sm">{m.display_name || "Unnamed"}</p>
                            </TLId>
                            <TLId code={dynTLId("V", "TM", row, "LBL-USERID")} inline>
                              <p className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}... {m.preferred_language && m.preferred_language !== "en" && `· ${LANGUAGES.find(l => l.code === m.preferred_language)?.label || m.preferred_language}`}</p>
                            </TLId>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Finalizer</Label>
                              <TLId code={dynTLId("V", "TM", row, "TGL-FINALIZE")} inline>
                                <Switch checked={m.can_finalize} onCheckedChange={() => toggleFinalize(m.id, m.can_finalize)} disabled={selectedWs.status !== "active"} />
                              </TLId>
                            </div>
                            {selectedWs.status === "active" && (
                              <TLId code={dynTLId("V", "TM", row, "BTN-REMOVE")} inline>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmAction({ type: "remove_member", id: m.id, label: `Remove ${m.display_name || "member"}` })}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TLId>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="chat">
            <WorkspaceChat workspaceId={selectedWs.id} members={members.map((m) => ({ user_id: m.user_id, display_name: m.display_name }))} />
          </TabsContent>

          {isOwner && (
            <TabsContent value="templates">
              <TeamTemplateManager workspaceId={selectedWs.id} members={members.map((m) => ({ id: m.id, display_name: m.display_name, user_id: m.user_id }))} disabled={selectedWs.status !== "active"} />
            </TabsContent>
          )}
        </Tabs>

        {/* Add Member Dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>User ID</Label><Input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="Paste member's user ID" /></div>
              <div><Label>Display Name</Label><Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. John" /></div>
              {rolePresets.length > 0 && (
                <div>
                  <Label>Role Preset</Label>
                  <Select value={memberRolePreset} onValueChange={setMemberRolePreset}>
                    <SelectTrigger><SelectValue placeholder="Select industry role" /></SelectTrigger>
                    <SelectContent>{rolePresets.map((r) => (<SelectItem key={r.role_key} value={r.role_key}>{r.role_name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Preferred Language</Label>
                <Select value={memberLang} onValueChange={setMemberLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map((l) => (<SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={addMember}>Add Member</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Task Dialog */}
        <Dialog open={showAssignTask} onOpenChange={setShowAssignTask}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Assign To</Label><Select value={taskMemberId} onValueChange={setTaskMemberId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m) => (<SelectItem key={m.id} value={m.id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>Milestone Key</Label><Input value={taskKey} onChange={(e) => setTaskKey(e.target.value)} placeholder="e.g. assay_report" /></div>
              <div><Label>Task Label</Label><Input value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="e.g. Submit Assay Report" /></div>
              <div><Label>Instructions</Label><Textarea value={taskInstructions} onChange={(e) => setTaskInstructions(e.target.value)} placeholder="What should this member do?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Deadline</Label><Input type="datetime-local" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} /></div>
                <div><Label>SLA (hours)</Label><Input type="number" value={taskSlaHours} onChange={(e) => setTaskSlaHours(e.target.value)} placeholder="e.g. 48" /></div>
              </div>
            </div>
            <DialogFooter><Button onClick={assignTask}>Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Confirm Action</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to: <strong>{confirmAction?.label}</strong>?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (confirmAction?.type === "complete") updateWorkspaceStatus("complete");
                else if (confirmAction?.type === "dissolve") updateWorkspaceStatus("dissolved");
                else if (confirmAction?.type === "remove_member") removeMember(confirmAction.id);
              }}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      <OfflineBanner />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">Manage work order teams and assign industry-specific tasks.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Workspace</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">Active ({activeWs.length})</TabsTrigger>
          <TabsTrigger value="complete" className="flex-1 sm:flex-none">Complete ({completedWs.length})</TabsTrigger>
          <TabsTrigger value="dissolved" className="flex-1 sm:flex-none">Dissolved ({dissolvedWs.length})</TabsTrigger>
        </TabsList>
        {["active", "complete", "dissolved"].map((status) => {
          const list = status === "active" ? activeWs : status === "complete" ? completedWs : dissolvedWs;
          return (
            <TabsContent key={status} value={status}>
              {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : list.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No {status} work orders.</CardContent></Card>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {list.map((ws) => (
                    <Card key={ws.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => openWorkspace(ws)}>
                      <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{ws.title}</CardTitle><Badge variant="outline">{ws.industry}</Badge></div></CardHeader>
                      <CardContent>
                        {ws.description && <p className="text-sm text-muted-foreground line-clamp-2">{ws.description}</p>}
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground"><Users className="w-3 h-3" /><span>Created {new Date(ws.created_at).toLocaleDateString()}</span></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Team Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Gold Export Order #42" /></div>
            <div><Label>Industry</Label><Select value={newIndustry} onValueChange={setNewIndustry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INDUSTRIES.map((ind) => (<SelectItem key={ind.key} value={ind.key}>{ind.label}</SelectItem>))}</SelectContent></Select></div>
            <div><Label>Description</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description" /></div>
            <div><Label>Transaction ID (optional)</Label><Input value={newTxId} onChange={(e) => setNewTxId(e.target.value)} placeholder="Link to existing transaction" /></div>
          </div>
          <DialogFooter><Button onClick={createWorkspace}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorTeams;

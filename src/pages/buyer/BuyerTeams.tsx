import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Users, Trash2, UserPlus, CheckCircle2, XCircle, AlertTriangle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

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

type Workspace = { id: string; title: string; description: string | null; industry: string; status: string; created_at: string; transaction_id: string | null; owner_id: string };
type Member = { id: string; user_id: string; display_name: string | null; role: string; can_finalize: boolean; removed_at: string | null };
type TaskAssignment = { id: string; member_id: string; milestone_key: string; milestone_label: string | null; instructions: string | null; status: string; sort_order: number };

const BuyerTeams = () => {
  const { user } = useAuth();
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

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIndustry, setNewIndustry] = useState("mining");
  const [newTxId, setNewTxId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [taskMemberId, setTaskMemberId] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [taskLabel, setTaskLabel] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");

  useEffect(() => { if (user?.id) fetchWorkspaces(); }, [user?.id]);

  const fetchWorkspaces = async () => {
    setLoading(true);
    const { data } = await supabase.from("team_workspaces").select("*").eq("owner_id", user!.id).eq("role", "buyer").order("created_at", { ascending: false });
    setWorkspaces((data as any[]) || []);
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

  const openWorkspace = (ws: Workspace) => { setSelectedWs(ws); fetchMembers(ws.id); fetchTasks(ws.id); };

  const createWorkspace = async () => {
    if (!newTitle.trim()) return toast.error("Title is required");
    const { error } = await supabase.from("team_workspaces").insert({ owner_id: user!.id, title: newTitle, description: newDesc || null, industry: newIndustry, role: "buyer", transaction_id: newTxId || null } as any);
    if (error) return toast.error(error.message);
    toast.success("Procurement workspace created");
    setShowCreate(false); setNewTitle(""); setNewDesc(""); fetchWorkspaces();
  };

  const addMember = async () => {
    if (!memberUserId.trim() || !selectedWs) return toast.error("User ID required");
    const { error } = await supabase.from("team_members").insert({ workspace_id: selectedWs.id, user_id: memberUserId, display_name: memberName || null, added_by: user!.id } as any);
    if (error) return toast.error(error.message);
    toast.success("Member added"); setShowAddMember(false); setMemberUserId(""); setMemberName(""); fetchMembers(selectedWs.id);
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
    const { error } = await supabase.from("team_task_assignments").insert({ workspace_id: selectedWs.id, member_id: taskMemberId, milestone_key: taskKey, milestone_label: taskLabel || taskKey, instructions: taskInstructions || null, sort_order: tasks.length } as any);
    if (error) return toast.error(error.message);
    toast.success("Task assigned"); setShowAssignTask(false); setTaskKey(""); setTaskLabel(""); setTaskInstructions(""); fetchTasks(selectedWs.id);
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

  if (selectedWs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedWs(null)}>← Back</Button>
            <h1 className="text-2xl font-bold mt-2">{selectedWs.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{selectedWs.industry}</Badge>
              <Badge className={selectedWs.status === "active" ? "bg-primary" : selectedWs.status === "complete" ? "bg-green-600" : "bg-destructive"}>{selectedWs.status}</Badge>
            </div>
            {selectedWs.description && <p className="text-sm text-muted-foreground mt-2">{selectedWs.description}</p>}
          </div>
          {selectedWs.status === "active" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "complete", id: selectedWs.id, label: "Mark as Complete" })}><CheckCircle2 className="w-4 h-4 mr-1" /> Complete</Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: "dissolve", id: selectedWs.id, label: "Dissolve Work Order" })}><XCircle className="w-4 h-4 mr-1" /> Dissolve</Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Procurement Team</CardTitle>
            {selectedWs.status === "active" && <Button size="sm" onClick={() => setShowAddMember(true)}><UserPlus className="w-4 h-4 mr-1" /> Add Member</Button>}
          </CardHeader>
          <CardContent>
            {members.length === 0 ? <p className="text-sm text-muted-foreground">No members added yet.</p> : (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm">{m.display_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Finalizer</Label>
                        <Switch checked={m.can_finalize} onCheckedChange={() => toggleFinalize(m.id, m.can_finalize)} disabled={selectedWs.status !== "active"} />
                      </div>
                      {selectedWs.status === "active" && (
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setConfirmAction({ type: "remove_member", id: m.id, label: `Remove ${m.display_name || "member"}` })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Task Assignments</CardTitle>
            {selectedWs.status === "active" && <Button size="sm" onClick={() => setShowAssignTask(true)}><ClipboardList className="w-4 h-4 mr-1" /> Assign Task</Button>}
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks assigned yet.</p> : (
              <div className="space-y-2">
                {tasks.map((t, i) => {
                  const member = members.find((m) => m.id === t.member_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground w-6">{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{t.milestone_label || t.milestone_key}</p>
                          <p className="text-xs text-muted-foreground">Assigned to: {member?.display_name || "Unknown"}</p>
                          {t.instructions && <p className="text-xs text-muted-foreground mt-1 italic">{t.instructions}</p>}
                        </div>
                      </div>
                      <Badge variant={t.status === "completed" ? "default" : t.status === "in_progress" ? "secondary" : "outline"}>{t.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Templates */}
        <TeamTemplateManager
          workspaceId={selectedWs.id}
          members={members.map((m) => ({ id: m.id, display_name: m.display_name, user_id: m.user_id }))}
          disabled={selectedWs.status !== "active"}
        />

        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>User ID</Label><Input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="Paste member's user ID" /></div>
              <div><Label>Display Name</Label><Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. Jane — Inspector" /></div>
            </div>
            <DialogFooter><Button onClick={addMember}>Add Member</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignTask} onOpenChange={setShowAssignTask}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Assign To</Label><Select value={taskMemberId} onValueChange={setTaskMemberId}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m) => (<SelectItem key={m.id} value={m.id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>Milestone Key</Label><Input value={taskKey} onChange={(e) => setTaskKey(e.target.value)} placeholder="e.g. quality_inspection" /></div>
              <div><Label>Task Label</Label><Input value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="e.g. Quality Inspection" /></div>
              <div><Label>Instructions</Label><Textarea value={taskInstructions} onChange={(e) => setTaskInstructions(e.target.value)} placeholder="What should this member do?" /></div>
            </div>
            <DialogFooter><Button onClick={assignTask}>Assign</Button></DialogFooter>
          </DialogContent>
        </Dialog>

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Procurement Teams</h1>
          <p className="text-sm text-muted-foreground">Manage procurement teams and coordinate buyer-side tasks across work orders.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Workspace</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({activeWs.length})</TabsTrigger>
          <TabsTrigger value="complete">Complete ({completedWs.length})</TabsTrigger>
          <TabsTrigger value="dissolved">Dissolved ({dissolvedWs.length})</TabsTrigger>
        </TabsList>
        {["active", "complete", "dissolved"].map((status) => {
          const list = status === "active" ? activeWs : status === "complete" ? completedWs : dissolvedWs;
          return (
            <TabsContent key={status} value={status}>
              {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : list.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No {status} work orders.</CardContent></Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
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
          <DialogHeader><DialogTitle>Create Procurement Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Cocoa Import Q3" /></div>
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

export default BuyerTeams;

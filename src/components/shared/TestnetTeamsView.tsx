/**
 * TestnetTeamsView — Interactive Team Lead simulation for testnet mode.
 * Shows pre-populated workspaces with members, tasks, activity log, and full CRUD.
 * Tasks are categorized by order number — never bundled across orders.
 */
import { useState, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Users, Trash2, UserPlus, CheckCircle2, XCircle, AlertTriangle,
  ClipboardList, RotateCcw, Upload, Clock, Shield, FileText, Activity,
  Hash, Eye, MessageSquare, Copy, Link, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { useTestnetTeams } from "@/hooks/useTestnetTeams";

const INDUSTRIES = [
  { key: "mining", label: "Mining" }, { key: "agriculture", label: "Agriculture" },
  { key: "construction", label: "Construction" }, { key: "real_estate", label: "Real Estate" },
  { key: "tourism", label: "Tourism" }, { key: "retail", label: "Retail" },
  { key: "freelance", label: "Freelance" }, { key: "logistics", label: "Logistics" },
  { key: "education", label: "Education" }, { key: "project_management", label: "Project Management" },
];

const LANGUAGES = [
  { code: "en", label: "English" }, { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" }, { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" }, { code: "es", label: "Español" },
];

interface TestnetTeamsViewProps {
  testnet: ReturnType<typeof useTestnetTeams>;
  role: "vendor" | "buyer";
}

const TestnetTeamsView = ({ testnet, role }: TestnetTeamsViewProps) => {
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [tab, setTab] = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [showCompleteTask, setShowCompleteTask] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<{ title: string; detail: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; label: string } | null>(null);
  const [wsTab, setWsTab] = useState<"tasks" | "members" | "chat" | "log">("tasks");

  // Chat simulation
  type ChatMsg = { id: string; sender: string; body: string; timestamp: string };
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMsg[]>>(() => {
    try {
      const saved = localStorage.getItem("tl_testnet_team_chat");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "ws-mining-1": [
        { id: "cm1", sender: "Kwame Asante", body: "Survey uploaded. GPS coords attached — check the evidence file.", timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
        { id: "cm2", sender: "Fatima Diallo", body: "Assay results confirm 3.2g/t gold grade. Ready for export docs.", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
        { id: "cm3", sender: "David Okonkwo", body: "I've contacted the trucking company. Waiting on insurance quote.", timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
        { id: "cm4", sender: "Team Lead", body: "Great progress everyone. Amina, please prioritize the EPA clearance.", timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
      ],
      "ws-agri-1": [
        { id: "cm5", sender: "Grace Nyambura", body: "Harvest schedule confirmed for next week. Labor team ready.", timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
        { id: "cm6", sender: "Pierre Dumont", body: "I'll need 48h for moisture testing once harvest arrives.", timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
      ],
      "ws-constr-1": [
        { id: "cm7", sender: "Ibrahim Toure", body: "All 3 quotes received. Recommended supplier: Dangote Cement.", timestamp: new Date(Date.now() - 8 * 86400000).toISOString() },
        { id: "cm8", sender: "Carlos Silva", body: "Foundation pour scheduled for Monday. Need weather clearance.", timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
      ],
    };
  });
  const [chatInput, setChatInput] = useState("");

  // Invite codes
  const [inviteCodes, setInviteCodes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("tl_testnet_invite_codes");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "ws-mining-1": "TL-INV-MIN-7X4K",
      "ws-agri-1": "TL-INV-AGR-9P2M",
      "ws-constr-1": "TL-INV-CON-3R8W",
      "ws-realestate-1": "TL-INV-RE-5N6J",
    };
  });
  const [inviteCopied, setInviteCopied] = useState(false);

  // Create form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIndustry, setNewIndustry] = useState("mining");

  // Add member form
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberLang, setMemberLang] = useState("en");

  // Assign task form
  const [taskMemberId, setTaskMemberId] = useState("");
  const [taskKey, setTaskKey] = useState("");
  const [taskLabel, setTaskLabel] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskSlaHours, setTaskSlaHours] = useState("");

  // Complete task form
  const [evidenceName, setEvidenceName] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const { workspaces, getMembers, getTasks, getPresets, getActivityLog, createWorkspace, addMember, removeMember, toggleFinalize, assignTask, completeTask, updateWorkspaceStatus, resetTeams } = testnet;

  const selectedWs = workspaces.find(w => w.id === selectedWsId) || null;
  const members = selectedWsId ? getMembers(selectedWsId).filter(m => !m.removed_at) : [];
  const tasks = selectedWsId ? getTasks(selectedWsId) : [];
  const presets = selectedWs ? getPresets(selectedWs.industry) : [];
  const wsLog = selectedWsId ? getActivityLog(selectedWsId) : [];

  const activeWs = workspaces.filter(w => w.status === "active");
  const completedWs = workspaces.filter(w => w.status === "complete");
  const dissolvedWs = workspaces.filter(w => w.status === "dissolved");

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.round(diffH / 24);
    return `${diffD}d ago`;
  };

  const actionIcon = (action: string) => {
    if (action.includes("completed")) return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
    if (action.includes("assigned")) return <ClipboardList className="w-3.5 h-3.5 text-primary" />;
    if (action.includes("added")) return <UserPlus className="w-3.5 h-3.5 text-blue-500" />;
    if (action.includes("removed")) return <Trash2 className="w-3.5 h-3.5 text-destructive" />;
    if (action.includes("created")) return <Plus className="w-3.5 h-3.5 text-primary" />;
    if (action.includes("complete") || action.includes("dissolved")) return <Shield className="w-3.5 h-3.5 text-amber-500" />;
    return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  // ─── Selected Workspace Detail View ───
  if (selectedWs) {
    const completedCount = tasks.filter(t => t.status === "completed").length;
    const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
    const completingTask = showCompleteTask ? tasks.find(t => t.id === showCompleteTask) : null;
    const completingMember = completingTask ? members.find(m => m.id === completingTask.member_id) : null;

    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedWsId(null); setWsTab("tasks"); }}>← Back</Button>
            <h1 className="text-xl sm:text-2xl font-bold mt-2">{selectedWs.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1"><Hash className="w-3 h-3" />{selectedWs.order_number}</Badge>
              <Badge variant="outline">{selectedWs.industry}</Badge>
              <Badge className={cn(
                selectedWs.status === "active" ? "bg-primary" : selectedWs.status === "complete" ? "bg-green-600" : "bg-destructive"
              )}>{selectedWs.status}</Badge>
              <Badge variant="secondary" className="text-[10px]">TESTNET</Badge>
            </div>
            {selectedWs.description && <p className="text-sm text-muted-foreground mt-2">{selectedWs.description}</p>}
          </div>
          {selectedWs.status === "active" && (
            <div className="flex gap-2 self-start flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: "complete", id: selectedWs.id, label: "Mark as Complete" })}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: "dissolve", id: selectedWs.id, label: "Dissolve Work Order" })}>
                <XCircle className="w-4 h-4 mr-1" /> Dissolve
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Workflow Progress</span>
              <span className="text-sm text-muted-foreground">{completedCount}/{tasks.length} tasks</span>
            </div>
            <Progress value={progress} className="h-2" />
            {progress === 100 && tasks.length > 0 && (
              <p className="text-xs text-green-600 mt-2 font-medium">🎉 All tasks completed — ready to finalize work order</p>
            )}
          </CardContent>
        </Card>

        {/* Inner Tabs: Tasks / Members / Chat / Activity Log */}
        <Tabs value={wsTab} onValueChange={v => setWsTab(v as any)}>
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="tasks" className="flex-1 sm:flex-none gap-1"><ClipboardList className="w-3.5 h-3.5" /> Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="members" className="flex-1 sm:flex-none gap-1"><Users className="w-3.5 h-3.5" /> Team ({members.length})</TabsTrigger>
            <TabsTrigger value="chat" className="flex-1 sm:flex-none gap-1"><MessageSquare className="w-3.5 h-3.5" /> Chat</TabsTrigger>
            <TabsTrigger value="log" className="flex-1 sm:flex-none gap-1"><Activity className="w-3.5 h-3.5" /> Log ({wsLog.length})</TabsTrigger>
          </TabsList>

          {/* ── Tasks Tab ── */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Task Pipeline</CardTitle>
                {selectedWs.status === "active" && (
                  <Button size="sm" onClick={() => setShowAssignTask(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Assign Task
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks assigned yet. Click "Assign Task" to start.</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((t, i) => {
                      const member = members.find(m => m.id === t.member_id);
                      const allPriorDone = tasks.filter(pt => pt.sort_order < t.sort_order).every(pt => pt.status === "completed");
                      const isBlocked = t.status === "pending" && !allPriorDone;
                      const canAct = t.status === "pending" && allPriorDone && selectedWs.status === "active";

                      return (
                        <div key={t.id} className={cn(
                          "p-3 rounded-lg border transition-colors",
                          t.status === "completed" ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/10" :
                          isBlocked ? "border-border bg-muted/30 opacity-60" :
                          canAct ? "border-primary/40 bg-primary/5" : "border-border"
                        )}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                                t.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                canAct ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                              )}>
                                {t.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{t.milestone_label || t.milestone_key}</p>
                                <p className="text-xs text-muted-foreground">
                                  Assigned to: <strong>{member?.display_name || "Unassigned"}</strong>
                                </p>
                                {t.instructions && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">"{t.instructions}"</p>
                                )}
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {t.sla_hours && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> SLA: {t.sla_hours}h
                                    </span>
                                  )}
                                  {t.evidence_url && (
                                    <span className="text-[10px] text-green-600 flex items-center gap-1 cursor-pointer" onClick={() => setShowResult({ title: t.milestone_label || t.milestone_key, detail: `Evidence: ${t.evidence_url}\nCompleted by: ${member?.display_name || "Team Member"}\nOrder: ${selectedWs.order_number}` })}>
                                      <FileText className="w-3 h-3" /> Evidence ↗
                                    </span>
                                  )}
                                  {isBlocked && (
                                    <span className="text-[10px] text-amber-600 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Blocked — prior task incomplete
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <Badge variant={t.status === "completed" ? "default" : "outline"} className={cn(
                                "text-[10px]",
                                t.status === "completed" && "bg-green-600"
                              )}>
                                {t.status === "completed" ? "Done" : canAct ? "Ready" : "Pending"}
                              </Badge>
                              {t.status === "completed" && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowResult({ title: t.milestone_label || t.milestone_key, detail: `✅ Task completed successfully\n\nEvidence: ${t.evidence_url || "N/A"}\nAssigned to: ${member?.display_name || "Unknown"}\nOrder: ${selectedWs.order_number}\nSLA: ${t.sla_hours || "N/A"}h` })}>
                                  <Eye className="w-3 h-3 mr-1" /> View
                                </Button>
                              )}
                              {canAct && (
                                <Button size="sm" className="h-7 text-xs" onClick={() => { setShowCompleteTask(t.id); setEvidenceName(""); setEvidenceNotes(""); setEvidenceFile(null); }}>
                                  <Upload className="w-3 h-3 mr-1" /> Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Members Tab ── */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" /> Team Members
                </CardTitle>
                {selectedWs.status === "active" && (
                  <Button size="sm" onClick={() => setShowAddMember(true)}>
                    <UserPlus className="w-4 h-4 mr-1" /> Add Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map(m => {
                      const memberTasks = tasks.filter(t => t.member_id === m.id);
                      const memberDone = memberTasks.filter(t => t.status === "completed").length;
                      return (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border gap-2">
                          <div>
                            <p className="font-medium text-sm">{m.display_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.role} · {LANGUAGES.find(l => l.code === m.preferred_language)?.label || "English"}
                              {memberTasks.length > 0 && <span className="ml-2">· {memberDone}/{memberTasks.length} tasks done</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Finalizer</Label>
                              <Switch
                                checked={m.can_finalize}
                                onCheckedChange={() => toggleFinalize(selectedWs.id, m.id)}
                                disabled={selectedWs.status !== "active"}
                              />
                            </div>
                            {m.can_finalize && <Badge className="bg-primary/15 text-primary text-[9px]">Can Release</Badge>}
                            {selectedWs.status === "active" && (
                              <Button size="icon" variant="ghost" className="text-destructive"
                                onClick={() => setConfirmAction({ type: "remove_member", id: m.id, label: `Remove ${m.display_name || "member"}` })}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
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

          {/* ── Activity Log Tab ── */}
          <TabsContent value="log">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Workflow Activity Log
                  <Badge variant="secondary" className="text-[10px]">{selectedWs.order_number}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wsLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
                ) : (
                  <div className="space-y-0 relative">
                    <div className="absolute left-[17px] top-3 bottom-3 w-px bg-border" />
                    {wsLog.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3 py-2.5 relative">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                          {actionIcon(entry.action)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm"><strong>{entry.actor}</strong> · <span className="text-muted-foreground">{entry.action.replace(/_/g, " ")}</span></p>
                          <p className="text-xs text-muted-foreground">{entry.detail}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(entry.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Complete Task Dialog ── */}
        <Dialog open={!!showCompleteTask} onOpenChange={() => setShowCompleteTask(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Complete Task</DialogTitle></DialogHeader>
            {completingTask && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-medium">{completingTask.milestone_label || completingTask.milestone_key}</p>
                  <p className="text-xs text-muted-foreground">Assigned to: {completingMember?.display_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">Order: {selectedWs.order_number}</p>
                </div>
                <div>
                  <Label className="text-sm">Evidence Name</Label>
                  <Input value={evidenceName} onChange={e => setEvidenceName(e.target.value)} placeholder="e.g. inspection_report_march_2026.pdf" />
                </div>
                <div>
                  <Label className="text-sm">Upload Evidence (optional)</Label>
                  <p className="text-xs text-muted-foreground mb-2">Upload photo, report, or document as proof.</p>
                  <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> {evidenceFile ? evidenceFile.name : "Choose File"}
                  </Button>
                </div>
                <div>
                  <Label className="text-sm">Completion Notes</Label>
                  <Textarea value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} placeholder="Any notes about this task completion..." />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteTask(null)}>Cancel</Button>
              <Button onClick={() => {
                if (!showCompleteTask || !selectedWs) return;
                const evName = evidenceName || evidenceFile?.name || "evidence_uploaded.pdf";
                completeTask(selectedWs.id, showCompleteTask, evName, completingMember?.display_name || undefined);
                setShowCompleteTask(null);
                setShowResult({
                  title: "Task Completed Successfully",
                  detail: `✅ ${completingTask?.milestone_label || "Task"}\n\nEvidence: ${evName}\nCompleted by: ${completingMember?.display_name || "Team Member"}\nOrder: ${selectedWs.order_number}\n${evidenceNotes ? `\nNotes: ${evidenceNotes}` : ""}\n\nThis has been logged in the Team Lead's activity log.`
                });
              }}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Result / Evidence View Dialog ── */}
        <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> {showResult?.title}</DialogTitle></DialogHeader>
            <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border border-border">{showResult?.detail}</pre>
            <DialogFooter>
              <Button onClick={() => setShowResult(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Display Name</Label><Input value={memberName} onChange={e => setMemberName(e.target.value)} placeholder="e.g. Jane Doe — Inspector" /></div>
              {presets.length > 0 && (
                <div>
                  <Label>Role Preset</Label>
                  <Select value={memberRole} onValueChange={setMemberRole}>
                    <SelectTrigger><SelectValue placeholder="Select industry role" /></SelectTrigger>
                    <SelectContent>{presets.map(r => <SelectItem key={r.role_key} value={r.role_key}>{r.role_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Preferred Language</Label>
                <Select value={memberLang} onValueChange={setMemberLang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                if (!memberName.trim()) return toast.error("Name required");
                addMember(selectedWs.id, memberName, memberRole || "member", memberLang);
                setShowAddMember(false); setMemberName(""); setMemberRole(""); setMemberLang("en");
              }}>Add Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Task Dialog */}
        <Dialog open={showAssignTask} onOpenChange={setShowAssignTask}>
          <DialogContent>
            <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground">Order: <strong>{selectedWs.order_number}</strong> — tasks are scoped to this order only.</p>
            <div className="space-y-4">
              <div>
                <Label>Assign To</Label>
                <Select value={taskMemberId} onValueChange={setTaskMemberId}>
                  <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.display_name || m.user_id}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Task Key</Label><Input value={taskKey} onChange={e => setTaskKey(e.target.value)} placeholder="e.g. assay_report" /></div>
              <div><Label>Task Label</Label><Input value={taskLabel} onChange={e => setTaskLabel(e.target.value)} placeholder="e.g. Submit Assay Report" /></div>
              <div><Label>Instructions</Label><Textarea value={taskInstructions} onChange={e => setTaskInstructions(e.target.value)} placeholder="What should this member do?" /></div>
              <div><Label>SLA (hours)</Label><Input type="number" value={taskSlaHours} onChange={e => setTaskSlaHours(e.target.value)} placeholder="e.g. 48" /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                if (!taskMemberId || !taskKey) return toast.error("Fill required fields");
                assignTask(selectedWs.id, taskMemberId, taskKey, taskLabel || taskKey, taskInstructions, taskSlaHours ? parseInt(taskSlaHours) : undefined);
                setShowAssignTask(false); setTaskKey(""); setTaskLabel(""); setTaskInstructions(""); setTaskSlaHours(""); setTaskMemberId("");
              }}>Assign Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Confirm Action</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to: <strong>{confirmAction?.label}</strong>?</p>
            <p className="text-xs text-muted-foreground">Order: {selectedWs.order_number}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (confirmAction?.type === "complete") {
                  updateWorkspaceStatus(selectedWs.id, "complete");
                  setShowResult({ title: "Work Order Completed", detail: `✅ Order ${selectedWs.order_number} has been marked as complete.\n\nAll activities have been logged.\n${tasks.filter(t => t.status === "completed").length}/${tasks.length} tasks completed.\n\nThis order will be auto-archived after 90 days.` });
                  setSelectedWsId(null);
                } else if (confirmAction?.type === "dissolve") {
                  updateWorkspaceStatus(selectedWs.id, "dissolved");
                  setShowResult({ title: "Work Order Dissolved", detail: `⚠️ Order ${selectedWs.order_number} has been dissolved.\n\nAll activities have been logged.\nNo further task completions are possible.\n\nThis order will be auto-archived after 90 days.` });
                  setSelectedWsId(null);
                } else if (confirmAction?.type === "remove_member") {
                  removeMember(selectedWs.id, confirmAction.id);
                }
                setConfirmAction(null);
              }}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Workspace List View ───
  const allLog = getActivityLog();
  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Teams</h1>
          <p className="text-sm text-muted-foreground">
            {role === "vendor" ? "Manage work order teams and assign industry-specific tasks." : "Manage procurement teams and track supplier workflows."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetTeams}><RotateCcw className="w-4 h-4 mr-1" /> Reset</Button>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> New Workspace</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">Active ({activeWs.length})</TabsTrigger>
          <TabsTrigger value="complete" className="flex-1 sm:flex-none">Complete ({completedWs.length})</TabsTrigger>
          <TabsTrigger value="dissolved" className="flex-1 sm:flex-none">Dissolved ({dissolvedWs.length})</TabsTrigger>
          <TabsTrigger value="master_log" className="flex-1 sm:flex-none gap-1"><Activity className="w-3.5 h-3.5" /> Master Log</TabsTrigger>
        </TabsList>

        {["active", "complete", "dissolved"].map(status => {
          const list = status === "active" ? activeWs : status === "complete" ? completedWs : dissolvedWs;
          return (
            <TabsContent key={status} value={status}>
              {list.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No {status} work orders.</CardContent></Card>
              ) : (
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {list.map(ws => {
                    const wsTasks = getTasks(ws.id);
                    const wsMembers = getMembers(ws.id).filter(m => !m.removed_at);
                    const done = wsTasks.filter(t => t.status === "completed").length;
                    return (
                      <Card key={ws.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedWsId(ws.id)}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{ws.title}</CardTitle>
                            <Badge variant="outline">{ws.industry}</Badge>
                          </div>
                          <Badge variant="secondary" className="w-fit text-[10px] flex items-center gap-1"><Hash className="w-3 h-3" />{ws.order_number}</Badge>
                        </CardHeader>
                        <CardContent>
                          {ws.description && <p className="text-sm text-muted-foreground line-clamp-2">{ws.description}</p>}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {wsMembers.length} members</span>
                            <span className="flex items-center gap-1"><ClipboardList className="w-3 h-3" /> {done}/{wsTasks.length} tasks</span>
                          </div>
                          {wsTasks.length > 0 && (
                            <Progress value={(done / wsTasks.length) * 100} className="h-1.5 mt-2" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}

        {/* ── Master Activity Log ── */}
        <TabsContent value="master_log">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" /> Master Workflow Log
                <Badge variant="secondary" className="text-[10px]">All Orders</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Order #</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="hidden sm:table-cell">Detail</TableHead>
                        <TableHead className="w-[80px]">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allLog.slice(0, 50).map(entry => (
                        <TableRow key={entry.id} className="cursor-pointer" onClick={() => {
                          const ws = workspaces.find(w => w.id === entry.workspace_id);
                          if (ws) setSelectedWsId(ws.id);
                        }}>
                          <TableCell><Badge variant="outline" className="text-[9px]">{entry.order_number}</Badge></TableCell>
                          <TableCell className="text-sm">{entry.actor}</TableCell>
                          <TableCell className="flex items-center gap-1 text-sm">{actionIcon(entry.action)} {entry.action.replace(/_/g, " ")}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{entry.detail}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Team Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Gold Export Order #42" /></div>
            <div>
              <Label>Industry</Label>
              <Select value={newIndustry} onValueChange={setNewIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map(ind => <SelectItem key={ind.key} value={ind.key}>{ind.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!newTitle.trim()) return toast.error("Title required");
              createWorkspace(newTitle, newIndustry, newDesc);
              setShowCreate(false); setNewTitle(""); setNewDesc("");
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog (used after completing/dissolving from list) */}
      <Dialog open={!!showResult} onOpenChange={() => setShowResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> {showResult?.title}</DialogTitle></DialogHeader>
          <pre className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border border-border">{showResult?.detail}</pre>
          <DialogFooter>
            <Button onClick={() => setShowResult(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestnetTeamsView;

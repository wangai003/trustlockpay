import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, RotateCcw, Crown, Copy, Check, ArrowDown, Building2, Star, ArrowRightLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENTS } from "@/lib/adminDepartments";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const TESTNET_CHIEF_ADMIN_ID = "a0ac136f-de82-45bd-8219-0fc5ab25d098";

function callStaffApi(body: Record<string, unknown>) {
  return fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: API_KEY },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

function getChiefAdminId(): string {
  try {
    const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
    if (auth.adminId) return auth.adminId;
    if (auth.id) return auth.id;
    if (auth.isChief === true && localStorage.getItem("tl_network") === "testnet") {
      return TESTNET_CHIEF_ADMIN_ID;
    }
    return "";
  } catch {
    return "";
  }
}

interface AdminAccount {
  id: string;
  username: string;
  name: string;
  email: string | null;
  is_setup: boolean;
  is_deleted: boolean;
  is_chief: boolean;
  is_team_lead: boolean;
  chief_rank: number | null;
  deleted_at: string | null;
  reinstated_at: string | null;
  created_at: string;
  department_slug?: string;
}

// Testnet mock staff for simulation
const TESTNET_MOCK_STAFF: AdminAccount[] = [
  { id: "a0ac136f-de82-45bd-8219-0fc5ab25d098", username: "michael.tl", name: "Michael", email: "michael@trustlock.co", is_setup: true, is_deleted: false, is_chief: true, is_team_lead: false, chief_rank: 1, deleted_at: null, reinstated_at: null, created_at: "2025-01-15T00:00:00Z", department_slug: "executive" },
  { id: "staff-david-001", username: "david.tl", name: "David", email: "david@trustlock.co", is_setup: true, is_deleted: false, is_chief: false, is_team_lead: true, chief_rank: null, deleted_at: null, reinstated_at: null, created_at: "2025-02-01T00:00:00Z", department_slug: "correspondence" },
  { id: "staff-emmanuel-001", username: "emmanuel.tl", name: "Emmanuel", email: "emmanuel@trustlock.co", is_setup: true, is_deleted: false, is_chief: false, is_team_lead: false, chief_rank: null, deleted_at: null, reinstated_at: null, created_at: "2025-02-10T00:00:00Z", department_slug: "operations" },
  { id: "staff-sarah-001", username: "sarah.tl", name: "Sarah", email: null, is_setup: false, is_deleted: false, is_chief: false, is_team_lead: false, chief_rank: null, deleted_at: null, reinstated_at: null, created_at: "2026-03-20T00:00:00Z", department_slug: "compliance" },
  { id: "staff-kwame-001", username: "kwame.tl", name: "Kwame", email: "kwame@trustlock.co", is_setup: true, is_deleted: true, is_chief: false, is_team_lead: false, chief_rank: null, deleted_at: "2026-03-01T00:00:00Z", reinstated_at: null, created_at: "2025-06-01T00:00:00Z", department_slug: "finance" },
];

function isTestnetMode(): boolean {
  return localStorage.getItem("tl_network") === "testnet";
}

export default function AdminStaffManager() {
  const qc = useQueryClient();
  const chiefAdminId = getChiefAdminId();
  const missingChiefSession = !chiefAdminId;
  const isTestnet = isTestnetMode();

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDepartment, setNewDepartment] = useState("operations");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tempPwResult, setTempPwResult] = useState<{ username: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generatedDisplayName = [newFirstName.trim(), newLastName.trim()].filter(Boolean).join(" ");

  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(0);
  const [reinstateTarget, setReinstateTarget] = useState<AdminAccount | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<AdminAccount | null>(null);
  const [demoteTarget, setDemoteTarget] = useState<AdminAccount | null>(null);

  // Testnet local state for mock staff
  const [testnetStaff, setTestnetStaff] = useState<AdminAccount[]>(() => {
    if (!isTestnet) return [];
    try {
      const saved = localStorage.getItem("tl_testnet_admin_staff");
      if (saved) return JSON.parse(saved);
    } catch {}
    return TESTNET_MOCK_STAFF;
  });

  const saveTestnetStaff = (staff: AdminAccount[]) => {
    setTestnetStaff(staff);
    localStorage.setItem("tl_testnet_admin_staff", JSON.stringify(staff));
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-staff-list", chiefAdminId],
    queryFn: () => callStaffApi({ action: "list", chiefAdminId }),
    enabled: !missingChiefSession && !isTestnet,
  });

  const accounts: AdminAccount[] = isTestnet ? testnetStaff : (data?.accounts || []);
  const callerRank: number | null = isTestnet ? 1 : (data?.callerRank ?? null);
  const isOriginalChief = callerRank === 1;

  const activeAccounts = accounts.filter((a) => !a.is_deleted);
  const deletedAccounts = accounts.filter((a) => a.is_deleted);

  // Auto-generate username from first + last name (firstname.lastname.tl)
  const generatedUsername = (() => {
    const f = newFirstName.trim().toLowerCase().replace(/[^a-z]/g, "");
    const l = newLastName.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!f || !l) return "";
    let base = `${f}.${l}.tl`;
    const usernames = new Set(accounts.map((a) => a.username));
    if (!usernames.has(base)) return base;
    let counter = 2;
    while (usernames.has(`${f}.${l}${counter}.tl`)) counter++;
    return `${f}.${l}${counter}.tl`;
  })();

  const addMutation = useMutation({
    mutationFn: () => {
      const username = generatedUsername;
      const name = generatedDisplayName;
      if (isTestnet) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
        const tempPw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const newAccount: AdminAccount = {
          id: `staff-${Date.now()}`, username, name,
          email: null, is_setup: false, is_deleted: false, is_chief: false, is_team_lead: false, chief_rank: null,
          deleted_at: null, reinstated_at: null, created_at: new Date().toISOString(),
          department_slug: newDepartment,
        };
        const updated = [...testnetStaff, newAccount];
        saveTestnetStaff(updated);
        return Promise.resolve({ account: { username: newAccount.username, temp_password: tempPw } });
      }
      return callStaffApi({ action: "add", chiefAdminId, username, name, departmentSlug: newDepartment });
    },
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      setTempPwResult({ username: res.account.username, temp_password: res.account.temp_password });
      setShowAddDialog(false);
      setNewFirstName("");
      setNewLastName("");
      if (!isTestnet) qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adminId: string) => {
      if (isTestnet) {
        const updated = testnetStaff.map(a => a.id === adminId ? { ...a, is_deleted: true, deleted_at: new Date().toISOString() } : a);
        saveTestnetStaff(updated);
        return Promise.resolve({});
      }
      return callStaffApi({ action: "delete", chiefAdminId, adminId });
    },
    onSuccess: (res: any) => {
      if (res?.error) { toast.error(res.error); return; }
      setDeleteTarget(null);
      setConfirmDeleteStep(0);
      if (!isTestnet) qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff deleted");
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: (adminId: string) => {
      if (isTestnet) {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&";
        const tempPw = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const updated = testnetStaff.map(a => a.id === adminId ? { ...a, is_deleted: false, deleted_at: null, reinstated_at: new Date().toISOString(), is_setup: false, email: null } : a);
        saveTestnetStaff(updated);
        return Promise.resolve({ temp_password: tempPw });
      }
      return callStaffApi({ action: "reinstate", chiefAdminId, adminId });
    },
    onSuccess: (res: any) => {
      if (res?.error) { toast.error(res.error); return; }
      setTempPwResult({ username: reinstateTarget?.username || "", temp_password: res.temp_password });
      setReinstateTarget(null);
      if (!isTestnet) qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff reinstated");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (adminId: string) => {
      if (isTestnet) {
        const updated = testnetStaff.map(a => a.id === adminId ? { ...a, is_chief: true, chief_rank: 2 } : a);
        saveTestnetStaff(updated);
        return Promise.resolve({});
      }
      return callStaffApi({ action: "promote", chiefAdminId, adminId });
    },
    onSuccess: (res: any) => {
      if (res?.error) { toast.error(res.error); return; }
      setPromoteTarget(null);
      if (!isTestnet) qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Promoted to Chief Admin");
    },
  });

  const demoteMutation = useMutation({
    mutationFn: (adminId: string) => {
      if (isTestnet) {
        const updated = testnetStaff.map(a => a.id === adminId ? { ...a, is_chief: false, chief_rank: null } : a);
        saveTestnetStaff(updated);
        return Promise.resolve({});
      }
      return callStaffApi({ action: "demote", chiefAdminId, adminId });
    },
    onSuccess: (res: any) => {
      if (res?.error) { toast.error(res.error); return; }
      setDemoteTarget(null);
      if (!isTestnet) qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Demoted to regular staff");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRankLabel = (rank: number | null) => {
    if (rank === 1) return "Original Chief";
    if (rank === 2) return "Chief";
    return "";
  };

  if (missingChiefSession && !isTestnet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin session needs refresh</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your chief admin session is missing its identity. Sign out and sign back in to access staff management.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !isTestnet) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load staff management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The chief-only staff service rejected this session. Refresh your login and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Testnet Banner */}
      {isTestnet && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">🧪 Testnet Mode — Simulated staff data. All actions are local.</p>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => { saveTestnetStaff(TESTNET_MOCK_STAFF); toast.success("Staff data reset"); }}>
            Reset Data
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Admin Staff Management</h2>
          <p className="text-sm text-muted-foreground">
            {isOriginalChief
              ? "Full control: add, remove, reinstate, and promote admin staff"
              : "You can add new staff. Delete, reinstate, and promote require the original Chief Admin."}
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {/* Active Staff */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Active Staff ({activeAccounts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {activeAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.name}</span>
                  {a.is_chief && (
                    <Badge variant="default" className="text-[10px] gap-1">
                      <Crown className="w-3 h-3" /> {getRankLabel(a.chief_rank)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{a.username}{a.email ? ` · ${a.email}` : ""}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {a.is_setup ? (
                    <Badge variant="secondary" className="text-[10px]">Setup Complete</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Awaiting Setup</Badge>
                  )}
                  {a.reinstated_at && <Badge variant="outline" className="text-[10px]">Reinstated</Badge>}
                  {a.department_slug && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Building2 className="w-2.5 h-2.5" />
                      {DEPARTMENTS.find(d => d.slug === a.department_slug)?.name || a.department_slug}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {a.id !== chiefAdminId && isOriginalChief && (
                  <>
                    {!a.is_chief ? (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPromoteTarget(a)}>
                        <Crown className="w-3 h-3" /> Promote
                      </Button>
                    ) : a.chief_rank !== 1 ? (
                      <Button size="sm" variant="secondary" className="gap-1 text-xs" onClick={() => setDemoteTarget(a)}>
                        <ArrowDown className="w-3 h-3" /> Demote
                      </Button>
                    ) : null}
                    <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => { setDeleteTarget(a); setConfirmDeleteStep(1); }}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Deleted / Inactive Staff — only original chief can reinstate */}
      {deletedAccounts.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Deleted Staff ({deletedAccounts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {deletedAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 opacity-70">
                <div className="space-y-1">
                  <span className="font-medium text-sm line-through">{a.name}</span>
                  <p className="text-xs text-muted-foreground">{a.username}</p>
                  {a.deleted_at && <p className="text-[10px] text-destructive">Deleted {new Date(a.deleted_at).toLocaleDateString()}</p>}
                </div>
                {isOriginalChief && (
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setReinstateTarget(a)}>
                    <RotateCcw className="w-3 h-3" /> Reinstate
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin Staff</DialogTitle>
            <DialogDescription>Enter the recruit's name. The system will auto-generate a unique username and temporary password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="First Name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} />
            <Input placeholder="Last Name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
            {generatedUsername && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">Auto-generated username</p>
                <p className="font-mono text-sm font-bold">{generatedUsername}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Department Assignment</p>
              <Select value={newDepartment} onValueChange={setNewDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => (
                    <SelectItem key={d.slug} value={d.slug}>
                      <div className="flex flex-col">
                        <span className="text-sm">{d.name}</span>
                        <span className="text-[10px] text-muted-foreground">{d.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!generatedUsername || addMutation.isPending}>
              {addMutation.isPending ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temp Password Result Dialog */}
      <Dialog open={!!tempPwResult} onOpenChange={() => setTempPwResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Credentials</DialogTitle>
            <DialogDescription>Share these securely. The password can only be used once for initial setup.</DialogDescription>
          </DialogHeader>
          {tempPwResult && (
            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-mono text-sm font-bold">{tempPwResult.username}</p>
                <p className="text-xs text-muted-foreground mt-2">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-bold">{tempPwResult.temp_password}</p>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(tempPwResult.temp_password)}>
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-destructive">⚠ This password will not be shown again.</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setTempPwResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation — Step 1 */}
      <Dialog open={confirmDeleteStep === 1} onOpenChange={() => { setConfirmDeleteStep(0); setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin Staff</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.username})? Their credentials will be voided immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmDeleteStep(0); setDeleteTarget(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => setConfirmDeleteStep(2)}>Yes, Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation — Step 2 (Reconfirm) */}
      <Dialog open={confirmDeleteStep === 2} onOpenChange={() => { setConfirmDeleteStep(0); setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠ Reconfirm Deletion</DialogTitle>
            <DialogDescription>
              This will immediately void all credentials for <strong>{deleteTarget?.name}</strong>. They will lose access to the admin panel. This action is logged. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConfirmDeleteStep(0); setDeleteTarget(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Confirmation */}
      <Dialog open={!!reinstateTarget} onOpenChange={() => setReinstateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reinstate Admin Staff</DialogTitle>
            <DialogDescription>
              Reinstate <strong>{reinstateTarget?.name}</strong> ({reinstateTarget?.username})? A new temporary password will be generated. Their previous credentials are permanently voided.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReinstateTarget(null)}>Cancel</Button>
            <Button onClick={() => reinstateTarget && reinstateMutation.mutate(reinstateTarget.id)} disabled={reinstateMutation.isPending}>
              {reinstateMutation.isPending ? "Reinstating…" : "Reinstate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote Confirmation */}
      <Dialog open={!!promoteTarget} onOpenChange={() => setPromoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote to Chief Admin</DialogTitle>
            <DialogDescription>
              Promote <strong>{promoteTarget?.name}</strong> to Chief Admin? They will gain override powers but cannot delete, reinstate, or demote other staff — only the original Chief Admin (you) can do that.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPromoteTarget(null)}>Cancel</Button>
            <Button onClick={() => promoteTarget && promoteMutation.mutate(promoteTarget.id)} disabled={promoteMutation.isPending}>
              {promoteMutation.isPending ? "Promoting…" : "Promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Demote Confirmation */}
      <Dialog open={!!demoteTarget} onOpenChange={() => setDemoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demote to Regular Staff</DialogTitle>
            <DialogDescription>
              Demote <strong>{demoteTarget?.name}</strong> back to regular admin staff? They will lose access to sensitive data (KYC, finance, disputes, compliance) and only retain messaging and informational access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDemoteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => demoteTarget && demoteMutation.mutate(demoteTarget.id)} disabled={demoteMutation.isPending}>
              {demoteMutation.isPending ? "Demoting…" : "Demote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

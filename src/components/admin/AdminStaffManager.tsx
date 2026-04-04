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
import { UserPlus, Trash2, RotateCcw, Crown, Copy, Check, ArrowDown } from "lucide-react";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
    return auth.adminId || "";
  } catch { return ""; }
}

interface AdminAccount {
  id: string;
  username: string;
  name: string;
  email: string | null;
  is_setup: boolean;
  is_deleted: boolean;
  is_chief: boolean;
  chief_rank: number | null;
  deleted_at: string | null;
  reinstated_at: string | null;
  created_at: string;
}

export default function AdminStaffManager() {
  const qc = useQueryClient();
  const chiefAdminId = getChiefAdminId();

  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [tempPwResult, setTempPwResult] = useState<{ username: string; temp_password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);
  const [confirmDeleteStep, setConfirmDeleteStep] = useState(0);
  const [reinstateTarget, setReinstateTarget] = useState<AdminAccount | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<AdminAccount | null>(null);
  

  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: () => callStaffApi({ action: "list", chiefAdminId }),
  });

  const accounts: AdminAccount[] = data?.accounts || [];
  const callerRank: number | null = data?.callerRank ?? null;
  const isOriginalChief = callerRank === 1;

  const activeAccounts = accounts.filter((a) => !a.is_deleted);
  const deletedAccounts = accounts.filter((a) => a.is_deleted);

  const addMutation = useMutation({
    mutationFn: () => callStaffApi({ action: "add", chiefAdminId, username: newUsername.trim(), name: newName.trim() }),
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      setTempPwResult({ username: res.account.username, temp_password: res.account.temp_password });
      setShowAddDialog(false);
      setNewUsername("");
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adminId: string) => callStaffApi({ action: "delete", chiefAdminId, adminId }),
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      setDeleteTarget(null);
      setConfirmDeleteStep(0);
      qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff deleted");
    },
  });

  const reinstateMutation = useMutation({
    mutationFn: (adminId: string) => callStaffApi({ action: "reinstate", chiefAdminId, adminId }),
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      setTempPwResult({ username: reinstateTarget?.username || "", temp_password: res.temp_password });
      setReinstateTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Admin staff reinstated");
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (adminId: string) => callStaffApi({ action: "promote", chiefAdminId, adminId }),
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      setPromoteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-staff-list"] });
      toast.success("Promoted to Chief Admin");
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

  return (
    <div className="space-y-6">
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
                <div className="flex gap-1.5">
                  {a.is_setup ? (
                    <Badge variant="secondary" className="text-[10px]">Setup Complete</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Awaiting Setup</Badge>
                  )}
                  {a.reinstated_at && <Badge variant="outline" className="text-[10px]">Reinstated</Badge>}
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {a.id !== chiefAdminId && isOriginalChief && (
                  <>
                    {!a.is_chief ? (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPromoteTarget(a)}>
                        <Crown className="w-3 h-3" /> Promote
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
            <DialogDescription>A temporary password will be generated. Share it securely with the new admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Username (e.g. sarah.tl)" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            <Input placeholder="Display Name (e.g. Sarah)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!newUsername.trim() || !newName.trim() || addMutation.isPending}>
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

    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Copy, Eye, Ban, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-audit`;
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const ALL_TABLES = [
  { id: "transactions", label: "Transactions" },
  { id: "disputes", label: "Disputes" },
  { id: "compliance_flags", label: "Compliance Flags" },
  { id: "kyc_queue", label: "KYC Queue" },
  { id: "payouts", label: "Payouts" },
  { id: "payout_requests", label: "Payout Requests" },
  { id: "order_carbon_copies", label: "Order Carbon Copies" },
  { id: "tax_ledger", label: "Tax & Tariff Collections" },
];

interface AuditSession {
  id: string;
  access_token: string;
  auditor_name: string;
  auditor_email: string | null;
  allowed_tables: string[];
  can_export: boolean;
  expires_at: string;
  is_active: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
}

const AuditManager = () => {
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>(["transactions", "disputes", "compliance_flags"]);
  const [canExport, setCanExport] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState("");

  const callAudit = async (body: Record<string, unknown>) => {
    // Attach the signed-in admin's JWT — required by the edge function.
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: API_KEY,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    return res.json();
  };


  const loadSessions = async () => {
    setLoading(true);
    const result = await callAudit({ action: "list" });
    if (result.sessions) setSessions(result.sessions);
    setLoading(false);
  };

  useEffect(() => { loadSessions(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Auditor name is required"); return; }
    if (selectedTables.length === 0) { toast.error("Select at least one data category"); return; }
    setCreating(true);
    const result = await callAudit({
      action: "create",
      auditor_name: name,
      auditor_email: email || null,
      password: password || null,
      allowed_tables: selectedTables,
      can_export: canExport,
      expires_in_days: expiryDays,
    });
    if (result.success) {
      setCreatedToken(result.session.access_token);
      toast.success("Audit session created");
      loadSessions();
    } else {
      toast.error("Failed to create session");
    }
    setCreating(false);
  };

  const handleRevoke = async (sessionId: string) => {
    await callAudit({ action: "revoke", session_id: sessionId });
    toast.success("Session revoked");
    loadSessions();
  };

  const handleViewLogs = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const result = await callAudit({ action: "logs", session_id: sessionId });
    setSelectedLogs(result.logs || []);
    setLogsOpen(true);
  };

  const getAuditUrl = (token: string) => `${window.location.origin}/trustlock/audit/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getAuditUrl(token));
    toast.success("Audit link copied to clipboard");
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableId) ? prev.filter((t) => t !== tableId) : [...prev, tableId]
    );
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPassword("");
    setSelectedTables(["transactions", "disputes", "compliance_flags"]);
    setCanExport(false); setExpiryDays(30); setCreatedToken("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Auditor & Regulator Access</CardTitle>
              <CardDescription>Create time-limited, read-only access for external auditors</CardDescription>
            </div>
          </div>
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Audit Access</DialogTitle>
              </DialogHeader>

              {createdToken ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 rounded-lg p-4 text-center space-y-2">
                    <p className="text-sm font-medium">Audit link created!</p>
                    <code className="text-xs break-all block bg-background p-2 rounded">
                      {getAuditUrl(createdToken)}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1" onClick={() => copyLink(createdToken)}>
                      <Copy className="w-4 h-4" /> Copy Link
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => window.open(getAuditUrl(createdToken), "_blank")}>
                      <ExternalLink className="w-4 h-4" /> Open
                    </Button>
                  </div>
                  {password && (
                    <p className="text-xs text-muted-foreground text-center">
                      Password: <strong>{password}</strong> — share securely
                    </p>
                  )}
                  <Button variant="ghost" className="w-full" onClick={() => { resetForm(); setCreateOpen(false); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Auditor / Organization Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Central Bank Examiner" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email (optional)</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="auditor@regulator.gov" />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Password (optional)</Label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for link-only access" />
                    <p className="text-[10px] text-muted-foreground">If set, auditor must enter this password to view data</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Categories</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_TABLES.map((t) => (
                        <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedTables.includes(t.id)}
                            onCheckedChange={() => toggleTable(t.id)}
                          />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Allow Data Exports</Label>
                    <Switch checked={canExport} onCheckedChange={setCanExport} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires In</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={expiryDays} onChange={(e) => setExpiryDays(Number(e.target.value))} className="w-20" />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreate} disabled={creating}>
                    {creating ? "Creating..." : "Create Audit Session"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No audit sessions created yet. Click "New Session" to grant read-only access to regulators.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Auditor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Access</TableHead>
                  <TableHead className="text-xs">Expires</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const expired = new Date(s.expires_at) < new Date();
                  const active = s.is_active && !expired;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{s.auditor_name}</p>
                          {s.auditor_email && <p className="text-[10px] text-muted-foreground">{s.auditor_email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"} className="text-[10px]">
                          {active ? "ACTIVE" : expired ? "EXPIRED" : "REVOKED"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{s.access_count}×</span>
                          <Badge variant="outline" className="text-[10px]">
                            {s.allowed_tables.length} tables
                          </Badge>
                          {s.can_export && <Badge variant="outline" className="text-[10px]">CSV</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(s.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyLink(s.access_token)} title="Copy link">
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleViewLogs(s.id)} title="View logs">
                            <Eye className="w-3 h-3" />
                          </Button>
                          {active && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRevoke(s.id)} title="Revoke">
                              <Ban className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Access Logs Dialog */}
        <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4" /> Access Logs
              </DialogTitle>
            </DialogHeader>
            {selectedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No access recorded yet</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Time</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                      <TableHead className="text-xs">Page</TableHead>
                      <TableHead className="text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address}</TableCell>
                        <TableCell className="text-xs">{log.page_viewed}</TableCell>
                        <TableCell className="text-xs">{log.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AuditManager;

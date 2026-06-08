import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wrench, Send, ShieldAlert, CheckCircle2, AlertTriangle, Clock,
  Bot, Loader2, ArrowUpCircle, Activity, RefreshCw, Bell, Package,
  Coins, FileCheck, Zap
} from "lucide-react";

interface Preset {
  key: string;
  label: string;
  icon: any;
  description: string;
  color: string;
}

const PRESETS: Preset[] = [
  { key: "stuck_escrow", label: "Stuck Escrow", icon: Package, description: "Escrow appears frozen or non-progressing", color: "text-orange-500" },
  { key: "anchoring_failure", label: "Anchoring Failure", icon: Activity, description: "Polygon anchor failed; retry blockchain proof", color: "text-purple-500" },
  { key: "failed_payout", label: "Failed Payout", icon: Coins, description: "Vendor payout stalled or returned an error", color: "text-yellow-500" },
  { key: "kyc_stuck", label: "KYC Stuck", icon: FileCheck, description: "KYC submission pending too long", color: "text-blue-500" },
  { key: "notification_retry", label: "Notification Retry", icon: Bell, description: "Customer didn't receive a status notification", color: "text-cyan-500" },
  { key: "stale_transaction", label: "Stale Transaction Refresh", icon: RefreshCw, description: "Force-refresh transaction so UI re-syncs", color: "text-green-500" },
];

interface Ticket {
  id: string;
  ticket_type: string;
  preset_key: string | null;
  tx_id_input: string;
  status: string;
  resolution_outcome: string | null;
  diagnosis_summary: string | null;
  agent_response: string | null;
  legitimacy_score: number;
  created_at: string;
  agent_resolved_at: string | null;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  pending_validation: { label: "Validating", color: "bg-muted text-muted-foreground", icon: Loader2 },
  dispatched: { label: "Diagnosing", color: "bg-blue-500/10 text-blue-500", icon: Bot },
  agent_diagnosing: { label: "Diagnosing", color: "bg-blue-500/10 text-blue-500", icon: Bot },
  agent_resolved: { label: "Resolved", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  agent_unresolved: { label: "Unresolved", color: "bg-orange-500/10 text-orange-500", icon: AlertTriangle },
  rejected_unverified: { label: "Blocked — Unverified", color: "bg-destructive/10 text-destructive", icon: ShieldAlert },
  escalated_to_executive: { label: "Escalated to Executive", color: "bg-purple-500/10 text-purple-500", icon: ArrowUpCircle },
};

const AdminAutonomousFixer = () => {
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [txIdInput, setTxIdInput] = useState("");
  const [devNote, setDevNote] = useState("");
  const [rawMessage, setRawMessage] = useState("");
  const [fixerTxId, setFixerTxId] = useState("");
  const [fixerDevNote, setFixerDevNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("autonomous_fixer_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setTickets((data as any) || []);
  };

  useEffect(() => {
    loadTickets();
    const channel = supabase
      .channel("autonomous-fixer-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "autonomous_fixer_tickets" }, () => loadTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const submitPreset = async () => {
    if (!activePreset || !txIdInput.trim()) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.rpc("submit_autonomous_fixer_ticket", {
        _ticket_type: "preset",
        _tx_id_input: txIdInput.trim(),
        _developer_note: devNote.trim() || null,
        _preset_key: activePreset.key,
      });
      if (error) throw error;
      const res = data as any;
      setLastResult(res);
      if (res.success) {
        toast.success("Ticket dispatched to autonomous agent");
        // Trigger dispatch
        await supabase.functions.invoke("autonomous-fixer-dispatch", { body: { ticket_id: res.ticket_id } });
        setActivePreset(null);
        setTxIdInput("");
        setDevNote("");
      } else {
        toast.error(res.message || res.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const submitFixer = async () => {
    if (!fixerTxId.trim() || rawMessage.trim().length < 20) {
      toast.error("Transaction ID and a customer message (min 20 chars) are both required.");
      return;
    }
    setSubmitting(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.rpc("submit_autonomous_fixer_ticket", {
        _ticket_type: "autonomous_fixer",
        _tx_id_input: fixerTxId.trim(),
        _raw_message: rawMessage.trim(),
        _developer_note: fixerDevNote.trim() || null,
        _preset_key: null,
      });
      if (error) throw error;
      const res = data as any;
      setLastResult(res);
      if (res.success) {
        toast.success("Ticket sent to autonomous agent. No follow-up reply — you'll be notified with the outcome.");
        await supabase.functions.invoke("autonomous-fixer-dispatch", { body: { ticket_id: res.ticket_id } });
        setFixerTxId("");
        setRawMessage("");
        setFixerDevNote("");
      } else {
        toast.error(res.message || res.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Autonomous Fixer" />
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        {/* Header banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Autonomous Agent Interface
            </CardTitle>
            <CardDescription>
              Submit technical issues to TrustLock's autonomous fixer. <strong>Every submission requires a transaction ID</strong> so the agent can pinpoint the order.
              The agent validates the issue against real system signals before acting — false reports are hard-blocked and your department lead is notified.
              You will receive an automated outcome report; there is no back-and-forth conversation.
            </CardDescription>
          </CardHeader>
        </Card>

        {lastResult && (
          <Alert variant={lastResult.success ? "default" : "destructive"}>
            {lastResult.success ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            <AlertTitle>{lastResult.success ? "Submitted" : "Blocked"}</AlertTitle>
            <AlertDescription>
              {lastResult.message}
              {typeof lastResult.legitimacy_score === "number" && (
                <span className="block mt-1 text-xs opacity-80">Legitimacy score: {lastResult.legitimacy_score}/100</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="presets">
          <TabsList>
            <TabsTrigger value="presets"><Wrench className="w-4 h-4 mr-1" /> Troubleshoot Shortcuts</TabsTrigger>
            <TabsTrigger value="fixer"><Bot className="w-4 h-4 mr-1" /> Autonomous Fixer</TabsTrigger>
            <TabsTrigger value="history"><Clock className="w-4 h-4 mr-1" /> Ticket History</TabsTrigger>
          </TabsList>

          {/* ── PRESET TROUBLESHOOT BUTTONS ── */}
          <TabsContent value="presets" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preconfigured Issues</CardTitle>
                <CardDescription>One-click diagnostics for known issue patterns. The agent runs real fixes server-side.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PRESETS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.key}
                      onClick={() => setActivePreset(p)}
                      className="text-left p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <Icon className={`w-5 h-5 mb-2 ${p.color}`} />
                      <div className="font-medium text-sm">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AUTONOMOUS FIXER (FREE-FORM, ONE-WAY) ── */}
          <TabsContent value="fixer">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Send to Autonomous Agent
                </CardTitle>
                <CardDescription>
                  Use when no preset shortcut fits the customer's report. <strong>One-way submission</strong> — paste the customer's raw message exactly as received.
                  The agent diagnoses, decides whether to act, and reports back via notification.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Transaction ID <span className="text-destructive">*</span></label>
                  <Input
                    placeholder="e.g. TL-12345 or full UUID"
                    value={fixerTxId}
                    onChange={e => setFixerTxId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Raw Customer Message <span className="text-destructive">*</span> <span className="text-muted-foreground">(min 20 chars)</span></label>
                  <Textarea
                    placeholder="Paste the customer's report verbatim. Do not paraphrase or add interpretation — the agent must see the original wording."
                    value={rawMessage}
                    onChange={e => setRawMessage(e.target.value)}
                    rows={6}
                  />
                  <div className="text-[10px] text-muted-foreground mt-1">{rawMessage.length} characters</div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Developer Note <span className="text-muted-foreground">(optional, brief)</span></label>
                  <Input
                    placeholder="One-line context, e.g. 'Customer first reported via email at 14:02 UTC'"
                    value={fixerDevNote}
                    onChange={e => setFixerDevNote(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <Alert>
                  <ShieldAlert className="w-4 h-4" />
                  <AlertTitle>One-way submission</AlertTitle>
                  <AlertDescription className="text-xs">
                    The autonomous agent will not reply to follow-up messages. If diagnosis fails, you will be told to escalate to the Executive department directly.
                  </AlertDescription>
                </Alert>
                <Button onClick={submitFixer} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit to Autonomous Agent
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TICKET HISTORY ── */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Tickets</CardTitle>
                <CardDescription>Live feed of submitted tickets and their diagnoses.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-3">
                  {tickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No tickets submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {tickets.map(t => {
                        const meta = STATUS_META[t.status] || STATUS_META.pending_validation;
                        const Icon = meta.icon;
                        return (
                          <div key={t.id} className="border border-border rounded-lg p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px]">
                                    {t.ticket_type === "preset" ? `Preset: ${t.preset_key}` : "Autonomous Fixer"}
                                  </Badge>
                                  <Badge className={`text-[10px] ${meta.color}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {meta.label}
                                  </Badge>
                                </div>
                                <div className="text-xs mt-1.5 font-mono">Tx: {t.tx_id_input}</div>
                              </div>
                              <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {new Date(t.created_at).toLocaleString()}
                              </div>
                            </div>
                            {t.diagnosis_summary && (
                              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border-l-2 border-primary">
                                <strong>Agent diagnosis:</strong> {t.diagnosis_summary}
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span>Legitimacy: {t.legitimacy_score}/100</span>
                              {t.agent_resolved_at && <span>Resolved {new Date(t.agent_resolved_at).toLocaleTimeString()}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preset confirmation dialog */}
        <Dialog open={!!activePreset} onOpenChange={o => !o && setActivePreset(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {activePreset && (<><activePreset.icon className="w-5 h-5 inline mr-2" />{activePreset.label}</>)}
              </DialogTitle>
              <DialogDescription>{activePreset?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Transaction ID <span className="text-destructive">*</span></label>
                <Input
                  placeholder="e.g. TL-12345"
                  value={txIdInput}
                  onChange={e => setTxIdInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Developer Note <span className="text-muted-foreground">(optional)</span></label>
                <Input
                  placeholder="Short context — what the customer said"
                  value={devNote}
                  onChange={e => setDevNote(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setActivePreset(null)}>Cancel</Button>
              <Button onClick={submitPreset} disabled={submitting || !txIdInput.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Dispatch to Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAutonomousFixer;

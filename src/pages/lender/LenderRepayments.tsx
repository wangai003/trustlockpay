import { useState, useEffect } from "react";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DollarSign, CheckCircle2, XCircle, Clock, AlertTriangle, FileText, ExternalLink } from "lucide-react";

interface RepaymentConfirmation {
  id: string;
  application_id: string;
  vendor_id: string;
  lender_id: string;
  amount_usd: number;
  proof_url: string | null;
  proof_file_name: string | null;
  reference_number: string | null;
  notes: string | null;
  lender_response: string;
  lender_response_note: string | null;
  lender_responded_at: string | null;
  created_at: string;
}

const RESPONSE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Pending Review" },
  acknowledged: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Acknowledged" },
  disputed: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Disputed" },
};

const LenderRepayments = () => {
  const { user } = useAuth();
  const [confirmations, setConfirmations] = useState<RepaymentConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RepaymentConfirmation | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchConfirmations();
  }, [user]);

  const fetchConfirmations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("repayment_confirmations")
      .select("*")
      .eq("lender_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) toast.error("Failed to load repayments");
    setConfirmations((data || []) as RepaymentConfirmation[]);
    setLoading(false);
  };

  const handleResponse = async (action: "acknowledged" | "disputed") => {
    if (!selected || !user) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("repayment_confirmations")
      .update({
        lender_response: action,
        lender_response_note: responseNote || null,
        lender_responded_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      toast.error("Failed to record response");
      setActionLoading(false);
      return;
    }

    // Notify vendor
    await supabase.from("notifications").insert({
      user_id: selected.vendor_id,
      type: action === "acknowledged" ? "repayment_acknowledged" : "repayment_disputed",
      title: action === "acknowledged" ? "Repayment Acknowledged" : "Repayment Disputed",
      message: action === "acknowledged"
        ? `Your repayment of $${selected.amount_usd.toLocaleString()} has been acknowledged by the lender.`
        : `Your repayment of $${selected.amount_usd.toLocaleString()} has been disputed. ${responseNote || ""}`,
      data: { confirmation_id: selected.id },
    });

    toast.success(action === "acknowledged" ? "Repayment acknowledged" : "Repayment disputed");
    setSelected(null);
    setResponseNote("");
    setActionLoading(false);
    fetchConfirmations();
  };

  const pending = confirmations.filter(c => c.lender_response === "pending");
  const resolved = confirmations.filter(c => c.lender_response !== "pending");

  return (
    <div>
      <LenderHeader title="Repayment Confirmations" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-foreground">Offline Repayment Tracking</h2>
          {pending.length > 0 && (
            <Badge variant="destructive" className="text-xs">{pending.length} pending</Badge>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{confirmations.length}</p>
              <p className="text-xs text-muted-foreground">Total Confirmations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                ${confirmations.filter(c => c.lender_response === "acknowledged").reduce((s, c) => s + c.amount_usd, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Acknowledged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                ${pending.reduce((s, c) => s + c.amount_usd, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
        ) : confirmations.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No repayment confirmations yet. Vendors will submit repayment proofs here.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pending.length > 0 && <h3 className="text-sm font-medium text-foreground">Awaiting Your Response</h3>}
            {pending.map(c => {
              const cfg = RESPONSE_CONFIG[c.lender_response];
              return (
                <Card key={c.id} className="cursor-pointer hover:border-primary/40 transition-colors border-yellow-300/50" onClick={() => { setSelected(c); setResponseNote(""); }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">${c.amount_usd.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ref: {c.reference_number || "N/A"} • {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-[10px] gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}

            {resolved.length > 0 && <h3 className="text-sm font-medium text-foreground mt-6">Resolved</h3>}
            {resolved.map(c => {
              const cfg = RESPONSE_CONFIG[c.lender_response] || RESPONSE_CONFIG.pending;
              return (
                <Card key={c.id} className="opacity-80" onClick={() => setSelected(c)}>
                  <CardContent className="p-4 flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-foreground">${c.amount_usd.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ref: {c.reference_number || "N/A"} • {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-[10px] gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail / Response Dialog */}
        <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Repayment Confirmation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Amount:</span> <span className="font-bold text-foreground">${selected?.amount_usd.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Reference:</span> <span className="font-medium">{selected?.reference_number || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Submitted:</span> <span>{selected?.created_at ? new Date(selected.created_at).toLocaleString() : ""}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="capitalize font-medium">{selected?.lender_response}</span></div>
              </div>

              {selected?.notes && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Vendor Notes:</span>
                  <p className="bg-muted/50 rounded p-2">{selected.notes}</p>
                </div>
              )}

              {selected?.proof_url && (
                <a href={selected.proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary underline">
                  <FileText className="w-3.5 h-3.5" />
                  View Proof Document ({selected.proof_file_name || "Download"})
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {selected?.lender_response === "pending" && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Response Note (optional)</label>
                  <Textarea
                    value={responseNote}
                    onChange={e => setResponseNote(e.target.value)}
                    placeholder="Add a note about this repayment..."
                    className="text-xs min-h-[60px]"
                  />
                </div>
              )}

              {selected?.lender_response !== "pending" && selected?.lender_response_note && (
                <div className="text-xs">
                  <span className="text-muted-foreground block mb-1">Your Response:</span>
                  <p className="bg-muted/50 rounded p-2">{selected.lender_response_note}</p>
                </div>
              )}
            </div>

            {selected?.lender_response === "pending" && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="destructive" size="sm" disabled={actionLoading} onClick={() => handleResponse("disputed")}>
                  <AlertTriangle className="w-4 h-4 mr-1" /> Dispute
                </Button>
                <Button size="sm" disabled={actionLoading} onClick={() => handleResponse("acknowledged")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Acknowledge
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LenderRepayments;

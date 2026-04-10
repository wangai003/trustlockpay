import { useState, useEffect } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DollarSign, Upload, CheckCircle2, Clock, AlertTriangle, Plus, Loader2 } from "lucide-react";

const VendorRepayments = () => {
  const { user } = useAuth();
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    application_id: "",
    amount_usd: "",
    reference_number: "",
    notes: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: confs }, { data: apps }] = await Promise.all([
      supabase
        .from("repayment_confirmations")
        .select("*")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("financing_applications")
        .select("id, requested_amount, approved_amount, lender_id, status")
        .eq("vendor_id", user!.id)
        .eq("status", "approved"),
    ]);
    setConfirmations(confs || []);
    setApplications(apps || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !form.application_id || !form.amount_usd) {
      toast.error("Select an application and enter the repayment amount");
      return;
    }

    setSubmitting(true);

    let proofUrl: string | null = null;
    let proofFileName: string | null = null;

    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const path = `${user.id}/repayments/${form.application_id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("financing-documents").upload(path, proofFile, { upsert: true });
      if (uploadErr) {
        toast.error("Proof upload failed");
        setSubmitting(false);
        return;
      }
      const { data: urlData } = await supabase.storage.from("financing-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      proofUrl = urlData?.signedUrl || path;
      proofFileName = proofFile.name;
    }

    const app = applications.find(a => a.id === form.application_id);

    const { error } = await supabase.from("repayment_confirmations").insert({
      application_id: form.application_id,
      vendor_id: user.id,
      lender_id: app?.lender_id || "",
      amount_usd: parseFloat(form.amount_usd),
      proof_url: proofUrl,
      proof_file_name: proofFileName,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
    });

    if (error) {
      toast.error("Failed to submit confirmation");
      setSubmitting(false);
      return;
    }

    toast.success("Repayment confirmation submitted");
    setShowCreate(false);
    setForm({ application_id: "", amount_usd: "", reference_number: "", notes: "" });
    setProofFile(null);
    setSubmitting(false);
    fetchData();
  };

  const statusBadge = (status: string) => {
    if (status === "acknowledged") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1 text-[10px]"><CheckCircle2 className="w-3 h-3" />Acknowledged</Badge>;
    if (status === "disputed") return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 gap-1 text-[10px]"><AlertTriangle className="w-3 h-3" />Disputed</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1 text-[10px]"><Clock className="w-3 h-3" />Pending</Badge>;
  };

  return (
    <div>
      <VendorHeader title="Repayment Confirmations" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Offline Repayments</h2>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} disabled={applications.length === 0}>
            <Plus className="w-4 h-4 mr-1" /> Log Repayment
          </Button>
        </div>

        {applications.length === 0 && !loading && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No approved financing applications to log repayments against.</CardContent></Card>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
        ) : confirmations.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No repayment confirmations yet. Use "Log Repayment" to record offline payments to your lender.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {confirmations.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">${c.amount_usd.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ref: {c.reference_number || "N/A"} • {new Date(c.created_at).toLocaleDateString()}
                      </p>
                      {c.notes && <p className="text-[10px] text-muted-foreground mt-1">{c.notes}</p>}
                    </div>
                    {statusBadge(c.lender_response)}
                  </div>
                  {c.lender_response === "disputed" && c.lender_response_note && (
                    <div className="mt-2 p-2 rounded bg-destructive/5 text-xs text-destructive">
                      <strong>Lender note:</strong> {c.lender_response_note}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Offline Repayment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Financing Application</label>
                <Select value={form.application_id} onValueChange={v => setForm(p => ({ ...p, application_id: v }))}>
                  <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select application" /></SelectTrigger>
                  <SelectContent>
                    {applications.map(app => (
                      <SelectItem key={app.id} value={app.id} className="text-xs">
                        ${(app.approved_amount || app.requested_amount).toLocaleString()} — {app.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Repayment Amount (USD)</label>
                <Input
                  type="number"
                  value={form.amount_usd}
                  onChange={e => setForm(p => ({ ...p, amount_usd: e.target.value }))}
                  placeholder="0.00"
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Reference Number (optional)</label>
                <Input
                  value={form.reference_number}
                  onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))}
                  placeholder="Bank reference or receipt number"
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Proof of Payment (optional)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setProofFile(e.target.files?.[0] || null)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Notes (optional)</label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Additional details..."
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button disabled={submitting || !form.application_id || !form.amount_usd} onClick={handleSubmit}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Submit Confirmation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VendorRepayments;

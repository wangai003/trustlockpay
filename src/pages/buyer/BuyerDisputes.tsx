import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, CheckCircle, Bot, Upload, MessageSquare, Eye, Scale } from "lucide-react";
import { useDisputes, useFileDispute } from "@/hooks/useSupabaseData";
import { useTestnetData } from "@/hooks/useTestnetData";
import { useBuyer } from "@/contexts/BuyerContext";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  under_review: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  resolved: { label: "Resolved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  resolved_buyer: { label: "Resolved — Your Favor", color: "bg-primary/15 text-primary", icon: CheckCircle },
  resolved_vendor: { label: "Resolved — Vendor Favor", color: "bg-muted text-muted-foreground", icon: CheckCircle },
};

const BuyerDisputes = () => {
  const { isTestnet } = useBuyer();
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [txIdInput, setTxIdInput] = useState("");
  const [reasonInput, setReasonInput] = useState("Item not as described");
  const [descInput, setDescInput] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const { data: rawDisputes = [] } = useDisputes();
  const fileDispute = useFileDispute();
  const testnet = useTestnetData();

  const disputes = isTestnet
    ? testnet.disputes.map(d => ({
        id: d.dispute_id,
        txId: d.tx_id,
        vendor: d.vendor_name,
        amount: `$${d.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        reason: d.reason,
        status: d.status,
        filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdate: d.ai_recommendation,
      }))
    : rawDisputes.map(d => ({
        id: d.dispute_id,
        txId: d.tx_id || "—",
        vendor: d.vendor_name || "Unknown",
        amount: d.amount ? `$${Number(d.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—",
        reason: d.reason || "—",
        status: d.status,
        filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdate: d.ai_recommendation || "Emmanuel AI is analyzing evidence",
      }));

  const handleSubmitDispute = async () => {
    if (!txIdInput) return;
    setUploadingEvidence(true);
    try {
      await fileDispute.mutateAsync({ txId: txIdInput, reason: reasonInput, description: descInput });

      // Upload evidence files if any
      if (evidenceFiles.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        for (const file of evidenceFiles) {
          const path = `${txIdInput}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage.from("dispute-evidence").upload(path, file);
          if (uploadErr) {
            toast.error(`Failed to upload ${file.name}`);
          }
        }
        if (evidenceFiles.length > 0) toast.success(`${evidenceFiles.length} evidence file(s) uploaded`);
      }

      setShowNewDispute(false);
      setTxIdInput(""); setDescInput(""); setEvidenceFiles([]);
    } catch { /* handled by hook */ }
    setUploadingEvidence(false);
  };

  const handleAddEvidence = async (disputeId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,.pdf,.doc,.docx";
    input.onchange = async () => {
      if (!input.files?.length) return;
      const files = Array.from(input.files);
      let uploaded = 0;
      for (const file of files) {
        const path = `${disputeId}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("dispute-evidence").upload(path, file);
        if (!error) uploaded++;
        else toast.error(`Failed to upload ${file.name}`);
      }
      if (uploaded > 0) toast.success(`${uploaded} evidence file(s) added to dispute`);
    };
    input.click();
  };

  return (
    <div>
      <BuyerHeader title="Disputes" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold">Your Disputes</h2>
            <p className="text-sm text-muted-foreground">Track the status of any disputes you've filed</p>
          </div>
          <TLId code="TL-B-DSP-BTN-FILE" inline>
            <Button onClick={() => setShowNewDispute(!showNewDispute)} className="gap-2">
              <AlertTriangle className="w-4 h-4" /> File New Dispute
            </Button>
          </TLId>
        </div>

        {showNewDispute && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-base">File a Dispute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
              <TLId code={dynTLId("B", "DSPF", 1, "INP-TXID")} inline>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g., TL-2026-XXXX" value={txIdInput} onChange={e => setTxIdInput(e.target.value)} />
              </TLId>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={reasonInput} onChange={e => setReasonInput(e.target.value)}>
                  <option>Item not as described</option>
                  <option>Non-delivery</option>
                  <option>Wrong item received</option>
                  <option>Quality issue</option>
                  <option>Service incomplete</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Describe the issue</Label>
                <Textarea placeholder="Provide details about what went wrong..." rows={4} value={descInput} onChange={e => setDescInput(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Evidence (optional)</Label>
                <input
                  ref={evidenceInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setEvidenceFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }}
                />
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => evidenceInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) setEvidenceFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                >
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drop photos, screenshots, or documents here</p>
                  <Button variant="outline" size="sm" className="mt-2" type="button">Browse Files</Button>
                </div>
                {evidenceFiles.length > 0 && (
                  <div className="space-y-1">
                    {evidenceFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
                        <span className="flex-1 truncate">{f.name}</span>
                        <button className="text-destructive hover:underline" onClick={() => setEvidenceFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="gap-2" onClick={handleSubmitDispute} disabled={uploadingEvidence}>
                  {uploadingEvidence ? <><Upload className="w-4 h-4 animate-spin" /> Uploading...</> : <><AlertTriangle className="w-4 h-4" /> Submit Dispute</>}
                </Button>
                <Button variant="outline" onClick={() => setShowNewDispute(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {disputes.map((dispute, rowIdx) => {
          const cfg = statusConfig[dispute.status] || statusConfig.pending;
          const row = rowIdx + 1;
          return (
            <Card key={dispute.id}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <TLId code={dynTLId("B", "DSP", row, "LBL-ID")} inline>
                        <span className="font-mono text-sm font-bold">{dispute.id}</span>
                      </TLId>
                      <TLId code={dynTLId("B", "DSP", row, "STS")} inline>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </TLId>
                    </div>
                    <p className="text-sm">
                      <TLId code={dynTLId("B", "DSP", row, "LBL-VENDOR")} inline>
                        <strong>vs {dispute.vendor}</strong>
                      </TLId>
                      {" — "}
                      <TLId code={dynTLId("B", "DSP", row, "LBL-REASON")} inline>
                        <span>{dispute.reason}</span>
                      </TLId>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>TX: {dispute.txId}</span>
                      <TLId code={dynTLId("B", "DSP", row, "LBL-AMOUNT")} inline>
                        <span>Amount: {dispute.amount}</span>
                      </TLId>
                      <span>Filed: {dispute.filed}</span>
                    </div>
                  </div>

                  <div className="lg:w-72 bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="text-xs font-semibold">Status Update</span>
                    </div>
                    <TLId code={dynTLId("B", "DSP", row, "LBL-AI-STATUS")} inline>
                      <p className="text-xs text-muted-foreground">{dispute.lastUpdate}</p>
                    </TLId>
                    <p className="text-[10px] text-muted-foreground">You will be notified when a decision is made</p>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {dispute.status !== "resolved" && dispute.status !== "resolved_buyer" && dispute.status !== "resolved_vendor" && (
                      <TLId code={dynTLId("B", "DSP", row, "BTN-EVIDENCE")} inline>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleAddEvidence(dispute.id)}><MessageSquare className="w-3 h-3" /> Add Evidence</Button>
                      </TLId>
                    )}
                    <TLId code={dynTLId("B", "DSP", row, "BTN-VIEW")} inline>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </TLId>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {disputes.length === 0 && !showNewDispute && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="font-heading font-bold text-lg">No Active Disputes</h3>
              <p className="text-sm text-muted-foreground mt-1">All your transactions are in good standing</p>
            </CardContent>
          </Card>
        )}

        <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
          <p><strong>Dispute Window:</strong> You have 14 days from delivery confirmation to file a dispute.</p>
          <p><strong>Review Process:</strong> Emmanuel AI will analyze your case and provide a recommendation. Every dispute requires explicit admin approval before any action is taken.</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDisputes;

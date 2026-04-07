import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, CheckCircle, Bot, Upload, MessageSquare, Eye, Scale } from "lucide-react";
import ArbitratorProposalPanel from "@/components/shared/ArbitratorProposalPanel";
import { useDisputes } from "@/hooks/useSupabaseData";
import { useTestnetData } from "@/hooks/useTestnetData";
import { useVendor } from "@/contexts/VendorContext";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getArbitrationFee } from "@/lib/arbitrationFees";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  under_review: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  resolved: { label: "Resolved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  resolved_buyer: { label: "Resolved — Buyer Favor", color: "bg-muted text-muted-foreground", icon: CheckCircle },
  resolved_vendor: { label: "Resolved — Your Favor", color: "bg-primary/15 text-primary", icon: CheckCircle },
};

const VendorDisputes = () => {
  const { isTestnet } = useVendor();
  const navigate = useNavigate();
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const { data: rawDisputes = [] } = useDisputes();
  const testnet = useTestnetData();

  const disputes = isTestnet
    ? testnet.disputes.map((d: any) => ({
        dbId: d.id || d.dispute_id,
        id: d.dispute_id,
        txId: d.tx_id,
        buyer: d.buyer_name || "Buyer",
        amount: `$${d.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        rawAmount: d.amount,
        reason: d.reason,
        status: d.status,
        filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdate: d.ai_recommendation,
      }))
    : rawDisputes.map((d) => ({
        dbId: d.id,
        id: d.dispute_id,
        txId: d.tx_id || "—",
        buyer: d.buyer_name || "Unknown",
        amount: d.amount ? `$${Number(d.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—",
        rawAmount: Number(d.amount) || 0,
        reason: d.reason || "—",
        status: d.status,
        filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastUpdate: d.ai_recommendation || "Emmanuel AI is analyzing evidence",
      }));

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

  const handleRequestArbitrator = async (dispute: typeof disputes[0]) => {
    const feeAmount = getArbitrationFee(dispute.rawAmount);
    const fee = feeAmount.toFixed(2);
    const confirmed = window.confirm(
      `You are requesting a professional arbitrator for dispute ${dispute.id}.\n\nEscrow Amount: ${dispute.amount}\nArbitration Filing & Case Management Fee: $${feeAmount.toLocaleString()}\n\nThis non-refundable flat fee covers TrustLock's case management and coordination. The appointed arbitrator's professional fees are separate and determined by their institution after appointment.\n\nYou will be routed to TrustLock OS Pay to complete payment.\n\nProceed?`
    );
    if (!confirmed) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("You must be logged in"); return; }

      const matchingRaw = rawDisputes.find((d) => d.dispute_id === dispute.id);
      const transactionId = matchingRaw?.transaction_id;

      if (!transactionId) {
        toast.error("Cannot find the linked transaction for this dispute");
        return;
      }

      const { data: arbOrder, error } = await supabase.from("arbitration_fee_orders").insert({
        dispute_id: matchingRaw.id,
        transaction_id: transactionId,
        requested_by: user.id,
        requester_role: "vendor",
        escrow_amount: dispute.rawAmount,
        arbitration_fee: parseFloat(fee),
        tx_id: dispute.txId,
      }).select("id").single();

      if (error) { toast.error("Failed to create arbitration request"); return; }

      navigate(`/trustlock/vendor/os-pay?service=${encodeURIComponent(`Arbitration Fee — ${dispute.txId}`)}&amount=${fee}&arbitration_order_id=${arbOrder.id}`);
      toast.info("Complete the arbitration fee payment to initiate professional review.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <VendorHeader title="Disputes" />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="font-heading text-lg font-bold">Disputes Against You</h2>
          <p className="text-sm text-muted-foreground">Track and respond to disputes filed by buyers</p>
        </div>

        {disputes.map((dispute, rowIdx) => {
          const cfg = statusConfig[dispute.status] || statusConfig.pending;
          const row = rowIdx + 1;
          return (
            <div key={dispute.id} className="space-y-2">
              <Card>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <TLId code={dynTLId("V", "DSP", row, "LBL-ID")} inline>
                          <span className="font-mono text-sm font-bold">{dispute.id}</span>
                        </TLId>
                        <TLId code={dynTLId("V", "DSP", row, "STS")} inline>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </TLId>
                      </div>
                      <p className="text-sm">
                        <TLId code={dynTLId("V", "DSP", row, "LBL-BUYER")} inline>
                          <strong>Filed by {dispute.buyer}</strong>
                        </TLId>
                        {" — "}
                        <TLId code={dynTLId("V", "DSP", row, "LBL-REASON")} inline>
                          <span>{dispute.reason}</span>
                        </TLId>
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>TX: {dispute.txId}</span>
                        <TLId code={dynTLId("V", "DSP", row, "LBL-AMOUNT")} inline>
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
                      <TLId code={dynTLId("V", "DSP", row, "LBL-AI-STATUS")} inline>
                        <p className="text-xs text-muted-foreground">{dispute.lastUpdate}</p>
                      </TLId>
                      <p className="text-[10px] text-muted-foreground">You will be notified when a decision is made</p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {dispute.status !== "resolved" && dispute.status !== "resolved_buyer" && dispute.status !== "resolved_vendor" && (
                        <>
                          <TLId code={dynTLId("V", "DSP", row, "BTN-EVIDENCE")} inline>
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleAddEvidence(dispute.id)}>
                              <MessageSquare className="w-3 h-3" /> Add Evidence
                            </Button>
                          </TLId>
                          {dispute.rawAmount >= 10000 && (
                            <TLId code={dynTLId("V", "DSP", row, "BTN-ARBITRATE")} inline>
                              <Button variant="outline" size="sm" className="gap-1 border-accent text-accent-foreground hover:bg-accent/10" onClick={() => handleRequestArbitrator(dispute)}>
                                <Scale className="w-3 h-3" /> Request Arbitrator
                              </Button>
                            </TLId>
                          )}
                        </>
                      )}
                      <TLId code={dynTLId("V", "DSP", row, "BTN-VIEW")} inline>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TLId>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <ArbitratorProposalPanel disputeId={dispute.dbId} role="vendor" disputeStatus={dispute.status} />
            </div>
          );
        })}

        {disputes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="font-heading font-bold text-lg">No Active Disputes</h3>
              <p className="text-sm text-muted-foreground mt-1">All your transactions are in good standing</p>
            </CardContent>
          </Card>
        )}

        <div className="bg-muted/30 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
          <p><strong>Response Window:</strong> You have 7 days from notification to respond with evidence.</p>
          <p><strong>Review Process:</strong> Emmanuel AI will analyze all evidence and provide a recommendation. Every dispute requires explicit admin approval before any action is taken.</p>
          <p><strong>Professional Arbitration:</strong> For disputes involving ≥$10,000 in escrow, either party may request a professional arbitrator. A non-refundable flat Arbitration Filing & Case Management Fee is required via TrustLock OS Pay ($500 for $10K–$50K · $1,500 for $50K–$250K · $3,000 for $250K–$1M · $5,000 for $1M+). This covers case coordination — the arbitrator's professional fees are separate, determined by their institution after appointment. Arbitration follows ICC/UNCITRAL rules.</p>
        </div>
      </div>
    </div>
  );
};

export default VendorDisputes;

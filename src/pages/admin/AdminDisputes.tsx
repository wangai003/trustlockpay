import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, AlertTriangle, Clock, CheckCircle, Bot, Eye, ArrowUpRight, Scale, Gavel, UserCheck, Upload, FileText, Image, ShieldCheck, UserX, SplitSquareHorizontal, DollarSign } from "lucide-react";
import { useDisputes, useReviewDispute, useEscalateToArbitration, useAssignArbitrator, useSubmitRuling, useDisputeEvidence, useUploadDisputeEvidence, useResolveDisputeVendorWins, useResolveDisputeBuyerWins, useResolveDisputeCompromise } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  under_review: { label: "Under Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  ai_reviewing: { label: "Emmanuel Analyzing", color: "bg-primary/15 text-primary", icon: Bot },
  resolved: { label: "Resolved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  escalated: { label: "Escalated", color: "bg-destructive/15 text-destructive", icon: ArrowUpRight },
  arbitration_pending: { label: "Arbitration Pending", color: "bg-accent/20 text-accent-foreground", icon: Scale },
  arbitration_in_progress: { label: "Arbitration Active", color: "bg-primary/20 text-primary", icon: Gavel },
  ruling_issued: { label: "Ruling Issued", color: "bg-primary/15 text-primary", icon: UserCheck },
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminDisputes = () => {
  const [search, setSearch] = useState("");
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [rulingDialog, setRulingDialog] = useState<string | null>(null);
  const [compromiseDialog, setCompromiseDialog] = useState<string | null>(null);
  const [arbName, setArbName] = useState("");
  const [arbEmail, setArbEmail] = useState("");
  const [ruling, setRuling] = useState("");
  const [splitPct, setSplitPct] = useState("50");
  const [compromisePct, setCompromisePct] = useState(50);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);

  const { data: rawDisputes = [] } = useDisputes();
  const reviewDispute = useReviewDispute();
  const escalateToArb = useEscalateToArbitration();
  const assignArb = useAssignArbitrator();
  const submitRuling = useSubmitRuling();
  const uploadEvidence = useUploadDisputeEvidence();
  const { data: evidenceFiles = [] } = useDisputeEvidence(expandedEvidence || undefined);
  const resolveVendorWins = useResolveDisputeVendorWins();
  const resolveBuyerWins = useResolveDisputeBuyerWins();
  const resolveCompromise = useResolveDisputeCompromise();

  const { data: arbOrders = [] } = useQuery({
    queryKey: ["arbitration-fee-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("arbitration_fee_orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
  const disputes = rawDisputes.map((d: any) => ({
    id: d.dispute_id,
    dbId: d.id,
    txId: d.tx_id || "—",
    buyer: d.buyer_name || "Unknown",
    vendor: d.vendor_name || "Unknown",
    amount: d.amount ? Number(d.amount) : 0,
    amountStr: d.amount ? `$${Number(d.amount).toLocaleString()}` : "—",
    reason: d.reason || "—",
    status: d.status,
    aiConfidence: d.ai_confidence ?? 0,
    aiRecommendation: d.ai_recommendation || "Awaiting analysis",
    filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    priority: d.priority || "medium",
    arbitrationFee: d.arbitration_fee ? `$${Number(d.arbitration_fee).toLocaleString()}` : null,
    arbitrationRuling: d.arbitration_ruling,
    rulingAcceptedBuyer: d.ruling_accepted_buyer,
    rulingAcceptedVendor: d.ruling_accepted_vendor,
  }));

  const filtered = disputes.filter((d: any) =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.buyer.toLowerCase().includes(search.toLowerCase()) ||
    d.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = disputes.filter((d: any) => d.status !== "resolved").length;
  const aiProcessing = disputes.filter((d: any) => d.status === "ai_reviewing").length;
  const resolvedCount = disputes.filter((d: any) => d.status === "resolved").length;
  const arbCount = disputes.filter((d: any) => ["arbitration_pending", "arbitration_in_progress", "ruling_issued"].includes(d.status)).length;

  const isArbEligible = (d: any) => d.amount >= 10000 && !["arbitration_pending", "arbitration_in_progress", "ruling_issued", "resolved"].includes(d.status);

  return (
    <div>
      <AdminHeader title="Dispute Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open Disputes", value: String(openCount), icon: AlertTriangle },
            { label: "Emmanuel Processing", value: String(aiProcessing), icon: Bot },
            { label: "In Arbitration", value: String(arbCount), icon: Scale },
            { label: "Resolved (30d)", value: String(resolvedCount), icon: CheckCircle },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-4">
          {filtered.map((dispute: any) => {
            const cfg = statusConfig[dispute.status] || statusConfig.pending;
            return (
              <Card key={dispute.id} className={dispute.priority === "critical" ? "border-destructive/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold">{dispute.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        <Badge className={`text-[10px] ${priorityColors[dispute.priority] || ""}`}>
                          {dispute.priority.toUpperCase()}
                        </Badge>
                        {dispute.amount >= 10000 && (
                          <Badge variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                            <Scale className="w-3 h-3 mr-1" /> ARB ELIGIBLE
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground">
                        <strong>{dispute.buyer}</strong> vs <strong>{dispute.vendor}</strong> — {dispute.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>TX: {dispute.txId}</span>
                        <span>Amount: {dispute.amountStr}</span>
                        <span>Filed: {dispute.filed}</span>
                        {dispute.arbitrationFee && <span className="text-destructive font-medium">Arb Fee: {dispute.arbitrationFee}</span>}
                      </div>

                      {/* Ruling status */}
                      {dispute.status === "ruling_issued" && (
                        <div className="bg-muted/50 rounded-lg p-2 mt-1 space-y-1">
                          <p className="text-xs font-semibold flex items-center gap-1"><Gavel className="w-3 h-3" /> Ruling: {dispute.arbitrationRuling?.replace("_", " ")}</p>
                          <div className="flex gap-3 text-xs">
                            <span>Buyer: {dispute.rulingAcceptedBuyer ? "✅ Accepted" : "⏳ Pending"}</span>
                            <span>Vendor: {dispute.rulingAcceptedVendor ? "✅ Accepted" : "⏳ Pending"}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-72 bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">Emmanuel's Take</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">{dispute.aiConfidence}% confident</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{dispute.aiRecommendation}</p>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${dispute.aiConfidence >= 90 ? "bg-primary" : dispute.aiConfidence >= 70 ? "bg-accent" : "bg-destructive"}`} style={{ width: `${dispute.aiConfidence}%` }} />
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setExpandedEvidence(expandedEvidence === dispute.dbId ? null : dispute.dbId)}>
                        <Eye className="w-3 h-3" /> {expandedEvidence === dispute.dbId ? "Hide" : "View"}
                      </Button>
                      {dispute.status !== "resolved" && !["arbitration_pending", "arbitration_in_progress", "ruling_issued"].includes(dispute.status) && (
                        <Button size="sm" className="gap-1" onClick={() => reviewDispute.mutate(dispute.dbId)}>Review</Button>
                      )}

                      {/* ── Three-Outcome Resolution Buttons ── */}
                      {dispute.status !== "resolved" && !["arbitration_pending", "arbitration_in_progress", "ruling_issued"].includes(dispute.status) && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => resolveVendorWins.mutate(dispute.id)}>
                            <ShieldCheck className="w-3 h-3" /> Vendor Wins
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => resolveBuyerWins.mutate(dispute.id)}>
                            <UserX className="w-3 h-3" /> Buyer Wins
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 border-accent/30 text-accent-foreground hover:bg-accent/10" onClick={() => setCompromiseDialog(dispute.id)}>
                            <SplitSquareHorizontal className="w-3 h-3" /> Compromise
                          </Button>
                        </>
                      )}

                      {isArbEligible(dispute) && (
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => escalateToArb.mutate(dispute.id)}>
                          <Scale className="w-3 h-3" /> Arbitrate
                        </Button>
                      )}
                      {dispute.status === "arbitration_pending" && (
                        <Button size="sm" className="gap-1" onClick={() => setAssignDialog(dispute.id)}>
                          <UserCheck className="w-3 h-3" /> Assign
                        </Button>
                      )}
                      {dispute.status === "arbitration_in_progress" && (
                        <Button size="sm" className="gap-1" onClick={() => setRulingDialog(dispute.id)}>
                          <Gavel className="w-3 h-3" /> Ruling
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Evidence Panel */}
                  {expandedEvidence === dispute.dbId && (
                    <div className="mt-4 border-t border-border pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Dispute Evidence ({evidenceFiles.length} files)
                        </h4>
                        <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1" onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file"; input.multiple = true;
                          input.accept = "image/*,.pdf,.doc,.docx";
                          input.onchange = () => {
                            if (input.files) Array.from(input.files).forEach(f => uploadEvidence.mutate({ disputeId: dispute.dbId, file: f }));
                          };
                          input.click();
                        }}>
                          <Upload className="w-3 h-3" /> Upload
                        </Button>
                      </div>
                      {evidenceFiles.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No evidence files uploaded yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {evidenceFiles.map((ev: any) => (
                            <div key={ev.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
                              {ev.file_type?.startsWith("image/") ? (
                                <Image className="w-4 h-4 text-primary shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{ev.file_name || "Document"}</p>
                                <p className="text-[10px] text-muted-foreground">{new Date(ev.created_at).toLocaleDateString()}</p>
                              </div>
                              <a href={ev.file_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline shrink-0">Open</a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Assign Arbitrator Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Arbitrator</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arbitrator Name</Label>
              <Input value={arbName} onChange={(e) => setArbName(e.target.value)} placeholder="Jane Doe, Esq." />
            </div>
            <div>
              <Label>Arbitrator Email</Label>
              <Input value={arbEmail} onChange={(e) => setArbEmail(e.target.value)} placeholder="arbitrator@firm.com" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (assignDialog && arbName && arbEmail) {
                assignArb.mutate({ disputeId: assignDialog, arbitratorName: arbName, arbitratorEmail: arbEmail });
                setAssignDialog(null);
                setArbName("");
                setArbEmail("");
              }
            }}>Assign & Notify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Ruling Dialog */}
      <Dialog open={!!rulingDialog} onOpenChange={() => setRulingDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Arbitration Ruling</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ruling</Label>
              <Select value={ruling} onValueChange={setRuling}>
                <SelectTrigger><SelectValue placeholder="Select ruling..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_refund">Full Refund to Buyer</SelectItem>
                  <SelectItem value="partial_refund">Partial Refund (Split)</SelectItem>
                  <SelectItem value="vendor_release">Full Release to Vendor</SelectItem>
                  <SelectItem value="dismiss">Dismiss Dispute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ruling === "partial_refund" && (
              <div>
                <Label>Buyer's Share (%)</Label>
                <Input type="number" value={splitPct} onChange={(e) => setSplitPct(e.target.value)} min="1" max="99" />
                <p className="text-xs text-muted-foreground mt-1">Vendor receives {100 - Number(splitPct)}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRulingDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (rulingDialog && ruling) {
                submitRuling.mutate({
                  disputeId: rulingDialog,
                  ruling,
                  splitPercentage: ruling === "partial_refund" ? Number(splitPct) : undefined,
                });
                setRulingDialog(null);
                setRuling("");
                setSplitPct("50");
              }
            }}>Submit Ruling</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compromise Split Dialog */}
      <Dialog open={!!compromiseDialog} onOpenChange={() => setCompromiseDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Compromise Resolution</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Use the slider to set how the escrowed funds are split between buyer and vendor.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-destructive">Buyer: {compromisePct}%</span>
                <span className="text-primary">Vendor: {100 - compromisePct}%</span>
              </div>
              <Slider
                value={[compromisePct]}
                onValueChange={(v) => setCompromisePct(v[0])}
                min={1}
                max={99}
                step={1}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>• <strong>Buyer</strong> will receive {compromisePct}% of escrowed principal as a refund</p>
              <p>• <strong>Vendor</strong> will receive {100 - compromisePct}% of escrowed principal as release</p>
              <p>• TrustLock 1% escrow fee applies only to vendor's share</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompromiseDialog(null)}>Cancel</Button>
            <Button onClick={() => {
              if (compromiseDialog) {
                resolveCompromise.mutate({
                  disputeId: compromiseDialog,
                  splitPercentage: compromisePct,
                });
                setCompromiseDialog(null);
                setCompromisePct(50);
              }
            }}>
              <SplitSquareHorizontal className="w-4 h-4 mr-1" /> Execute Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDisputes;

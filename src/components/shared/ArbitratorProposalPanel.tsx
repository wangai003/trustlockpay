/**
 * ArbitratorProposalPanel — Shared component for buyer/vendor to propose
 * and respond to arbitrator nominations during dispute arbitration.
 *
 * Flow: Either party proposes → counterparty accepts/rejects → if no agreement
 * within 7 days, system auto-assigns from platform panel.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Scale, UserCheck, Clock, Check, X, ExternalLink, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ARBITRATION_DIRECTORIES = [
  { name: "ICC", region: "Global", url: "https://iccwbo.org/dispute-resolution/", focus: "Cross-border commercial disputes" },
  { name: "LCIA", region: "UK / Europe", url: "https://www.lcia.org/", focus: "Financial, energy, construction" },
  { name: "SIAC", region: "Asia-Pacific", url: "https://www.siac.org.sg/", focus: "Tech, manufacturing, trade" },
  { name: "KIAC", region: "Africa", url: "https://kiac.org.rw/", focus: "AfCFTA, regional trade" },
  { name: "Lagos RCICA", region: "West Africa", url: "https://rcica.org.ng/", focus: "Agriculture, commodities" },
  { name: "Cairo CRCICA", region: "North / East Africa", url: "https://crcica.org/", focus: "Construction, energy" },
  { name: "AAA / ICDR", region: "USA / International", url: "https://www.adr.org/", focus: "E-commerce, services" },
];

interface Props {
  disputeId?: string;
  transactionId?: string;
  role: "buyer" | "vendor";
  disputeStatus?: string;
}

const ArbitratorProposalPanel = ({ disputeId: propDisputeId, transactionId, role, disputeStatus: propDisputeStatus }: Props) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [credentials, setCredentials] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If we have a transactionId but no disputeId, look up the dispute
  const { data: resolvedDispute } = useQuery({
    queryKey: ["dispute-for-transaction", transactionId],
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("id, status")
        .eq("transaction_id", transactionId!)
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!transactionId && !propDisputeId,
  });

  const disputeId = propDisputeId || resolvedDispute?.id;
  const disputeStatus = propDisputeStatus || resolvedDispute?.status || "";

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["arbitrator-proposals", disputeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("arbitrator_proposals")
        .select("*")
        .eq("dispute_id", disputeId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!disputeId,
  });

  // Only show for arbitration_pending status
  if (!disputeId || !["arbitration_pending", "arbitration_in_progress"].includes(disputeStatus)) {
    return null;
  }

  const myProposals = proposals.filter((p: any) => p.proposer_role === role);
  const theirProposals = proposals.filter((p: any) => p.proposer_role !== role);
  const acceptedProposal = proposals.find((p: any) => p.counterparty_response === "accepted");
  const hasAutoDeadlinePassed = proposals.some((p: any) => new Date(p.auto_assign_deadline) < new Date());

  const handleSubmitProposal = async () => {
    if (!name.trim()) { toast.error("Arbitrator name is required"); return; }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("You must be logged in"); return; }

      const { error } = await supabase.from("arbitrator_proposals").insert({
        dispute_id: disputeId,
        proposed_by: user.id,
        proposer_role: role,
        arbitrator_name: name.trim(),
        arbitrator_email: email.trim() || null,
        arbitrator_institution: institution.trim() || null,
        arbitrator_credentials: credentials.trim() || null,
      });

      if (error) throw error;
      toast.success("Arbitrator proposal submitted. Waiting for counterparty response.");
      setName(""); setEmail(""); setInstitution(""); setCredentials("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["arbitrator-proposals", disputeId] });
    } catch {
      toast.error("Failed to submit proposal");
    }
    setSubmitting(false);
  };

  const handleRespond = async (proposalId: string, response: "accepted" | "rejected") => {
    try {
      const { error } = await supabase.from("arbitrator_proposals")
        .update({ counterparty_response: response, counterparty_responded_at: new Date().toISOString() })
        .eq("id", proposalId);

      if (error) throw error;

      if (response === "accepted") {
        // Update dispute status
        await supabase.from("disputes")
          .update({ status: "arbitration_in_progress" })
          .eq("id", disputeId);
        toast.success("Arbitrator accepted! Arbitration proceedings will begin.");
      } else {
        toast.info("Proposal rejected. You may propose your own arbitrator.");
      }
      queryClient.invalidateQueries({ queryKey: ["arbitrator-proposals", disputeId] });
    } catch {
      toast.error("Failed to respond");
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="w-4 h-4" /> Arbitrator Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Accepted arbitrator */}
        {acceptedProposal && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Agreed Arbitrator</span>
            </div>
            <p className="text-sm font-medium">{acceptedProposal.arbitrator_name}</p>
            {acceptedProposal.arbitrator_institution && (
              <p className="text-xs text-muted-foreground">{acceptedProposal.arbitrator_institution}</p>
            )}
            <p className="text-[10px] text-muted-foreground">Both parties agreed — arbitration proceedings active</p>
          </div>
        )}

        {/* Pending proposals from counterparty */}
        {!acceptedProposal && theirProposals.filter((p: any) => p.counterparty_response === "pending").map((p: any) => (
          <div key={p.id} className="p-3 rounded-lg bg-accent/10 border border-accent/20 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-foreground" />
              <span className="text-xs font-semibold">
                {p.proposer_role === "buyer" ? "Buyer" : "Vendor"} proposed an arbitrator
              </span>
              <Badge variant="outline" className="text-[10px]">
                {getDaysRemaining(p.auto_assign_deadline)}d remaining
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{p.arbitrator_name}</p>
              {p.arbitrator_institution && <p className="text-xs text-muted-foreground">{p.arbitrator_institution}</p>}
              {p.arbitrator_credentials && <p className="text-xs text-muted-foreground">{p.arbitrator_credentials}</p>}
              {p.arbitrator_email && <p className="text-xs text-muted-foreground">{p.arbitrator_email}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1" onClick={() => handleRespond(p.id, "accepted")}>
                <Check className="w-3 h-3" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleRespond(p.id, "rejected")}>
                <X className="w-3 h-3" /> Reject
              </Button>
            </div>
          </div>
        ))}

        {/* My pending proposals */}
        {!acceptedProposal && myProposals.filter((p: any) => p.counterparty_response === "pending").map((p: any) => (
          <div key={p.id} className="p-3 rounded-lg bg-muted/30 border space-y-1">
            <div className="flex items-center gap-2">
              <Send className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Your proposal — awaiting response</span>
              <Badge variant="outline" className="text-[10px]">
                {getDaysRemaining(p.auto_assign_deadline)}d remaining
              </Badge>
            </div>
            <p className="text-sm font-medium">{p.arbitrator_name}</p>
            {p.arbitrator_institution && <p className="text-xs text-muted-foreground">{p.arbitrator_institution}</p>}
          </div>
        ))}

        {/* Rejected proposals */}
        {!acceptedProposal && proposals.filter((p: any) => p.counterparty_response === "rejected").map((p: any) => (
          <div key={p.id} className="p-2 rounded bg-muted/20 text-xs text-muted-foreground line-through">
            {p.arbitrator_name} ({p.proposer_role}) — rejected
          </div>
        ))}

        {/* Auto-assign warning */}
        {!acceptedProposal && hasAutoDeadlinePassed && (
          <div className="p-2 rounded bg-destructive/10 text-xs text-destructive">
            ⏰ 7-day selection window expired. The platform will auto-assign an arbitrator.
          </div>
        )}

        {/* Actions */}
        {!acceptedProposal && !hasAutoDeadlinePassed && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowForm(!showForm)}>
              <Scale className="w-3 h-3" /> {showForm ? "Cancel" : "Propose Arbitrator"}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setShowDirectory(!showDirectory)}>
              <ExternalLink className="w-3 h-3" /> Browse Directories
            </Button>
          </div>
        )}

        {/* Proposal form */}
        {showForm && !acceptedProposal && (
          <div className="space-y-3 p-3 rounded-lg border bg-background">
            <div className="space-y-1">
              <Label className="text-xs">Arbitrator Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe, Esq." className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="arbitrator@example.com" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Institution</Label>
              <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. ICC, LCIA, KIAC" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Credentials / Qualifications</Label>
              <Textarea value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="Certified Arbitrator, 15yrs trade dispute experience..." rows={2} className="text-sm" />
            </div>
            <Button size="sm" className="gap-1" onClick={handleSubmitProposal} disabled={submitting}>
              <Send className="w-3 h-3" /> Submit Proposal
            </Button>
          </div>
        )}

        {/* Directory links */}
        {showDirectory && (
          <div className="space-y-2 p-3 rounded-lg border bg-background">
            <p className="text-xs font-semibold">International Arbitration Directories</p>
            <p className="text-[10px] text-muted-foreground">Browse these registries to find qualified arbitrators for your dispute</p>
            <div className="space-y-1.5">
              {ARBITRATION_DIRECTORIES.map(dir => (
                <a
                  key={dir.name}
                  href={dir.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors group"
                >
                  <div>
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{dir.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{dir.region}</span>
                    <p className="text-[10px] text-muted-foreground">{dir.focus}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Both parties have 7 days to agree on an arbitrator. If no agreement is reached, the platform will auto-assign from its curated panel. The flat filing fee ($500–$5,000 based on escrow tier) covers TrustLock's case management — the arbitrator's professional fees are determined separately by their institution. All arbitration follows ICC/UNCITRAL rules.
        </p>
      </CardContent>
    </Card>
  );
};

export default ArbitratorProposalPanel;

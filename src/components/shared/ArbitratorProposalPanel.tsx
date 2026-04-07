/**
 * ArbitratorProposalPanel — Shared component for buyer/vendor to propose
 * and respond to arbitrator nominations during dispute arbitration.
 *
 * Features:
 * - Embedded searchable arbitrator directory (by region/industry)
 * - Counter-proposal flow: rejecting auto-opens form to propose alternative
 * - 7-day auto-assign deadline with countdown
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, UserCheck, Clock, Check, X, Send, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ArbitratorDirectory from "./arbitrator/ArbitratorDirectory";
import ArbitratorProposalForm from "./arbitrator/ArbitratorProposalForm";
import ArbitratorCountdown from "./arbitrator/ArbitratorCountdown";

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
  const [isCounterProposal, setIsCounterProposal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [credentials, setCredentials] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const { data: proposals = [] } = useQuery({
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

  if (!disputeId || !["arbitration_pending", "arbitration_in_progress"].includes(disputeStatus)) {
    return null;
  }

  const myProposals = proposals.filter((p: any) => p.proposer_role === role);
  const theirProposals = proposals.filter((p: any) => p.proposer_role !== role);
  const acceptedProposal = proposals.find((p: any) => p.counterparty_response === "accepted");
  const hasAutoDeadlinePassed = proposals.some((p: any) => new Date(p.auto_assign_deadline) < new Date());

  const resetForm = () => {
    setName(""); setEmail(""); setInstitution(""); setCredentials("");
    setShowForm(false); setIsCounterProposal(false);
  };

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
      toast.success(isCounterProposal
        ? "Counter-proposal submitted. Waiting for counterparty response."
        : "Arbitrator proposal submitted. Waiting for counterparty response.");
      resetForm();
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
        await supabase.from("disputes")
          .update({ status: "arbitration_in_progress" })
          .eq("id", disputeId);
        toast.success("Arbitrator accepted! Arbitration proceedings will begin.");
      } else {
        toast.info("Proposal rejected. You can now submit a counter-proposal.");
        // Auto-open counter-proposal form
        setIsCounterProposal(true);
        setShowForm(true);
        setShowDirectory(true);
      }
      queryClient.invalidateQueries({ queryKey: ["arbitrator-proposals", disputeId] });
    } catch {
      toast.error("Failed to respond");
    }
  };

  const handleSelectInstitution = (institutionName: string) => {
    setInstitution(institutionName);
    setShowForm(true);
    if (!isCounterProposal) setIsCounterProposal(false);
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
                <X className="w-3 h-3" /> Reject & Counter-Propose
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
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setShowForm(!showForm); if (showForm) setIsCounterProposal(false); }}>
              <Scale className="w-3 h-3" /> {showForm ? "Cancel" : "Propose Arbitrator"}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setShowDirectory(!showDirectory)}>
              <BookOpen className="w-3 h-3" /> {showDirectory ? "Hide Directory" : "Browse Directory"}
            </Button>
          </div>
        )}

        {/* Embedded directory */}
        {showDirectory && !acceptedProposal && (
          <ArbitratorDirectory onSelectInstitution={handleSelectInstitution} />
        )}

        {/* Proposal form */}
        {showForm && !acceptedProposal && (
          <ArbitratorProposalForm
            name={name}
            email={email}
            institution={institution}
            credentials={credentials}
            submitting={submitting}
            onNameChange={setName}
            onEmailChange={setEmail}
            onInstitutionChange={setInstitution}
            onCredentialsChange={setCredentials}
            onSubmit={handleSubmitProposal}
            isCounterProposal={isCounterProposal}
          />
        )}

        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>Both parties have 7 days to agree on an arbitrator. If no agreement is reached, the platform will auto-assign from its curated panel.</p>
          <p><strong>You pay via OS Pay:</strong> TrustLock's flat case management fee only ($500–$5,000 by escrow tier). Institution filing fees and the arbitrator's professional fees are separate and paid directly to the chosen body.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArbitratorProposalPanel;

/**
 * Form for proposing an arbitrator — can be pre-filled from directory.
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface Props {
  name: string;
  email: string;
  institution: string;
  credentials: string;
  submitting: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onInstitutionChange: (v: string) => void;
  onCredentialsChange: (v: string) => void;
  onSubmit: () => void;
  isCounterProposal?: boolean;
}

const ArbitratorProposalForm = ({
  name, email, institution, credentials, submitting,
  onNameChange, onEmailChange, onInstitutionChange, onCredentialsChange,
  onSubmit, isCounterProposal,
}: Props) => (
  <div className="space-y-3 p-3 rounded-lg border bg-background">
    {isCounterProposal && (
      <p className="text-xs font-semibold text-primary">
        Counter-Proposal — Suggest your own arbitrator
      </p>
    )}
    <div className="space-y-1">
      <Label className="text-xs">Arbitrator Name *</Label>
      <Input value={name} onChange={e => onNameChange(e.target.value)} placeholder="Jane Doe, Esq." className="h-8 text-sm" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Email</Label>
      <Input value={email} onChange={e => onEmailChange(e.target.value)} placeholder="arbitrator@example.com" className="h-8 text-sm" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Institution</Label>
      <Input value={institution} onChange={e => onInstitutionChange(e.target.value)} placeholder="e.g. ICC, LCIA, KIAC" className="h-8 text-sm" />
    </div>
    <div className="space-y-1">
      <Label className="text-xs">Credentials / Qualifications</Label>
      <Textarea value={credentials} onChange={e => onCredentialsChange(e.target.value)} placeholder="Certified Arbitrator, 15yrs trade dispute experience..." rows={2} className="text-sm" />
    </div>
    <Button size="sm" className="gap-1" onClick={onSubmit} disabled={submitting}>
      <Send className="w-3 h-3" /> {isCounterProposal ? "Submit Counter-Proposal" : "Submit Proposal"}
    </Button>
  </div>
);

export default ArbitratorProposalForm;

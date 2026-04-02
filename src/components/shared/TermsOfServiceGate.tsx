import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";

const CURRENT_TOS_VERSION = "1.0";

interface TermsOfServiceGateProps {
  accepted: boolean;
  onAcceptChange: (accepted: boolean) => void;
}

const TermsOfServiceGate = ({ accepted, onAcceptChange }: TermsOfServiceGateProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {expanded && (
        <div className="rounded-lg border border-border bg-muted/30 p-1">
          <ScrollArea className="h-40 px-3 py-2">
            <div className="text-[11px] text-muted-foreground space-y-3 leading-relaxed">
              <p className="font-semibold text-foreground text-xs flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> TrustLock Platform Terms of Service (v{CURRENT_TOS_VERSION})
              </p>
              <p><strong>1. Service Description.</strong> TrustLock provides an escrow-based transaction platform that holds funds on behalf of transacting parties until pre-agreed conditions are met. By creating an account, you authorize TrustLock to receive, hold, and disburse funds according to the terms of each transaction.</p>
              <p><strong>2. Fee Authorization.</strong> You agree to TrustLock's published fee schedule, including but not limited to: transaction fees (up to 1.5% at checkout), escrow service fees (1.0% at release), and any third-party processor fees. Fees are non-refundable once a transaction is completed.</p>
              <p><strong>3. Escrow & Fund Holds.</strong> Funds deposited into escrow are held in regulated custodial accounts. TrustLock may freeze or place compliance holds on funds when required by law, internal risk policies, or regulatory obligations. You acknowledge the 14-day auto-release mechanism for undisputed milestone deliverables.</p>
              <p><strong>4. Dispute Resolution.</strong> In the event of a dispute, TrustLock will facilitate resolution through its internal arbitration process. Both parties agree to provide evidence within the specified timeframe. TrustLock's arbitration decisions are binding to the extent permitted by applicable law.</p>
              <p><strong>5. Compliance & AML.</strong> You consent to identity verification (KYC), sanctions screening, and anti-money laundering (AML) checks. TrustLock may report suspicious activity to relevant authorities as required by law (FATF, FinCEN, EFCC, and local equivalents).</p>
              <p><strong>6. Document Retention.</strong> Transaction records, contracts, and compliance documents are retained for a minimum of 7 years in accordance with international financial regulations.</p>
              <p><strong>7. Limitation of Liability.</strong> TrustLock acts as an escrow intermediary and is not a party to the underlying transaction between buyer and vendor. TrustLock's liability is limited to the fees collected for the specific transaction in dispute.</p>
              <p><strong>8. Governing Law.</strong> These terms are governed by the laws of the jurisdiction in which TrustLock is incorporated, with disputes subject to binding arbitration.</p>
              <p><strong>9. Amendments.</strong> TrustLock may update these terms with 30 days' notice. Continued use of the platform constitutes acceptance of updated terms.</p>
              <p><strong>10. Account Termination.</strong> TrustLock reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or fail compliance checks. Escrowed funds will be handled per applicable regulations.</p>
            </div>
          </ScrollArea>
        </div>
      )}
      <div className="flex items-start gap-2">
        <Checkbox
          id="tos-accept"
          checked={accepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor="tos-accept" className="text-xs text-muted-foreground leading-tight cursor-pointer">
          I have read and agree to the{" "}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:underline font-medium"
          >
            TrustLock Terms of Service
          </button>
          {" "}(v{CURRENT_TOS_VERSION}), including the escrow, fee, dispute resolution, and compliance policies.
        </label>
      </div>
    </div>
  );
};

export { CURRENT_TOS_VERSION };
export default TermsOfServiceGate;

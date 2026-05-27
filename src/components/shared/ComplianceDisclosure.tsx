import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, FileText, Scale } from "lucide-react";

/**
 * Mandatory legal disclosures users must acknowledge before transacting.
 * Adapts content based on amount thresholds and payment method.
 */
interface ComplianceDisclosureProps {
  amount: number;
  paymentMethod: string;
  userRole: "buyer" | "vendor";
  onAccept: () => void;
}

const ComplianceDisclosure = ({ amount, paymentMethod, userRole, onAccept }: ComplianceDisclosureProps) => {
  const [checks, setChecks] = useState({
    terms: false,
    aml: false,
    escrow: false,
    travel: false,
    highValue: false,
  });

  const isCrypto = ["azix", "crypto", "coinbase", "transak", "thirdweb"].includes(paymentMethod);
  const isHighValue = amount >= 10000;
  const isEDD = amount >= 3000;
  const needsTravelRule = isCrypto && amount >= 1000;

  // Determine which checkboxes are required
  const requiredChecks: (keyof typeof checks)[] = ["terms", "aml", "escrow"];
  if (needsTravelRule) requiredChecks.push("travel");
  if (isHighValue) requiredChecks.push("highValue");

  const allChecked = requiredChecks.every((k) => checks[k]);

  const toggle = (key: keyof typeof checks) =>
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Legal & Compliance Acknowledgement
          {isHighValue && (
            <Badge variant="destructive" className="text-[9px] ml-auto">
              HIGH VALUE
            </Badge>
          )}
          {isEDD && !isHighValue && (
            <Badge variant="secondary" className="text-[9px] ml-auto">
              EDD REQUIRED
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Core Terms */}
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={checks.terms} onCheckedChange={() => toggle("terms")} className="mt-0.5" />
          <span className="text-[11px] text-muted-foreground">
            I have read and agree to the <strong className="text-foreground">TrustLock Terms of Service</strong>,{" "}
            <strong className="text-foreground">Privacy Policy</strong>, and{" "}
            <strong className="text-foreground">Escrow Agreement</strong>. I understand TrustLock acts as a
            neutral custodian under <strong>UNCITRAL Model Law</strong> and <strong>ICC Uniform Rules</strong>.
          </span>
        </label>

        {/* AML Declaration */}
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={checks.aml} onCheckedChange={() => toggle("aml")} className="mt-0.5" />
          <span className="text-[11px] text-muted-foreground">
            I confirm the funds used in this transaction are from <strong className="text-foreground">legitimate sources</strong>,
            are not connected to money laundering, terrorist financing, or sanctions evasion, and I am not acting on behalf
            of a sanctioned entity. I consent to AML screening against <strong>OFAC SDN</strong>,{" "}
            <strong>EU Consolidated</strong>, and <strong>UN Security Council</strong> lists.
          </span>
        </label>

        {/* Escrow & Dispute Understanding */}
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={checks.escrow} onCheckedChange={() => toggle("escrow")} className="mt-0.5" />
          <span className="text-[11px] text-muted-foreground">
            I understand that funds will be held in <strong className="text-foreground">escrow</strong> until
            milestone conditions are met. {userRole === "buyer"
              ? "Funds are released only upon my approval or after the industry-adaptive auto-release window (14–90 days depending on industry). I may file a dispute or request an extension before the auto-release deadline."
              : "I will fulfill the agreed milestones before funds are released. I understand that buyers may file disputes and that I cannot file disputes directly — my protections are Reject Order and Flag for Review."}
            {" "}All disputes are subject to TrustLock's{" "}
            <a href="/dispute-policy" target="_blank" rel="noopener" className="text-primary underline font-medium">Dispute Resolution Policy</a>.
          </span>
        </label>

        {/* Travel Rule (crypto ≥$1K) */}
        {needsTravelRule && (
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={checks.travel} onCheckedChange={() => toggle("travel")} className="mt-0.5" />
            <span className="text-[11px] text-muted-foreground">
              I acknowledge that this crypto transaction of <strong className="text-foreground">${amount.toLocaleString()}</strong>{" "}
              requires <strong className="text-foreground">FATF Travel Rule</strong> compliance (Recommendation 16).
              My identity information will be securely transmitted to regulated counterparties as required by law.
            </span>
          </label>
        )}

        {/* High-Value Monitoring (≥$10K) */}
        {isHighValue && (
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={checks.highValue} onCheckedChange={() => toggle("highValue")} className="mt-0.5" />
            <span className="text-[11px] text-muted-foreground">
              I understand this transaction of <strong className="text-foreground">${amount.toLocaleString()}</strong>{" "}
              exceeds the <strong className="text-foreground">$10,000 CTR threshold</strong> and will be reported in
              accordance with <strong>FinCEN Currency Transaction Reporting</strong> requirements. This transaction
              is subject to enhanced monitoring and may require additional documentation.
            </span>
          </label>
        )}

        {/* EDD Notice */}
        {isEDD && (
          <div className="p-2.5 rounded-lg bg-muted/50 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Enhanced Due Diligence:</strong> Transactions above{" "}
              $3,000 are subject to additional identity verification and source-of-funds checks per
              FATF/AML guidelines. Your compliance record is maintained for 7 years.
            </p>
          </div>
        )}

        {/* Vendor Rejection & Gas Deduction Disclosure */}
        <div className="p-2.5 rounded-lg bg-muted/50 flex items-start gap-2">
          <Shield className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <strong className="text-foreground">Rejection & Refund Policy:</strong> If a vendor rejects
            your order, 100% of your principal is refunded with <strong>no cancellation fee</strong>.
            However, a nominal blockchain network gas fee (est. $0.01–$0.05 on Polygon) is deducted
            from the escrowed funds to process the on-chain refund. This is the only scenario where
            TrustLock deducts from escrow principal, as gas costs are variable and non-recoverable.
          </p>
        </div>

        {/* Legal references */}
        <div className="p-2 rounded-lg border border-border bg-muted/30 space-y-1">
          <p className="text-[9px] font-semibold flex items-center gap-1 text-muted-foreground">
            <FileText className="w-2.5 h-2.5" /> Regulatory Framework
          </p>
          <div className="flex flex-wrap gap-1">
            {["UNCITRAL Model Law", "ICC UCP 600", "FATF R.16", "eIDAS", "FinCEN BSA"].map((ref) => (
              <Badge key={ref} variant="outline" className="text-[8px] py-0">
                {ref}
              </Badge>
            ))}
          </div>
        </div>

        <Button className="w-full gap-2" disabled={!allChecked} onClick={onAccept}>
          <Shield className="w-4 h-4" /> I Acknowledge & Accept
        </Button>
      </CardContent>
    </Card>
  );
};

export default ComplianceDisclosure;

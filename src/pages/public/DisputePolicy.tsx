import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Scale, Clock, AlertTriangle, Users, Gavel, ArrowLeft, CheckCircle, XCircle, SplitSquareHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DisputePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Dispute Resolution Policy</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: April 2026 · Effective for all transactions processed through TrustLock
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["UNCITRAL Model Law", "ICC Arbitration Rules", "eIDAS", "FATF R.16"].map((ref) => (
              <Badge key={ref} variant="outline" className="text-[10px]">{ref}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Section 1: Overview */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> 1. Overview
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TrustLock provides an escrow-based dispute resolution framework designed to protect both buyers and vendors
            in cross-border and domestic trade transactions. All funds are held in auditable smart contracts on the
            Polygon blockchain until trade conditions are met or a dispute is formally resolved.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This policy governs the filing, review, and resolution of disputes on the TrustLock platform. By using
            TrustLock, both parties consent to this dispute resolution process as a condition of transacting.
          </p>
        </section>

        {/* Section 2: Who Can File */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> 2. Who Can File a Dispute
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" /> Buyers
                </h3>
                <p className="text-xs text-muted-foreground">
                  Buyers may file a dispute if goods or services are not delivered as agreed, are defective,
                  or do not match the description. The dispute must be filed within the <strong>14-day dispute window</strong> after
                  the vendor marks the order as delivered.
                </p>
                <Badge className="text-[10px] bg-primary/10 text-primary border-0">Can file disputes</Badge>
              </CardContent>
            </Card>
            <Card className="border-muted">
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-muted-foreground" /> Vendors
                </h3>
                <p className="text-xs text-muted-foreground">
                  Vendors <strong>cannot</strong> file disputes directly. Instead, vendors protect their interests through:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li><strong>Reject Order</strong> — Decline the order before fulfillment. Triggers an automatic 100% refund to the buyer with no cancellation fee.</li>
                  <li><strong>Flag for Review</strong> — Escalate the transaction for administrative intervention if suspicious activity is detected.</li>
                </ul>
                <Badge className="text-[10px] bg-muted text-muted-foreground border-0">Cannot file disputes</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3: Dispute Window */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> 3. Dispute Window & Auto-Release
          </h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">14</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">14-Day Dispute Window</p>
                  <p className="text-xs text-muted-foreground">
                    Once a vendor marks an order as delivered, the buyer has <strong>14 calendar days</strong> to confirm
                    receipt or open a dispute. This window applies to all transaction types (simple and milestone-based).
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent-foreground">48h</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">48-Hour Auto-Release</p>
                  <p className="text-xs text-muted-foreground">
                    If the buyer does not confirm delivery or file a dispute within <strong>48 hours</strong> after
                    delivery confirmation, funds are automatically released to the vendor. This protects vendors
                    from indefinite fund holds.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Stale Order Protection</p>
                  <p className="text-xs text-muted-foreground">
                    If a vendor accepts an order but fails to update its status (ship, fulfill milestones) within a
                    reasonable timeframe, the buyer may request administrative intervention. TrustLock reserves the
                    right to issue a force-refund to the buyer for unresponsive vendors.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Resolution Process */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" /> 4. Resolution Process
          </h2>
          <p className="text-sm text-muted-foreground">
            All disputes are processed through TrustLock's structured resolution pipeline:
          </p>

          {/* Steps */}
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "AI Pre-Screening (Emmanuel)",
                desc: "Every dispute is first analyzed by TrustLock's AI compliance assistant, Emmanuel, which reviews transaction history, milestone completion status, document signatures, and behavioral patterns to generate a confidence-scored recommendation.",
              },
              {
                step: "2",
                title: "Administrative Review",
                desc: "A TrustLock administrator reviews the AI recommendation alongside uploaded evidence from both parties. The admin then selects one of three resolution outcomes.",
              },
              {
                step: "3",
                title: "Resolution Execution",
                desc: "The chosen outcome is executed on-chain via the TrustLock smart contract. Both parties are notified, and all records are archived for the mandatory 7-year retention period.",
              },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Three Outcomes */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <SplitSquareHorizontal className="w-5 h-5 text-primary" /> 5. Resolution Outcomes
          </h2>
          <p className="text-sm text-muted-foreground">
            Every dispute concludes with one of three outcomes:
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-2 text-center">
                <CheckCircle className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-sm">Vendor Wins</h3>
                <p className="text-[11px] text-muted-foreground">
                  100% of escrowed funds are released to the vendor. The vendor fulfilled their obligations as agreed.
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/20">
              <CardContent className="p-4 space-y-2 text-center">
                <XCircle className="w-8 h-8 text-destructive mx-auto" />
                <h3 className="font-semibold text-sm">Buyer Wins</h3>
                <p className="text-[11px] text-muted-foreground">
                  100% of escrowed principal is refunded to the buyer. The vendor failed to deliver as promised.
                </p>
              </CardContent>
            </Card>
            <Card className="border-accent/20">
              <CardContent className="p-4 space-y-2 text-center">
                <SplitSquareHorizontal className="w-8 h-8 text-accent-foreground mx-auto" />
                <h3 className="font-semibold text-sm">Compromise</h3>
                <p className="text-[11px] text-muted-foreground">
                  Funds are split between buyer and vendor at a percentage determined by the admin or arbitrator (e.g., 60/40).
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 6: Arbitration */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> 6. External Arbitration
          </h2>
          <Card className="border-destructive/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-[10px]">≥ $10,000</Badge>
                <span className="text-sm font-medium text-foreground">High-Value Dispute Arbitration</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Disputes involving transactions of <strong>$10,000 or more</strong> are eligible for escalation to
                external arbitration. An independent arbitrator is assigned to review all evidence, interview parties
                if necessary, and issue a binding ruling.
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li><strong>Arbitration fee:</strong> 2% of the disputed transaction amount, borne by the losing party.</li>
                <li><strong>Timeline:</strong> Arbitrators are given 30 days to issue a ruling.</li>
                <li><strong>Acceptance:</strong> Both parties must acknowledge the ruling. If both accept, the ruling is executed on-chain.</li>
                <li><strong>Binding:</strong> Arbitration rulings are final and binding under ICC Arbitration Rules.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Section 7: Fees */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" /> 7. Fees & Deductions
          </h2>
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Scenario</th>
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Fee</th>
                      <th className="text-left py-2 font-semibold text-foreground">Who Pays</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Standard dispute resolution</td>
                      <td className="py-2 pr-4">No additional fee</td>
                      <td className="py-2">N/A</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Vendor rejects order</td>
                      <td className="py-2 pr-4">No fee (100% refund)</td>
                      <td className="py-2">N/A</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">External arbitration (≥$10K)</td>
                      <td className="py-2 pr-4">2% of transaction</td>
                      <td className="py-2">Losing party</td>
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2 pr-4">Buyer wins — refund</td>
                      <td className="py-2 pr-4">0.5% transaction fee (non-refundable)</td>
                      <td className="py-2">Already collected at checkout</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Vendor wins — release</td>
                      <td className="py-2 pr-4">1% escrow service fee</td>
                      <td className="py-2">Deducted from vendor principal</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 8: Evidence */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> 8. Evidence & Documentation
          </h2>
          <p className="text-sm text-muted-foreground">
            Both parties may upload evidence to support their case during a dispute. Accepted formats include:
          </p>
          <div className="flex flex-wrap gap-2">
            {["Photos/Screenshots", "PDF Documents", "Shipping Receipts", "Communication Logs", "Inspection Reports", "Contracts/Invoices"].map((item) => (
              <Badge key={item} variant="outline" className="text-[10px]">{item}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            All evidence is securely stored and retained for <strong>7 years</strong> in compliance with international
            record-keeping requirements. Evidence uploaded by one party is visible to the other party and the reviewing
            administrator or arbitrator.
          </p>
        </section>

        {/* Section 9: Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">9. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            TrustLock acts as a neutral technology platform providing escrow infrastructure. TrustLock is not a bank,
            financial institution, or legal advisor. TrustLock's total liability in any dispute is limited to the
            platform fees collected for that transaction. TrustLock shall not be liable for indirect, consequential,
            or punitive damages arising from any dispute resolution outcome.
          </p>
        </section>

        {/* Footer notice */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            This policy is subject to periodic updates. Continued use of TrustLock constitutes acceptance of the
            most current version. Questions? Contact <strong>legal@trustlock.io</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DisputePolicy;

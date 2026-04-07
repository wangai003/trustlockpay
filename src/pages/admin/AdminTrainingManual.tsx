import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, ExternalLink, Scale, DollarSign, Shield, Clock, Upload, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PDF_URL = "/TrustLock_Admin_Training_Manual.pdf";

const AdminTrainingManual = () => {
  return (
    <div>
      <AdminHeader title="Admin Training Manual" />
      <div className="p-4 sm:p-6 space-y-6">
        {/* PDF Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              TrustLock Admin Training Manual v2.0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Comprehensive guide covering procedures, policies, chain of command, AI tools,
              messaging protocol, escalation rules, and everything new admin staff need to know.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2" onClick={() => window.open(PDF_URL, "_blank")}>
                <ExternalLink className="w-4 h-4" /> View PDF
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={PDF_URL} download="TrustLock_Admin_Training_Manual.pdf">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              </Button>
            </div>
            <div className="mt-6 border rounded-lg overflow-hidden bg-muted/30" style={{ height: "70vh" }}>
              <iframe src={PDF_URL} title="Admin Training Manual" className="w-full h-full border-0" />
            </div>
          </CardContent>
        </Card>

        {/* Arbitration & Dispute Resolution Addendum */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="w-5 h-5 text-primary" />
              Addendum: Arbitration & Dispute Resolution Procedures
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete guide for chief admins on managing professional arbitration cases — from fee collection through ruling enforcement.
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full space-y-2">
              {/* Section 1: Overview */}
              <AccordionItem value="overview">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> 1. Arbitration Overview</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Professional arbitration is a <strong>user-initiated last resort</strong> for disputes involving ≥ $10,000 in escrow value. TrustLock operates a <strong>"Party selection (no admin)"</strong> model — both buyer and vendor propose and agree on an arbitrator. Admin's role is facilitation, not adjudication.</p>
                  <div className="p-3 bg-primary/5 rounded-lg border">
                    <p className="font-medium text-foreground mb-1">Key Principles:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Both buyers and vendors can file disputes and request arbitration</li>
                      <li>TrustLock never selects the arbitrator — parties negotiate</li>
                      <li>If parties can't agree within 7 days, TrustLock assigns from the institution directory</li>
                      <li>Admin facilitates: packages case files, generates portal access, distributes rulings</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 2: Fee Structure */}
              <AccordionItem value="fees">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> 2. Case Management Fee Structure</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>TrustLock charges a <strong>flat Case Management Fee</strong> that covers facilitation costs (case file packaging, portal hosting, blockchain anchoring). This is <strong>separate</strong> from the arbitrator's professional fees.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="p-2 text-left border">Escrow Amount</th>
                          <th className="p-2 text-left border">TrustLock Fee</th>
                          <th className="p-2 text-left border">External Fees</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td className="p-2 border">$10,000 – $49,999</td><td className="p-2 border font-medium">$500</td><td className="p-2 border text-muted-foreground">Filing + arbitrator fees vary by institution</td></tr>
                        <tr><td className="p-2 border">$50,000 – $99,999</td><td className="p-2 border font-medium">$1,000</td><td className="p-2 border text-muted-foreground">Filing + arbitrator fees vary by institution</td></tr>
                        <tr><td className="p-2 border">$100,000 – $499,999</td><td className="p-2 border font-medium">$2,500</td><td className="p-2 border text-muted-foreground">Filing + arbitrator fees vary by institution</td></tr>
                        <tr><td className="p-2 border">$500,000+</td><td className="p-2 border font-medium">$5,000</td><td className="p-2 border text-muted-foreground">Filing + arbitrator fees vary by institution</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-amber-800 dark:text-amber-300 text-xs"><strong>Important:</strong> Arbitrator professional fees and institutional filing fees are <em>not</em> set by TrustLock and vary by institution (ICC, SIAC, KIAC, AAA, etc.). Direct parties to the institution's published fee schedule. The OS Pay checkout auto-calculates the TrustLock fee based on the disputed escrow amount.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 3: Payment Flow */}
              <AccordionItem value="payment-flow">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> 3. OS Pay Payment Flow (Option B)</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Arbitration fees use <strong>Option B — in-context auto-calculation</strong>. When a party triggers arbitration from their dispute dashboard:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li><strong>Trigger:</strong> User clicks "Request Arbitration" inside the dispute detail panel</li>
                    <li><strong>Auto-calculate:</strong> System pulls the disputed escrow amount from the database and computes the TrustLock Case Management Fee using the tiered formula</li>
                    <li><strong>Fee breakdown:</strong> User sees: TrustLock fee (exact), external fees (noted as variable), total TrustLock charges</li>
                    <li><strong>Accept & Pay:</strong> User confirms → routed to OS Pay final checkout with pre-filled amount</li>
                    <li><strong>Payment recorded:</strong> `arbitration_fee_orders` table updated with status, OS payment ID, and transaction reference</li>
                    <li><strong>Admin notified:</strong> Fee payment triggers admin notification and unlocks arbitration workflow phases</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              {/* Section 4: 7-Phase Procedure */}
              <AccordionItem value="seven-phases">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-primary" /> 4. 7-Phase Arbitration Procedure</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                  {[
                    { phase: 1, title: "Fee Confirmation", icon: DollarSign, desc: "Verify that the requesting party's Case Management Fee has been received via OS Pay. Check the `arbitration_fee_orders` table for status = 'paid'. Do NOT proceed until payment is confirmed." },
                    { phase: 2, title: "Case File Packaging", icon: FileText, desc: "Use the 'Package Case File' button in Admin Disputes. The system automatically compiles: transaction details, milestone history, all uploaded evidence, chat logs, compliance flags, and blockchain proofs into a single downloadable bundle for the arbitrator." },
                    { phase: 3, title: "7-Day Monitoring Window", icon: Clock, desc: "Both parties have 7 days to agree on an arbitrator via the proposal/counter-proposal workflow. Monitor the atomic countdown timer. If a proposal is rejected, the rejecting party must immediately propose an alternative. If no agreement is reached by deadline, proceed to admin assignment." },
                    { phase: 4, title: "Portal Link Generation", icon: Shield, desc: "Once an arbitrator is confirmed, generate a secure portal link via the Arbitrator Management System (AMS). The portal provides: hashed credentials, case file access, evidence review, and ruling upload capability. Share the link + password with the arbitrator via their registered email." },
                    { phase: 5, title: "Ruling Upload & Review", icon: Upload, desc: "The arbitrator uploads their ruling document through the secure portal. Upon upload, the system automatically: revokes portal access, anchors the ruling hash (SHA-256) to Polygon blockchain, and transitions the dispute status to 'ruling_issued'." },
                    { phase: 6, title: "Ruling Execution", icon: CheckCircle, desc: "Distribute the ruling document to all party dashboards (admin, buyer, vendor). The ruling is archived in each party's documents section under 'Arbitrator Ruling'. Execute the arbitrator's decision: release funds, split escrow, or refund as directed." },
                    { phase: 7, title: "Archiving & Compliance", icon: Shield, desc: "All case materials, the ruling, blockchain anchors, and fee records are permanently archived. Retention period: 7 years minimum. Documents are indexed by transaction ID and accessible through the Documents tab across all dashboards." },
                  ].map(({ phase, title, icon: Icon, desc }) => (
                    <div key={phase} className="flex gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{phase}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-primary" /> {title}
                        </p>
                        <p className="text-xs mt-1">{desc}</p>
                      </div>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Section 5: Arbitrator Portal (AMS) */}
              <AccordionItem value="ams">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> 5. Arbitrator Management System (AMS)</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>The AMS automates the arbitrator lifecycle:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Secure portal:</strong> Each arbitrator gets a unique URL (`/arbitrator/:token`) with hashed password credentials</li>
                    <li><strong>Case file access:</strong> Portal displays the packaged case bundle, evidence, and transaction timeline</li>
                    <li><strong>Ruling upload:</strong> Arbitrator uploads their ruling document (PDF) directly through the portal</li>
                    <li><strong>Auto-revocation:</strong> Portal access is immediately revoked upon ruling upload</li>
                    <li><strong>Blockchain anchoring:</strong> Ruling hash (SHA-256) is anchored to Polygon for immutability</li>
                    <li><strong>Distribution:</strong> Ruling document is automatically cloned and archived across admin, buyer, and vendor dashboards</li>
                  </ul>
                  <div className="p-3 bg-primary/5 rounded-lg border">
                    <p className="font-medium text-foreground mb-1">Admin Actions in AMS:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Generate portal link + temporary password</li>
                      <li>Package and attach case file bundle</li>
                      <li>Monitor arbitrator activity (access count, last accessed)</li>
                      <li>Manually revoke access if needed</li>
                      <li>Track ruling upload and distribution status</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 6: Arbitrator Selection Process */}
              <AccordionItem value="selection">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> 6. Arbitrator Selection & Counter-Proposal</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>The party-driven selection workflow:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Either party browses the embedded institution directory (ICC, SIAC, KIAC, AAA, LCIA, etc.)</li>
                    <li>The proposing party submits an arbitrator name, institution, and optional credentials</li>
                    <li>The counterparty receives a notification and has 7 days to accept or reject</li>
                    <li><strong>If accepted:</strong> Admin is notified → proceed to portal generation</li>
                    <li><strong>If rejected:</strong> The rejecting party must immediately propose an alternative — the system enforces this</li>
                    <li><strong>If 7-day deadline expires:</strong> TrustLock admin assigns an arbitrator from the directory based on dispute jurisdiction and amount</li>
                  </ol>
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-xs text-amber-800 dark:text-amber-300"><strong>Admin Note:</strong> The atomic countdown timer is visible to both parties. Admins should monitor proposals approaching the deadline and prepare a backup assignment recommendation.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 7: Ruling Distribution */}
              <AccordionItem value="ruling">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> 7. Ruling Distribution & Enforcement</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>When an arbitrator uploads their ruling:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Portal access is automatically revoked</li>
                    <li>Ruling document is hashed (SHA-256) and anchored to Polygon blockchain</li>
                    <li>Dispute status transitions to <Badge variant="secondary" className="text-[10px]">ruling_issued</Badge></li>
                    <li>The ruling PDF is cloned and archived to:
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        <li><strong>Admin dashboard:</strong> Documents → Arbitrator Rulings</li>
                        <li><strong>Buyer dashboard:</strong> Documents → Arbitrator Rulings</li>
                        <li><strong>Vendor dashboard:</strong> Documents → Arbitrator Rulings</li>
                      </ul>
                    </li>
                    <li>All parties receive notifications with the ruling reference</li>
                    <li>Admin executes the ruling: releases, splits, or refunds escrow funds as directed</li>
                  </ol>
                  <div className="p-3 bg-primary/5 rounded-lg border">
                    <p className="text-xs"><strong>Blockchain proof:</strong> The ruling's SHA-256 hash is permanently recorded on Polygon. This provides immutable evidence that the document has not been tampered with. The proof is viewable in Blockchain Proofs → transaction timeline.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 8: Compliance & Recordkeeping */}
              <AccordionItem value="compliance">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> 8. Compliance & Recordkeeping</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Retention:</strong> All arbitration materials retained for minimum 7 years</li>
                    <li><strong>Audit trail:</strong> Every action logged in `admin_action_log` with timestamps, admin ID, and justification</li>
                    <li><strong>Evidence chain:</strong> All uploaded evidence is immutably stored with SHA-256 hashes</li>
                    <li><strong>Financial records:</strong> Case management fee payments tracked in `arbitration_fee_orders` with OS Pay payment IDs</li>
                    <li><strong>Cross-border compliance:</strong> Arbitrator selection considers jurisdiction — institutions are tagged by region and specialization</li>
                    <li><strong>Document scanning:</strong> Uploaded ruling documents are automatically scanned for authenticity via the document scanner</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              {/* Section 9: Department Divisions */}
              <AccordionItem value="departments">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> 9. Admin Department Divisions</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Admin staff are organized into specialized departments. Each department has scoped access to specific platform modules:</p>
                  <div className="space-y-2">
                    {[
                      { name: "Executive Office", desc: "Full platform access. Chief Admin oversight, staff management, overrides, analytics." },
                      { name: "Correspondence & Client Relations", desc: "Anonymous client messaging (TL-Agent handles), notification triage, onboarding support. Only department with direct client messaging access (alongside Executive)." },
                      { name: "Disputes & Arbitration", desc: "Dispute management, arbitration fees, case file packaging, arbitrator portal, ruling enforcement." },
                      { name: "Finance & Payouts", desc: "OS Pay, payout processing, fee auditing, gas treasury, tax remittance, revenue analytics." },
                      { name: "Compliance & Risk", desc: "KYC/KYB review, sanctions screening, document scanning, compliance flags, anti-structuring." },
                      { name: "Operations & Workflow", desc: "Transaction monitoring, milestone verification, vendor/buyer accounts, platform config, blockchain proofs." },
                    ].map(d => (
                      <div key={d.name} className="p-2 border rounded-lg bg-muted/30">
                        <p className="font-medium text-foreground text-xs">{d.name}</p>
                        <p className="text-[11px]">{d.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border">
                    <p className="text-xs"><strong>Communication Rules:</strong> Team chat is department-scoped — only members of the same department can correspond. Executive team can transcend into any department channel. Client messaging is restricted to Correspondence & Executive departments only.</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTrainingManual;

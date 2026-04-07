import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield, FileText, AlertTriangle, Scale, Clock, Globe,
  CheckCircle2, Fingerprint, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Industry-Specific Clause Templates ───────────────────
interface IndustryClauseSet {
  label: string;
  escrowDisclaimer: string;
  riskWarnings: string[];
  specialClauses: string[];
  holdbackApplicable: boolean;
  holdbackDescription?: string;
  arbitrationThreshold: number; // USD above which external arbitration is recommended
  documentRetentionYears: number;
}

const INDUSTRY_CLAUSES: Record<string, IndustryClauseSet> = {
  "e-commerce": {
    label: "E-Commerce / Retail",
    escrowDisclaimer:
      "TrustLock acts solely as a neutral escrow intermediary. Funds are held in a non-custodial smart contract and released only upon buyer confirmation of receipt or expiry of the 14-day auto-release window. TrustLock does not inspect, guarantee, or warrant the quality, authenticity, or fitness of any product.",
    riskWarnings: [
      "Product may differ from seller description or images.",
      "Shipping delays, customs holds, or carrier damage are outside TrustLock's control.",
      "Refund eligibility is subject to dispute resolution timelines.",
    ],
    specialClauses: [
      "Buyer must confirm delivery within 14 calendar days of the vendor marking the order as shipped, or funds will auto-release to the vendor.",
      "Disputes must be filed before the auto-release deadline to pause fund disbursement.",
    ],
    holdbackApplicable: false,
    arbitrationThreshold: 10000,
    documentRetentionYears: 3,
  },
  "real-estate": {
    label: "Real Estate & Property",
    escrowDisclaimer:
      "TrustLock facilitates milestone-based escrow for real estate transactions as a technology platform only. TrustLock is not a licensed real estate broker, title company, or attorney. All parties are advised to retain independent legal counsel. Fund releases follow the mutually agreed milestone schedule and require documented proof of completion.",
    riskWarnings: [
      "Property valuations, title searches, and legal due diligence are the responsibility of the transacting parties.",
      "TrustLock does not guarantee clear title, property condition, or zoning compliance.",
      "Regulatory requirements (e.g., FIRPTA, stamp duty) vary by jurisdiction and are the parties' obligation.",
      "Force majeure events (natural disasters, government actions) may affect transaction timelines.",
    ],
    specialClauses: [
      "A mandatory third-party observer (attorney, notary, or licensed inspector) must sign off on the Closing milestone before funds are released.",
      "All milestone document uploads are immutable and retained for 7 years per cross-border compliance requirements.",
      "Either party may request a 30-day extension on any milestone with mutual written consent.",
    ],
    holdbackApplicable: true,
    holdbackDescription:
      "90% of the closing milestone funds are released upon execution of transfer documents. The remaining 10% is held for 30 days pending final inspection, regulatory clearance, or defect remediation as agreed by both parties.",
    arbitrationThreshold: 10000,
    documentRetentionYears: 7,
  },
  "professional-services": {
    label: "Professional / Freelance Services",
    escrowDisclaimer:
      "TrustLock holds project funds in escrow and releases them upon milestone completion as confirmed by both parties. TrustLock does not evaluate the quality of work delivered, provide professional opinions, or mediate scope disputes beyond facilitating communication between parties.",
    riskWarnings: [
      "Scope creep and deliverable ambiguity are common sources of disputes — clearly define milestones before locking funds.",
      "IP ownership transfers only upon final milestone release unless otherwise agreed in writing.",
      "TrustLock cannot enforce non-compete, NDA, or IP clauses between parties.",
    ],
    specialClauses: [
      "Each milestone release requires explicit buyer approval or 14-day auto-release window.",
      "Partial refunds follow the milestone completion percentage at time of cancellation.",
    ],
    holdbackApplicable: false,
    arbitrationThreshold: 10000,
    documentRetentionYears: 3,
  },
  "agriculture-cargo": {
    label: "Agriculture & Cargo Shipping",
    escrowDisclaimer:
      "TrustLock provides escrow infrastructure for agricultural commodity and cargo transactions. TrustLock does not inspect shipments, verify commodity grades, or guarantee delivery timelines. All phytosanitary, customs, and trade compliance obligations rest with the buyer and vendor. Funds are released per the agreed milestone schedule upon receipt of required shipping documents.",
    riskWarnings: [
      "Perishable goods are subject to spoilage, temperature excursions, and transit delays beyond TrustLock's control.",
      "Import/export regulations, tariffs, embargoes, and sanctions vary by jurisdiction — parties must ensure compliance independently.",
      "Bill of Lading discrepancies, short shipments, and quality disputes require third-party inspection evidence.",
      "Currency fluctuation risk between order placement and payout is borne by the receiving party.",
    ],
    specialClauses: [
      "Mandatory document gates: Export License, Phytosanitary Certificate, Bill of Lading, and Certificate of Origin must be uploaded before the corresponding milestone can be marked complete.",
      "Observer sign-off from a certified inspector or customs broker is required at Loading and Customs Clearance milestones.",
      "All cross-border trade documents are retained for 7 years per international trade compliance standards.",
    ],
    holdbackApplicable: true,
    holdbackDescription:
      "90% of the final Delivery & Acceptance milestone is released upon receipt confirmation. 10% is held for 14 days pending quality report approval and any short-shipment claims.",
    arbitrationThreshold: 10000,
    documentRetentionYears: 7,
  },
  "mining-minerals": {
    label: "Mining & Minerals Export",
    escrowDisclaimer:
      "TrustLock provides escrow technology for mining and mineral trade transactions. TrustLock does not certify mineral origins, purity, or conflict-free status. All Kimberley Process, LBMA, or equivalent certifications are the vendor's responsibility. TrustLock is not liable for assay discrepancies, regulatory seizures, or export ban enforcement.",
    riskWarnings: [
      "Mineral assay results may vary between vendor's lab and buyer's independent verification.",
      "Conflict mineral regulations (Dodd-Frank Section 1502, EU Conflict Minerals Regulation) may apply — compliance is the parties' obligation.",
      "Government royalties, mining levies, and export duties are not included in TrustLock fees and must be settled independently.",
      "Sanctions screening is performed at checkout but does not constitute legal advice on OFAC/EU/UN compliance.",
    ],
    specialClauses: [
      "Mandatory Contract Upload: Both parties must acknowledge the trade contract before any milestone begins.",
      "Assay Certificate from an accredited laboratory must be uploaded at the first milestone.",
      "Export License from the origin country's mining authority is required before the Shipping milestone.",
      "A certified third-party observer must sign off on Loading, Customs, and Delivery milestones.",
      "All mineral trade documents are retained for 7 years per AML/CFT compliance.",
    ],
    holdbackApplicable: true,
    holdbackDescription:
      "90% of the final milestone is released upon buyer's independent assay verification. 10% is held for 30 days pending purity confirmation and any weight/grade discrepancy claims.",
    arbitrationThreshold: 10000,
    documentRetentionYears: 7,
  },
  "construction": {
    label: "Construction & Contracting",
    escrowDisclaimer:
      "TrustLock facilitates milestone-based payment escrow for construction projects. TrustLock is not a licensed contractor, engineer, or building inspector. All building permits, safety certifications, and code compliance are the responsibility of the contractor and property owner.",
    riskWarnings: [
      "Construction delays due to weather, permits, labor shortages, or supply chain issues are outside TrustLock's control.",
      "Lien rights and mechanic's liens vary by jurisdiction — consult local counsel.",
      "Change orders that modify the original scope require mutual milestone re-agreement through TrustLock's change request protocol.",
    ],
    specialClauses: [
      "Progress photos or inspection reports are required at each milestone before fund release.",
      "A licensed building inspector may serve as the third-party observer for structural milestones.",
      "Retention/holdback of 10% applies to the final completion milestone pending punch-list sign-off.",
    ],
    holdbackApplicable: true,
    holdbackDescription:
      "90% of the final milestone is released upon substantial completion. 10% is retained for 30 days pending punch-list remediation and final inspection.",
    arbitrationThreshold: 10000,
    documentRetentionYears: 7,
  },
  "logistics-freight": {
    label: "Logistics & Freight",
    escrowDisclaimer:
      "TrustLock provides escrow for logistics and freight transactions. TrustLock does not operate vessels, trucks, or aircraft and bears no liability for carrier performance, transit damage, or delivery delays. All carrier insurance and liability coverage must be arranged independently by the shipper.",
    riskWarnings: [
      "Transit times are estimates — port congestion, weather, and customs delays are common.",
      "Cargo insurance is the shipper's responsibility; TrustLock does not provide or underwrite insurance.",
      "Demurrage and detention charges are not covered by TrustLock escrow.",
    ],
    specialClauses: [
      "Bill of Lading must be uploaded before the Shipping milestone is marked complete.",
      "Proof of Delivery (POD) with recipient signature is required to release final funds.",
      "Claims for damage or shortage must be filed within 48 hours of delivery with photographic evidence.",
    ],
    holdbackApplicable: false,
    arbitrationThreshold: 10000,
    documentRetentionYears: 5,
  },
  "hospitality": {
    label: "Hospitality & Travel",
    escrowDisclaimer:
      "TrustLock holds booking deposits and service fees in escrow. TrustLock does not operate hotels, venues, or travel services and is not liable for service quality, overbooking, or cancellation policies set by the vendor.",
    riskWarnings: [
      "Cancellation policies are set by the vendor — review before confirming payment.",
      "Travel advisories, visa requirements, and health regulations are the traveler's responsibility.",
      "Force majeure (natural disasters, pandemics) may trigger vendor cancellation outside TrustLock's control.",
    ],
    specialClauses: [
      "Deposit release follows the vendor's stated cancellation policy timeline.",
      "Service completion confirmation by the buyer triggers final payment release.",
    ],
    holdbackApplicable: false,
    arbitrationThreshold: 5000,
    documentRetentionYears: 3,
  },
  default: {
    label: "General Transaction",
    escrowDisclaimer:
      "TrustLock acts as a neutral escrow intermediary using smart contract technology. Funds are held securely and released only upon fulfillment of agreed conditions. TrustLock does not inspect, evaluate, or guarantee the goods, services, or obligations exchanged between parties.",
    riskWarnings: [
      "All representations about goods or services are made by the vendor — TrustLock does not verify claims.",
      "Dispute resolution timelines depend on evidence submission by both parties.",
      "Auto-release of funds occurs 14 days after milestone fulfillment if the buyer takes no action.",
    ],
    specialClauses: [
      "Both parties consent to TrustLock's escrow protocol and fee schedule as displayed at checkout.",
      "Disputes above the arbitration threshold may be escalated to a certified third-party arbitrator at the requesting party's expense.",
    ],
    holdbackApplicable: false,
    arbitrationThreshold: 10000,
    documentRetentionYears: 3,
  },
};

// ─── Universal Clauses (always included) ──────────────────
const UNIVERSAL_CLAUSES = [
  "TrustLock is a technology platform providing escrow infrastructure. TrustLock is not a bank, financial institution, or legal advisor.",
  "All escrow actions (lock, release, refund, split) are executed via smart contracts on the Polygon blockchain. Gas fees apply.",
  "TrustLock reserves the right to freeze funds and escalate to external arbitration if fraud, sanctions violations, or AML red flags are detected.",
  "TrustLock's total liability in any transaction is limited to the platform fees collected for that transaction. TrustLock shall not be liable for indirect, consequential, or punitive damages.",
  "By proceeding, both parties consent to electronic signatures, digital record-keeping, and TrustLock's dispute resolution process as outlined in the Dispute Resolution Policy (available at /dispute-policy). Buyers may file disputes within 14 days of delivery; vendors protect their interests via Reject Order or Flag for Review. Resolution outcomes include: Vendor Wins (100% release), Buyer Wins (100% refund), or Compromise (admin-determined split).",
  "Sanctions screening is performed using OFAC, EU, and UN consolidated lists. Flagged transactions are blocked pending manual review.",
  "TrustLock may update its fee schedule, policies, and protocols with 30 days' notice. Continued use constitutes acceptance.",
];

// ─── Component ────────────────────────────────────────────
interface AcknowledgementFormProps {
  industry?: string;
  orderAmount?: number;
  buyerName?: string;
  vendorName?: string;
  txId?: string;
  milestoneCount?: number;
  onAccept: () => void;
  onDecline?: () => void;
  requireTypedSignature?: boolean;
}

const AcknowledgementForm = ({
  industry,
  orderAmount = 0,
  buyerName = "Buyer",
  vendorName = "Vendor",
  txId,
  milestoneCount = 1,
  onAccept,
  onDecline,
  requireTypedSignature = true,
}: AcknowledgementFormProps) => {
  const [checkedClauses, setCheckedClauses] = useState<Record<string, boolean>>({});
  const [typedName, setTypedName] = useState("");
  const nameMatch = !requireTypedSignature || typedName.trim().toLowerCase() === buyerName.trim().toLowerCase();

  const clauses = useMemo(() => {
    const key = industry && INDUSTRY_CLAUSES[industry] ? industry : "default";
    return INDUSTRY_CLAUSES[key];
  }, [industry]);

  const allCheckboxIds = useMemo(() => {
    const ids: string[] = ["escrow-disclaimer", "liability-waiver", "auto-release-consent"];
    clauses.riskWarnings.forEach((_, i) => ids.push(`risk-${i}`));
    clauses.specialClauses.forEach((_, i) => ids.push(`special-${i}`));
    if (clauses.holdbackApplicable) ids.push("holdback-consent");
    if (orderAmount >= clauses.arbitrationThreshold) ids.push("arbitration-consent");
    return ids;
  }, [clauses, orderAmount]);

  const allChecked = allCheckboxIds.every((id) => checkedClauses[id]);
  const checkedCount = allCheckboxIds.filter((id) => checkedClauses[id]).length;
  const progress = allCheckboxIds.length > 0 ? (checkedCount / allCheckboxIds.length) * 100 : 0;

  const toggle = (id: string) => {
    setCheckedClauses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  return (
    <Card className="border-2 border-primary/30 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">TrustLock Escrow Acknowledgement</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {clauses.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Both parties must review and accept all clauses below before funds are locked in escrow.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Header Info ─────────────────── */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-muted/50 rounded-lg p-3">
          <div><span className="text-muted-foreground">Order:</span> <span className="font-medium">{txId ?? "Pending"}</span></div>
          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{formattedDate}</span></div>
          <div><span className="text-muted-foreground">Buyer:</span> <span className="font-medium">{buyerName}</span></div>
          <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{vendorName}</span></div>
          <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">${orderAmount.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Milestones:</span> <span className="font-medium">{milestoneCount}</span></div>
        </div>

        {/* ── Progress Bar ─────────────────── */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Clauses acknowledged</span>
            <span>{checkedCount}/{allCheckboxIds.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn("h-2 rounded-full transition-all", allChecked ? "bg-green-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ScrollArea className="max-h-[400px] pr-2">
          <div className="space-y-4">
            {/* ── 1. Escrow Disclaimer ─────────── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Lock className="h-4 w-4 text-primary" /> Escrow Service Disclaimer
              </h3>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                {clauses.escrowDisclaimer}
              </p>
              <ClauseCheckbox
                id="escrow-disclaimer"
                checked={!!checkedClauses["escrow-disclaimer"]}
                onToggle={() => toggle("escrow-disclaimer")}
                label="I have read and understand the escrow service disclaimer."
              />
            </section>

            <Separator />

            {/* ── 2. Risk Warnings ─────────────── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Warnings — {clauses.label}
              </h3>
              <div className="space-y-2">
                {clauses.riskWarnings.map((warning, i) => (
                  <ClauseCheckbox
                    key={i}
                    id={`risk-${i}`}
                    checked={!!checkedClauses[`risk-${i}`]}
                    onToggle={() => toggle(`risk-${i}`)}
                    label={warning}
                  />
                ))}
              </div>
            </section>

            <Separator />

            {/* ── 3. Special Industry Clauses ──── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <FileText className="h-4 w-4 text-blue-500" /> Industry-Specific Terms
              </h3>
              <div className="space-y-2">
                {clauses.specialClauses.map((clause, i) => (
                  <ClauseCheckbox
                    key={i}
                    id={`special-${i}`}
                    checked={!!checkedClauses[`special-${i}`]}
                    onToggle={() => toggle(`special-${i}`)}
                    label={clause}
                  />
                ))}
              </div>
            </section>

            {/* ── 4. Holdback Clause (conditional) */}
            {clauses.holdbackApplicable && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Lock className="h-4 w-4 text-orange-500" /> 90/10 Escrow Holdback Clause
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    {clauses.holdbackDescription}
                  </p>
                  <ClauseCheckbox
                    id="holdback-consent"
                    checked={!!checkedClauses["holdback-consent"]}
                    onToggle={() => toggle("holdback-consent")}
                    label="I consent to the 90/10 holdback arrangement as described above."
                  />
                </section>
              </>
            )}

            {/* ── 5. Arbitration Escalation (high-value) */}
            {orderAmount >= clauses.arbitrationThreshold && (
              <>
                <Separator />
                 <section>
                   <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                     <Scale className="h-4 w-4 text-purple-500" /> Professional Arbitration Clause
                   </h3>
                   <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                     This transaction exceeds ${clauses.arbitrationThreshold.toLocaleString()}. In the event of an
                     unresolved dispute, either party (buyer or vendor) may request escalation to a professional
                     arbitrator as a last resort. The requesting party pays a non-refundable <strong>Arbitration Filing
                     &amp; Case Management Fee of 2%</strong> of the escrowed principal via TrustLock OS Pay, which covers
                     case coordination and document packaging. The appointed arbitrator's professional fees are
                     separate and determined by their institution's published schedule after appointment. The
                     arbitrator may award costs to the prevailing party. TrustLock's internal dispute resolution
                     remains the mandatory first step. All arbitration follows ICC/UNCITRAL rules and rulings are
                     binding under the New York Convention.
                   </p>
                   <ClauseCheckbox
                     id="arbitration-consent"
                     checked={!!checkedClauses["arbitration-consent"]}
                     onToggle={() => toggle("arbitration-consent")}
                     label="I acknowledge the professional arbitration process, the tiered flat filing fee ($500–$5,000 based on escrow amount) payable by the requesting party, and that the arbitrator's professional fees are determined separately."
                   />
                 </section>
              </>
            )}

            <Separator />

            {/* ── 6. Liability Waiver ──────────── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Shield className="h-4 w-4 text-red-500" /> Liability Limitation & Waiver
              </h3>
              <div className="text-xs text-muted-foreground space-y-1 mb-2">
                {UNIVERSAL_CLAUSES.map((clause, i) => (
                  <p key={i} className="leading-relaxed">• {clause}</p>
                ))}
              </div>
              <ClauseCheckbox
                id="liability-waiver"
                checked={!!checkedClauses["liability-waiver"]}
                onToggle={() => toggle("liability-waiver")}
                label="I have read all universal platform terms and accept the liability limitations."
              />
            </section>

            <Separator />

            {/* ── 7. Auto-Release Consent ──────── */}
            <section>
              <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                <Clock className="h-4 w-4 text-primary" /> 14-Day Auto-Release Policy
              </h3>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                If the buyer does not confirm receipt or file a dispute within 14 calendar days of the
                vendor marking a milestone as fulfilled, funds for that milestone will automatically
                release to the vendor. This is a non-reversible action enforced by smart contract logic.
              </p>
              <ClauseCheckbox
                id="auto-release-consent"
                checked={!!checkedClauses["auto-release-consent"]}
                onToggle={() => toggle("auto-release-consent")}
                label="I consent to the 14-day auto-release policy for each milestone."
              />
            </section>
          </div>
        </ScrollArea>

        {/* ── Digital Signature Block ──────── */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Fingerprint className="h-4 w-4 text-primary" /> Digital Consent Record
          </div>
          <p className="text-muted-foreground">
            By clicking "Accept & Lock Funds", a timestamped digital signature record will be
            created capturing your consent, IP address, and browser fingerprint for evidentiary purposes.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedDate} at {formattedTime}</span>
          </div>
          <p className="text-muted-foreground">
            Document retention: <span className="font-medium">{clauses.documentRetentionYears} years</span> per
            applicable compliance standards.
          </p>
        </div>

        {/* ── Typed Signature (when required) ── */}
        {requireTypedSignature && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5" /> Type Your Full Legal Name to Sign
            </Label>
            <Input
              placeholder={`Type "${buyerName}" to confirm acknowledgement`}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className={cn(
                "text-sm",
                typedName.length > 0 && nameMatch && "border-green-500 ring-1 ring-green-500/30",
                typedName.length > 0 && !nameMatch && "border-red-500 ring-1 ring-red-500/30"
              )}
            />
            {typedName.length > 0 && !nameMatch && (
              <p className="text-[10px] text-red-500">Name must match: "{buyerName}"</p>
            )}
            {typedName.length > 0 && nameMatch && (
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Signature verified
              </p>
            )}
          </div>
        )}

        {/* ── Actions ──────────────────────── */}
        <div className="flex gap-2">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Decline
            </Button>
          )}
          <Button
            onClick={onAccept}
            disabled={!allChecked || !nameMatch}
            className="flex-1 gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {allChecked && nameMatch
              ? "Accept & Lock Funds"
              : !allChecked
                ? `${allCheckboxIds.length - checkedCount} clauses remaining`
                : "Type your name to sign"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Sub-component ────────────────────────────────────────
function ClauseCheckbox({
  id, checked, onToggle, label,
}: {
  id: string; checked: boolean; onToggle: () => void; label: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-xs",
        checked ? "bg-green-500/10 border border-green-500/30" : "bg-muted/30 border border-transparent hover:border-muted-foreground/20"
      )}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className={cn("leading-relaxed", checked && "text-foreground")}>{label}</span>
    </label>
  );
}

export default AcknowledgementForm;
export { INDUSTRY_CLAUSES };
export type { IndustryClauseSet };

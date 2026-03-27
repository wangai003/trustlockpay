import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield, FileText, Scale, Clock, Globe, CheckCircle2,
  Fingerprint, PenLine, AlertTriangle, Lock, Handshake
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRY_CLAUSES } from "@/components/shared/AcknowledgementForm";

// ─── Pre-Order Signatory Contract ────────────────────────
// This is the per-transaction legal contract that both buyer and vendor
// sign at checkout or standalone link before funds are locked.

interface PreOrderSignatoryContractProps {
  industry?: string;
  orderAmount?: number;
  buyerName?: string;
  vendorName?: string;
  txId?: string;
  milestoneCount?: number;
  isAutoSigned?: boolean; // true when vendor's auto-signature protocol signed this
  onBothSigned: () => void;
  onDecline?: () => void;
  previewMode?: boolean;
  role?: "buyer" | "vendor"; // who is currently viewing/signing
}

// Industries with 3+ milestone stages that require negotiation
const MILESTONE_INDUSTRIES = [
  "construction", "real-estate", "agriculture", "mining",
  "projectmanagement", "freelance", "logistics", "education",
];

const isMilestoneIndustry = (industry?: string) => {
  if (!industry) return false;
  const key = industry.toLowerCase().replace(/[^a-z-]/g, "");
  return MILESTONE_INDUSTRIES.some(m => key.includes(m.replace("-", "")));
};

const CONTRACT_TERMS = [
  {
    id: "escrow-commitment",
    title: "Escrow Fund Commitment",
    text: "Both parties agree that the buyer's payment will be locked in TrustLock's smart contract escrow on the Polygon blockchain. Funds will only be released upon milestone fulfillment as confirmed by the buyer, or after the 14-day auto-release window per milestone.",
  },
  {
    id: "milestone-agreement",
    title: "Milestone & Deliverable Agreement",
    text: "Both parties acknowledge the agreed-upon milestones, deliverables, and timelines. Any modifications to the scope or milestone structure require mutual consent through TrustLock's change request protocol.",
  },
  {
    id: "dispute-protocol",
    title: "Dispute Resolution Protocol",
    text: "In the event of a dispute, both parties agree to TrustLock's internal resolution process as the first step. For transactions exceeding $10,000, either party may escalate to certified external arbitration. Both parties will cooperate in providing evidence within the specified timelines.",
  },
  {
    id: "fee-acknowledgement",
    title: "Fee Schedule Acknowledgement",
    text: "Both parties acknowledge TrustLock's fee schedule: platform processing fee (deducted at payment), escrow service fee (1% deducted at release), and any applicable gas fees for blockchain transactions. Refunds waive the escrow service fee.",
  },
  {
    id: "auto-release-consent",
    title: "14-Day Auto-Release Consent",
    text: "Both parties consent to TrustLock's 14-day auto-release policy. If the buyer does not confirm receipt or file a dispute within 14 calendar days of the vendor marking a milestone as fulfilled, funds for that milestone automatically release to the vendor. This is enforced by smart contract logic and is non-reversible.",
  },
  {
    id: "trustlock-absolution",
    title: "TrustLock Liability Absolution",
    text: "Both parties acknowledge that TrustLock is a neutral technology intermediary and is absolved of liability for: product/service quality disputes, shipping delays or carrier damage, regulatory non-compliance by either party, force majeure events, currency fluctuations, and any losses arising from parties' failure to meet their contractual obligations to each other.",
  },
  {
    id: "governing-law",
    title: "Governing Standards",
    text: "This contract is governed by UNCITRAL Model Law on Electronic Commerce, ICC Incoterms (where applicable), eIDAS/ESIGN Act for electronic signatures, and the dispute resolution framework agreed upon at checkout. Jurisdiction-specific regulations of both parties' domiciles are acknowledged.",
  },
];

const PreOrderSignatoryContract = ({
  industry,
  orderAmount = 0,
  buyerName = "Buyer",
  vendorName = "Vendor",
  txId,
  milestoneCount = 1,
  isAutoSigned = false,
  onBothSigned,
  onDecline,
  previewMode = false,
  role = "buyer",
}: PreOrderSignatoryContractProps) => {
  const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({});
  const [buyerTypedName, setBuyerTypedName] = useState("");
  const [vendorTypedName, setVendorTypedName] = useState(isAutoSigned ? vendorName : "");

  const clauseSet = useMemo(() => {
    const key = industry && INDUSTRY_CLAUSES[industry] ? industry : "default";
    return INDUSTRY_CLAUSES[key];
  }, [industry]);

  const allTermIds = CONTRACT_TERMS.map((t) => t.id);
  const allChecked = allTermIds.every((id) => checkedTerms[id]);
  const checkedCount = allTermIds.filter((id) => checkedTerms[id]).length;
  const progress = (checkedCount / allTermIds.length) * 100;

  const buyerNameMatch = buyerTypedName.trim().toLowerCase() === buyerName.trim().toLowerCase();
  const vendorNameMatch = isAutoSigned || vendorTypedName.trim().toLowerCase() === vendorName.trim().toLowerCase();

  const canSign = allChecked && buyerNameMatch && vendorNameMatch && !previewMode;

  const toggle = (id: string) => {
    setCheckedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const formattedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  return (
    <Card className="border-2 border-primary/30 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Handshake className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg">Pre-Order Signatory Contract</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{clauseSet.label}</Badge>
            {isAutoSigned && (
              <Badge className="text-[10px] bg-green-600">Vendor Auto-Signed ✓</Badge>
            )}
            {previewMode && <Badge variant="secondary" className="text-[10px]">Preview</Badge>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This binding contract must be signed by both parties before escrow funds are locked.
          {isAutoSigned
            ? " The vendor's automated signature protocol has pre-signed this contract. Buyer signature is required to proceed."
            : " Both buyer and vendor must type their full legal names below."}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Order Summary ────────────── */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-muted/50 rounded-lg p-3">
          <div><span className="text-muted-foreground">Transaction:</span> <span className="font-medium">{txId ?? "Pending"}</span></div>
          <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{formattedDate}</span></div>
          <div><span className="text-muted-foreground">Buyer:</span> <span className="font-medium">{buyerName}</span></div>
          <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{vendorName}</span></div>
          <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium">${orderAmount.toLocaleString()}</span></div>
          <div><span className="text-muted-foreground">Milestones:</span> <span className="font-medium">{milestoneCount}</span></div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Industry:</span>{" "}
            <span className="font-medium">{clauseSet.label}</span>
          </div>
        </div>

        {/* ── Progress ─────────────────── */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Contract terms acknowledged</span>
            <span>{checkedCount}/{allTermIds.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn("h-2 rounded-full transition-all", allChecked ? "bg-green-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ScrollArea className="max-h-[320px] pr-2">
          <div className="space-y-3">
            {CONTRACT_TERMS.map((term) => (
              <label
                key={term.id}
                htmlFor={`contract-${term.id}`}
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-md cursor-pointer transition-colors text-xs border",
                  checkedTerms[term.id]
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                )}
              >
                <Checkbox
                  id={`contract-${term.id}`}
                  checked={!!checkedTerms[term.id]}
                  onCheckedChange={() => toggle(term.id)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">{term.title}</span>
                  <p className={cn("leading-relaxed", checkedTerms[term.id] ? "text-foreground" : "text-muted-foreground")}>
                    {term.text}
                  </p>
                </div>
              </label>
            ))}

            {/* Industry-specific addendum */}
            <div className="p-3 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                <FileText className="h-3.5 w-3.5 text-blue-500" /> Industry Addendum — {clauseSet.label}
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed mb-1">
                {clauseSet.escrowDisclaimer}
              </p>
              {clauseSet.holdbackApplicable && (
                <p className="text-[10px] text-orange-600 dark:text-orange-400 leading-relaxed">
                  <strong>90/10 Holdback:</strong> {clauseSet.holdbackDescription}
                </p>
              )}
            </div>

            {/* Milestone Negotiation Notice for milestone-based industries */}
            {isMilestoneIndustry(industry) && (
              <div className="p-3 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Milestone-Based Project Notice
                </h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-1.5">
                  This transaction falls under a <strong>milestone-based industry ({clauseSet.label})</strong>.
                  After payment is locked in escrow, both parties must agree on the milestone breakdown
                  (stages, payment percentages, and deliverables) before work can begin.
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  <li>Either party (buyer or vendor) may draft the milestone proposal first.</li>
                  <li>The counterparty must review and approve via the Milestone Agreement panel in the dashboard.</li>
                  <li>Funds remain locked until both parties agree. No deadline — negotiate at your own pace.</li>
                  <li>Once agreed, milestone modifications require mutual consent via the change request protocol.</li>
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* ── Dual Signature Block ───────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <PenLine className="h-4 w-4 text-primary" /> Binding Signatures
          </h3>

          {/* Vendor Signature */}
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
            <Label className="text-xs font-semibold">Vendor Signature</Label>
            {isAutoSigned ? (
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  Auto-signed by TrustLock Protocol — "{vendorName}"
                </span>
                <Badge variant="secondary" className="text-[10px]">Automated</Badge>
              </div>
            ) : (
              <>
                <Input
                  placeholder={`Vendor: Type "${vendorName}" to sign`}
                  value={vendorTypedName}
                  onChange={(e) => setVendorTypedName(e.target.value)}
                  disabled={role === "buyer"}
                  className={cn(
                    "text-sm",
                    vendorTypedName.length > 0 && vendorNameMatch && "border-green-500",
                    vendorTypedName.length > 0 && !vendorNameMatch && "border-red-500"
                  )}
                />
                {vendorTypedName.length > 0 && vendorNameMatch && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Vendor signature verified
                  </p>
                )}
              </>
            )}
          </div>

          {/* Buyer Signature */}
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
            <Label className="text-xs font-semibold">Buyer Signature</Label>
            <Input
              placeholder={`Buyer: Type "${buyerName}" to sign`}
              value={buyerTypedName}
              onChange={(e) => setBuyerTypedName(e.target.value)}
              disabled={role === "vendor"}
              className={cn(
                "text-sm",
                buyerTypedName.length > 0 && buyerNameMatch && "border-green-500",
                buyerTypedName.length > 0 && !buyerNameMatch && "border-red-500"
              )}
            />
            {buyerTypedName.length > 0 && !buyerNameMatch && (
              <p className="text-[10px] text-red-500">Name must match: "{buyerName}"</p>
            )}
            {buyerNameMatch && buyerTypedName.length > 0 && (
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Buyer signature verified
              </p>
            )}
          </div>
        </div>

        {/* ── Digital Consent Record ─────── */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Fingerprint className="h-4 w-4 text-primary" /> Digital Consent Record
          </div>
          <p className="text-muted-foreground">
            Both signatures, timestamps, IP addresses, and browser fingerprints are recorded immutably
            for evidentiary and audit trail purposes per UNCITRAL, eIDAS, and ESIGN Act standards.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedDate} at {formattedTime}</span>
          </div>
          <p className="text-muted-foreground">
            Document retention: <span className="font-medium">{clauseSet.documentRetentionYears} years</span>
          </p>
        </div>

        {/* ── Actions ──────────────────────── */}
        <div className="flex gap-2">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Decline & Cancel
            </Button>
          )}
          <Button
            onClick={onBothSigned}
            disabled={!canSign}
            className="flex-1 gap-2"
          >
            <Handshake className="h-4 w-4" />
            {previewMode
              ? "Preview Only"
              : canSign
                ? "Both Parties Signed — Proceed to Payment"
                : !allChecked
                  ? `${allTermIds.length - checkedCount} terms remaining`
                  : "Complete both signatures above"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreOrderSignatoryContract;
export { CONTRACT_TERMS, MILESTONE_INDUSTRIES, isMilestoneIndustry };

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Shield, FileText, AlertTriangle, CheckCircle2, Fingerprint,
  Globe, Zap, Users, Clock, PenLine, ToggleRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Auto-Signature Protocol Thresholds ─────────────────
interface PlanThresholds {
  label: string;
  avgOrdersPerDay: number;
  avgTxPerDay: number;
  maxAutoSignPerDay: number;
}

const PLAN_THRESHOLDS: Record<string, PlanThresholds> = {
  starter: { label: "Starter", avgOrdersPerDay: 5, avgTxPerDay: 5, maxAutoSignPerDay: 10 },
  growth: { label: "Growth", avgOrdersPerDay: 25, avgTxPerDay: 30, maxAutoSignPerDay: 50 },
  scale: { label: "Scale", avgOrdersPerDay: 100, avgTxPerDay: 150, maxAutoSignPerDay: 200 },
  enterprise: { label: "Enterprise", avgOrdersPerDay: 500, avgTxPerDay: 1000, maxAutoSignPerDay: 999 },
};

// ─── Consent Clauses ────────────────────────────────────
const CONSENT_CLAUSES = [
  {
    id: "auto-sign-authority",
    title: "Automated Signature Authority",
    text: "I authorize TrustLock's automated signature protocol to digitally sign Pre-Order Signatory Contracts on my behalf for incoming orders at checkout or via standalone payment links. This authority applies to orders that fall within my plan's volume thresholds.",
  },
  {
    id: "volume-routing",
    title: "Volume-Based Routing Logic",
    text: "I understand that TrustLock will monitor my average daily order count and transaction volume against my subscription plan limits. If my actual order volume falls significantly below plan expectations, the system will route new orders to my Work Log for manual review and individual signature, rather than auto-signing.",
  },
  {
    id: "manual-fallback",
    title: "Manual Signature Fallback",
    text: "When orders are routed to my Work Log for manual review, I will receive a notification. I can either: (a) review and sign each order individually alongside the buyer's existing digital signature, or (b) use the 'Accept All Pending' feature to batch-accept all queued orders and start work orders immediately.",
  },
  {
    id: "buyer-confirmation",
    title: "Buyer Confirmation Trigger",
    text: "I understand that for manually-routed orders, the work order formally begins only when the buyer confirms their order by entering the work order number on the Buyer side. My signature (manual or auto) combined with the buyer's confirmation constitutes mutual consent.",
  },
  {
    id: "liability-shield",
    title: "TrustLock Liability Shield",
    text: "I acknowledge that TrustLock acts as a neutral technology intermediary. By enabling automated signatures, I accept that TrustLock is absolved of liability for: order acceptance decisions made by the protocol, delays caused by manual routing, and any disputes arising from auto-accepted orders that I did not individually review.",
  },
  {
    id: "revocation-right",
    title: "Right to Revoke",
    text: "I retain the right to revoke this automated signature consent at any time via my Vendor Settings. Revocation will take effect immediately, and all subsequent orders will require manual signature. Orders already auto-signed before revocation remain binding.",
  },
  {
    id: "data-consent",
    title: "Order Analytics Consent",
    text: "I consent to TrustLock analyzing my order history, transaction frequency, and plan utilization metrics solely for the purpose of determining auto-signature eligibility and volume-based routing decisions.",
  },
];

// ─── Component ──────────────────────────────────────────
interface VendorConsentFormProps {
  vendorName?: string;
  vendorPlan?: string;
  onConsent: () => void;
  onDecline?: () => void;
  previewMode?: boolean;
}

const VendorConsentForm = ({
  vendorName = "Vendor",
  vendorPlan = "starter",
  onConsent,
  onDecline,
  previewMode = false,
}: VendorConsentFormProps) => {
  const [checkedClauses, setCheckedClauses] = useState<Record<string, boolean>>({});
  const [typedName, setTypedName] = useState("");
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(true);

  const planInfo = PLAN_THRESHOLDS[vendorPlan] || PLAN_THRESHOLDS.starter;

  const allChecked = CONSENT_CLAUSES.every((c) => checkedClauses[c.id]);
  const nameMatch = typedName.trim().toLowerCase() === vendorName.trim().toLowerCase();
  const canSubmit = allChecked && nameMatch && !previewMode;

  const checkedCount = CONSENT_CLAUSES.filter((c) => checkedClauses[c.id]).length;
  const progress = (checkedCount / CONSENT_CLAUSES.length) * 100;

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

  const handleSubmit = () => {
    if (!canSubmit) return;
    toast.success("Vendor Automated Consent signed! Auto-signature protocol is now active.");
    onConsent();
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PenLine className="h-6 w-6 text-amber-600" />
            <CardTitle className="text-lg">Vendor Automated Consent Form</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-700">
              Mandatory · One-Time
            </Badge>
            {previewMode && <Badge variant="secondary" className="text-[10px]">Preview</Badge>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This form authorizes TrustLock's automated signature protocol to sign Pre-Order Signatory
          Contracts on your behalf. You must sign this before the system can auto-process incoming orders.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Vendor & Plan Info ──────────── */}
        <div className="grid grid-cols-2 gap-3 text-xs bg-muted/50 rounded-lg p-3">
          <div><span className="text-muted-foreground">Vendor:</span> <span className="font-medium">{vendorName}</span></div>
          <div><span className="text-muted-foreground">Plan:</span> <span className="font-medium">{planInfo.label}</span></div>
          <div><span className="text-muted-foreground">Auto-Sign Limit:</span> <span className="font-medium">{planInfo.maxAutoSignPerDay}/day</span></div>
          <div><span className="text-muted-foreground">Expected Avg Orders:</span> <span className="font-medium">{planInfo.avgOrdersPerDay}/day</span></div>
        </div>

        {/* ── Auto-Signature Protocol Explanation ── */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-600" /> How the Auto-Signature Protocol Works
          </h3>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p className="flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">1.</span>
              <span>When a buyer completes checkout, TrustLock checks your historical order volume against your plan thresholds.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">2.</span>
              <span><strong>High-volume match:</strong> The protocol auto-signs the Pre-Order Signatory Contract on your behalf, and the work order starts immediately.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">3.</span>
              <span><strong>Low-volume detected:</strong> The order is routed to your Work Log table. You'll receive a notification with a signal cue to review.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">4.</span>
              <span>In the Work Log, you can sign each order individually OR tap <strong>"Accept All Pending"</strong> to batch-start all queued orders.</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="font-bold text-amber-600 shrink-0">5.</span>
              <span>For manually-routed orders, the work order formally begins once the buyer also confirms by entering their order number.</span>
            </p>
          </div>
        </div>

        {/* ── Progress Bar ─────────────────── */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Consent clauses acknowledged</span>
            <span>{checkedCount}/{CONSENT_CLAUSES.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn("h-2 rounded-full transition-all", allChecked ? "bg-green-500" : "bg-amber-500")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ScrollArea className="max-h-[350px] pr-2">
          <div className="space-y-3">
            {CONSENT_CLAUSES.map((clause) => (
              <label
                key={clause.id}
                htmlFor={clause.id}
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-md cursor-pointer transition-colors text-xs border",
                  checkedClauses[clause.id]
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                )}
              >
                <Checkbox
                  id={clause.id}
                  checked={!!checkedClauses[clause.id]}
                  onCheckedChange={() => toggle(clause.id)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">{clause.title}</span>
                  <p className={cn("leading-relaxed", checkedClauses[clause.id] ? "text-foreground" : "text-muted-foreground")}>
                    {clause.text}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* ── Auto-Accept Toggle ─────────── */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <ToggleRight className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-semibold">Enable Auto-Accept for Future Orders</p>
              <p className="text-[10px] text-muted-foreground">When enabled, qualifying orders are auto-signed. You can disable this anytime in Settings.</p>
            </div>
          </div>
          <Switch checked={autoAcceptEnabled} onCheckedChange={setAutoAcceptEnabled} />
        </div>

        {/* ── Typed Signature ────────────── */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <PenLine className="h-3.5 w-3.5" /> Digital Signature — Type Your Full Legal Name
          </Label>
          <Input
            placeholder={`Type "${vendorName}" to confirm consent`}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className={cn(
              "text-sm",
              typedName.length > 0 && nameMatch && "border-green-500 ring-1 ring-green-500/30",
              typedName.length > 0 && !nameMatch && "border-red-500 ring-1 ring-red-500/30"
            )}
          />
          {typedName.length > 0 && !nameMatch && (
            <p className="text-[10px] text-red-500">Name must match: "{vendorName}"</p>
          )}
          {nameMatch && (
            <p className="text-[10px] text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Signature verified
            </p>
          )}
        </div>

        {/* ── Digital Consent Record ─────── */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-sm">
            <Fingerprint className="h-4 w-4 text-primary" /> Digital Consent Record
          </div>
          <p className="text-muted-foreground">
            By clicking "Sign & Activate Protocol", a timestamped consent record capturing your typed signature,
            IP address, browser fingerprint, and plan configuration will be created for evidentiary purposes.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{formattedDate} at {formattedTime}</span>
          </div>
        </div>

        {/* ── Actions ──────────────────────── */}
        <div className="flex gap-2">
          {onDecline && (
            <Button variant="outline" onClick={onDecline} className="flex-1">
              Decline
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PenLine className="h-4 w-4" />
            {previewMode
              ? "Preview Only"
              : canSubmit
                ? "Sign & Activate Protocol"
                : !allChecked
                  ? `${CONSENT_CLAUSES.length - checkedCount} clauses remaining`
                  : "Type your name to sign"
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorConsentForm;
export { PLAN_THRESHOLDS, CONSENT_CLAUSES };

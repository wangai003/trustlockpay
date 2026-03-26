import { useState } from "react";
import { CheckCircle, Circle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TaskFrequency = "one-time" | "always" | "sometimes" | "future";

interface OnboardingTask {
  id: string;
  label: string;
  frequency: TaskFrequency;
  completed?: boolean;
  description?: string;
}

const vendorTasks: OnboardingTask[] = [
  { id: "v1", label: "Complete KYC Verification (Tier 1+)", frequency: "one-time", description: "Upload government ID + proof of address to unlock full platform features." },
  { id: "v2", label: "Sign Vendor Automated Consent Form", frequency: "one-time", description: "One-time consent enabling TrustLock auto-signature protocol on your orders." },
  { id: "v3", label: "Connect at least 1 e-commerce site", frequency: "one-time", description: "Link your Shopify, WooCommerce, or custom store to accept TrustLock payments." },
  { id: "v4", label: "Set payout preferences (Managed or Self-Custody)", frequency: "one-time", description: "Choose how you receive released funds — fiat off-ramp or direct wallet." },
  { id: "v5", label: "Review Escrow Acknowledgement Form", frequency: "always", description: "Generated per transaction — understand the escrow terms before each order." },
  { id: "v6", label: "Sign Pre-Order Signatory Contract", frequency: "always", description: "Binding contract signed at checkout/standalone link for each transaction." },
  { id: "v7", label: "Upload milestone documents (if applicable)", frequency: "sometimes", description: "Required for milestone-based orders: inspection certs, shipping manifests, etc." },
  { id: "v8", label: "Confirm shipment / mark delivered", frequency: "always", description: "Update order status to trigger buyer confirmation countdown." },
  { id: "v9", label: "Respond to disputes within 72 hours", frequency: "sometimes", description: "Upload evidence and respond to buyer-filed disputes before escalation." },
  { id: "v10", label: "KYC Tier upgrade for higher volumes", frequency: "future", description: "Submit additional docs when approaching plan order limits." },
  { id: "v11", label: "Renew subscription plan before expiry", frequency: "future", description: "Avoid service interruption by renewing before your plan expires." },
];

const buyerTasks: OnboardingTask[] = [
  { id: "b1", label: "Verify email address", frequency: "one-time", description: "Confirm your email to activate your buyer account." },
  { id: "b2", label: "Complete profile (name, location, phone)", frequency: "one-time", description: "Required for order tracking and dispute resolution." },
  { id: "b3", label: "Review Escrow Acknowledgement Form", frequency: "always", description: "Understand the escrow terms before each purchase." },
  { id: "b4", label: "Sign Pre-Order Signatory Contract", frequency: "always", description: "Digital signature required at checkout for every transaction." },
  { id: "b5", label: "Confirm delivery within 14 days", frequency: "always", description: "Confirm receipt to release vendor funds. Auto-release after 14 days." },
  { id: "b6", label: "Upload customs clearance proof (cross-border)", frequency: "sometimes", description: "Required for international shipments before fund release." },
  { id: "b7", label: "File dispute with evidence (if needed)", frequency: "sometimes", description: "Open a dispute within the 14-day window with supporting documents." },
  { id: "b8", label: "Review auto-release countdown notifications", frequency: "always", description: "Monitor the 48h/14d countdown — act before funds auto-release." },
];

const adminTasks: OnboardingTask[] = [
  { id: "a1", label: "Collect Vendor Consent Form from new vendors", frequency: "always", description: "Verify all new vendors have signed the automated consent form." },
  { id: "a2", label: "Collect KYC documents per tier requirement", frequency: "always", description: "Ensure government ID, business license, and proof of address are on file." },
  { id: "a3", label: "Verify AML/Sanctions screening results", frequency: "always", description: "Review OFAC/EU/UN screening gate logs for flagged users." },
  { id: "a4", label: "Archive Pre-Order Signatory Contracts", frequency: "always", description: "All signed contracts auto-archived — verify completeness." },
  { id: "a5", label: "Review Acknowledgement Form compliance", frequency: "always", description: "Spot-check that dynamic forms match industry requirements." },
  { id: "a6", label: "Audit dispute evidence for resolved cases", frequency: "sometimes", description: "Cross-reference uploaded evidence with resolution outcomes." },
  { id: "a7", label: "Collect tax documentation (W-9/W-8BEN)", frequency: "sometimes", description: "Required for US-based vendors exceeding $600 in payouts." },
  { id: "a8", label: "Generate compliance reports (monthly)", frequency: "always", description: "Export transaction, dispute, and KYC data for regulatory filing." },
  { id: "a9", label: "Review 7-year retention compliance", frequency: "future", description: "Audit cross-border trade docs against 7-year immutable retention policy." },
];

const frequencyBadge: Record<TaskFrequency, { label: string; color: string }> = {
  "one-time": { label: "One-Time", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  "always": { label: "Every Order", color: "bg-primary/15 text-primary" },
  "sometimes": { label: "Conditional", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  "future": { label: "Future", color: "bg-muted text-muted-foreground" },
};

interface Props {
  role: "vendor" | "buyer" | "admin";
}

const OnboardingTaskCard = ({ role }: Props) => {
  const [expanded, setExpanded] = useState(true);
  const tasks = role === "vendor" ? vendorTasks : role === "buyer" ? buyerTasks : adminTasks;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const progress = Math.round((checked.size / tasks.length) * 100);
  const title = role === "admin"
    ? "📋 Admin Document Collection Checklist"
    : role === "vendor"
    ? "📋 Vendor Onboarding & Order Tasks"
    : "📋 Buyer Order Requirements";

  return (
    <Card className="border-2 border-yellow-400/60 bg-yellow-50/80 dark:bg-yellow-900/10 dark:border-yellow-500/40 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-foreground">{title}</h3>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 rounded-full bg-yellow-200 dark:bg-yellow-800/40 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-bold text-foreground">{checked.size}/{tasks.length}</span>
        </div>

        {expanded && (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {tasks.map(task => {
              const done = checked.has(task.id);
              const badge = frequencyBadge[task.frequency];
              return (
                <button
                  key={task.id}
                  onClick={() => toggle(task.id)}
                  className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${done ? "bg-primary/5 opacity-60" : "hover:bg-yellow-100/80 dark:hover:bg-yellow-800/20"}`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold text-foreground ${done ? "line-through" : ""}`}>{task.label}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>{badge.label}</span>
                    </div>
                    {task.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{task.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!expanded && (
          <p className="text-[10px] text-muted-foreground">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-600" />
            {tasks.length - checked.size} task{tasks.length - checked.size !== 1 ? "s" : ""} remaining — expand to view
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingTaskCard;

import { useState } from "react";
import { CheckCircle, Circle, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TaskFrequency = "one-time" | "always" | "sometimes" | "future";

interface OnboardingTask {
  id: string;
  label: string;
  frequency: TaskFrequency;
  completed?: boolean;
  description?: string;
  task_key?: string;
}

const vendorTasks: OnboardingTask[] = [
  { id: "v1", label: "Complete KYC Verification (Tier 1+)", frequency: "one-time", task_key: "kyc_verification", description: "Upload government ID + proof of address to unlock full platform features." },
  { id: "v2", label: "Sign Vendor Automated Consent Form", frequency: "one-time", task_key: "consent_form", description: "One-time consent enabling TrustLock auto-signature protocol on your orders." },
  { id: "v3", label: "Connect at least 1 e-commerce site", frequency: "one-time", task_key: "add_site", description: "Link your Shopify, WooCommerce, or custom store to accept TrustLock payments." },
  { id: "v4", label: "Set payout preferences (Managed or Self-Custody)", frequency: "one-time", task_key: "configure_payouts", description: "Choose how you receive released funds — fiat off-ramp or direct wallet." },
  { id: "v5", label: "Complete your business profile", frequency: "one-time", task_key: "complete_profile", description: "Fill in your business name, location, and contact details." },
  { id: "v6", label: "Install TrustLock widget on your site", frequency: "one-time", task_key: "install_widget", description: "Add the TrustLock Pay checkout widget to your connected store." },
  { id: "v7", label: "Create your first transaction", frequency: "one-time", task_key: "first_transaction", description: "Start accepting payments through TrustLock escrow." },
  { id: "v8", label: "Review Escrow Acknowledgement Form", frequency: "always", description: "Generated per transaction — understand the escrow terms before each order." },
  { id: "v9", label: "Sign Pre-Order Signatory Contract", frequency: "always", description: "Binding contract signed at checkout/standalone link for each transaction." },
  { id: "v10", label: "Draft & agree on milestone stages", frequency: "sometimes", description: "For milestone/hybrid orders: propose stages, review with buyer, and Approve & Lock before work begins." },
  { id: "v11", label: "Upload milestone documents (if applicable)", frequency: "sometimes", description: "Required for milestone-based orders: inspection certs, shipping manifests, etc." },
  { id: "v12", label: "Confirm shipment / mark delivered", frequency: "always", description: "Update order status to trigger buyer confirmation countdown." },
];

const buyerTasks: OnboardingTask[] = [
  { id: "b1", label: "Verify email address", frequency: "one-time", task_key: "verify_email", description: "Confirm your email to activate your buyer account." },
  { id: "b2", label: "Complete profile (name, location, phone)", frequency: "one-time", task_key: "complete_profile", description: "Required for order tracking and dispute resolution." },
  { id: "b3", label: "Sign consent form", frequency: "one-time", task_key: "consent_form", description: "Agree to TrustLock platform terms and conditions." },
  { id: "b4", label: "Make your first purchase", frequency: "one-time", task_key: "first_purchase", description: "Complete your first transaction through TrustLock escrow." },
  { id: "b5", label: "Confirm delivery", frequency: "one-time", task_key: "confirm_delivery", description: "Confirm receipt of your first order to release vendor funds." },
  { id: "b6", label: "Review milestone stages", frequency: "one-time", task_key: "review_milestones", description: "For milestone orders: review vendor's proposed stages." },
  { id: "b7", label: "Review Escrow Acknowledgement Form", frequency: "always", description: "Understand the escrow terms before each purchase." },
  { id: "b8", label: "Sign Pre-Order Signatory Contract", frequency: "always", description: "Digital signature required at checkout for every transaction." },
  { id: "b9", label: "Confirm delivery within 14 days", frequency: "always", description: "Confirm receipt to release vendor funds. Auto-release after 14 days." },
  { id: "b10", label: "File dispute with evidence (if needed)", frequency: "sometimes", description: "Open a dispute within the 14-day window with supporting documents." },
  { id: "b11", label: "Review rejection & refund policy", frequency: "one-time", description: "Understand that vendor rejections trigger full refund minus nominal gas fee (~$0.01–$0.05)." },
];

const adminTasks: OnboardingTask[] = [
  { id: "a1", label: "Collect Vendor Consent Form from new vendors", frequency: "always", description: "Verify all new vendors have signed the automated consent form." },
  { id: "a2", label: "Collect KYC documents per tier requirement", frequency: "always", description: "Ensure government ID, business license, and proof of address are on file." },
  { id: "a3", label: "Verify AML/Sanctions screening results", frequency: "always", description: "Review OFAC/EU/UN screening gate logs for flagged users." },
  { id: "a4", label: "Archive Pre-Order Signatory Contracts", frequency: "always", description: "All signed contracts auto-archived — verify completeness." },
  { id: "a5", label: "Review Acknowledgement Form compliance", frequency: "always", description: "Spot-check that dynamic forms match industry requirements." },
  { id: "a6", label: "Audit dispute evidence for resolved cases", frequency: "sometimes", description: "Cross-reference uploaded evidence with resolution outcomes." },
  { id: "a7", label: "Generate compliance reports (monthly)", frequency: "always", description: "Export transaction, dispute, and KYC data for regulatory filing." },
  { id: "a8", label: "Review 7-year retention compliance", frequency: "future", description: "Audit cross-border trade docs against 7-year immutable retention policy." },
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tasks = role === "vendor" ? vendorTasks : role === "buyer" ? buyerTasks : adminTasks;

  const userId = user?.id;

  // Fetch tasks from DB
  const { data: dbTasks, isLoading } = useQuery({
    queryKey: ["onboarding-tasks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.functions.invoke("manage-onboarding-tasks", {
        body: { action: "get", user_id: userId },
      });
      if (error) throw error;
      return (data?.tasks || []) as Array<{ task_key: string; completed: boolean }>;
    },
    enabled: !!userId && role !== "admin",
  });

  // Build completed set from DB data
  const completedKeys = new Set(
    (dbTasks || []).filter((t) => t.completed).map((t) => t.task_key)
  );

  // Map task_key to checked state
  const isChecked = (task: OnboardingTask) => {
    if (task.task_key && completedKeys.has(task.task_key)) return true;
    return false;
  };

  // Local checked set for admin (no DB) and non-db tasks
  const [localChecked, setLocalChecked] = useState<Set<string>>(new Set());

  const completeMutation = useMutation({
    mutationFn: async ({ taskKey, completed }: { taskKey: string; completed: boolean }) => {
      if (!userId) return;
      const { error } = await supabase.functions.invoke("manage-onboarding-tasks", {
        body: { action: "complete", user_id: userId, task_key: taskKey, completed },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks", userId] });
    },
  });

  const toggle = (task: OnboardingTask) => {
    if (task.task_key && role !== "admin" && userId) {
      const currentlyChecked = isChecked(task);
      completeMutation.mutate({ taskKey: task.task_key, completed: !currentlyChecked });
    } else {
      setLocalChecked((prev) => {
        const next = new Set(prev);
        next.has(task.id) ? next.delete(task.id) : next.add(task.id);
        return next;
      });
    }
  };

  const getCheckedCount = () => {
    let count = 0;
    for (const task of tasks) {
      if (task.task_key && role !== "admin") {
        if (isChecked(task)) count++;
      } else if (localChecked.has(task.id)) {
        count++;
      }
    }
    return count;
  };

  const checkedCount = getCheckedCount();
  const progress = Math.round((checkedCount / tasks.length) * 100);
  const title =
    role === "admin"
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
          <span className="text-[10px] font-bold text-foreground">
            {checkedCount}/{tasks.length}
          </span>
        </div>

        {expanded && isLoading && role !== "admin" && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-2 p-2">
                <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {expanded && (!isLoading || role === "admin") && (
          <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const done = task.task_key && role !== "admin" ? isChecked(task) : localChecked.has(task.id);
              const badge = frequencyBadge[task.frequency];
              const isMutating = completeMutation.isPending && completeMutation.variables?.taskKey === task.task_key;
              return (
                <button
                  key={task.id}
                  onClick={() => toggle(task)}
                  disabled={isMutating}
                  className={`w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors ${
                    done ? "bg-primary/5 opacity-60" : "hover:bg-yellow-100/80 dark:hover:bg-yellow-800/20"
                  }`}
                >
                  {isMutating ? (
                    <Loader2 className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-spin" />
                  ) : done ? (
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold text-foreground ${done ? "line-through" : ""}`}>
                        {task.label}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
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
            {tasks.length - checkedCount} task{tasks.length - checkedCount !== 1 ? "s" : ""} remaining — expand to view
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingTaskCard;

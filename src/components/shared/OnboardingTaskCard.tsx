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
  { id: "v1", label: "Complete KYC Verification", frequency: "one-time", task_key: "kyc_verification", description: "Upload government ID and proof of address to unlock full platform features and higher transaction limits." },
  { id: "v2", label: "Sign Vendor Consent Form", frequency: "one-time", task_key: "consent_form", description: "Authorize TrustLock's auto-signature protocol for seamless contract execution on your orders." },
  { id: "v3", label: "Connect Your Store", frequency: "one-time", task_key: "add_site", description: "Link your Shopify, WooCommerce, or custom e-commerce site to accept TrustLock escrow payments." },
  { id: "v4", label: "Configure Payout Method", frequency: "one-time", task_key: "configure_payouts", description: "Set up how you receive released funds — bank transfer, mobile money, or crypto self-custody." },
  { id: "v5", label: "Complete Business Profile", frequency: "one-time", task_key: "complete_profile", description: "Add your business name, industry, location, and contact details for buyer trust and compliance." },
  { id: "v6", label: "Install TrustLock Widget", frequency: "one-time", task_key: "install_widget", description: "Add the TrustLock Pay checkout widget to your storefront for secure buyer payments." },
  { id: "v7", label: "Process Your First Order", frequency: "one-time", task_key: "first_transaction", description: "Accept your first escrow payment and familiarize yourself with the order lifecycle." },
  { id: "v8", label: "Review Escrow Acknowledgement", frequency: "always", description: "Auto-generated per transaction — review escrow terms, fees, and auto-release timelines before each order." },
  { id: "v9", label: "Sign Pre-Order Contract", frequency: "always", description: "Digitally sign the binding contract at checkout — required for every transaction." },
  { id: "v10", label: "Set Up Milestones (if applicable)", frequency: "sometimes", description: "For milestone or hybrid orders: propose stages, agree with buyer, and lock the schedule before work begins." },
  { id: "v11", label: "Upload Milestone Documents", frequency: "sometimes", description: "Submit inspection reports, shipping manifests, or proof-of-work for milestone-based orders." },
  { id: "v12", label: "Confirm Shipment & Delivery", frequency: "always", description: "Update order status to shipped/delivered — triggers buyer confirmation countdown and auto-release timer." },
];

const buyerTasks: OnboardingTask[] = [
  { id: "b1", label: "Verify Your Email", frequency: "one-time", task_key: "verify_email", description: "Confirm your email address to activate your buyer account and receive order notifications." },
  { id: "b2", label: "Complete Your Profile", frequency: "one-time", task_key: "complete_profile", description: "Add your name, location, and phone number — required for order tracking and dispute resolution." },
  { id: "b3", label: "Sign Platform Consent", frequency: "one-time", task_key: "consent_form", description: "Agree to TrustLock's platform terms, escrow rules, and buyer protection policies." },
  { id: "b4", label: "Make Your First Purchase", frequency: "one-time", task_key: "first_purchase", description: "Complete your first escrow transaction — funds are held securely until you confirm delivery." },
  { id: "b5", label: "Confirm First Delivery", frequency: "one-time", task_key: "confirm_delivery", description: "Confirm receipt of your first order to release vendor funds from escrow." },
  { id: "b6", label: "Review Milestone Stages", frequency: "one-time", task_key: "review_milestones", description: "For milestone orders: review the vendor's proposed stages and approve before funds are locked." },
  { id: "b7", label: "Review Escrow Acknowledgement", frequency: "always", description: "Read the escrow terms, fees, and auto-release schedule before each purchase." },
  { id: "b8", label: "Sign Pre-Order Contract", frequency: "always", description: "Digitally sign the binding contract at checkout — your signature locks the escrow terms." },
  { id: "b9", label: "Confirm Delivery Before Auto-Release", frequency: "always", description: "Confirm receipt to release funds. Auto-release varies by industry (14–90 days) — request extensions if needed." },
  { id: "b10", label: "File Dispute with Evidence", frequency: "sometimes", description: "Open a dispute within the auto-release window. Upload photos, messages, or receipts as supporting evidence." },
  { id: "b11", label: "Understand Refund Policy", frequency: "one-time", description: "Vendor rejections trigger a full refund minus a nominal gas fee (~$0.01–$0.05). Review the policy in Documents." },
];

const adminTasks: OnboardingTask[] = [
  { id: "a1", label: "Verify Vendor Consent Forms", frequency: "always", description: "Ensure every new vendor has signed the automated consent form before processing their first order." },
  { id: "a2", label: "Collect & Review KYC Documents", frequency: "always", description: "Verify government ID, business licenses, and proof of address per tier requirements." },
  { id: "a3", label: "Review AML/Sanctions Screening", frequency: "always", description: "Check OFAC, EU, and UN sanctions screening results for flagged users before clearing transactions." },
  { id: "a4", label: "Archive Signed Contracts", frequency: "always", description: "Verify all pre-order signatory contracts are properly archived with timestamps and signatures." },
  { id: "a5", label: "Audit Acknowledgement Forms", frequency: "always", description: "Spot-check that dynamically generated forms match industry-specific requirements and fee disclosures." },
  { id: "a6", label: "Review Dispute Evidence", frequency: "sometimes", description: "Cross-reference uploaded evidence with dispute outcomes and arbitrator rulings for resolved cases." },
  { id: "a7", label: "Generate Compliance Reports", frequency: "always", description: "Export monthly transaction, dispute, KYC, and AML data for regulatory filing and internal audit." },
  { id: "a8", label: "Audit Document Retention", frequency: "future", description: "Verify cross-border trade documents meet the 7-year immutable retention requirement." },
  { id: "a9", label: "Monitor Rejection Analytics", frequency: "always", description: "Track vendor rejection rates, associated gas costs, and revenue impact in the Analytics dashboard." },
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
  const [expanded, setExpanded] = useState(false);
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
    <Card className={`border ${expanded ? "border-2 border-yellow-400/60 bg-yellow-50/80 dark:bg-yellow-900/10 dark:border-yellow-500/40 shadow-md" : "border-border bg-muted/30"}`}>
      <CardContent className={expanded ? "p-4" : "p-2 px-3"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {!expanded && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{title}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{checkedCount}/{tasks.length}</span>
                </div>
                {tasks.length - checkedCount > 0 && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    · {tasks.length - checkedCount} remaining
                  </span>
                )}
              </div>
            )}
            {expanded && <h3 className="font-bold text-sm text-foreground">{title}</h3>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && (
          <>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-3 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-yellow-200 dark:bg-yellow-800/40 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] font-bold text-foreground">
                {checkedCount}/{tasks.length}
              </span>
            </div>

            {isLoading && role !== "admin" && (
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

            {(!isLoading || role === "admin") && (
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingTaskCard;

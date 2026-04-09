import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Lightbulb, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTestnetData } from "@/hooks/useTestnetData";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  route?: string;
  action?: string;
}

interface TestnetGuideProps {
  role: "vendor" | "buyer" | "admin";
}

const vendorSteps: GuideStep[] = [
  { id: "v1", title: "Explore Plans & Pricing", description: "Compare subscription tiers — from free Basic to unlimited Enterprise — and pick the plan that matches your transaction volume.", route: "/trustlock/vendor/pricing", action: "Navigate to Plans & Pricing" },
  { id: "v2", title: "Subscribe to a Plan", description: "Select a plan and complete payment via TrustLock OS Pay. Your dashboard updates instantly with plan limits and features.", route: "/trustlock/vendor/pricing", action: "Select and pay for a plan" },
  { id: "v3", title: "Connect Your Store", description: "Link your Shopify, WooCommerce, or custom e-commerce site so buyers can pay through TrustLock escrow.", route: "/trustlock/vendor/sites", action: "Add a site" },
  { id: "v4", title: "Install the TrustLock Widget", description: "Copy the embed code and add it to your storefront — buyers see a secure checkout badge and pay directly.", route: "/trustlock/vendor/widget", action: "Configure and install widget" },
  { id: "v5", title: "Configure Payout Preferences", description: "Choose your payout method — fiat bank transfer, mobile money, or crypto self-custody — for released escrow funds.", route: "/trustlock/vendor/payouts", action: "Set up payouts" },
  { id: "v6", title: "Review a Transaction", description: "Go to Transactions and explore order actions: add tracking, upload shipping docs, and mark orders as shipped.", route: "/trustlock/vendor/transactions", action: "Interact with an order" },
  { id: "v7", title: "Download a Report", description: "Navigate to Analytics & Reports and export a revenue statement or transaction summary.", route: "/trustlock/vendor/analytics", action: "Download a report" },
  { id: "v8", title: "Chat with TrustLock Assist", description: "Ask the AI assistant about escrow flows, dispute handling, milestone setup, or cross-border compliance.", route: "/trustlock/vendor/assistant", action: "Send a message" },
  { id: "v9", title: "Review Settings & Auto-Delivery", description: "Check auto-delivery rules (industry-dependent), notification preferences, and widget theme settings.", route: "/trustlock/vendor/settings", action: "Toggle a setting" },
];

const buyerSteps: GuideStep[] = [
  { id: "b1", title: "Review Your Dashboard", description: "Check active orders, total funds in escrow, pending confirmations, and any action items requiring attention.", route: "/trustlock/buyer", action: "Review the overview" },
  { id: "b2", title: "Browse Your Orders", description: "View order statuses — locked, shipped, delivered. Try confirming delivery on a delivered order to release vendor funds.", route: "/trustlock/buyer/orders", action: "Interact with an order" },
  { id: "b3", title: "Explore the Dispute Flow", description: "Navigate to Disputes and see how to file a claim, upload evidence, and track resolution — including arbitrator proposals.", route: "/trustlock/buyer/disputes", action: "Review dispute process" },
  { id: "b4", title: "Make a Test Payment", description: "Go to TrustLock OS Pay and complete a payment using card, bank transfer, mobile money, or crypto.", route: "/trustlock/buyer/os-pay", action: "Complete a payment" },
  { id: "b5", title: "Chat with Support AI", description: "Open the Support Assistant and ask about buyer protections, auto-release windows, or refund policies.", route: "/trustlock/buyer/assistant", action: "Send a message" },
  { id: "b6", title: "Download a Statement", description: "Navigate to Analytics and export your purchase history or payment receipts.", route: "/trustlock/buyer/analytics", action: "Download a report" },
  { id: "b7", title: "Review Protection Documents", description: "Browse the Documents section for escrow terms, acknowledgement forms, and signed contracts.", route: "/trustlock/buyer/documents", action: "Browse documents" },
];

const adminSteps: GuideStep[] = [
  { id: "a1", title: "Review Platform Metrics", description: "Check global transaction volume, active escrows, dispute rates, and Emmanuel AI system status.", route: "/trustlock/admin", action: "Review dashboard metrics" },
  { id: "a2", title: "Monitor All Transactions", description: "Browse platform-wide transactions across vendors, buyers, and payment corridors.", route: "/trustlock/admin/transactions", action: "Browse transactions" },
  { id: "a3", title: "Manage Active Disputes", description: "Review open disputes, AI-generated recommendations, arbitrator assignments, and ruling status.", route: "/trustlock/admin/disputes", action: "Review a dispute case" },
  { id: "a4", title: "Process a Refund or Split Pay", description: "Use TrustLock OS Pay to execute refunds, split payments between parties, or process manual payouts.", route: "/trustlock/admin/os-pay", action: "Execute a payment action" },
  { id: "a5", title: "Review Vendor Compliance", description: "Check vendor KYC tiers, plan statuses, consent forms, and sanctions screening results.", route: "/trustlock/admin/vendors", action: "Audit a vendor" },
  { id: "a6", title: "Generate Platform Reports", description: "Export compliance reports, transaction summaries, and dispute analytics for regulatory filing.", route: "/trustlock/admin/analytics", action: "Download a report" },
  { id: "a7", title: "Review Audit Trail", description: "Inspect the blockchain proof chain, admin action logs, and department workflow history.", route: "/trustlock/admin/audit", action: "Browse audit logs" },
];

const stepsMap = { vendor: vendorSteps, buyer: buyerSteps, admin: adminSteps };
const storageKey = (role: string) => `tl_testnet_guide_${role}`;

const TestnetGuide = ({ role }: TestnetGuideProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const { resetTestnetData } = useTestnetData();
  const [completed, setCompleted] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey(role)) || "[]"); } catch { return []; }
  });

  const networkKey = role === "admin" ? "tl_network" : role === "vendor" ? "tl_vendor_network" : "tl_buyer_network";
  const authKey = role === "admin" ? "tl_admin_auth" : role === "vendor" ? "tl_vendor_auth" : "tl_buyer_auth";
  const storedNetwork = localStorage.getItem(networkKey);
  const hasLegacyTestnetAuth = storedNetwork === null && localStorage.getItem(authKey) === "true";
  const isTestnet = storedNetwork === "testnet" || hasLegacyTestnetAuth;

  const steps = stepsMap[role];
  const completedCount = completed.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  useEffect(() => {
    localStorage.setItem(storageKey(role), JSON.stringify(completed));
  }, [completed, role]);

  if (!isTestnet) return null;

  const toggleComplete = (id: string) => {
    setCompleted(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const currentStep = steps.find(s => !completed.includes(s.id));

  return (
    <div className="mx-4 sm:mx-6 mt-3">
      <Card className={`${collapsed ? "border-border bg-muted/30" : "border-blue-400/30 bg-blue-50/50 dark:bg-blue-950/20"}`}>
        <CardContent className={collapsed ? "p-2 px-3" : "p-3 space-y-2"}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Testnet Guide
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <Badge variant="secondary" className="text-[10px]">{completedCount}/{steps.length}</Badge>
              </div>
              {collapsed && currentStep && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[200px]">
                  · Next: {currentStep.title}
                </span>
              )}
            </div>
            <button onClick={() => setCollapsed(!collapsed)} className="text-blue-500 hover:text-blue-700 shrink-0">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {!collapsed && (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {steps.map((step) => {
                const isDone = completed.includes(step.id);
                const isCurrent = currentStep?.id === step.id;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg text-xs transition-all",
                      isCurrent && "bg-blue-100/70 dark:bg-blue-900/30 ring-1 ring-blue-400/40",
                      isDone && "opacity-60"
                    )}
                  >
                    <button onClick={() => toggleComplete(step.id)} className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Circle className={cn("w-4 h-4", isCurrent ? "text-blue-500" : "text-muted-foreground")} />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-medium", isDone && "line-through")}>{step.title}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{step.description}</p>
                    </div>
                    {isCurrent && step.route && step.route !== location.pathname && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 shrink-0 border-blue-400/40 text-blue-600 animate-pulse"
                        onClick={() => navigate(step.route!)}
                      >
                        Go <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    {isCurrent && step.route === location.pathname && (
                      <Badge className="bg-blue-500 text-primary-foreground text-[8px] shrink-0 animate-pulse">
                        👉 Do this now
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!collapsed && completedCount === steps.length && (
            <div className="text-center py-2 space-y-2">
              <p className="text-xs font-semibold text-blue-600">🎉 All tasks completed! You've explored the {role} dashboard.</p>
              <Button size="sm" variant="outline" className="text-[10px] gap-1" onClick={() => { setCompleted([]); resetTestnetData(); }}>
                <RotateCcw className="w-3 h-3" /> Reset Guide & Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestnetGuide;

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ChevronDown, ChevronUp, Lightbulb, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
  { id: "v1", title: "View Plans & Pricing", description: "Browse available subscription plans to find one that fits your order volume.", route: "/trustlock/vendor/pricing", action: "Navigate to Plans & Pricing" },
  { id: "v2", title: "Select a Plan", description: "Choose the Starter plan (highlighted in blue) and tap 'Get Starter' to proceed to checkout.", route: "/trustlock/vendor/pricing", action: "Click the highlighted plan" },
  { id: "v3", title: "Pay via TrustLock OS Pay", description: "On the TrustLock OS Pay page, select a payment method, enter any amount, and tap Pay.", route: "/trustlock/vendor/os-pay", action: "Complete the payment flow" },
  { id: "v4", title: "Review Dashboard", description: "After payment, you'll return to the dashboard. Check your plan status and order usage in the overview.", route: "/trustlock/vendor", action: "Review your dashboard stats" },
  { id: "v5", title: "View Transactions", description: "Go to Transactions to see your orders queue. Try adding tracking to a locked order.", route: "/trustlock/vendor/transactions", action: "Explore transaction actions" },
  { id: "v6", title: "Download a Report", description: "Navigate to Analytics & Reports to download a revenue statement with TrustLock Pay branding.", route: "/trustlock/vendor/analytics", action: "Download a report" },
  { id: "v7", title: "Browse Archives", description: "Open the Archives tab in Analytics to view historical reports sorted by date.", route: "/trustlock/vendor/analytics", action: "Open archives and select a date" },
  { id: "v8", title: "Try TrustLock Assist", description: "Open TrustLock Assist AI and ask a question about fulfillment or escrow.", route: "/trustlock/vendor/assistant", action: "Send a message to the assistant" },
  { id: "v9", title: "Check Settings", description: "Review auto-delivery toggle and TrustLock Pay widget settings.", route: "/trustlock/vendor/settings", action: "Toggle a setting" },
];

const buyerSteps: GuideStep[] = [
  { id: "b1", title: "Review Dashboard", description: "Check your active orders, funds in escrow, and action items.", route: "/trustlock/buyer", action: "Review the overview" },
  { id: "b2", title: "View Orders", description: "Go to My Orders to see order statuses. Try confirming delivery on a delivered order.", route: "/trustlock/buyer/orders", action: "Interact with an order" },
  { id: "b3", title: "File a Test Dispute", description: "Navigate to Disputes and review how the dispute filing process works.", route: "/trustlock/buyer/disputes", action: "Review dispute flow" },
  { id: "b4", title: "Pay for Analytics Report", description: "Go to TrustLock OS Pay and purchase an analytics report download.", route: "/trustlock/buyer/os-pay", action: "Complete a payment" },
  { id: "b5", title: "Use Support Assistant", description: "Open the Support Assistant AI and ask about buyer protections.", route: "/trustlock/buyer/assistant", action: "Send a message" },
  { id: "b6", title: "Download a Statement", description: "Navigate to Analytics to download a purchase history statement.", route: "/trustlock/buyer/analytics", action: "Download a report" },
  { id: "b7", title: "Check Documents", description: "Review the reference library for buyer protection policies.", route: "/trustlock/buyer/documents", action: "Browse documents" },
];

const adminSteps: GuideStep[] = [
  { id: "a1", title: "Review Platform Overview", description: "Check transaction volume, dispute stats, and Emmanuel AI status.", route: "/trustlock/admin", action: "Review dashboard metrics" },
  { id: "a2", title: "Monitor Transactions", description: "View all platform transactions across vendors and buyers.", route: "/trustlock/admin/transactions", action: "Browse transactions" },
  { id: "a3", title: "Review Disputes", description: "Check active disputes and Emmanuel AI recommendations.", route: "/trustlock/admin/disputes", action: "Review a dispute case" },
  { id: "a4", title: "Process a Refund", description: "Go to TrustLock OS Pay, select Refund, enter recipient details and process.", route: "/trustlock/admin/os-pay", action: "Execute a test refund" },
  { id: "a5", title: "Process a Split Payment", description: "Use TrustLock OS Pay Split Pay feature to divide funds between parties.", route: "/trustlock/admin/os-pay", action: "Execute a split payment" },
  { id: "a6", title: "Vendor Management", description: "View vendor list, plan statuses, and KYC compliance.", route: "/trustlock/admin/vendors", action: "Check vendor details" },
  { id: "a7", title: "Platform Analytics", description: "Deep-dive into analytics charts and download platform reports.", route: "/trustlock/admin/analytics", action: "Download a report" },
  { id: "a8", title: "Browse Archives", description: "Open archives to view historical reports by date range.", route: "/trustlock/admin/analytics", action: "Select archive date range" },
];

const stepsMap = { vendor: vendorSteps, buyer: buyerSteps, admin: adminSteps };
const storageKey = (role: string) => `tl_testnet_guide_${role}`;

const TestnetGuide = ({ role }: TestnetGuideProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
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
      <Card className="border-blue-400/30 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Testnet Guide — {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
              <Badge variant="secondary" className="text-[10px]">{completedCount}/{steps.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <button onClick={() => setCollapsed(!collapsed)} className="text-blue-500 hover:text-blue-700">
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsed && (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {steps.map((step, i) => {
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
                      <Badge className="bg-blue-500 text-white text-[8px] shrink-0 animate-pulse">
                        👉 Do this now
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {completedCount === steps.length && !collapsed && (
            <div className="text-center py-2">
              <p className="text-xs font-semibold text-blue-600">🎉 All tasks completed! You've explored the {role} dashboard.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TestnetGuide;

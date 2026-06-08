import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, Users, UserCheck,
  ShieldCheck, FileText, BarChart3, Bot, Settings, LogOut, Shield, Menu, X, GitBranch, Banknote, Info, BookOpen, Landmark, MessageSquare, Fuel, ClipboardList, FlaskConical, Building2, Activity, Network, Inbox, UsersRound, Rocket, Bug, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import SidebarAccordionNav, { type SidebarNavGroup } from "@/components/shared/SidebarAccordionNav";
import { DEPARTMENTS } from "@/lib/adminDepartments";
import { useAdminUnreadBadges } from "@/hooks/useAdminUnreadBadges";

const allNavGroups: SidebarNavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", icon: LayoutDashboard, to: "/trustlock/admin", tip: "Dashboard summary with key metrics and alerts", moduleKey: "overview", badgeKey: null },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Work Orders", icon: ArrowLeftRight, to: "/trustlock/admin/transactions", tip: "View and manage all escrow work orders", moduleKey: "transactions" },
      { label: "Workflow Tracker", icon: GitBranch, to: "/trustlock/admin/workflow", tip: "Track milestone progress across all orders", moduleKey: "workflow" },
      { label: "Staff Workflow", icon: GitBranch, to: "/trustlock/admin/staff-workflow", tip: "Monitor staff task assignments and performance", moduleKey: "staff-workflow" },
      { label: "Departments", icon: Network, to: "/trustlock/admin/departments", tip: "View department divisions, workflows, and alerts", moduleKey: "staff", badgeKey: "deptAlerts" },
      { label: "Platforms", icon: Building2, to: "/trustlock/admin/platforms", tip: "Manage marketplace platform integrations", moduleKey: "platforms" },
    ],
  },
  {
    label: "Users",
    items: [
      { label: "Vendors", icon: Users, to: "/trustlock/admin/vendors", tip: "Manage vendor accounts, KYC, and tiers", moduleKey: "vendors" },
      { label: "Buyers", icon: UserCheck, to: "/trustlock/admin/buyers", tip: "View buyer accounts and order history", moduleKey: "buyers" },
      { label: "Lender KYB", icon: ShieldCheck, to: "/trustlock/admin/lender-kyb", tip: "Review and approve lender KYB submissions", moduleKey: "compliance" },
      { label: "Sandbox Leads", icon: FlaskConical, to: "/trustlock/admin/sandbox-leads", tip: "View contact info from sandbox testers", moduleKey: "sandbox" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Admin OS Pay", icon: Banknote, to: "/trustlock/admin/os-pay", tip: "Manage fund withdrawals and disbursements", moduleKey: "finance" },
      { label: "Tax Remittance", icon: Landmark, to: "/trustlock/admin/tax-remittance", tip: "Track collected taxes by jurisdiction", moduleKey: "tax" },
      { label: "Gas Treasury", icon: Fuel, to: "/trustlock/admin/gas-treasury", tip: "Monitor Polygon wallet balance and anchoring costs", moduleKey: "gas" },
    ],
  },
  {
    label: "Compliance & Security",
    items: [
      { label: "Compliance", icon: ShieldCheck, to: "/trustlock/admin/compliance", tip: "AML/KYC flags and regulatory compliance", moduleKey: "compliance" },
      { label: "Disputes", icon: AlertTriangle, to: "/trustlock/admin/disputes", tip: "Review open disputes and AI recommendations", moduleKey: "disputes" },
      { label: "Audit Access", icon: ShieldCheck, to: "/trustlock/admin/audit", tip: "Create read-only audit sessions for regulators", moduleKey: "audit" },
      { label: "Blockchain Proofs", icon: Shield, to: "/trustlock/admin/blockchain-proofs", tip: "Verify on-chain records anchored to Polygon", moduleKey: "blockchain" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Emmanuel AI", icon: Bot, to: "/trustlock/admin/emmanuel", tip: "Admin AI assistant for operations support", moduleKey: "emmanuel" },
      { label: "Analytics", icon: BarChart3, to: "/trustlock/admin/analytics", tip: "Revenue, volume, and performance charts", moduleKey: "analytics" },
      { label: "Platform Analytics", icon: Activity, to: "/trustlock/admin/platform-analytics", tip: "Fund flow, funnels, and geographic insights", moduleKey: "analytics" },
      { label: "Reports", icon: FileText, to: "/trustlock/admin/reports", tip: "Generate and export summary reports", moduleKey: "reports" },
      { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/admin/industry-playbook", tip: "Industry workflows and compliance overview", moduleKey: "industry" },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Team Chat", icon: UsersRound, to: "/trustlock/admin/team-chat", tip: "Internal department team chat", moduleKey: "team-chat", badgeKey: "teamChat" },
      { label: "Client Inbox", icon: Inbox, to: "/trustlock/admin/messages", tip: "View and respond to vendor and buyer messages", moduleKey: "messages" },
      { label: "Staff DMs", icon: MessageSquare, to: "/trustlock/admin/staff-dms", tip: "Direct messages with the Chief Executive", moduleKey: "staff-dms", badgeKey: "chiefDMs" },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Accountability", icon: ClipboardList, to: "/trustlock/admin/accountability", tip: "Action log and chief admin override controls", moduleKey: "accountability" },
      { label: "Training Manual", icon: BookOpen, to: "/trustlock/admin/training-manual", tip: "Operations guide for admin staff", moduleKey: "training" },
      { label: "Documents", icon: FileText, to: "/trustlock/admin/documents", tip: "Archived files, contracts, and evidence", moduleKey: "documents" },
      { label: "Settings", icon: Settings, to: "/trustlock/admin/settings", tip: "Platform configuration and preferences", moduleKey: "settings" },
      { label: "Deploy Contracts", icon: Rocket, to: "/trustlock/admin/deploy-contracts", tip: "Deploy escrow & registry smart contracts to Polygon", moduleKey: "deploy-contracts" },
      { label: "System Health", icon: Bug, to: "/trustlock/admin/system-health", tip: "Bug Sentry — live error stream across the platform", moduleKey: "system-health" },
      { label: "Autonomous Fixer", icon: Wrench, to: "/trustlock/admin/autonomous-fixer", tip: "Submit technical issues to TrustLock's autonomous fixer agent", moduleKey: "autonomous-fixer" },
    ],
  },
];

function getAdminAuth() {
  try {
    return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
  } catch { return {}; }
}

// CHIEF-ONLY modules — never exposed to non-chief admins regardless of department.
// Defense-in-depth: server-side handlers must also reject non-chief callers.
const CHIEF_ONLY_MODULES = new Set([
  "accountability",   // Staff Manager, chief overrides, action log
  "settings",         // Platform configuration
  "deploy-contracts", // Polygon mainnet contract deployment
]);

function getAccessibleModules(): string[] | null {
  const auth = getAdminAuth();
  const deptSlug = auth.departmentSlug;
  if (auth.isChief === true) return null;
  if (deptSlug) {
    const ACCESS_MAP: Record<string, string[]> = {
      // Executive department = full operational access (still NOT chief-only modules)
      executive: [
        "overview", "transactions", "workflow", "staff-workflow", "staff", "platforms",
        "vendors", "buyers", "compliance", "sandbox",
        "finance", "payout", "tax", "gas",
        "disputes", "audit", "blockchain",
        "emmanuel", "analytics", "reports", "industry",
        "team-chat", "messages", "staff-dms",
        "documents", "training",
      ],
      correspondence: ["overview", "messages", "team-chat", "staff-dms", "vendors", "buyers", "training", "emmanuel"],
      technical: ["overview", "system-health", "blockchain", "gas", "platforms", "team-chat", "staff-dms", "training", "emmanuel"],
      disputes: ["overview", "disputes", "documents", "team-chat", "staff-dms", "training", "emmanuel"],
      finance: ["overview", "transactions", "finance", "payout", "tax", "gas", "analytics", "team-chat", "staff-dms", "training", "emmanuel"],
      compliance: ["overview", "compliance", "documents", "team-chat", "staff-dms", "training", "emmanuel"],
      operations: ["overview", "transactions", "workflow", "vendors", "buyers", "platforms", "blockchain", "industry", "documents", "team-chat", "staff-dms", "training", "emmanuel"],
    };
    const base = ACCESS_MAP[deptSlug] || ["overview", "emmanuel", "team-chat", "staff-dms", "training"];
    // Strip any chief-only modules that may have slipped into a dept allow-list
    return base.filter((m) => !CHIEF_ONLY_MODULES.has(m));
  }
  return ["overview", "emmanuel", "team-chat", "staff-dms", "training"];
}

const AdminSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { teamChat, chiefDMs, deptAlerts } = useAdminUnreadBadges();

  const auth = getAdminAuth();
  const deptSlug = auth.departmentSlug;
  const deptName = deptSlug ? DEPARTMENTS.find(d => d.slug === deptSlug)?.name : null;

  const badgeCounts: Record<string, number> = { teamChat, chiefDMs, deptAlerts };

  const accessibleModules = getAccessibleModules();

  // Filter groups by accessible modules, removing empty groups
  const filteredGroups: SidebarNavGroup[] = allNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (accessibleModules === null) return true;
        return accessibleModules.includes(item.moduleKey || "");
      }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("tl-open-sidebar", handler);
    return () => window.removeEventListener("tl-open-sidebar", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("tl_admin_auth");
    localStorage.removeItem("tl_network");
    navigate("/trustlock/admin/login");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-200",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-sidebar-foreground">TrustLock</span>
              <p className="text-[10px] text-muted-foreground leading-none">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {deptName && (
          <div className="px-4 py-2 border-b border-sidebar-border">
            <Badge variant="outline" className="text-[10px] gap-1 w-full justify-center">
              <Building2 className="w-3 h-3" />
              {deptName}
            </Badge>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <SidebarAccordionNav
            groups={filteredGroups}
            basePath="/trustlock/admin"
            badgeCounts={badgeCounts}
            onItemClick={() => setOpen(false)}
          />
        </nav>

        <SidebarLegalLinks />
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;

import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, Users, UserCheck,
  ShieldCheck, FileText, BarChart3, Bot, Settings, LogOut, Shield, Menu, X, GitBranch, Banknote, Info, BookOpen, Tag, Landmark, MessageSquare, Fuel, ClipboardList, FlaskConical, Building2, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENTS } from "@/lib/adminDepartments";

// Each nav item now has a moduleKey for department access control
const allNavItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/admin", tip: "Dashboard summary with key metrics and alerts", moduleKey: "overview" },
  { label: "Work Orders", icon: ArrowLeftRight, to: "/trustlock/admin/transactions", tip: "View and manage all escrow work orders", moduleKey: "transactions" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/admin/disputes", tip: "Review open disputes and AI recommendations", moduleKey: "disputes" },
  { label: "Workflow Tracker", icon: GitBranch, to: "/trustlock/admin/workflow", tip: "Track milestone progress across all orders", moduleKey: "workflow" },
  { label: "Emmanuel AI", icon: Bot, to: "/trustlock/admin/emmanuel", tip: "Admin AI assistant for operations support", moduleKey: "emmanuel" },
  { label: "Vendors", icon: Users, to: "/trustlock/admin/vendors", tip: "Manage vendor accounts, KYC, and tiers", moduleKey: "vendors" },
  { label: "Buyers", icon: UserCheck, to: "/trustlock/admin/buyers", tip: "View buyer accounts and order history", moduleKey: "buyers" },
  { label: "Compliance", icon: ShieldCheck, to: "/trustlock/admin/compliance", tip: "AML/KYC flags and regulatory compliance", moduleKey: "compliance" },
  { label: "Analytics", icon: BarChart3, to: "/trustlock/admin/analytics", tip: "Revenue, volume, and platform performance charts", moduleKey: "analytics" },
  { label: "Reports", icon: FileText, to: "/trustlock/admin/reports", tip: "Generate and export summary reports", moduleKey: "reports" },
  { label: "Platform Analytics", icon: Activity, to: "/trustlock/admin/platform-analytics", tip: "Fund flow, funnels, adoption, and geographic insights", moduleKey: "analytics" },
  { label: "Documents", icon: FileText, to: "/trustlock/admin/documents", tip: "Archived files, contracts, and evidence", moduleKey: "documents" },
  { label: "Admin OS Pay", icon: Banknote, to: "/trustlock/admin/os-pay", tip: "Manage fund withdrawals and disbursements", moduleKey: "finance" },
  { label: "Audit Access", icon: ShieldCheck, to: "/trustlock/admin/audit", tip: "Create read-only audit sessions for regulators", moduleKey: "audit" },
  { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/admin/industry-playbook", tip: "Industry capabilities, workflows, and compliance overview", moduleKey: "industry" },
  { label: "TL-ID Diagnostics", icon: Tag, to: "/trustlock/admin/tl-id", tip: "Look up component identifiers reported by users for support", moduleKey: "overview" },
  { label: "Tax Remittance", icon: Landmark, to: "/trustlock/admin/tax-remittance", tip: "Track collected taxes by jurisdiction and manage manual remittance", moduleKey: "tax" },
  { label: "Blockchain Proofs", icon: Shield, to: "/trustlock/admin/blockchain-proofs", tip: "Verify immutable on-chain records anchored to Polygon", moduleKey: "blockchain" },
  { label: "Gas Treasury", icon: Fuel, to: "/trustlock/admin/gas-treasury", tip: "Monitor Polygon wallet balance and anchoring costs", moduleKey: "gas" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/admin/messages", tip: "View and respond to all vendor and buyer messages", moduleKey: "messages" },
  { label: "Accountability", icon: ClipboardList, to: "/trustlock/admin/accountability", tip: "Shared inbox, action log, and chief admin override controls", moduleKey: "accountability" },
  { label: "Training Manual", icon: BookOpen, to: "/trustlock/admin/training-manual", tip: "Operations guide for new and existing admin staff", moduleKey: "training" },
  { label: "Sandbox Leads", icon: FlaskConical, to: "/trustlock/admin/sandbox-leads", tip: "View contact info collected from sandbox testers", moduleKey: "sandbox" },
  { label: "Departments", icon: Building2, to: "/trustlock/admin/departments", tip: "View department divisions and assigned staff", moduleKey: "staff" },
  { label: "Platforms", icon: Building2, to: "/trustlock/admin/platforms", tip: "Manage marketplace platform integrations, API keys, and vendor claim tokens", moduleKey: "platforms" },
  { label: "Settings", icon: Settings, to: "/trustlock/admin/settings", tip: "Platform configuration and preferences", moduleKey: "settings" },
];

function getAdminAuth() {
  try {
    return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
  } catch { return {}; }
}

function getAccessibleModules(): string[] | null {
  const auth = getAdminAuth();
  const deptSlug = auth.departmentSlug;

  // Chiefs and executive always get full access
  if (auth.isChief === true) return null; // null = all access

  // If department is set, use its access modules
  if (deptSlug) {
    const dept = DEPARTMENTS.find(d => d.slug === deptSlug);
    // Always include overview, emmanuel, training, industry for all staff
    const base = ["overview", "emmanuel", "training", "industry"];
    const deptModules = dept ? ([] as string[]) : base;
    // We need the actual modules from the department — stored in DB but we mirror in DEPARTMENTS
    // For now use the known access patterns
    const ACCESS_MAP: Record<string, string[]> = {
      executive: [], // null handled above
      correspondence: ["overview", "messages", "vendors", "buyers", "training", "emmanuel"],
      disputes: ["overview", "disputes", "documents", "training", "emmanuel"],
      finance: ["overview", "transactions", "finance", "payout", "tax", "gas", "analytics", "training", "emmanuel"],
      compliance: ["overview", "compliance", "documents", "training", "emmanuel"],
      operations: ["overview", "transactions", "workflow", "vendors", "buyers", "platforms", "blockchain", "industry", "documents", "training", "emmanuel"],
    };
    return ACCESS_MAP[deptSlug] || base;
  }

  // Legacy: use chief-only check (backwards compat)
  if (auth.isChief === true) return null;
  return ["overview", "emmanuel", "messages", "training", "industry"];
}

const AdminSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const auth = getAdminAuth();
  const isChief = auth.isChief === true;
  const deptSlug = auth.departmentSlug;
  const deptName = deptSlug ? DEPARTMENTS.find(d => d.slug === deptSlug)?.name : null;

  const accessibleModules = getAccessibleModules();
  const navItems = allNavItems.filter((item) => {
    if (accessibleModules === null) return true; // full access
    return accessibleModules.includes(item.moduleKey);
  });

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

        {/* Department Badge */}
        {deptName && (
          <div className="px-4 py-2 border-b border-sidebar-border">
            <Badge variant="outline" className="text-[10px] gap-1 w-full justify-center">
              <Building2 className="w-3 h-3" />
              {deptName}
            </Badge>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <div key={item.to} className="flex items-center gap-1">
              <NavLink
                to={item.to}
                end={item.to === "/trustlock/admin"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                    <Info className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" className="max-w-[200px] text-xs p-2">
                  {item.tip}
                </PopoverContent>
              </Popover>
            </div>
          ))}
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

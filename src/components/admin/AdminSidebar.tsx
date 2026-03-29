import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, Users, UserCheck,
  ShieldCheck, FileText, BarChart3, Bot, Settings, LogOut, Shield, Menu, X, Wallet, GitBranch, Banknote, Info, BookOpen, Tag, Landmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/admin", tip: "Dashboard summary with key metrics and alerts" },
  { label: "Transactions", icon: ArrowLeftRight, to: "/trustlock/admin/transactions", tip: "View and manage all escrow transactions" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/admin/disputes", tip: "Review open disputes and AI recommendations" },
  { label: "Workflow Tracker", icon: GitBranch, to: "/trustlock/admin/workflow", tip: "Track milestone progress across all orders" },
  { label: "Emmanuel AI", icon: Bot, to: "/trustlock/admin/emmanuel", tip: "Admin AI assistant for operations support" },
  { label: "Vendors", icon: Users, to: "/trustlock/admin/vendors", tip: "Manage vendor accounts, KYC, and tiers" },
  { label: "Buyers", icon: UserCheck, to: "/trustlock/admin/buyers", tip: "View buyer accounts and order history" },
  { label: "Compliance", icon: ShieldCheck, to: "/trustlock/admin/compliance", tip: "AML/KYC flags and regulatory compliance" },
  { label: "Analytics", icon: BarChart3, to: "/trustlock/admin/analytics", tip: "Revenue, volume, and platform performance charts" },
  { label: "Reports", icon: FileText, to: "/trustlock/admin/reports", tip: "Generate and export summary reports" },
  { label: "Documents", icon: FileText, to: "/trustlock/admin/documents", tip: "Archived files, contracts, and evidence" },
  { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/admin/os-pay", tip: "Process internal payments, refunds, and splits" },
  { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/admin/payout", tip: "Manage fund withdrawals and disbursements" },
  { label: "Audit Access", icon: ShieldCheck, to: "/trustlock/admin/audit", tip: "Create read-only audit sessions for regulators" },
  { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/admin/industry-playbook", tip: "Industry capabilities, workflows, and compliance overview" },
  { label: "TL-ID Diagnostics", icon: Tag, to: "/trustlock/admin/tl-id", tip: "Look up component identifiers reported by users for support" },
  { label: "Settings", icon: Settings, to: "/trustlock/admin/settings", tip: "Platform configuration and preferences" },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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

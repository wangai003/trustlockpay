import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, DollarSign, Globe, ShieldCheck,
  Settings, LogOut, Store, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/vendor" },
  { label: "Transactions", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions" },
  { label: "Payouts", icon: DollarSign, to: "/trustlock/vendor/payouts" },
  { label: "My Sites", icon: Globe, to: "/trustlock/vendor/sites" },
  { label: "KYC & Verification", icon: ShieldCheck, to: "/trustlock/vendor/kyc" },
  { label: "Documents", icon: FileText, to: "/trustlock/vendor/documents" },
  { label: "Settings", icon: Settings, to: "/trustlock/vendor/settings" },
];

const VendorSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("tl_vendor_auth");
    localStorage.removeItem("tl_vendor_network");
    navigate("/trustlock/vendor/login");
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Store className="w-4 h-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <span className="font-heading font-bold text-sm text-sidebar-foreground">TrustLock</span>
          <p className="text-[10px] text-muted-foreground leading-none">Vendor Portal</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/trustlock/vendor"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
};

export default VendorSidebar;

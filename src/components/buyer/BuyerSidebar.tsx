import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, AlertTriangle, FileText, Settings, LogOut, ShoppingBag, Store, Menu, X, Home, Bot, HelpCircle, BarChart3, Wallet, Banknote, Receipt, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/buyer", tip: "Dashboard summary with order status and alerts" },
  { label: "Bill Payments", icon: Receipt, to: "/trustlock/buyer/bill-payments", tip: "Track service fees and pay-as-you-go charges" },
  { label: "My Orders", icon: Package, to: "/trustlock/buyer/orders", tip: "View all purchases and escrow order statuses" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/buyer/disputes", tip: "File and track disputes on transactions" },
  { label: "Support Assistant", icon: Bot, to: "/trustlock/buyer/assistant", tip: "AI-powered support for order questions" },
  { label: "Analytics & Reports", icon: BarChart3, to: "/trustlock/buyer/analytics", tip: "Spending trends and transaction reports" },
  { label: "Documents", icon: FileText, to: "/trustlock/buyer/documents", tip: "Receipts, invoices, and uploaded evidence" },
  { label: "Help Center", icon: HelpCircle, to: "/trustlock/buyer/help", tip: "Guides, FAQs, and how-to articles" },
  { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/buyer/os-pay", tip: "Make internal OS service payments" },
  { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/buyer/payout", tip: "Withdraw refunded or split funds" },
  { label: "Settings", icon: Settings, to: "/trustlock/buyer/settings", tip: "Account preferences and notifications" },
];

const BuyerSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { switchRole, switching } = useRoleSwitcher("buyer");
  const handleLogout = () => {
    localStorage.removeItem("tl_buyer_auth");
    localStorage.removeItem("tl_buyer_network");
    navigate("/trustlock/buyer/login");
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
              <ShoppingBag className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-sidebar-foreground">TrustLock</span>
              <p className="text-[10px] text-muted-foreground leading-none">Buyer Portal</p>
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
                end={item.to === "/trustlock/buyer"}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0">
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-xs">
                  {item.tip}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground font-semibold" onClick={() => { setOpen(false); switchRole(); }} disabled={switching}>
            <Store className="w-4 h-4" />
            {switching ? "Switching..." : "Switch to Vendor"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => { setOpen(false); navigate("/"); }}>
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};

export default BuyerSidebar;

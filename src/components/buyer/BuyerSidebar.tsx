import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, AlertTriangle, FileText, Settings, LogOut, ShoppingBag, Store, Menu, X, Home, Bot, HelpCircle, BarChart3, Wallet, Banknote, Receipt, Info, BookOpen, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";
import TLId from "@/components/shared/TLId";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/buyer", tip: "Dashboard summary with order status and alerts", tlId: "TL-B-SB-NAV-OVERVIEW", badgeKey: null as string | null },
  { label: "Bill Payments", icon: Receipt, to: "/trustlock/buyer/bill-payments", tip: "Track service fees and pay-as-you-go charges", tlId: "TL-B-SB-NAV-BILL-PAY", badgeKey: null },
  { label: "My Orders", icon: Package, to: "/trustlock/buyer/orders", tip: "View all purchases and escrow order statuses", tlId: "TL-B-SB-NAV-ORDERS", badgeKey: null },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/buyer/disputes", tip: "File and track disputes on transactions", tlId: "TL-B-SB-NAV-DISPUTES", badgeKey: "disputes" },
  { label: "Support Assistant", icon: Bot, to: "/trustlock/buyer/assistant", tip: "AI-powered support for order questions", tlId: "TL-B-SB-NAV-ASSISTANT", badgeKey: null },
  { label: "Analytics & Reports", icon: BarChart3, to: "/trustlock/buyer/analytics", tip: "Spending trends and transaction reports", tlId: "TL-B-SB-NAV-ANALYTICS", badgeKey: null },
  { label: "Documents", icon: FileText, to: "/trustlock/buyer/documents", tip: "Receipts, invoices, and uploaded evidence", tlId: "TL-B-SB-NAV-DOCUMENTS", badgeKey: null },
  { label: "Help Center", icon: HelpCircle, to: "/trustlock/buyer/help", tip: "Guides, FAQs, and how-to articles", tlId: "TL-B-SB-NAV-HELP", badgeKey: null },
  { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/buyer/os-pay", tip: "Make internal OS service payments", tlId: "TL-B-SB-NAV-OSPAY", badgeKey: null },
  { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/buyer/payout", tip: "Withdraw refunded or split funds", tlId: "TL-B-SB-NAV-PAYOUT", badgeKey: null },
  { label: "Teams", icon: Users, to: "/trustlock/buyer/teams", tip: "Manage procurement teams and coordinate buyer-side tasks", tlId: "TL-B-SB-NAV-TEAMS", badgeKey: null },
  { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/buyer/industry-playbook", tip: "Industry workflows, capabilities, and compliance overview", tlId: "TL-B-SB-NAV-PLAYBOOK", badgeKey: null },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/buyer/messages", tip: "Direct messaging with vendors and admin support", tlId: "TL-B-SB-NAV-MESSAGES", badgeKey: "messages" },
  { label: "Settings", icon: Settings, to: "/trustlock/buyer/settings", tip: "Account preferences and notifications", tlId: "TL-B-SB-NAV-SETTINGS", badgeKey: null },
];

const BuyerSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { switchRole, switching } = useRoleSwitcher("buyer");
  const { messages: msgCount, disputes: disputeCount } = useSidebarBadges("buyer");

  const badgeCounts: Record<string, number> = { messages: msgCount, disputes: disputeCount };

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("tl-open-sidebar", handler);
    return () => window.removeEventListener("tl-open-sidebar", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tl_buyer_auth");
    localStorage.removeItem("tl_buyer_network");
    navigate("/trustlock/buyer/login");
  };

  return (
    <>
      <TLId code="TL-B-SB-BTN-MENU" inline>
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>
      </TLId>

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
          {navItems.map((item) => {
            const badgeCount = item.badgeKey ? (badgeCounts[item.badgeKey] || 0) : 0;
            return (
              <div key={item.to} className="flex items-center gap-1">
                <TLId code={item.tlId} inline>
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
                    {badgeCount > 0 && (
                      <Badge className="ml-auto text-[9px] px-1.5 min-w-[18px] justify-center bg-destructive text-destructive-foreground">
                        {badgeCount}
                      </Badge>
                    )}
                  </NavLink>
                </TLId>
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
            );
          })}
        </nav>

        <SidebarLegalLinks />
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <TLId code="TL-B-SB-BTN-SWITCH-VENDOR" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground font-semibold" onClick={() => { setOpen(false); switchRole(); }} disabled={switching}>
              <Store className="w-4 h-4" />
              {switching ? "Switching..." : "Switch to Vendor"}
            </Button>
          </TLId>
          <TLId code="TL-B-SB-BTN-HOME" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => { setOpen(false); navigate("/"); }}>
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          </TLId>
          <TLId code="TL-B-SB-BTN-LOGOUT" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </TLId>
        </div>
      </aside>
    </>
  );
};

export default BuyerSidebar;

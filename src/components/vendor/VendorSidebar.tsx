import { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, DollarSign, Globe, ShieldCheck,
  Settings, LogOut, Store, FileText, Menu, X, Home, Bot, HelpCircle, CreditCard, BarChart3, Wallet, ShoppingBag, Banknote, Receipt, Link2, Info, BookOpen, Users, MessageSquare, ClipboardList, AlertTriangle, Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";

const baseNavItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/vendor", tip: "Dashboard summary with earnings and activity", tlId: "TL-V-SB-NAV-OVERVIEW", badgeKey: null as string | null },
  { label: "Bill Payments", icon: Receipt, to: "/trustlock/vendor/bill-payments", tip: "View subscription charges and service fees", tlId: "TL-V-SB-NAV-BILL-PAY", badgeKey: null },
  { label: "Direct Work Orders", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions", tip: "Orders from your own website widget, standalone payment links, or TrustLock OS Pay — transactions you initiate and manage directly", tlId: "TL-V-SB-NAV-TRANSACTIONS", badgeKey: null },
  { label: "Marketplace Work Orders", icon: Store, to: "/trustlock/vendor/marketplace-orders", tip: "Orders routed to you from multi-vendor platforms (Amazon, Jumia, Shopify, etc.) — where the marketplace controls checkout and splits cart orders across vendors", tlId: "TL-V-SB-NAV-MARKETPLACE", badgeKey: null },
  { label: "My Sites & Widget", icon: Globe, to: "/trustlock/vendor/sites", tip: "Manage your websites, widget installation, and configure widget behavior", tlId: "TL-V-SB-NAV-SITES", badgeKey: null },
  { label: "Fee Simulator", icon: DollarSign, to: "/trustlock/vendor/fee-simulator", tip: "Preview cross-border fees for any buyer/vendor corridor", tlId: "TL-V-SB-NAV-FEE-SIM", badgeKey: null },
  { label: "KYC / KYB", icon: ShieldCheck, to: "/trustlock/vendor/kyc", tip: "Upload identity or business documents and verify your account", tlId: "TL-V-SB-NAV-KYC", badgeKey: null },
  { label: "TrustLock Assist", icon: Bot, to: "/trustlock/vendor/assistant", tip: "AI assistant for vendor support and queries", tlId: "TL-V-SB-NAV-ASSISTANT", badgeKey: null },
  { label: "Analytics & Reports", icon: BarChart3, to: "/trustlock/vendor/analytics", tip: "Sales trends, revenue charts, and exports", tlId: "TL-V-SB-NAV-ANALYTICS", badgeKey: null },
  { label: "Documents", icon: FileText, to: "/trustlock/vendor/documents", tip: "Stored contracts, invoices, and evidence files", tlId: "TL-V-SB-NAV-DOCUMENTS", badgeKey: null },
  { label: "Help Center", icon: HelpCircle, to: "/trustlock/vendor/help", tip: "Guides, FAQs, and platform documentation", tlId: "TL-V-SB-NAV-HELP", badgeKey: null },
  { label: "Plans & Pricing", icon: CreditCard, to: "/trustlock/vendor/pricing", tip: "View and upgrade your subscription plan", tlId: "TL-V-SB-NAV-PRICING", badgeKey: null },
  { label: "Standalone Links", icon: Link2, to: "/trustlock/vendor/standalone-links", tip: "Create shareable payment links for P2P deals", tlId: "TL-V-SB-NAV-LINKS", badgeKey: null },
  { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/vendor/os-pay", tip: "Process internal OS service payments", tlId: "TL-V-SB-NAV-OSPAY", badgeKey: null },
  { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/vendor/payout", tip: "Withdraw funds via local or diaspora rails", tlId: "TL-V-SB-NAV-PAYOUT", badgeKey: null },
  { label: "Teams", icon: Users, to: "/trustlock/vendor/teams", tip: "Manage work order teams, assign industry tasks to members", tlId: "TL-V-SB-NAV-TEAMS", badgeKey: null },
  { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/vendor/industry-playbook", tip: "Industry workflows, capabilities, and compliance overview", tlId: "TL-V-SB-NAV-PLAYBOOK", badgeKey: null },
  { label: "Buyer Lookup", icon: Search, to: "/trustlock/vendor/buyer-lookup", tip: "Search and connect with buyers on the TrustLock network", tlId: "TL-V-SB-NAV-BUYER-LOOKUP", badgeKey: null },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/vendor/messages", tip: "Direct messaging with buyers and admin support", tlId: "TL-V-SB-NAV-MESSAGES", badgeKey: "messages" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/vendor/disputes", tip: "View and respond to disputes filed by buyers", tlId: "TL-V-SB-NAV-DISPUTES", badgeKey: "disputes" },
  { label: "Settings", icon: Settings, to: "/trustlock/vendor/settings", tip: "Account preferences and notification settings", tlId: "TL-V-SB-NAV-SETTINGS", badgeKey: null },
];

const VendorSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { switchRole, switching } = useRoleSwitcher("vendor");
  const { messages: msgCount, disputes: disputeCount } = useSidebarBadges("vendor");

  const badgeCounts: Record<string, number> = { messages: msgCount, disputes: disputeCount };

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    const pricingIdx = items.findIndex(i => i.to === "/trustlock/vendor/pricing");
    items.splice(pricingIdx + 1, 0, {
      label: "Quote Requests", icon: ClipboardList, to: "/trustlock/vendor/crm",
      tip: "View and manage customer quote requests (RFQ/Proforma CRM)", tlId: "TL-V-SB-NAV-CRM", badgeKey: null,
    });
    return items;
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("tl-open-sidebar", handler);
    return () => window.removeEventListener("tl-open-sidebar", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tl_vendor_auth");
    localStorage.removeItem("tl_vendor_network");
    navigate("/trustlock/vendor/login");
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
              <Store className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-sidebar-foreground">TrustLock</span>
              <p className="text-[10px] text-muted-foreground leading-none">Vendor Portal</p>
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
                <NavLink
                    to={item.to}
                    end={item.to === "/trustlock/vendor"}
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
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground font-semibold" onClick={() => { setOpen(false); switchRole(); }} disabled={switching}>
              <ShoppingBag className="w-4 h-4" />
              {switching ? "Switching..." : "Switch to Buyer"}
            </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => { setOpen(false); navigate("/"); }}>
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
        </div>
      </aside>
    </>
  );
};

export default VendorSidebar;

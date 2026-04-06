import { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, DollarSign, Globe, ShieldCheck,
  Settings, LogOut, Store, FileText, Menu, X, Home, Bot, HelpCircle, CreditCard, BarChart3, Wallet, ShoppingBag, Banknote, Receipt, Link2, Info, BookOpen, Users, MessageSquare, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import TLId from "@/components/shared/TLId";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";

const baseNavItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/vendor", tip: "Dashboard summary with earnings and activity", tlId: "TL-V-SB-NAV-OVERVIEW" },
  { label: "Bill Payments", icon: Receipt, to: "/trustlock/vendor/bill-payments", tip: "View subscription charges and service fees", tlId: "TL-V-SB-NAV-BILL-PAY" },
  { label: "Work Orders", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions", tip: "All escrow work orders and order statuses", tlId: "TL-V-SB-NAV-TRANSACTIONS" },
  { label: "My Sites", icon: Globe, to: "/trustlock/vendor/sites", tip: "Manage websites with TrustLock widget installed", tlId: "TL-V-SB-NAV-SITES" },
  { label: "KYC / KYB", icon: ShieldCheck, to: "/trustlock/vendor/kyc", tip: "Upload identity or business documents and verify your account", tlId: "TL-V-SB-NAV-KYC" },
  { label: "TrustLock Assist", icon: Bot, to: "/trustlock/vendor/assistant", tip: "AI assistant for vendor support and queries", tlId: "TL-V-SB-NAV-ASSISTANT" },
  { label: "Analytics & Reports", icon: BarChart3, to: "/trustlock/vendor/analytics", tip: "Sales trends, revenue charts, and exports", tlId: "TL-V-SB-NAV-ANALYTICS" },
  { label: "Documents", icon: FileText, to: "/trustlock/vendor/documents", tip: "Stored contracts, invoices, and evidence files", tlId: "TL-V-SB-NAV-DOCUMENTS" },
  { label: "Help Center", icon: HelpCircle, to: "/trustlock/vendor/help", tip: "Guides, FAQs, and platform documentation", tlId: "TL-V-SB-NAV-HELP" },
  { label: "Plans & Pricing", icon: CreditCard, to: "/trustlock/vendor/pricing", tip: "View and upgrade your subscription plan", tlId: "TL-V-SB-NAV-PRICING" },
  { label: "Standalone Links", icon: Link2, to: "/trustlock/vendor/standalone-links", tip: "Create shareable payment links for P2P deals", tlId: "TL-V-SB-NAV-LINKS" },
  { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/vendor/os-pay", tip: "Process internal OS service payments", tlId: "TL-V-SB-NAV-OSPAY" },
  { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/vendor/payout", tip: "Withdraw funds via local or diaspora rails", tlId: "TL-V-SB-NAV-PAYOUT" },
  { label: "Teams", icon: Users, to: "/trustlock/vendor/teams", tip: "Manage work order teams, assign industry tasks to members", tlId: "TL-V-SB-NAV-TEAMS" },
  { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/vendor/industry-playbook", tip: "Industry workflows, capabilities, and compliance overview", tlId: "TL-V-SB-NAV-PLAYBOOK" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/vendor/messages", tip: "Direct messaging with buyers and admin support", tlId: "TL-V-SB-NAV-MESSAGES" },
  { label: "Marketplace Orders", icon: Store, to: "/trustlock/vendor/marketplace-orders", tip: "Orders from integrated marketplace platforms (Jumia, Amazon, etc.)", tlId: "TL-V-SB-NAV-MARKETPLACE" },
  { label: "Widget Config", icon: Settings, to: "/trustlock/vendor/widget-config", tip: "Configure widget settings for your platform — multi-vendor, branding, payments", tlId: "TL-V-SB-NAV-WIDGET-CFG" },
  { label: "Settings", icon: Settings, to: "/trustlock/vendor/settings", tip: "Account preferences and notification settings", tlId: "TL-V-SB-NAV-SETTINGS" },
];

const VendorSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { switchRole, switching } = useRoleSwitcher("vendor");

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    // Always show Quote Requests (CRM) after "Plans & Pricing"
    const pricingIdx = items.findIndex(i => i.to === "/trustlock/vendor/pricing");
    items.splice(pricingIdx + 1, 0, {
      label: "Quote Requests", icon: ClipboardList, to: "/trustlock/vendor/crm",
      tip: "View and manage customer quote requests (RFQ/Proforma CRM)", tlId: "TL-V-SB-NAV-CRM",
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
      <TLId code="TL-V-SB-BTN-MENU" inline>
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
          {navItems.map((item) => (
            <div key={item.to} className="flex items-center gap-1">
              <TLId code={item.tlId} inline>
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
          ))}
        </nav>

        <SidebarLegalLinks />
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <TLId code="TL-V-SB-BTN-SWITCH-BUYER" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground font-semibold" onClick={() => { setOpen(false); switchRole(); }} disabled={switching}>
              <ShoppingBag className="w-4 h-4" />
              {switching ? "Switching..." : "Switch to Buyer"}
            </Button>
          </TLId>
          <TLId code="TL-V-SB-BTN-HOME" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => { setOpen(false); navigate("/"); }}>
              <Home className="w-4 h-4" />
              Back to Home
            </Button>
          </TLId>
          <TLId code="TL-V-SB-BTN-LOGOUT" inline>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </TLId>
        </div>
      </aside>
    </>
  );
};

export default VendorSidebar;

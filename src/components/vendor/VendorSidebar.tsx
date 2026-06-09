import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, DollarSign, Globe, ShieldCheck,
  Settings, LogOut, Store, FileText, Menu, X, Home, Bot, HelpCircle, CreditCard, BarChart3, Wallet, ShoppingBag, Banknote, Receipt, Link2, BookOpen, Users, MessageSquare, ClipboardList, AlertTriangle, Search, Landmark, Palette, Shield, ShieldCheck, Globe2, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoleSwitcher } from "@/hooks/useRoleSwitcher";
import { supabase } from "@/integrations/supabase/client";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import SidebarAccordionNav, { type SidebarNavGroup } from "@/components/shared/SidebarAccordionNav";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

const navGroups: SidebarNavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", icon: LayoutDashboard, to: "/trustlock/vendor", tip: "Dashboard summary with earnings and activity" },
    ],
  },
  {
    label: "Orders",
    items: [
      { label: "Direct Work Orders", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions", tip: "Orders from your own website widget, standalone links, or OS Pay" },
      { label: "Marketplace Work Orders", icon: Store, to: "/trustlock/vendor/marketplace-orders", tip: "Orders routed from multi-vendor platforms" },
    ],
  },
  {
    label: "Payments & Finance",
    items: [
      { label: "Bill Payments", icon: Receipt, to: "/trustlock/vendor/bill-payments", tip: "View subscription charges and service fees" },
      { label: "TrustLock OS Pay", icon: Wallet, to: "/trustlock/vendor/os-pay", tip: "Pay for TrustLock subscriptions, AI queries, widget services, and platform fees" },
      { label: "TrustLock OS Payout", icon: Banknote, to: "/trustlock/vendor/payout", tip: "Withdraw your earned escrow funds to your saved crypto wallet or bank account" },
      { label: "Fee Simulator", icon: DollarSign, to: "/trustlock/vendor/fee-simulator", tip: "Preview cross-border fees for any corridor" },
      { label: "Standalone Links", icon: Link2, to: "/trustlock/vendor/standalone-links", tip: "Create shareable payment links for P2P deals" },
      { label: "Plans & Pricing", icon: CreditCard, to: "/trustlock/vendor/pricing", tip: "View and upgrade your subscription plan" },
    ],
  },
  {
    label: "Financing",
    items: [
      { label: "Lender Lookup", icon: Landmark, to: "/trustlock/vendor/lender-lookup", tip: "Browse verified lenders and request financing" },
      { label: "Request Financing", icon: ClipboardList, to: "/trustlock/vendor/request-financing", tip: "Submit a financing application to a lender" },
      { label: "Repayments", icon: ClipboardList, to: "/trustlock/vendor/repayments", tip: "Log and track offline repayment confirmations" },
    ],
  },
  {
    label: "Network & Teams",
    items: [
      { label: "Buyer Lookup", icon: Search, to: "/trustlock/vendor/buyer-lookup", tip: "Search and connect with buyers" },
      { label: "Teams", icon: Users, to: "/trustlock/vendor/teams", tip: "Manage work order teams and assign tasks" },
      { label: "Quote Requests", icon: ClipboardList, to: "/trustlock/vendor/crm", tip: "View and manage customer quote requests" },
    ],
  },
  {
    label: "Tools & Insights",
    items: [
      { label: "My Sites & Widget", icon: Globe, to: "/trustlock/vendor/sites", tip: "Manage websites, widget installation, and behavior" },
      { label: "KYC / KYB", icon: ShieldCheck, to: "/trustlock/vendor/kyc", tip: "Upload identity or business documents" },
      { label: "Analytics & Reports", icon: BarChart3, to: "/trustlock/vendor/analytics", tip: "Sales trends, revenue charts, and exports" },
      { label: "Documents", icon: FileText, to: "/trustlock/vendor/documents", tip: "Stored contracts, invoices, and evidence files" },
      { label: "Industry Playbook", icon: BookOpen, to: "/trustlock/vendor/industry-playbook", tip: "Industry workflows and compliance overview" },
    ],
  },
  {
    label: "Support & Communication",
    items: [
      { label: "TrustLock Assist", icon: Bot, to: "/trustlock/vendor/assistant", tip: "AI assistant for vendor support" },
      { label: "Messages", icon: MessageSquare, to: "/trustlock/vendor/messages", tip: "Direct messaging with buyers and admin", badgeKey: "messages" },
      { label: "Disputes", icon: AlertTriangle, to: "/trustlock/vendor/disputes", tip: "View and respond to disputes", badgeKey: "disputes" },
      { label: "Help Center", icon: HelpCircle, to: "/trustlock/vendor/help", tip: "Guides, FAQs, and documentation" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Settings", icon: Settings, to: "/trustlock/vendor/settings", tip: "Account preferences and notifications", badgeKey: "settings" },
    ],
  },
];

const VendorSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { switchRole, switching } = useRoleSwitcher("vendor");
  const { messages: msgCount, disputes: disputeCount } = useSidebarBadges("vendor");
  const { user } = useAuth();

  // Check web presence for settings badge
  const { data: webPresenceCheck } = useQuery({
    queryKey: ["vendor_web_presence_badge", user?.id],
    queryFn: async () => {
      if (!user?.id) return { missing: false };
      const { data } = await supabase.from("profiles").select("website_url, social_links").eq("id", user.id).single();
      if (!data) return { missing: false };
      const hasSocial = data.social_links && Object.values(data.social_links as Record<string, string>).some(v => v);
      return { missing: !data.website_url && !hasSocial };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const settingsBadge = webPresenceCheck?.missing ? 1 : 0;
  const badgeCounts: Record<string, number> = { messages: msgCount, disputes: disputeCount, settings: settingsBadge };

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

        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <SidebarAccordionNav
            groups={navGroups}
            basePath="/trustlock/vendor"
            badgeCounts={badgeCounts}
            onItemClick={() => setOpen(false)}
          />
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

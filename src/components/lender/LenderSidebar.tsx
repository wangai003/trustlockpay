import { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Landmark, Briefcase, ClipboardList, Search, MessageSquare,
  FileText, Link2, BarChart3, Bot, ShieldCheck, Settings, LogOut, Home,
  Menu, X, Info, Store, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import SidebarLegalLinks from "@/components/shared/SidebarLegalLinks";
import { useSidebarBadges } from "@/hooks/useSidebarBadges";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, to: "/trustlock/lender", tip: "Portfolio metrics and key indicators", badgeKey: null as string | null },
  { label: "Portfolio", icon: Briefcase, to: "/trustlock/lender/portfolio", tip: "Browse escrow certificates and active financing", badgeKey: null },
  { label: "Applications", icon: ClipboardList, to: "/trustlock/lender/applications", tip: "Incoming financing requests from vendors", badgeKey: null },
  { label: "Vendor Lookup", icon: Search, to: "/trustlock/lender/vendor-lookup", tip: "Search and discover verified vendors", badgeKey: null },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/lender/messages", tip: "Encrypted messaging with vendors", badgeKey: "messages" },
  { label: "Documents", icon: FileText, to: "/trustlock/lender/documents", tip: "KYB docs, contracts, compliance records", badgeKey: null },
  { label: "Blockchain Explorer", icon: Link2, to: "/trustlock/lender/blockchain", tip: "Read-only SHA-256 proof chain verification", badgeKey: null },
  { label: "Analytics", icon: BarChart3, to: "/trustlock/lender/analytics", tip: "Portfolio performance, sector concentration", badgeKey: null },
  { label: "FlashVet AI", icon: Bot, to: "/trustlock/lender/flashvet", tip: "AI-powered research, forensics, and platform Q&A", badgeKey: null },
  { label: "Repayments", icon: DollarSign, to: "/trustlock/lender/repayments", tip: "Review offline repayment confirmations from vendors", badgeKey: null },
  { label: "KYB Verification", icon: ShieldCheck, to: "/trustlock/lender/kyb", tip: "Upload KYB documents and manage tier status", badgeKey: null },
  { label: "Settings", icon: Settings, to: "/trustlock/lender/settings", tip: "Profile, logo, website, notification preferences", badgeKey: null },
];

const LenderSidebar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { messages: msgCount } = useSidebarBadges("vendor");
  const badgeCounts: Record<string, number> = { messages: msgCount };

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("tl-open-sidebar", handler);
    return () => window.removeEventListener("tl-open-sidebar", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tl_lender_auth");
    localStorage.removeItem("tl_lender_network");
    navigate("/trustlock/lender/login");
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-sidebar border border-sidebar-border text-sidebar-foreground">
        <Menu className="w-5 h-5" />
      </button>

      {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}

      <aside className={cn(
        "w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-50 transition-transform duration-200",
        "lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Landmark className="w-4 h-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-sidebar-foreground">TrustLock</span>
              <p className="text-[10px] text-muted-foreground leading-none">Lender Portal</p>
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
                  end={item.to === "/trustlock/lender"}
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
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => { setOpen(false); navigate("/"); }}>
            <Home className="w-4 h-4" /> Back to Home
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};

export default LenderSidebar;

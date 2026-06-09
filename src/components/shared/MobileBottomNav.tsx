import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, Package, AlertTriangle, Bot,
  MessageSquare, Menu, Briefcase, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  end?: boolean;
}

interface MobileBottomNavProps {
  role: "vendor" | "buyer" | "admin" | "lender";
}

const vendorPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/vendor", end: true },
  { label: "Direct", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions" },
  { label: "Assist", icon: Bot, to: "/trustlock/vendor/assistant" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/vendor/messages" },
];

const buyerPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/buyer", end: true },
  { label: "Orders", icon: Package, to: "/trustlock/buyer/orders" },
  { label: "Support", icon: Bot, to: "/trustlock/buyer/assistant" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/buyer/messages" },
];

const adminPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/admin", end: true },
  { label: "Orders", icon: ArrowLeftRight, to: "/trustlock/admin/transactions" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/admin/disputes" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/admin/messages" },
];

const lenderPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/lender", end: true },
  { label: "Portfolio", icon: Briefcase, to: "/trustlock/lender/portfolio" },
  { label: "Apps", icon: ClipboardList, to: "/trustlock/lender/applications" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/lender/messages" },
];

const primaryItems: Record<string, NavItem[]> = {
  vendor: vendorPrimary,
  buyer: buyerPrimary,
  admin: adminPrimary,
  lender: lenderPrimary,
};

const MobileBottomNav = ({ role }: MobileBottomNavProps) => {
  const items = primaryItems[role];

  const handleMore = () => {
    window.dispatchEvent(new CustomEvent("tl-open-sidebar"));
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 gap-1 text-[11px] font-medium transition-colors min-w-0 active:scale-95",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={handleMore}
          className="flex flex-col items-center justify-center flex-1 gap-1 text-[11px] font-medium text-muted-foreground min-w-0 active:scale-95"
        >
          <Menu className="w-6 h-6" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;

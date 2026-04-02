import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, Package, AlertTriangle, Bot,
  Settings, MessageSquare, Menu, Store, ShoppingBag, Shield,
  BarChart3, Users, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
}

interface MobileBottomNavProps {
  role: "vendor" | "buyer" | "admin";
}

const vendorPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/vendor" },
  { label: "Orders", icon: ArrowLeftRight, to: "/trustlock/vendor/transactions" },
  { label: "Assist", icon: Bot, to: "/trustlock/vendor/assistant" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/vendor/messages" },
];

const buyerPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/buyer" },
  { label: "Orders", icon: Package, to: "/trustlock/buyer/orders" },
  { label: "Support", icon: Bot, to: "/trustlock/buyer/assistant" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/buyer/messages" },
];

const adminPrimary: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, to: "/trustlock/admin" },
  { label: "Orders", icon: ArrowLeftRight, to: "/trustlock/admin/transactions" },
  { label: "Disputes", icon: AlertTriangle, to: "/trustlock/admin/disputes" },
  { label: "Messages", icon: MessageSquare, to: "/trustlock/admin/messages" },
];

const primaryItems: Record<string, NavItem[]> = {
  vendor: vendorPrimary,
  buyer: buyerPrimary,
  admin: adminPrimary,
};

const MobileBottomNav = ({ role }: MobileBottomNavProps) => {
  const items = primaryItems[role];
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around h-14">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split("/").length <= 3}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors min-w-0 py-1.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setSheetOpen(true)}
          className="flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium text-muted-foreground min-w-0 py-1.5"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0">
          <div className="p-4 border-b border-border">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-3" />
            <h3 className="font-heading font-bold text-sm text-foreground">
              {role === "vendor" ? "Vendor Menu" : role === "buyer" ? "Buyer Menu" : "Admin Menu"}
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2" style={{ maxHeight: "calc(70vh - 4rem)" }}>
            {/* The sidebar items will be rendered by the parent sidebar, this sheet just opens the sidebar */}
            <p className="text-xs text-muted-foreground p-3">
              Use the sidebar menu for full navigation.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default MobileBottomNav;

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SidebarNavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  tip: string;
  badgeKey?: string | null;
  moduleKey?: string;
  tlId?: string;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

interface SidebarAccordionNavProps {
  groups: SidebarNavGroup[];
  basePath: string;
  badgeCounts?: Record<string, number>;
  onItemClick?: () => void;
}

const SidebarAccordionNav = ({ groups, basePath, badgeCounts = {}, onItemClick }: SidebarAccordionNavProps) => {
  const location = useLocation();

  // Find which group contains the active route
  const activeGroupIndex = groups.findIndex((g) =>
    g.items.some((item) =>
      item.to === basePath
        ? location.pathname === basePath
        : location.pathname.startsWith(item.to)
    )
  );

  const [openIndex, setOpenIndex] = useState<number | null>(activeGroupIndex >= 0 ? activeGroupIndex : 0);

  const toggleGroup = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-1">
      {groups.map((group, idx) => {
        const isOpen = openIndex === idx;
        const groupHasBadge = group.items.some(
          (item) => item.badgeKey && (badgeCounts[item.badgeKey] || 0) > 0
        );

        return (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(idx)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                isOpen
                  ? "text-sidebar-foreground bg-sidebar-accent/50"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/30"
              )}
            >
              <span className="flex items-center gap-2">
                {group.label}
                {!isOpen && groupHasBadge && (
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                )}
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {isOpen && (
              <div className="mt-0.5 ml-1 space-y-0.5">
                {group.items.map((item) => {
                  const badgeCount = item.badgeKey
                    ? badgeCounts[item.badgeKey] || 0
                    : 0;

                  return (
                    <div key={item.to} className="flex items-center gap-1">
                      <NavLink
                        to={item.to}
                        end={item.to === basePath}
                        onClick={onItemClick}
                        className={({ isActive }) =>
                          cn(
                            "flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
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
                        <PopoverContent
                          side="right"
                          className="max-w-[200px] text-xs p-2"
                        >
                          {item.tip}
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SidebarAccordionNav;

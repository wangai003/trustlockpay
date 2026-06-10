import { useAdmin } from "@/contexts/AdminContext";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import NotificationCenter from "@/components/shared/NotificationCenter";
import SearchBar from "@/components/shared/SearchBar";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const AdminHeader = ({ title }: { title: string }) => {
  const { isTestnet } = useAdmin();
  const { user } = useAuth();
  const unread = useUnreadMessages("admin", user?.id);
  const navigate = useNavigate();

  return (
    <>
      {/* ── Network sentinel strip — colored, persistent, impossible to miss ── */}
      <div
        className={cn("h-1.5 w-full", isTestnet ? "bg-accent" : "bg-destructive")}
        aria-hidden="true"
      />
      <header
        className={cn(
          "border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30 px-3 sm:px-6",
          isTestnet ? "border-accent/40" : "border-destructive/40"
        )}
      >
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          <h1 className="sr-only sm:not-sr-only font-heading font-bold text-base sm:text-lg text-foreground pl-10 lg:pl-0 truncate min-w-0 flex-1">{title}</h1>

          <div className="flex items-center justify-end gap-1.5 sm:gap-4 min-w-0 flex-1 sm:flex-none">
            {/* Read-only network badge — login-stamped, cannot be flipped here */}
            <Badge
              variant={isTestnet ? "outline" : "destructive"}
              className={cn(
                "text-[9px] sm:text-[10px] gap-1 shrink-0",
                isTestnet && "border-accent/60 text-accent"
              )}
              title="Network mode is locked at login. Log out to switch."
            >
              <Lock className="w-2.5 h-2.5" />
              {isTestnet ? "TESTNET" : "MAINNET · LIVE"}
            </Badge>

            <SearchBar onOpen={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} />

            <NotificationCenter role="admin" />

            <LanguageSelector compact />

            <Button
              variant="ghost"
              size="icon"
              className="relative w-8 h-8 hidden sm:flex"
              onClick={() => navigate("/trustlock/admin/messages")}
              title="Messages"
            >
              <MessageSquare className="w-4 h-4" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>

            <div className="hidden sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 items-center justify-center">
              <span className="text-[10px] sm:text-xs font-bold text-primary">SA</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AdminHeader;

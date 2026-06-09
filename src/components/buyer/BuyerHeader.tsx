import { useNavigate } from "react-router-dom";
import { useBuyer } from "@/contexts/BuyerContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/shared/NotificationCenter";
import SearchBar from "@/components/shared/SearchBar";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const BuyerHeader = ({ title }: { title: string }) => {
  const { networkMode, setNetworkMode, isTestnet, buyer } = useBuyer();
  const navigate = useNavigate();
  const { user } = useAuth();
  const unread = useUnreadMessages("buyer", user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tl_buyer_auth");
    localStorage.removeItem("tl_buyer_network");
    navigate("/trustlock/buyer/login");
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 px-3 sm:px-6">
      <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
        <h1 className="sr-only sm:not-sr-only font-heading font-bold text-base sm:text-lg text-foreground pl-10 lg:pl-0 truncate min-w-0 flex-1">{title}</h1>

        <div className="flex items-center justify-end gap-1.5 sm:gap-4 min-w-0 flex-1 sm:flex-none">
          <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[10px] sm:text-xs font-medium ${isTestnet ? "text-accent" : "text-muted-foreground"}`}>Test</span>
              <Switch
                checked={!isTestnet}
                onCheckedChange={(c) => setNetworkMode(c ? "mainnet" : "testnet")}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-accent scale-90 sm:scale-100"
              />
              <span className={`text-[10px] sm:text-xs font-medium ${!isTestnet ? "text-primary" : "text-muted-foreground"}`}>Live</span>
              <Badge variant={isTestnet ? "outline" : "default"} className="text-[9px] sm:text-[10px] hidden sm:inline-flex">
                {isTestnet ? "TEST" : "LIVE"}
              </Badge>
            </div>

          <SearchBar onOpen={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} />

          <NotificationCenter role="buyer" />

          <LanguageSelector compact />

          <Button
              variant="ghost"
              size="icon"
              className="relative w-8 h-8"
              onClick={() => navigate("/trustlock/buyer/messages")}
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
              <span className="text-[10px] sm:text-xs font-bold text-primary">{buyer.name.substring(0, 2).toUpperCase()}</span>
            </div>

          <Button variant="ghost" size="icon" className="hidden sm:inline-flex w-8 h-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Sign Out">
              <LogOut className="w-4 h-4" />
            </Button>
        </div>
      </div>
    </header>
  );
};

export default BuyerHeader;

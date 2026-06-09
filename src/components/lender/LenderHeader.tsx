import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { LogOut, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/shared/NotificationCenter";
import SearchBar from "@/components/shared/SearchBar";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LenderHeader = ({ title }: { title: string }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isTestnet = localStorage.getItem("tl_lender_network") === "testnet";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tl_lender_auth");
    localStorage.removeItem("tl_lender_network");
    navigate("/trustlock/lender/login");
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 px-3 sm:px-6">
      <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
        <h1 className="sr-only sm:not-sr-only font-heading font-bold text-base sm:text-lg text-foreground pl-10 lg:pl-0 truncate min-w-0 flex-1">{title}</h1>
        <div className="flex items-center justify-end gap-1.5 sm:gap-4 min-w-0 flex-1 sm:flex-none">
          <Badge variant={isTestnet ? "outline" : "default"} className="text-[9px] sm:text-[10px] shrink-0">
            {isTestnet ? "TEST" : "LIVE"}
          </Badge>
          <SearchBar onOpen={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))} />
          <NotificationCenter role="vendor" />
          <LanguageSelector compact />
          <Button variant="ghost" size="icon" className="relative w-8 h-8" onClick={() => navigate("/trustlock/lender/messages")} title="Messages">
            <MessageSquare className="w-4 h-4" />
          </Button>
          <div className="hidden sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 items-center justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-primary">LN</span>
          </div>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex w-8 h-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default LenderHeader;

import { useNavigate } from "react-router-dom";
import { useBuyer } from "@/contexts/BuyerContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/shared/NotificationCenter";
import SearchBar from "@/components/shared/SearchBar";

const BuyerHeader = ({ title }: { title: string }) => {
  const { networkMode, setNetworkMode, isTestnet, buyer } = useBuyer();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("tl_buyer_auth");
    localStorage.removeItem("tl_buyer_network");
    navigate("/trustlock/buyer/login");
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-6">
      <div className="flex items-center justify-between h-14 sm:h-16">
        <h1 className="font-heading font-bold text-sm sm:text-lg text-foreground pl-10 lg:pl-0 truncate">{title}</h1>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5">
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

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-primary"
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            title="Search (⌘K)"
          >
            <Search className="w-4 h-4" />
          </Button>

          <NotificationCenter role="buyer" />

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-primary">{buyer.name.substring(0, 2).toUpperCase()}</span>
          </div>

          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Sign Out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default BuyerHeader;

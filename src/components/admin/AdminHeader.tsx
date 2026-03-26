import { useAdmin } from "@/contexts/AdminContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/shared/NotificationCenter";

const AdminHeader = ({ title }: { title: string }) => {
  const { networkMode, setNetworkMode, isTestnet } = useAdmin();

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-6">
      <div className="flex items-center justify-between h-14 sm:h-16">
        <h1 className="font-heading font-bold text-sm sm:text-lg text-foreground pl-10 lg:pl-0 truncate">{title}</h1>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] sm:text-xs font-medium ${isTestnet ? "text-accent" : "text-muted-foreground"}`}>
              Test
            </span>
            <Switch
              checked={!isTestnet}
              onCheckedChange={(checked) => setNetworkMode(checked ? "mainnet" : "testnet")}
              className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-accent scale-90 sm:scale-100"
            />
            <span className={`text-[10px] sm:text-xs font-medium ${!isTestnet ? "text-primary" : "text-muted-foreground"}`}>
              Live
            </span>
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

          <NotificationCenter role="admin" />

          <Button variant="ghost" size="icon" className="relative w-8 h-8 hidden sm:flex">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent rounded-full text-[9px] text-accent-foreground flex items-center justify-center">
              1
            </span>
          </Button>

          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-[10px] sm:text-xs font-bold text-primary">SA</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;

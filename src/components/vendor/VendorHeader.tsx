import { useVendor } from "@/contexts/VendorContext";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const VendorHeader = ({ title }: { title: string }) => {
  const { networkMode, setNetworkMode, isTestnet, vendor } = useVendor();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="font-heading font-bold text-lg text-foreground">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 w-48 h-9 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isTestnet ? "text-accent" : "text-muted-foreground"}`}>Testnet</span>
          <Switch
            checked={!isTestnet}
            onCheckedChange={(checked) => setNetworkMode(checked ? "mainnet" : "testnet")}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-accent"
          />
          <span className={`text-xs font-medium ${!isTestnet ? "text-primary" : "text-muted-foreground"}`}>Mainnet</span>
          <Badge variant={isTestnet ? "outline" : "default"} className="text-[10px] ml-1">{isTestnet ? "TEST" : "LIVE"}</Badge>
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center">2</span>
        </Button>

        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{vendor.name.substring(0, 2).toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
};

export default VendorHeader;

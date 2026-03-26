import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, ArrowLeftRight, AlertTriangle, Users, UserCheck,
  ShieldCheck, FileText, BarChart3, Bot, Settings, Wallet, GitBranch,
  Banknote, Package, HelpCircle, CreditCard, Globe, DollarSign, Receipt, Link2,
  BookOpen, Search, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type CommandEntry = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  keywords: string;
  group: string;
};

const adminItems: CommandEntry[] = [
  { label: "Admin Overview", to: "/trustlock/admin", icon: LayoutDashboard, keywords: "dashboard home summary", group: "Admin" },
  { label: "Transactions", to: "/trustlock/admin/transactions", icon: ArrowLeftRight, keywords: "escrow orders payments", group: "Admin" },
  { label: "Disputes", to: "/trustlock/admin/disputes", icon: AlertTriangle, keywords: "complaints resolution arbitration", group: "Admin" },
  { label: "Workflow Tracker", to: "/trustlock/admin/workflow", icon: GitBranch, keywords: "milestones progress stages", group: "Admin" },
  { label: "Emmanuel AI", to: "/trustlock/admin/emmanuel", icon: Bot, keywords: "assistant chat ai help", group: "Admin" },
  { label: "Vendors", to: "/trustlock/admin/vendors", icon: Users, keywords: "sellers merchants accounts", group: "Admin" },
  { label: "Buyers", to: "/trustlock/admin/buyers", icon: UserCheck, keywords: "customers purchasers", group: "Admin" },
  { label: "Compliance", to: "/trustlock/admin/compliance", icon: ShieldCheck, keywords: "aml kyc flags regulatory", group: "Admin" },
  { label: "Analytics", to: "/trustlock/admin/analytics", icon: BarChart3, keywords: "charts revenue volume metrics", group: "Admin" },
  { label: "Reports", to: "/trustlock/admin/reports", icon: FileText, keywords: "export csv pdf summary", group: "Admin" },
  { label: "Documents", to: "/trustlock/admin/documents", icon: FileText, keywords: "files contracts evidence archive", group: "Admin" },
  { label: "OS Pay", to: "/trustlock/admin/os-pay", icon: Wallet, keywords: "refund split payment internal", group: "Admin" },
  { label: "OS Payout", to: "/trustlock/admin/payout", icon: Banknote, keywords: "withdraw disbursement funds", group: "Admin" },
  { label: "Audit Access", to: "/trustlock/admin/audit", icon: ShieldCheck, keywords: "regulators read-only session", group: "Admin" },
  { label: "Settings", to: "/trustlock/admin/settings", icon: Settings, keywords: "config preferences network", group: "Admin" },
];

const vendorItems: CommandEntry[] = [
  { label: "Vendor Overview", to: "/trustlock/vendor", icon: LayoutDashboard, keywords: "dashboard home earnings", group: "Vendor" },
  { label: "Bill Payments", to: "/trustlock/vendor/bill-payments", icon: Receipt, keywords: "subscription charges fees", group: "Vendor" },
  { label: "Transactions", to: "/trustlock/vendor/transactions", icon: ArrowLeftRight, keywords: "escrow orders sales", group: "Vendor" },
  { label: "Payouts", to: "/trustlock/vendor/payouts", icon: DollarSign, keywords: "withdraw earnings released", group: "Vendor" },
  { label: "My Sites", to: "/trustlock/vendor/sites", icon: Globe, keywords: "websites widget install integration", group: "Vendor" },
  { label: "KYC & Verification", to: "/trustlock/vendor/kyc", icon: ShieldCheck, keywords: "identity documents verify", group: "Vendor" },
  { label: "TrustLock Assist", to: "/trustlock/vendor/assistant", icon: Bot, keywords: "ai chat support help", group: "Vendor" },
  { label: "Analytics", to: "/trustlock/vendor/analytics", icon: BarChart3, keywords: "charts sales trends reports", group: "Vendor" },
  { label: "Documents", to: "/trustlock/vendor/documents", icon: FileText, keywords: "files invoices contracts", group: "Vendor" },
  { label: "Help Center", to: "/trustlock/vendor/help", icon: HelpCircle, keywords: "faq guides documentation", group: "Vendor" },
  { label: "Plans & Pricing", to: "/trustlock/vendor/pricing", icon: CreditCard, keywords: "upgrade subscription plan", group: "Vendor" },
  { label: "Standalone Links", to: "/trustlock/vendor/standalone-links", icon: Link2, keywords: "p2p payment link invoice share", group: "Vendor" },
  { label: "OS Pay", to: "/trustlock/vendor/os-pay", icon: Wallet, keywords: "internal payment service", group: "Vendor" },
  { label: "OS Payout", to: "/trustlock/vendor/payout", icon: Banknote, keywords: "withdraw funds local diaspora", group: "Vendor" },
  { label: "Settings", to: "/trustlock/vendor/settings", icon: Settings, keywords: "preferences notifications account", group: "Vendor" },
];

const buyerItems: CommandEntry[] = [
  { label: "Buyer Overview", to: "/trustlock/buyer", icon: LayoutDashboard, keywords: "dashboard home orders", group: "Buyer" },
  { label: "Bill Payments", to: "/trustlock/buyer/bill-payments", icon: Receipt, keywords: "service fees charges", group: "Buyer" },
  { label: "My Orders", to: "/trustlock/buyer/orders", icon: Package, keywords: "purchases escrow tracking", group: "Buyer" },
  { label: "Disputes", to: "/trustlock/buyer/disputes", icon: AlertTriangle, keywords: "complaints file resolution", group: "Buyer" },
  { label: "Support Assistant", to: "/trustlock/buyer/assistant", icon: Bot, keywords: "ai chat help support", group: "Buyer" },
  { label: "Analytics", to: "/trustlock/buyer/analytics", icon: BarChart3, keywords: "spending trends reports", group: "Buyer" },
  { label: "Documents", to: "/trustlock/buyer/documents", icon: FileText, keywords: "receipts invoices evidence", group: "Buyer" },
  { label: "Help Center", to: "/trustlock/buyer/help", icon: HelpCircle, keywords: "faq guides documentation", group: "Buyer" },
  { label: "OS Pay", to: "/trustlock/buyer/os-pay", icon: Wallet, keywords: "internal payment", group: "Buyer" },
  { label: "OS Payout", to: "/trustlock/buyer/payout", icon: Banknote, keywords: "withdraw refund funds", group: "Buyer" },
  { label: "Settings", to: "/trustlock/buyer/settings", icon: Settings, keywords: "preferences notifications", group: "Buyer" },
];

const knowledgeItems: CommandEntry[] = [
  { label: "How Escrow Works", to: "", icon: BookOpen, keywords: "escrow flow lock release funds payment", group: "Knowledge" },
  { label: "14-Day Auto-Release", to: "", icon: BookOpen, keywords: "auto release timer countdown mandate", group: "Knowledge" },
  { label: "Dynamic Milestones", to: "", icon: BookOpen, keywords: "milestone workflow stages industry", group: "Knowledge" },
  { label: "Dispute Resolution", to: "", icon: BookOpen, keywords: "dispute arbitration resolution refund", group: "Knowledge" },
  { label: "KYC Verification", to: "", icon: BookOpen, keywords: "kyc identity verify documents compliance", group: "Knowledge" },
  { label: "Payment Processors", to: "", icon: BookOpen, keywords: "stripe coinbase yellow card thirdweb transak", group: "Knowledge" },
  { label: "Fee Structure", to: "", icon: BookOpen, keywords: "fees platform escrow processing costs", group: "Knowledge" },
  { label: "Payout Methods", to: "", icon: BookOpen, keywords: "bank mobile money crypto withdraw", group: "Knowledge" },
  { label: "Widget Installation", to: "", icon: BookOpen, keywords: "install widget script embed checkout", group: "Knowledge" },
  { label: "Standalone Payment Links", to: "", icon: BookOpen, keywords: "p2p link share invoice no website", group: "Knowledge" },
  { label: "Audit & Compliance", to: "", icon: BookOpen, keywords: "audit regulator read-only session", group: "Knowledge" },
  { label: "Smart Contract", to: "", icon: BookOpen, keywords: "polygon usdc blockchain contract on-chain", group: "Knowledge" },
  { label: "Tax & Tariff Handling", to: "", icon: BookOpen, keywords: "vat gst import duty tariff tax", group: "Knowledge" },
  { label: "Mid-Order Cancellation", to: "", icon: BookOpen, keywords: "cancel order refund partial milestone", group: "Knowledge" },
];

interface CommandPaletteProps {
  role: "admin" | "vendor" | "buyer";
}

interface LiveResult {
  type: "transaction" | "dispute" | "order";
  label: string;
  sub: string;
  to: string;
}

const CommandPalette = ({ role }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Live DB search with debounce
  useEffect(() => {
    if (!open || search.length < 2) {
      setLiveResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results: LiveResult[] = [];
      const basePath = `/trustlock/${role}`;
      try {
        // Search transactions
        const { data: txs } = await supabase
          .from("transactions")
          .select("tx_id, item, amount, status, buyer_name, vendor_name")
          .or(`tx_id.ilike.%${search}%,item.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%`)
          .limit(5);
        txs?.forEach((tx) => {
          const txRoute = role === "admin" ? `${basePath}/transactions` : role === "vendor" ? `${basePath}/transactions` : `${basePath}/orders`;
          results.push({
            type: "transaction",
            label: `${tx.tx_id} — ${tx.item || "Order"}`,
            sub: `$${tx.amount} · ${tx.status} · ${tx.buyer_name || ""} → ${tx.vendor_name || ""}`,
            to: txRoute,
          });
        });

        // Search disputes
        const { data: disputes } = await supabase
          .from("disputes")
          .select("dispute_id, reason, status, buyer_name, vendor_name, amount")
          .or(`dispute_id.ilike.%${search}%,reason.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%`)
          .limit(5);
        disputes?.forEach((d) => {
          results.push({
            type: "dispute",
            label: `${d.dispute_id} — ${d.reason || "Dispute"}`,
            sub: `$${d.amount || 0} · ${d.status} · ${d.buyer_name || ""} vs ${d.vendor_name || ""}`,
            to: role === "buyer" ? `${basePath}/disputes` : `${basePath}/disputes`,
          });
        });

        // Search carbon copies / orders
        const { data: orders } = await supabase
          .from("order_carbon_copies")
          .select("order_number, item, amount, status, buyer_name, vendor_name")
          .or(`order_number.ilike.%${search}%,item.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%`)
          .limit(5);
        orders?.forEach((o) => {
          results.push({
            type: "order",
            label: `Order ${o.order_number || ""} — ${o.item || "Item"}`,
            sub: `$${o.amount || 0} · ${o.status} · ${o.buyer_name || ""}`,
            to: role === "buyer" ? `${basePath}/orders` : `${basePath}/transactions`,
          });
        });
      } catch {
        // silent
      }
      setLiveResults(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, open, role]);

  const roleItems = useMemo(() => {
    switch (role) {
      case "admin": return adminItems;
      case "vendor": return vendorItems;
      case "buyer": return buyerItems;
    }
  }, [role]);

  const handleSelect = (to: string) => {
    setOpen(false);
    setSearch("");
    if (to) navigate(to);
  };

  const typeIcon = (type: LiveResult["type"]) => {
    switch (type) {
      case "transaction": return ArrowLeftRight;
      case "dispute": return AlertTriangle;
      case "order": return Package;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <CommandInput
        placeholder="Search pages, transactions, disputes, orders…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? (
            <span className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching database…
            </span>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {/* Live DB Results */}
        {liveResults.length > 0 && (
          <CommandGroup heading="Database Results">
            {liveResults.map((r, i) => {
              const Icon = typeIcon(r.type);
              return (
                <CommandItem
                  key={`live-${i}`}
                  value={`${r.label} ${r.sub}`}
                  onSelect={() => handleSelect(r.to)}
                  className="gap-3"
                >
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0 capitalize">{r.type}</Badge>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Pages">
          {roleItems.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => handleSelect(item.to)}
              className="gap-3"
            >
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Knowledge Base">
          {knowledgeItems.map((item, i) => (
            <CommandItem
              key={i}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => handleSelect(item.to)}
              className="gap-3"
            >
              <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

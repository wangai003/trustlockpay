import { useEffect, useState, useMemo } from "react";
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
  BookOpen, Search, Loader2, Sparkles
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
  { label: "Compliance", to: "/trustlock/admin/compliance", icon: ShieldCheck, keywords: "aml kyc flags regulatory sanctions screening", group: "Admin" },
  { label: "Analytics", to: "/trustlock/admin/analytics", icon: BarChart3, keywords: "charts revenue volume metrics", group: "Admin" },
  { label: "Reports", to: "/trustlock/admin/reports", icon: FileText, keywords: "export csv pdf summary", group: "Admin" },
  { label: "Documents", to: "/trustlock/admin/documents", icon: FileText, keywords: "files contracts evidence archive acknowledgement form", group: "Admin" },
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
  { label: "Documents", to: "/trustlock/vendor/documents", icon: FileText, keywords: "files invoices contracts acknowledgement form", group: "Vendor" },
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
  { label: "Documents", to: "/trustlock/buyer/documents", icon: FileText, keywords: "receipts invoices evidence acknowledgement form", group: "Buyer" },
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
  { label: "Acknowledgement Form", to: "", icon: BookOpen, keywords: "acknowledgement agreement contract digital signature sign-off", group: "Knowledge" },
  { label: "Escrow Holdback Clause", to: "", icon: BookOpen, keywords: "holdback 90% retention inspection risk", group: "Knowledge" },
  { label: "Observer Sign-Off", to: "", icon: BookOpen, keywords: "observer third-party inspector bank customs sign off", group: "Knowledge" },
  { label: "Document Retention Policy", to: "", icon: BookOpen, keywords: "retention archival 7-year destroy documents confidential", group: "Knowledge" },
  { label: "Arbitration Escalation", to: "", icon: BookOpen, keywords: "arbitration escalate third-party mediator legal", group: "Knowledge" },
];

// Rotating placeholder hints
const placeholderHints = [
  'Try: "order #1042" or "dispute DSP-001"… (⌘K)',
  'Search: transaction ID, vendor name, or order number…',
  'Try: "gold export", "acknowledgement form", "KYC"…',
  'Find: disputes, orders, contracts, or any document…',
  'Search: "real estate", "milestone", or buyer name…',
  'Tip: type a partial name — we\'ll search the database live',
];

// Suggestion phrases for autocomplete when query is short
const searchSuggestions = [
  { text: "Acknowledgement Form", hint: "Digital agreement document" },
  { text: "Dispute Resolution", hint: "Complaint & arbitration process" },
  { text: "KYC Documents", hint: "Identity verification files" },
  { text: "Milestone Workflow", hint: "Dynamic order stages" },
  { text: "Standalone Payment Link", hint: "P2P invoice without website" },
  { text: "Observer Sign-Off", hint: "Third-party inspector approval" },
  { text: "Escrow Holdback", hint: "90/10 fund retention protocol" },
  { text: "AML Screening", hint: "Sanctions & compliance checks" },
  { text: "Payout Request", hint: "Fund withdrawal & disbursement" },
  { text: "Contract Upload", hint: "B2B agreement documentation" },
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
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const navigate = useNavigate();

  // Rotate placeholder every 4 seconds
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholderHints.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [open]);

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
        // Search transactions — includes order_number
        const { data: txs } = await supabase
          .from("transactions")
          .select("tx_id, item, amount, status, buyer_name, vendor_name, order_number, created_at")
          .or(`tx_id.ilike.%${search}%,item.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%`)
          .order("created_at", { ascending: false })
          .limit(5);
        txs?.forEach((tx) => {
          const txRoute = role === "buyer" ? `${basePath}/orders` : `${basePath}/transactions`;
          results.push({
            type: "transaction",
            label: `${tx.tx_id}${tx.order_number ? ` (#${tx.order_number})` : ""} — ${tx.item || "Order"}`,
            sub: `$${Number(tx.amount).toLocaleString()} · ${tx.status} · ${tx.buyer_name || ""} → ${tx.vendor_name || ""} · ${new Date(tx.created_at).toLocaleDateString()}`,
            to: txRoute,
          });
        });

        // Search disputes — includes order-linked tx_id and date
        const { data: disputes } = await supabase
          .from("disputes")
          .select("dispute_id, reason, status, buyer_name, vendor_name, amount, tx_id, created_at, priority")
          .or(`dispute_id.ilike.%${search}%,reason.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%,tx_id.ilike.%${search}%`)
          .order("created_at", { ascending: false })
          .limit(5);
        disputes?.forEach((d) => {
          results.push({
            type: "dispute",
            label: `${d.dispute_id}${d.tx_id ? ` (TX: ${d.tx_id})` : ""} — ${d.reason || "Dispute"}`,
            sub: `$${Number(d.amount || 0).toLocaleString()} · ${d.status} · ${d.priority || "medium"} · ${d.buyer_name || ""} vs ${d.vendor_name || ""} · ${new Date(d.created_at).toLocaleDateString()}`,
            to: role === "admin" ? `${basePath}/disputes` : `${basePath}/disputes`,
          });
        });

        // Search carbon copies / orders
        const { data: orders } = await supabase
          .from("order_carbon_copies")
          .select("order_number, item, amount, status, buyer_name, vendor_name, created_at, confirmation_code")
          .or(`order_number.ilike.%${search}%,item.ilike.%${search}%,buyer_name.ilike.%${search}%,vendor_name.ilike.%${search}%,confirmation_code.ilike.%${search}%`)
          .order("created_at", { ascending: false })
          .limit(5);
        orders?.forEach((o) => {
          results.push({
            type: "order",
            label: `Order ${o.order_number || ""} — ${o.item || "Item"}`,
            sub: `$${Number(o.amount || 0).toLocaleString()} · ${o.status} · ${o.buyer_name || ""} · ${new Date(o.created_at).toLocaleDateString()}`,
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

  // Show suggestions when user typed 1 char or empty
  const showSuggestions = open && search.length < 2 && search.length >= 0;
  const filteredSuggestions = search.length === 0
    ? searchSuggestions
    : searchSuggestions.filter((s) => s.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
      <CommandInput
        placeholder={placeholderHints[placeholderIdx]}
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
            "No results found. Try a different term or browse pages below."
          )}
        </CommandEmpty>

        {/* Suggestions when query is short */}
        {showSuggestions && filteredSuggestions.length > 0 && search.length === 0 && (
          <CommandGroup heading="💡 Try searching for…">
            {filteredSuggestions.slice(0, 6).map((s) => (
              <CommandItem
                key={s.text}
                value={s.text}
                onSelect={() => setSearch(s.text)}
                className="gap-3"
              >
                <Sparkles className="w-3 h-3 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm">{s.text}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">— {s.hint}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

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

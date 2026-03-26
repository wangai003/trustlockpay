import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Search, BookOpen
} from "lucide-react";

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

const CommandPalette = ({ role }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  const roleItems = useMemo(() => {
    switch (role) {
      case "admin": return adminItems;
      case "vendor": return vendorItems;
      case "buyer": return buyerItems;
    }
  }, [role]);

  const handleSelect = (item: CommandEntry) => {
    setOpen(false);
    if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, orders, help topics…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {roleItems.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.keywords}`}
              onSelect={() => handleSelect(item)}
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
              onSelect={() => handleSelect(item)}
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

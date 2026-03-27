import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  BookOpen, Search, Loader2, Sparkles, Brain, Eye, Calendar, MapPin, Tag, TrendingUp,
  Download, ShieldX, Shield, Landmark, ClipboardCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";

/* ─── route items (pages, knowledge) ─── */

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
  { label: "Industry Playbook", to: "/trustlock/admin/industry-playbook", icon: BookOpen, keywords: "industries capabilities workflow construction mining agriculture real estate tourism retail", group: "Admin" },
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
  { label: "Industry Playbook", to: "/trustlock/vendor/industry-playbook", icon: BookOpen, keywords: "industries capabilities workflow construction mining agriculture real estate tourism retail", group: "Vendor" },
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
  { label: "Industry Playbook", to: "/trustlock/buyer/industry-playbook", icon: BookOpen, keywords: "industries capabilities workflow construction mining agriculture real estate tourism retail", group: "Buyer" },
];

// Rotating search hints
const searchHints = [
  { text: "Search by order number...", hint: "e.g. TL-1234567890" },
  { text: "Search by buyer or vendor name...", hint: "e.g. John Smith" },
  { text: "Search by dispute ID...", hint: "e.g. DSP-001" },
  { text: "Search by confirmation code...", hint: "e.g. ABC12345" },
  { text: "Search by country for sanctions...", hint: "e.g. Nigeria" },
  { text: "How does escrow work?", hint: "AI-powered answer" },
  { text: "Search archived reports...", hint: "e.g. Monthly Summary" },
  { text: "Milestone workflow", hint: "Dynamic order stages" },
  { text: "Payout methods", hint: "Bank, M-Pesa, crypto" },
  { text: "Fee structure", hint: "Platform & processing fees" },
];

const searchSuggestions = [
  { text: "How does escrow work?", hint: "AI-powered answer" },
  { text: "Dispute resolution process", hint: "Knowledge base" },
  { text: "Milestone workflow", hint: "Dynamic order stages" },
  { text: "Payout methods", hint: "Bank, M-Pesa, crypto" },
  { text: "Fee structure", hint: "Platform & processing fees" },
  { text: "Vendor Consent Form", hint: "Protection document" },
  { text: "Pre-Order Contract", hint: "Protection document" },
  { text: "AML Certificate", hint: "Compliance record" },
  { text: "Data Deletion Record", hint: "Account lifecycle" },
  { text: "Payout Receipt", hint: "Reconciliation document" },
  { text: "Account Pause Record", hint: "Account lifecycle" },
  { text: "Sanctions screening", hint: "OFAC, EU, UN checks" },
];

/* ─── types ─── */

interface SearchResults {
  knowledge_answer: string | null;
  ai_answer: string | null;
  transactions: any[];
  disputes: any[];
  orders: any[];
  payouts: any[];
  acknowledgement_forms: any[];
  archived_reports: any[];
  screening_logs: any[];
  protection_documents: any[];
}

interface CommandPaletteProps {
  role: "admin" | "vendor" | "buyer";
}

/* ─── component ─── */

const CommandPalette = ({ role }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const navigate = useNavigate();

  // Rotate search hints
  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % searchHints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Open from keyboard shortcut
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

  // Debounced search via edge function
  useEffect(() => {
    if (!open || search.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trustlock-search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ query: search, role }),
          }
        );
        const data = await resp.json();
        if (data.success) {
          setResults(data.data);
        }
      } catch {
        // silent
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, open, role]);

  const roleItems = useMemo(() => {
    switch (role) {
      case "admin": return adminItems;
      case "vendor": return vendorItems;
      case "buyer": return buyerItems;
    }
  }, [role]);

  const handleSelect = useCallback((to: string) => {
    setOpen(false);
    setSearch("");
    setResults(null);
    if (to) navigate(to);
  }, [navigate]);

  const basePath = `/trustlock/${role}`;

  const hasResults = results && (
    results.knowledge_answer ||
    results.ai_answer ||
    results.transactions.length > 0 ||
    results.disputes.length > 0 ||
    results.orders.length > 0 ||
    results.payouts.length > 0 ||
    results.acknowledgement_forms.length > 0 ||
    results.archived_reports.length > 0 ||
    results.screening_logs.length > 0 ||
    results.protection_documents.length > 0
  );

  const currentHint = searchHints[hintIndex];

  return (
    <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setResults(null); } }}>
      <CommandInput
        placeholder={currentHint.text}
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>
          {searching ? (
            <span className="flex items-center justify-center gap-2 text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching TrustLock…
            </span>
          ) : search.length < 2 ? (
            <span className="text-muted-foreground">Type at least 2 characters to search</span>
          ) : (
            "No results found. Try a different term."
          )}
        </CommandEmpty>

        {/* Suggestions when empty */}
        {search.length < 2 && (
          <CommandGroup heading="💡 Try asking…">
            {searchSuggestions.map((s) => (
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

        {/* AI / Knowledge Answer */}
        {(results?.knowledge_answer || results?.ai_answer) && (
          <div className="px-2 py-2">
            <div className="flex items-center gap-2 px-2 mb-1.5">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">TrustLock Answer</span>
            </div>
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                <ReactMarkdown>{results.knowledge_answer || results.ai_answer || ""}</ReactMarkdown>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Transaction Results ─── */}
        {results && results.transactions.length > 0 && (
          <CommandGroup heading="📦 Transactions">
            {results.transactions.map((tx: any) => (
              <CommandItem
                key={tx.id}
                value={`tx ${tx.tx_id} ${tx.item} ${tx.buyer_name} ${tx.vendor_name}`}
                onSelect={() => handleSelect(role === "buyer" ? `${basePath}/orders` : `${basePath}/transactions`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{tx.tx_id}</span>
                    {tx.order_number && <Badge variant="outline" className="text-[9px]">#{tx.order_number}</Badge>}
                    <Badge variant={tx.status === "released" ? "default" : "secondary"} className="text-[9px] capitalize">{tx.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{tx.item || "Order"}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />${Number(tx.amount).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />{tx.buyer_name || "—"} → {tx.vendor_name || "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(tx.created_at).toLocaleDateString()}
                    </span>
                    {tx.industry && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />{tx.industry}
                      </span>
                    )}
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Dispute Results ─── */}
        {results && results.disputes.length > 0 && (
          <CommandGroup heading="⚠️ Disputes">
            {results.disputes.map((d: any) => (
              <CommandItem
                key={d.id}
                value={`dispute ${d.dispute_id} ${d.reason} ${d.buyer_name} ${d.vendor_name}`}
                onSelect={() => handleSelect(`${basePath}/disputes`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{d.dispute_id}</span>
                    <Badge variant={d.priority === "high" ? "destructive" : "secondary"} className="text-[9px] capitalize">{d.priority || "medium"}</Badge>
                    <Badge variant="outline" className="text-[9px] capitalize">{d.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{d.reason || d.description || "Dispute"}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />${Number(d.amount || 0).toLocaleString()}
                    </span>
                    <span>{d.buyer_name || "—"} vs {d.vendor_name || "—"}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {d.ai_recommendation && (
                    <p className="text-[10px] text-primary italic truncate">AI: {d.ai_recommendation}</p>
                  )}
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Order Results ─── */}
        {results && results.orders.length > 0 && (
          <CommandGroup heading="🛒 Orders">
            {results.orders.map((o: any) => (
              <CommandItem
                key={o.id}
                value={`order ${o.order_number} ${o.item} ${o.buyer_name} ${o.vendor_name}`}
                onSelect={() => handleSelect(role === "buyer" ? `${basePath}/orders` : `${basePath}/transactions`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Order #{o.order_number || "—"}</span>
                    <Badge variant="outline" className="text-[9px] capitalize">{o.status}</Badge>
                    {o.confirmation_code && <Badge variant="secondary" className="text-[9px]">{o.confirmation_code}</Badge>}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{o.item || "Item"}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />${Number(o.amount || 0).toLocaleString()}
                    </span>
                    <span>{o.buyer_name || "—"}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Payout Results ─── */}
        {results && results.payouts.length > 0 && (
          <CommandGroup heading="💸 Payouts">
            {results.payouts.map((p: any) => (
              <CommandItem
                key={p.id}
                value={`payout ${p.order_number} ${p.confirmation_code}`}
                onSelect={() => handleSelect(`${basePath}/payout`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Payout {p.order_number || p.confirmation_code || "—"}</span>
                    <Badge variant={p.status === "completed" ? "default" : "secondary"} className="text-[9px] capitalize">{p.status}</Badge>
                    {p.mode && <Badge variant="outline" className="text-[9px] capitalize">{p.mode}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />${Number(p.amount || 0).toLocaleString()}
                    </span>
                    {p.payment_provider && <span>{p.payment_provider}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Acknowledgement Forms ─── */}
        {results && results.acknowledgement_forms.length > 0 && (
          <CommandGroup heading="✍️ Acknowledgement Forms">
            {results.acknowledgement_forms.map((f: any) => (
              <CommandItem
                key={f.id}
                value={`ack ${f.title} ${f.transaction_id}`}
                onSelect={() => handleSelect(`${basePath}/documents`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{f.title}</span>
                    <Badge variant="outline" className="text-[9px] capitalize">{f.form_type?.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Buyer: {f.signed_by_buyer ? "✓ Signed" : "Pending"}</span>
                    <span>Vendor: {f.signed_by_vendor ? "✓ Signed" : "Pending"}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {f.pdf_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(f.pdf_url, "_blank");
                    }}
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                  </Button>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Archived Reports ─── */}
        {results && results.archived_reports.length > 0 && (
          <CommandGroup heading="📁 Documents & Reports">
            {results.archived_reports.map((r: any) => (
              <CommandItem
                key={r.id}
                value={`report ${r.name}`}
                onSelect={() => handleSelect(`${basePath}/documents`)}
                className="gap-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <span className="text-sm font-medium truncate block">{r.name}</span>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{r.file_type || "PDF"}</span>
                    {r.file_size && <span>{r.file_size}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {r.file_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(r.file_url, "_blank");
                    }}
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                  </Button>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* ─── Protection Documents ─── */}
        {results && results.protection_documents?.length > 0 && (
          <CommandGroup heading="🔒 Protection Documents">
            {results.protection_documents.map((doc: any) => {
              const docTypeLabels: Record<string, string> = {
                vendor_consent: "Vendor Consent",
                pre_order_contract: "Pre-Order Contract",
                escrow_acknowledgement: "Acknowledgement",
                aml_certificate: "AML Certificate",
                payout_reconciliation: "Payout Receipt",
                dispute_evidence_package: "Dispute Evidence",
                account_pause_record: "Account Pause",
                account_deletion_archive: "Data Deletion",
                account_reactivation_record: "Reactivation",
              };
              const label = docTypeLabels[doc.document_type] || doc.document_type?.replace(/_/g, " ");
              const retentionYears = doc.retention_years || 7;
              const created = new Date(doc.created_at);
              const expiry = new Date(created);
              expiry.setFullYear(expiry.getFullYear() + retentionYears);
              const yearsLeft = Math.max(0, Math.round((expiry.getTime() - Date.now()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10);
              const retentionColor = yearsLeft > 5 ? "text-primary" : yearsLeft > 1 ? "text-amber-500" : "text-destructive";

              return (
                <CommandItem
                  key={doc.id}
                  value={`protection ${doc.title} ${doc.document_type} ${doc.transaction_id}`}
                  onSelect={() => handleSelect(`${basePath}/documents`)}
                  className="gap-3 py-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{doc.title}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      {doc.industry && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />{doc.industry}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${retentionColor}`}>
                        <Clock className="w-3 h-3" />{yearsLeft}yr retention
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{created.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ─── Sanctions Screening Logs (admin only) ─── */}
        {results && results.screening_logs.length > 0 && (
          <CommandGroup heading="🛡️ Sanctions Screening">
            {results.screening_logs.map((s: any) => (
              <CommandItem
                key={s.id}
                value={`sanctions ${s.full_name} ${s.country}`}
                onSelect={() => handleSelect("/trustlock/admin/compliance")}
                className="gap-3 py-2.5"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  s.result === "blocked" ? "bg-destructive/10" : s.result === "flagged" ? "bg-accent/10" : "bg-primary/10"
                }`}>
                  {s.result === "blocked" ? (
                    <ShieldX className="w-4 h-4 text-destructive" />
                  ) : s.result === "flagged" ? (
                    <Shield className="w-4 h-4 text-accent-foreground" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.full_name}</span>
                    <Badge
                      variant={s.result === "blocked" ? "destructive" : s.result === "flagged" ? "secondary" : "default"}
                      className="text-[9px] capitalize"
                    >
                      {s.result}
                    </Badge>
                    {s.risk_score > 0 && <Badge variant="outline" className="text-[9px]">Risk: {s.risk_score}%</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{s.country}
                    </span>
                    <span>{s.screening_source}</span>
                    <span>{s.user_role}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Loading indicator when searching */}
        {searching && search.length >= 2 && (
          <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Searching TrustLock database & knowledge base…</span>
          </div>
        )}

        {/* Pages — always show */}
        <CommandGroup heading="📄 Pages">
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
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;

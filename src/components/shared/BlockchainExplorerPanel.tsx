import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield, Search, CheckCircle2, XCircle, Copy, ExternalLink,
  Link2, Hash, Clock, ChevronRight, Layers, ArrowUpRight, Info,
  Maximize2, Minimize2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { explorerTxUrl, explorerAddressUrl, explorerName } from "@/lib/polygonExplorer";

const RECORD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  invoice: { label: "Invoice", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  contract: { label: "Contract", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
  signature: { label: "Signature", color: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" },
  milestone: { label: "Milestone", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  observer_signoff: { label: "Observer", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  dispute_ruling: { label: "Dispute", color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30" },
  document_upload: { label: "Document", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  acknowledgement: { label: "Acknowledgement", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  payout: { label: "Payout", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  aml_screening: { label: "AML Check", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  gps_verification: { label: "GPS Proof", color: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30" },
  price_lock: { label: "Price Lock", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30" },
  rejection: { label: "Rejection", color: "bg-red-600/15 text-red-700 dark:text-red-300 border-red-600/30" },
  hash_chain_anchor: { label: "Chain Anchor", color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30" },
};

interface ProofRecord {
  id: string;
  content_hash: string;
  prev_hash: string;
  record_type: string;
  tx_ref: string;
  transaction_id: string | null;
  event_data: Record<string, unknown>;
  chain_status: string;
  polygon_tx_hash: string | null;
  anchored_at: string | null;
  created_at: string;
}

interface BlockchainExplorerPanelProps {
  trigger?: React.ReactNode;
  defaultTransactionId?: string;
}

const BlockchainExplorerPanel = ({ trigger, defaultTransactionId }: BlockchainExplorerPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(defaultTransactionId || "");
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<ProofRecord | null>(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [feedProofs, setFeedProofs] = useState<ProofRecord[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedFilter, setFeedFilter] = useState<string>("all");
  const [contractAddresses, setContractAddresses] = useState<{ registry?: string; escrow?: string; network?: string }>({});
  const [expanded, setExpanded] = useState(false);

  const sb = supabase as any;

  useEffect(() => {
    if (!open) return;
    // Fetch public contract addresses for header link
    supabase.functions.invoke("get-wallet-config").then(({ data }) => {
      if (data) {
        setContractAddresses({
          registry: data.registryContract || "",
          escrow: data.escrowContract || "",
          network: data.network || "polygon",
        });
      }
    }).catch(() => {});
  }, [open]);

  const loadRecentFeed = async (filter: string = feedFilter) => {
    setFeedLoading(true);
    let q = sb
      .from("blockchain_proofs")
      .select("*")
      .eq("chain_status", "anchored")
      .order("anchored_at", { ascending: false })
      .limit(50);
    if (filter !== "all") q = q.eq("record_type", filter);
    const { data, error } = await q;
    if (error) toast.error("Failed to load recent activity");
    setFeedProofs((data as ProofRecord[]) || []);
    setFeedLoading(false);
  };

  const searchByOrder = async (query?: string) => {
    const q = (query || searchQuery).trim();
    if (!q) return;
    setLoading(true);
    setSelectedProof(null);

    // Try transaction_id first, then tx_ref partial match
    let { data } = await sb
      .from("blockchain_proofs")
      .select("*")
      .eq("transaction_id", q)
      .order("created_at", { ascending: true });

    if (!data?.length) {
      const res = await sb
        .from("blockchain_proofs")
        .select("*")
        .ilike("tx_ref", `%${q}%`)
        .order("created_at", { ascending: true })
        .limit(50);
      data = res.data;
    }

    setProofs((data as ProofRecord[]) || []);
    if (!data?.length) toast.info("No blockchain records found for this query");
    setLoading(false);
  };

  const verifyContentHash = async () => {
    if (!verifyHash.trim()) return;
    setLoading(true);

    const { data } = await sb
      .from("blockchain_proofs")
      .select("*")
      .eq("content_hash", verifyHash.trim());

    if (data?.length) {
      setVerifyResult({ verified: true, message: "Hash verified — record exists in TrustLock Registry" });
      setProofs(data as ProofRecord[]);
    } else {
      setVerifyResult({ verified: false, message: "Hash NOT found — record may be tampered or not yet anchored" });
    }
    setLoading(false);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Copied to clipboard");
  };

  const truncate = (hash: string) => hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : "—";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Blockchain</span>
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[480px] md:w-[540px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Blockchain Explorer
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Search orders, verify hashes, and trace the immutable proof chain
          </p>
          {(contractAddresses.registry || contractAddresses.escrow) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {contractAddresses.registry && (
                <a
                  href={explorerAddressUrl(contractAddresses.registry, contractAddresses.network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline border border-primary/30 rounded px-2 py-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Registry on {explorerName(contractAddresses.network)}
                </a>
              )}
              {contractAddresses.escrow && (
                <a
                  href={explorerAddressUrl(contractAddresses.escrow, contractAddresses.network)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline border border-primary/30 rounded px-2 py-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                  Escrow Contract
                </a>
              )}
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
                    <p className="font-medium mb-1">Why are these public?</p>
                    <p>
                      Smart contract addresses are public by design on the blockchain — like a bank's SWIFT code. Only the private key that controls the wallet is secret. Publishing these addresses lets anyone independently verify the contract is deployed, untampered, and actively anchoring records. Hiding them would be a red flag.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </SheetHeader>

        <Tabs defaultValue="order" className="flex-1 flex flex-col overflow-hidden" onValueChange={(v) => { if (v === "feed" && feedProofs.length === 0) loadRecentFeed(); }}>
          <TabsList className="mx-4 mt-3 w-auto">
            <TabsTrigger value="order" className="text-xs">By Order</TabsTrigger>
            <TabsTrigger value="feed" className="text-xs">Recent Activity</TabsTrigger>
            <TabsTrigger value="verify" className="text-xs">Verify Hash</TabsTrigger>
          </TabsList>

          {/* Order Search Tab */}
          <TabsContent value="order" className="flex-1 flex flex-col overflow-hidden px-4 mt-2">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Transaction ID or order ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchByOrder()}
                className="text-sm"
              />
              <Button size="sm" onClick={() => searchByOrder()} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {selectedProof ? (
                <ProofDetail proof={selectedProof} onBack={() => setSelectedProof(null)} copyHash={copyHash} truncate={truncate} onNavigateToSource={() => {
                  setOpen(false);
                  const path = location.pathname;
                  if (path.includes("/admin")) {
                    navigate(`/trustlock/admin/transactions`);
                  } else if (path.includes("/buyer")) {
                    navigate(`/trustlock/buyer/orders`);
                  } else if (path.includes("/vendor")) {
                    navigate(`/trustlock/vendor/transactions`);
                  } else {
                    navigate(`/trustlock/admin/transactions`);
                  }
                }} />
              ) : (
                <ProofTimeline proofs={proofs} onSelect={setSelectedProof} truncate={truncate} loading={loading} />
              )}
            </ScrollArea>
          </TabsContent>

          {/* Recent Activity Feed Tab */}
          <TabsContent value="feed" className="flex-1 flex flex-col overflow-hidden px-4 mt-2">
            <div className="flex gap-2 mb-2">
              <Select value={feedFilter} onValueChange={(v) => { setFeedFilter(v); loadRecentFeed(v); }}>
                <SelectTrigger className="text-xs h-9 flex-1">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All record types</SelectItem>
                  {Object.entries(RECORD_TYPE_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => loadRecentFeed()} disabled={feedLoading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Latest anchored proofs across all orders. Click any record → PolygonScan to verify on chain.
            </p>
            <ScrollArea className="flex-1">
              {selectedProof ? (
                <ProofDetail proof={selectedProof} onBack={() => setSelectedProof(null)} copyHash={copyHash} truncate={truncate} onNavigateToSource={() => { setOpen(false); }} />
              ) : (
                <ProofTimeline proofs={feedProofs} onSelect={setSelectedProof} truncate={truncate} loading={feedLoading} />
              )}
            </ScrollArea>
          </TabsContent>

          {/* Verify Hash Tab */}
          <TabsContent value="verify" className="flex-1 flex flex-col overflow-hidden px-4 mt-2">
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Paste SHA-256 content hash..."
                value={verifyHash}
                onChange={(e) => { setVerifyHash(e.target.value); setVerifyResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && verifyContentHash()}
                className="font-mono text-xs"
              />
              <Button size="sm" onClick={verifyContentHash} disabled={loading}>
                <Hash className="w-4 h-4" />
              </Button>
            </div>

            {verifyResult && (
              <div className={`p-3 rounded-lg border mb-3 ${verifyResult.verified ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                <div className="flex items-center gap-2 text-sm">
                  {verifyResult.verified ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="font-medium">{verifyResult.message}</span>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <ProofTimeline proofs={proofs} onSelect={setSelectedProof} truncate={truncate} loading={loading} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Timeline View ──────────────────────────────── */
function ProofTimeline({ proofs, onSelect, truncate, loading }: {
  proofs: ProofRecord[];
  onSelect: (p: ProofRecord) => void;
  truncate: (h: string) => string;
  loading: boolean;
}) {
  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Searching...</div>;

  if (!proofs.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Search by order ID to view the blockchain proof trail</p>
        <p className="text-xs mt-1 text-muted-foreground/60">or load the demo to explore a sample trade</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-4">
      <p className="text-xs text-muted-foreground mb-2">{proofs.length} record{proofs.length !== 1 ? "s" : ""} in proof chain</p>
      {proofs.map((p, i) => {
        const typeInfo = RECORD_TYPE_LABELS[p.record_type] || { label: p.record_type, color: "bg-muted text-muted-foreground" };
        return (
          <div
            key={p.id}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
          >
            {/* Chain link indicator */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className={`w-3 h-3 rounded-full ${p.chain_status === "anchored" ? "bg-primary" : "bg-muted-foreground/40"}`} />
              {i < proofs.length - 1 && <div className="w-px h-4 bg-border" />}
            </div>

            <button onClick={() => onSelect(p)} className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge className={`${typeInfo.color} text-[10px] px-1.5 py-0`} variant="outline">{typeInfo.label}</Badge>
                <Badge variant={p.chain_status === "anchored" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                  {p.chain_status === "anchored" ? "On-Chain" : "Queued"}
                </Badge>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground truncate">{truncate(p.content_hash)}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {new Date(p.created_at).toLocaleString()}
              </p>
            </button>

            {/* Quick PolygonScan jump for anchored rows */}
            {p.chain_status === "anchored" && p.polygon_tx_hash && (
              <a
                href={explorerTxUrl(p.polygon_tx_hash, (p as any).network)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title={`View this block on ${explorerName((p as any).network)}`}
                className="shrink-0 p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button onClick={() => onSelect(p)} className="shrink-0" aria-label="Open detail">
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Detail View ────────────────────────────────── */
function ProofDetail({ proof, onBack, copyHash, truncate, onNavigateToSource }: {
  proof: ProofRecord;
  onBack: () => void;
  copyHash: (h: string) => void;
  truncate: (h: string) => string;
  onNavigateToSource: (transactionId: string) => void;
}) {
  const typeInfo = RECORD_TYPE_LABELS[proof.record_type] || { label: proof.record_type, color: "bg-muted text-muted-foreground" };

  const rows: { label: string; value: string; mono?: boolean; copyable?: boolean }[] = [
    { label: "Record Type", value: typeInfo.label },
    { label: "Content Hash", value: proof.content_hash, mono: true, copyable: true },
    { label: "Previous Hash", value: proof.prev_hash, mono: true, copyable: true },
    { label: "Chain Status", value: proof.chain_status === "anchored" ? "✅ On-Chain (Polygon)" : "⏳ Queued for Anchoring" },
    { label: "TX Reference", value: proof.tx_ref, mono: true },
    { label: "Transaction ID", value: proof.transaction_id || "—", mono: true },
    { label: "Created", value: new Date(proof.created_at).toLocaleString() },
  ];

  if (proof.anchored_at) {
    rows.push({ label: "Anchored At", value: new Date(proof.anchored_at).toLocaleString() });
  }
  if (proof.polygon_tx_hash) {
    rows.push({ label: "Polygon TX", value: proof.polygon_tx_hash, mono: true, copyable: true });
  }

  return (
    <div className="space-y-3 pb-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-xs mb-1">
        ← Back to timeline
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <Badge className={`${typeInfo.color}`} variant="outline">{typeInfo.label}</Badge>
        <Badge variant={proof.chain_status === "anchored" ? "default" : "secondary"}>
          {proof.chain_status === "anchored" ? "On-Chain" : "Queued"}
        </Badge>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="border border-border rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{row.label}</p>
            <div className="flex items-center gap-2">
              <p className={`text-sm flex-1 break-all ${row.mono ? "font-mono text-xs" : ""}`}>{row.value}</p>
              {row.copyable && (
                <button onClick={() => copyHash(row.value)} className="shrink-0 hover:text-primary transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event Data */}
      {proof.event_data && Object.keys(proof.event_data).length > 0 && (
        <div className="border border-border rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Event Data (Hashed)</p>
          <div className="space-y-1">
            {Object.entries(proof.event_data).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs gap-2">
                <span className="text-muted-foreground shrink-0">{key.replace(/_/g, " ")}</span>
                <span className="font-mono text-foreground truncate max-w-[220px] text-right">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PolygonScan Link */}
      {proof.polygon_tx_hash && (
        <a
          href={explorerTxUrl(proof.polygon_tx_hash, (proof as any).network)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View on {explorerName((proof as any).network)} →
        </a>
      )}

      {/* Navigate to Source */}
      {proof.transaction_id && (
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => onNavigateToSource(proof.transaction_id!)}
        >
          <ArrowUpRight className="w-4 h-4" />
          View Source Order / Transaction
        </Button>
      )}

      {/* Chain Link Visualization */}
      <div className="border border-primary/20 bg-primary/5 rounded-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5 text-primary" /> Hash Chain Link
        </p>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <div className="bg-muted/50 rounded px-2 py-1 truncate max-w-[140px]" title={proof.prev_hash}>
            prev: {truncate(proof.prev_hash)}
          </div>
          <span className="text-primary font-bold">→</span>
          <div className="bg-primary/10 border border-primary/30 rounded px-2 py-1 truncate max-w-[140px]" title={proof.content_hash}>
            this: {truncate(proof.content_hash)}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          Each record's hash links to the previous, forming a tamper-evident chain
        </p>
      </div>
    </div>
  );
}

export default BlockchainExplorerPanel;

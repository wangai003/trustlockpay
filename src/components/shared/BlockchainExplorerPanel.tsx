import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Search, CheckCircle2, XCircle, Copy, ExternalLink,
  Link2, Hash, FileText, Clock, ChevronRight, Layers, PlayCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RECORD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  invoice: { label: "Invoice", color: "bg-blue-500/20 text-blue-400" },
  contract: { label: "Contract", color: "bg-purple-500/20 text-purple-400" },
  signature: { label: "Signature", color: "bg-green-500/20 text-green-400" },
  milestone: { label: "Milestone", color: "bg-amber-500/20 text-amber-400" },
  observer_signoff: { label: "Observer", color: "bg-cyan-500/20 text-cyan-400" },
  dispute_ruling: { label: "Dispute", color: "bg-red-500/20 text-red-400" },
  document_upload: { label: "Document", color: "bg-indigo-500/20 text-indigo-400" },
  acknowledgement: { label: "Acknowledgement", color: "bg-emerald-500/20 text-emerald-400" },
  payout: { label: "Payout", color: "bg-orange-500/20 text-orange-400" },
  aml_screening: { label: "AML Check", color: "bg-rose-500/20 text-rose-400" },
  gps_verification: { label: "GPS Proof", color: "bg-teal-500/20 text-teal-400" },
  price_lock: { label: "Price Lock", color: "bg-yellow-500/20 text-yellow-400" },
  rejection: { label: "Rejection", color: "bg-red-600/20 text-red-300" },
  hash_chain_anchor: { label: "Chain Anchor", color: "bg-slate-500/20 text-slate-400" },
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

// ─── Demo Proof Chain ─────────────────────────────
// Simulates a complete $12,500 Agriculture trade between Kenya and Nigeria
const DEMO_TX_REF = "TL-2025-0847";
const DEMO_TX_ID = "demo-tx-00000-0847";
const DEMO_POLYGON_TX_PREFIX = "0x";
const now = new Date();
const demoTime = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

const DEMO_PROOFS: ProofRecord[] = [
  {
    id: "demo-proof-001",
    content_hash: "0x7a3f8b2cd91c7e04f5e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5d4e1",
    prev_hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    record_type: "invoice",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      proforma_number: "PFI-2025-0847",
      order_amount: "$12,500.00",
      currency: "USD",
      industry: "Agriculture",
      buyer: "Amara Holdings Ltd (Lagos, NG)",
      vendor: "GreenField Exports (Nairobi, KE)",
      line_items: "Premium Arabica Coffee - 5,000 kg",
      incoterms: "CIF Lagos",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0x9bc2e7f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6f71a",
    anchored_at: demoTime(72),
    created_at: demoTime(72),
  },
  {
    id: "demo-proof-002",
    content_hash: "0x2d91c7e04f5e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7a8f3",
    prev_hash: "0x7a3f8b2cd91c7e04f5e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5d4e1",
    record_type: "aml_screening",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      screening_provider: "TrustLock Compliance Engine",
      buyer_status: "CLEAR — No OFAC/UN matches",
      vendor_status: "CLEAR — No OFAC/UN matches",
      risk_score: "Low (12/100)",
      corridor: "KE → NG",
      sanctions_lists_checked: "OFAC SDN, UN Consolidated, EU Sanctions, FATF Greylist",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xa1e73c9b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
    anchored_at: demoTime(71.5),
    created_at: demoTime(71.5),
  },
  {
    id: "demo-proof-003",
    content_hash: "0x4b8c3d7e2f1a9b0c5d6e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    prev_hash: "0x2d91c7e04f5e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7a8f3",
    record_type: "contract",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      buyer_typed_name: "Amara Osei",
      buyer_ip: "105.112.xxx.xxx (Lagos, NG)",
      vendor_auto_signed: "Yes (consent on file)",
      contract_version: "1.0",
      industry_addendum: "Agriculture — Perishable Goods Clause",
      milestone_count: "3",
      escrow_terms: "1.5% fee, milestone-based release",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xb3f28d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    anchored_at: demoTime(70),
    created_at: demoTime(70),
  },
  {
    id: "demo-proof-004",
    content_hash: "0x5f4e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c7d2",
    prev_hash: "0x4b8c3d7e2f1a9b0c5d6e7f8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    record_type: "milestone",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      milestone: "1 of 3 — Goods Packaged & Quality Inspected",
      observer: "James Mwangi (Certified Inspector)",
      gps_coordinates: "1.2921° S, 36.8219° E (Nairobi)",
      evidence_hash: "0x8c1d...e4a7 (inspection_report.pdf)",
      sign_off_ip: "197.248.xxx.xxx",
      quality_grade: "Grade AA Arabica",
      weight_verified: "5,012 kg (within tolerance)",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xc4d17a2f3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    anchored_at: demoTime(48),
    created_at: demoTime(48),
  },
  {
    id: "demo-proof-005",
    content_hash: "0x1a8b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e3f5",
    prev_hash: "0x5f4e3a1b9c4d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c7d2",
    record_type: "document_upload",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      file_name: "Certificate_of_Origin_KE.pdf",
      file_hash: "0x3e7fb2c1d4e5f6a7b8c9d0e1f2a3b4c5",
      file_size: "2.4 MB",
      uploaded_by: "Vendor (GreenField Exports)",
      document_type: "Certificate of Origin",
      issuing_authority: "Kenya Revenue Authority",
      retention_period: "7 years",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xd5e29b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
    anchored_at: demoTime(36),
    created_at: demoTime(36),
  },
  {
    id: "demo-proof-006",
    content_hash: "0x8e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
    prev_hash: "0x1a8b9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e3f5",
    record_type: "milestone",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      milestone: "2 of 3 — Shipped & In Transit",
      carrier: "Maersk Line",
      tracking_number: "MAEU-284719-5",
      port_of_loading: "Mombasa, Kenya",
      port_of_discharge: "Apapa, Lagos",
      etd: "2025-03-15",
      eta: "2025-03-28",
      bill_of_lading: "BL-MSK-2025-284719",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xe6f31c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    anchored_at: demoTime(24),
    created_at: demoTime(24),
  },
  {
    id: "demo-proof-007",
    content_hash: "0x6c2d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5b1a4",
    prev_hash: "0x8e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
    record_type: "observer_signoff",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      observer: "Lagos Port Authority Inspector",
      sign_off_type: "Delivery Confirmation",
      gps_coordinates: "6.4541° N, 3.3947° E (Apapa Port)",
      goods_condition: "Intact — No damage reported",
      weight_at_arrival: "5,008 kg",
      customs_clearance: "Cleared — NCS Ref: NCS-2025-08471",
      sign_off_ip: "41.58.xxx.xxx",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xf7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
    anchored_at: demoTime(6),
    created_at: demoTime(6),
  },
  {
    id: "demo-proof-008",
    content_hash: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a",
    prev_hash: "0x6c2d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5b1a4",
    record_type: "acknowledgement",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      form_type: "Delivery Acknowledgement",
      buyer_confirmed: "Yes — Amara Osei",
      buyer_ip: "105.112.xxx.xxx",
      confirmation_timestamp: demoTime(4),
      goods_accepted: "Full quantity accepted",
      quality_confirmed: "Matches Grade AA specification",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xa0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    anchored_at: demoTime(4),
    created_at: demoTime(4),
  },
  {
    id: "demo-proof-009",
    content_hash: "0x9e7f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7d5c8",
    prev_hash: "0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a",
    record_type: "payout",
    tx_ref: DEMO_TX_REF,
    transaction_id: DEMO_TX_ID,
    event_data: {
      gross_amount: "$12,500.00",
      escrow_fee: "$187.50 (1.5%)",
      net_payout: "$12,312.50",
      recipient: "GreenField Exports",
      wallet: "0x4b2c...8d1e",
      settlement: "USDC on Polygon",
      confirmation_code: "TLP-9847",
      trickle_to_wallet_1: "$125.00 (1.0% escrow fee)",
    },
    chain_status: "anchored",
    polygon_tx_hash: "0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
    anchored_at: demoTime(2),
    created_at: demoTime(2),
  },
];

const BlockchainExplorerPanel = ({ trigger, defaultTransactionId }: BlockchainExplorerPanelProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(defaultTransactionId || "");
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProof, setSelectedProof] = useState<ProofRecord | null>(null);
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);

  const sb = supabase as any;

  const loadDemo = () => {
    setSearchQuery(DEMO_TX_REF);
    setProofs(DEMO_PROOFS);
    setSelectedProof(null);
    toast.success("Demo loaded — 9-block proof chain for order TL-2025-0847");
  };

  const searchByOrder = async (query?: string) => {
    const q = (query || searchQuery).trim();
    if (!q) return;
    setLoading(true);
    setSelectedProof(null);

    // Check demo data first
    if (q === DEMO_TX_REF || q === DEMO_TX_ID || q.toLowerCase().includes("0847") || q.toLowerCase().includes("demo")) {
      setProofs(DEMO_PROOFS);
      setLoading(false);
      return;
    }

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

    // Check demo hashes first
    const demoMatch = DEMO_PROOFS.find(p => p.content_hash === verifyHash.trim());
    if (demoMatch) {
      setVerifyResult({ verified: true, message: "Hash verified — record exists in TrustLock Registry (Demo)" });
      setProofs([demoMatch]);
      setLoading(false);
      return;
    }

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
        </SheetHeader>

        <Tabs defaultValue="order" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 w-auto">
            <TabsTrigger value="order" className="text-xs">By Order</TabsTrigger>
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

            {/* Demo Load Button */}
            {proofs.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadDemo}
                className="mb-3 gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              >
                <PlayCircle className="w-4 h-4" />
                Load Demo: Agriculture Trade (KE → NG) — 9 Proof Blocks
              </Button>
            )}

            <ScrollArea className="flex-1">
              {selectedProof ? (
                <ProofDetail proof={selectedProof} onBack={() => setSelectedProof(null)} copyHash={copyHash} truncate={truncate} />
              ) : (
                <ProofTimeline proofs={proofs} onSelect={setSelectedProof} truncate={truncate} loading={loading} />
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
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
          >
            {/* Chain link indicator */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className={`w-3 h-3 rounded-full ${p.chain_status === "anchored" ? "bg-primary" : "bg-muted-foreground/40"}`} />
              {i < proofs.length - 1 && <div className="w-px h-4 bg-border" />}
            </div>

            <div className="flex-1 min-w-0">
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
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </button>
        );
      })}
    </div>
  );
}

/* ─── Detail View ────────────────────────────────── */
function ProofDetail({ proof, onBack, copyHash, truncate }: {
  proof: ProofRecord;
  onBack: () => void;
  copyHash: (h: string) => void;
  truncate: (h: string) => string;
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
          href={`https://polygonscan.com/tx/${proof.polygon_tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View on PolygonScan →
        </a>
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

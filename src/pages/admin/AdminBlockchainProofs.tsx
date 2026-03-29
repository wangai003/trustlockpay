import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Search, CheckCircle2, XCircle, Link2, Hash, Clock, FileText, AlertTriangle, Copy, ExternalLink } from "lucide-react";
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

const AdminBlockchainProofs = () => {
  const [searchHash, setSearchHash] = useState("");
  const [searchTxId, setSearchTxId] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [chainStatus, setChainStatus] = useState<{ valid: boolean; totalRecords: number } | null>(null);

  const loadAllProofs = async () => {
    setLoading(true);
    let query = supabase.from("blockchain_proofs" as string).select("*").order("created_at", { ascending: false }).limit(200);
    if (filterType !== "all") {
      query = query.eq("record_type", filterType);
    }
    const { data, error } = await query;
    if (error) toast.error("Failed to load proofs");
    setProofs((data as unknown as ProofRecord[]) || []);
    setLoading(false);
  };

  const searchByHash = async () => {
    if (!searchHash.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("blockchain_proofs" as string)
      .select("*")
      .eq("content_hash", searchHash.trim());
    if (data && (data as unknown as ProofRecord[]).length > 0) {
      setVerifyResult({ verified: true, message: "✅ Hash found and verified in TrustLock Registry" });
      setProofs(data as unknown as ProofRecord[]);
    } else {
      setVerifyResult({ verified: false, message: "❌ Hash NOT found — record may be tampered or not anchored" });
      setProofs([]);
    }
    setLoading(false);
  };

  const searchByTransaction = async () => {
    if (!searchTxId.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("blockchain_proofs" as string)
      .select("*")
      .eq("transaction_id", searchTxId.trim())
      .order("created_at", { ascending: true });
    setProofs((data as unknown as ProofRecord[]) || []);
    setLoading(false);
  };

  const checkChainIntegrity = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("blockchain_proofs" as string)
      .select("id, content_hash, prev_hash, created_at")
      .order("created_at", { ascending: true })
      .limit(1000);

    const records = (data as unknown as { content_hash: string; prev_hash: string }[]) || [];
    let valid = true;
    for (let i = 1; i < records.length; i++) {
      if (records[i].prev_hash !== records[i - 1].content_hash) {
        valid = false;
        break;
      }
    }
    setChainStatus({ valid, totalRecords: records.length });
    setLoading(false);
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash copied to clipboard");
  };

  const truncateHash = (hash: string) => hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "—";

  return (
    <div>
      <AdminHeader />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Blockchain Proof Explorer</h1>
            <p className="text-sm text-muted-foreground">Verify immutable records anchored to Polygon via TrustLockRegistry</p>
          </div>
        </div>

        {/* Chain Integrity Banner */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-foreground">Hash Chain Integrity</p>
                <p className="text-xs text-muted-foreground">
                  {chainStatus
                    ? chainStatus.valid
                      ? `✅ Chain valid — ${chainStatus.totalRecords} records verified`
                      : `⚠️ Chain broken — integrity compromised`
                    : "Click to verify the entire hash chain"}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={checkChainIntegrity} disabled={loading}>
              {loading ? "Checking..." : "Verify Chain"}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="browse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="browse">Browse Records</TabsTrigger>
            <TabsTrigger value="verify">Verify Hash</TabsTrigger>
            <TabsTrigger value="transaction">By Transaction</TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(RECORD_TYPE_LABELS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={loadAllProofs} disabled={loading}>
                {loading ? "Loading..." : "Load Records"}
              </Button>
            </div>

            <ProofTable proofs={proofs} truncateHash={truncateHash} copyHash={copyHash} />
          </TabsContent>

          {/* Verify Tab */}
          <TabsContent value="verify" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Verify Content Hash</CardTitle>
                <CardDescription>Paste a SHA-256 content hash to verify if it exists in the registry</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="0x..."
                    value={searchHash}
                    onChange={(e) => { setSearchHash(e.target.value); setVerifyResult(null); }}
                    className="font-mono text-sm"
                  />
                  <Button onClick={searchByHash} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" /> Verify
                  </Button>
                </div>
                {verifyResult && (
                  <div className={`p-4 rounded-lg border ${verifyResult.verified ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                    <div className="flex items-center gap-2">
                      {verifyResult.verified ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      <span className="font-medium">{verifyResult.message}</span>
                    </div>
                  </div>
                )}
                <ProofTable proofs={proofs} truncateHash={truncateHash} copyHash={copyHash} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction Tab */}
          <TabsContent value="transaction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Transaction Proof Trail</CardTitle>
                <CardDescription>Enter a transaction UUID to see all anchored records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Transaction UUID..."
                    value={searchTxId}
                    onChange={(e) => setSearchTxId(e.target.value)}
                  />
                  <Button onClick={searchByTransaction} disabled={loading}>
                    <Search className="w-4 h-4 mr-2" /> Search
                  </Button>
                </div>
                <ProofTable proofs={proofs} truncateHash={truncateHash} copyHash={copyHash} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function ProofTable({ proofs, truncateHash, copyHash }: { proofs: ProofRecord[]; truncateHash: (h: string) => string; copyHash: (h: string) => void }) {
  if (!proofs.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No records to display</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Content Hash</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proofs.map((p) => {
            const typeInfo = RECORD_TYPE_LABELS[p.record_type] || { label: p.record_type, color: "bg-muted text-muted-foreground" };
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Badge className={typeInfo.color} variant="outline">{typeInfo.label}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <button onClick={() => copyHash(p.content_hash)} className="hover:text-primary transition-colors flex items-center gap-1" title={p.content_hash}>
                    {truncateHash(p.content_hash)}
                    <Copy className="w-3 h-3 opacity-50" />
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={p.chain_status === "anchored" ? "default" : "secondary"} className="text-xs">
                    {p.chain_status === "anchored" ? "On-Chain" : p.chain_status === "queued" ? "Queued" : p.chain_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {p.polygon_tx_hash && (
                    <a href={`https://polygonscan.com/tx/${p.polygon_tx_hash}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default AdminBlockchainProofs;

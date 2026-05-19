import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useBlockchainAnchor, type ProofRecord } from "@/hooks/useBlockchainAnchor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield, CheckCircle2, XCircle, Copy, ExternalLink, Link2,
  FileText, Coins, PenLine, MapPin, AlertTriangle, Loader2,
  Package, Eye, Scale, Hash, Clock, ChevronDown, ChevronUp,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { explorerTxUrl } from "@/lib/polygonExplorer";

// ─── Record type visual config ────────────────────────────
const RECORD_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  invoice: { label: "Invoice", icon: FileText, color: "text-blue-400 bg-blue-500/15" },
  contract: { label: "Contract", icon: PenLine, color: "text-purple-400 bg-purple-500/15" },
  signature: { label: "Signature", icon: PenLine, color: "text-green-400 bg-green-500/15" },
  milestone: { label: "Milestone", icon: CheckCircle2, color: "text-amber-400 bg-amber-500/15" },
  observer_signoff: { label: "Observer", icon: Eye, color: "text-cyan-400 bg-cyan-500/15" },
  dispute_ruling: { label: "Dispute", icon: Scale, color: "text-red-400 bg-red-500/15" },
  document_upload: { label: "Document", icon: FileText, color: "text-indigo-400 bg-indigo-500/15" },
  acknowledgement: { label: "Acknowledgement", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/15" },
  payout: { label: "Payout", icon: Coins, color: "text-orange-400 bg-orange-500/15" },
  aml_screening: { label: "AML Check", icon: Shield, color: "text-rose-400 bg-rose-500/15" },
  gps_verification: { label: "GPS Proof", icon: MapPin, color: "text-teal-400 bg-teal-500/15" },
  price_lock: { label: "Price Lock", icon: Coins, color: "text-yellow-400 bg-yellow-500/15" },
  rejection: { label: "Rejection", icon: XCircle, color: "text-red-400 bg-red-600/15" },
  hash_chain_anchor: { label: "Chain Anchor", icon: Link2, color: "text-slate-400 bg-slate-500/15" },
};

const CHAIN_STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "Queued", variant: "secondary" },
  pending_tx: { label: "Pending TX", variant: "outline" },
  anchored: { label: "On-Chain ✓", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

// ─── Component ────────────────────────────────────────────
interface TransactionProofChainProps {
  transactionId: string;
  className?: string;
  compact?: boolean;
}

const TransactionProofChain = ({ transactionId, className, compact = false }: TransactionProofChainProps) => {
  const { getProofsByTransaction, loading } = useBlockchainAnchor();
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [expanded, setExpanded] = useState(!compact);
  const [selectedProof, setSelectedProof] = useState<ProofRecord | null>(null);

  useEffect(() => {
    if (transactionId) {
      getProofsByTransaction(transactionId).then(setProofs);
    }
  }, [transactionId, getProofsByTransaction]);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash copied to clipboard");
  };

  const truncateHash = (hash: string, len = 10) => {
    if (!hash || hash.length < len * 2) return hash;
    return `${hash.slice(0, len)}...${hash.slice(-len)}`;
  };

  if (loading) {
    return (
      <Card className={cn("border-border", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">Loading blockchain proofs...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Blockchain Proof Chain
            <Badge variant="outline" className="text-[10px] font-mono">
              {proofs.length} record{proofs.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {proofs.length > 0 && (
              <Badge
                variant={proofs.every((p) => p.chain_status === "anchored") ? "default" : "secondary"}
                className="text-[10px]"
              >
                {proofs.every((p) => p.chain_status === "anchored")
                  ? "Fully Anchored"
                  : proofs.some((p) => p.chain_status === "anchored")
                  ? "Partially Anchored"
                  : "Queued"}
              </Badge>
            )}
            {compact && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {proofs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No blockchain proofs recorded yet for this transaction.
            </div>
          ) : (
            <div className="space-y-0">
              {proofs.map((proof, i) => {
                const config = RECORD_CONFIG[proof.record_type] || {
                  label: proof.record_type,
                  icon: Hash,
                  color: "text-muted-foreground bg-muted",
                };
                const statusConfig = CHAIN_STATUS_BADGE[proof.chain_status] || {
                  label: proof.chain_status,
                  variant: "outline" as const,
                };
                const Icon = config.icon;
                const isLast = i === proofs.length - 1;
                const isSelected = selectedProof?.id === proof.id;

                return (
                  <div key={proof.id}>
                    {/* Chain node */}
                    <div
                      className={cn(
                        "flex items-start gap-3 py-2 px-2 rounded-lg cursor-pointer transition-colors",
                        isSelected ? "bg-muted/60" : "hover:bg-muted/30"
                      )}
                      onClick={() => setSelectedProof(isSelected ? null : proof)}
                    >
                      {/* Timeline */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", config.color)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {!isLast && <div className="w-0.5 h-6 bg-border" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{config.label}</span>
                          <Badge variant={statusConfig.variant} className="text-[9px] h-4">
                            {statusConfig.label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(proof.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Hash preview */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyHash(proof.content_hash);
                                  }}
                                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                  <Hash className="w-2.5 h-2.5" />
                                  {truncateHash(proof.content_hash, 8)}
                                  <Copy className="w-2.5 h-2.5 opacity-50" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="font-mono text-[10px] max-w-xs break-all">
                                {proof.content_hash}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {i > 0 && (
                            <span className="text-[9px] text-muted-foreground/60 ml-1">
                              ← {truncateHash(proof.prev_hash, 4)}
                            </span>
                          )}

                          {proof.polygon_tx_hash && (
                            <a
                              href={`https://polygonscan.com/tx/${proof.polygon_tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto"
                            >
                              <ExternalLink className="w-3 h-3 text-primary hover:text-primary/80" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="ml-10 mb-2 p-3 rounded-lg bg-muted/40 border border-border text-[10px] space-y-1.5">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <span className="text-muted-foreground">Proof ID:</span>
                            <span className="ml-1 font-mono">{proof.id.slice(0, 8)}...</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Chain Status:</span>
                            <span className="ml-1 font-semibold">{proof.chain_status}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Content Hash:</span>
                            <span className="ml-1 font-mono break-all">{proof.content_hash}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Previous Hash:</span>
                            <span className="ml-1 font-mono break-all">{proof.prev_hash}</span>
                          </div>
                          {proof.polygon_tx_hash && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Polygon TX:</span>
                              <a
                                href={`https://polygonscan.com/tx/${proof.polygon_tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 font-mono text-primary underline break-all"
                              >
                                {proof.polygon_tx_hash}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Event data summary */}
                        {proof.event_data && Object.keys(proof.event_data).length > 0 && (
                          <div className="pt-1.5 border-t border-border/50">
                            <span className="text-muted-foreground font-semibold">Hashed Event Data:</span>
                            <div className="mt-1 font-mono bg-background/50 rounded p-2 max-h-32 overflow-auto">
                              {Object.entries(proof.event_data).map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <span className="text-muted-foreground shrink-0">{key}:</span>
                                  <span className="text-foreground break-all">
                                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chain integrity indicator */}
          {proofs.length >= 2 && (
            <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground">
                Hash chain: {proofs.length} linked records
              </span>
              {proofs.every((p, i) => i === 0 || p.prev_hash === proofs[i - 1].content_hash) ? (
                <Badge variant="default" className="text-[9px] h-4 ml-auto">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Chain Valid
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[9px] h-4 ml-auto">
                  <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Chain Broken
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TransactionProofChain;

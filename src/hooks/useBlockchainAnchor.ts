import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────
export type RecordType =
  | "invoice"
  | "contract"
  | "signature"
  | "milestone"
  | "observer_signoff"
  | "dispute_ruling"
  | "document_upload"
  | "acknowledgement"
  | "payout"
  | "aml_screening"
  | "gps_verification"
  | "price_lock"
  | "rejection"
  | "hash_chain_anchor";

export interface AnchorResult {
  success: boolean;
  proofId?: string;
  contentHash?: string;
  prevHash?: string;
  txRef?: string;
  recordType?: string;
  chainStatus?: string;
  verifyUrl?: string;
  resolvedLocation?: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postcode: string | null;
    formatted: string | null;
  } | null;
  error?: string;
}

export interface VerifyResult {
  verified: boolean;
  message?: string;
  proof?: {
    id: string;
    contentHash: string;
    prevHash: string;
    recordType: string;
    txRef: string;
    chainStatus: string;
    polygonTxHash: string | null;
    createdAt: string;
  };
}

export interface ProofRecord {
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

export interface ChainStatus {
  valid: boolean;
  totalRecords: number;
  brokenAt?: number | null;
  latestHash?: string;
}

// ─── Hook ─────────────────────────────────────────────────
export function useBlockchainAnchor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callRegistryAnchor = useCallback(async (body: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("registry-anchor", {
        body,
      });
      if (fnError) throw fnError;
      return data;
    } catch (err: any) {
      const msg = err?.message || "Blockchain anchor call failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Anchor a new event to the blockchain proof chain.
   */
  const anchor = useCallback(
    async (
      transactionId: string,
      recordType: RecordType,
      eventData: Record<string, unknown>
    ): Promise<AnchorResult> => {
      return callRegistryAnchor({
        action: "anchor",
        transactionId,
        recordType,
        eventData,
      });
    },
    [callRegistryAnchor]
  );

  /**
   * Verify a content hash exists in the registry.
   */
  const verify = useCallback(
    async (contentHash: string): Promise<VerifyResult> => {
      return callRegistryAnchor({
        action: "verify",
        contentHash,
      });
    },
    [callRegistryAnchor]
  );

  /**
   * List all proof records for a specific transaction.
   */
  const listProofs = useCallback(
    async (transactionId: string): Promise<{ records: ProofRecord[]; count: number }> => {
      return callRegistryAnchor({
        action: "list",
        transactionId,
      });
    },
    [callRegistryAnchor]
  );

  /**
   * Check the integrity of the entire hash chain.
   */
  const checkChainStatus = useCallback(async (): Promise<ChainStatus> => {
    return callRegistryAnchor({
      action: "chain_status",
    });
  }, [callRegistryAnchor]);

  /**
   * Direct DB query for proofs (no edge function needed — uses RLS).
   */
  const getProofsByTransaction = useCallback(async (transactionId: string): Promise<ProofRecord[]> => {
    const { data, error: queryError } = await (supabase as any)
      .from("blockchain_proofs")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      return [];
    }
    return (data as ProofRecord[]) || [];
  }, []);

  return {
    anchor,
    verify,
    listProofs,
    checkChainStatus,
    getProofsByTransaction,
    loading,
    error,
  };
}

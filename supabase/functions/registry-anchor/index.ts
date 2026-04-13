import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// SHA-256 hash helper
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Convert tx_id string to bytes32-like hex
function toBytes32(input: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  let hash = "0x";
  for (let i = 0; i < 32; i++) {
    const byte = data[i % data.length] ^ (i * 37);
    hash += (byte & 0xff).toString(16).padStart(2, "0");
  }
  return hash;
}

// ─── Reverse Geocoding via OpenStreetMap Nominatim ───
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postcode: string | null;
  formatted: string | null;
}> {
  const empty = { address: null, city: null, state: null, country: null, postcode: null, formatted: null };
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=18`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TrustLock-Escrow/1.0 (compliance-geocode)" },
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const a = data.address || {};
    return {
      address: a.road || a.neighbourhood || a.suburb || null,
      city: a.city || a.town || a.village || a.hamlet || null,
      state: a.state || a.region || a.province || null,
      country: a.country || null,
      postcode: a.postcode || null,
      formatted: data.display_name || null,
    };
  } catch (err) {
    console.warn("[registry-anchor] Reverse geocode failed:", err);
    return empty;
  }
}

const RECORD_TYPE_MAP: Record<string, number> = {
  invoice: 0,
  contract: 1,
  signature: 2,
  milestone: 3,
  observer_signoff: 4,
  dispute_ruling: 5,
  document_upload: 6,
  acknowledgement: 7,
  payout: 8,
  aml_screening: 9,
  gps_verification: 10,
  price_lock: 11,
  rejection: 12,
  hash_chain_anchor: 13,
};

// ═══════════════════════════════════════════════════════════
//  POLYGON PRE-WIRING — activates when secrets are set
// ═══════════════════════════════════════════════════════════
//
// Required secrets (add via Lovable secrets tool when ready):
//   REGISTRY_CONTRACT_ADDRESS  — deployed TrustLockRegistry.sol address
//   POLYGON_WALLET_PRIVATE_KEY — hot wallet private key for signing txs
//   POLYGON_RPC_URL            — e.g. https://polygon-rpc.com or Alchemy/Infura
//
// The anchorOnChain() function is called automatically when all three
// secrets are present. Until then, records stay "queued" in the DB.
// ═══════════════════════════════════════════════════════════

function getPolygonConfig(): {
  contractAddress: string;
  privateKey: string;
  rpcUrl: string;
} | null {
  const contractAddress = Deno.env.get("REGISTRY_CONTRACT_ADDRESS");
  const privateKey = Deno.env.get("POLYGON_RELAYER_PRIVATE_KEY");
  const rpcUrl = Deno.env.get("POLYGON_RPC_URL");

  if (!contractAddress || !privateKey || !rpcUrl) return null;
  return { contractAddress, privateKey, rpcUrl };
}

// TrustLockRegistry ABI (minimal — only what we call)
const REGISTRY_ABI = [
  {
    name: "anchorRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "txRef", type: "bytes32" },
      { name: "recordType", type: "uint8" },
    ],
    outputs: [{ name: "recordId", type: "uint256" }],
  },
  {
    name: "anchorBatch",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contentHashes", type: "bytes32[]" },
      { name: "txRefs", type: "bytes32[]" },
      { name: "recordTypes", type: "uint8[]" },
    ],
    outputs: [],
  },
  {
    name: "verifyHash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "contentHash", type: "bytes32" }],
    outputs: [
      { name: "exists", type: "bool" },
      { name: "recordId", type: "uint256" },
    ],
  },
];

// Get wallet address from private key
function getWalletAddress(privateKey: string): string {
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

// Send signed transaction to Polygon via ethers.js
async function sendPolygonTx(
  config: { contractAddress: string; privateKey: string; rpcUrl: string },
  contentHash: string,
  txRef: string,
  recordType: number
): Promise<{ txHash: string } | { error: string }> {
  try {
    const chainId = Number(Deno.env.get("POLYGON_CHAIN_ID") || "137");
    const provider = new ethers.JsonRpcProvider(config.rpcUrl, {
      name: "polygon",
      chainId,
    });
    const wallet = new ethers.Wallet(config.privateKey, provider);
    const contract = new ethers.Contract(config.contractAddress, REGISTRY_ABI, wallet);

    console.log("[registry-anchor] Sending anchorRecord TX...", {
      from: wallet.address,
      to: config.contractAddress,
      contentHash: contentHash.slice(0, 10) + "...",
      recordType,
    });

    const tx = await contract.anchorRecord(contentHash, txRef, recordType);
    console.log("[registry-anchor] TX submitted:", tx.hash);

    const receipt = await tx.wait(1); // wait for 1 confirmation
    console.log("[registry-anchor] TX confirmed in block:", receipt.blockNumber);

    return { txHash: receipt.hash };
  } catch (err: any) {
    console.error("[registry-anchor] Polygon TX error:", err);
    return { error: err.message || "polygon_tx_failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) return json({ error: "action is required" }, 400);

    const supabase = getSupabase();
    const polygonConfig = getPolygonConfig();

    // ═══════════════════════════════════════════
    //  ACTION: ANCHOR — Hash, store, and optionally anchor on-chain
    // ═══════════════════════════════════════════
    if (action === "anchor") {
      const { transactionId, recordType, eventData } = body;
      if (!transactionId || !recordType || !eventData) {
        return json({ error: "transactionId, recordType, and eventData required" }, 400);
      }

      const typeNum = RECORD_TYPE_MAP[recordType];
      if (typeNum === undefined) {
        return json({ error: `Unknown recordType: ${recordType}` }, 400);
      }

      // ── Enrich GPS verification records with reverse geocoding ──
      let resolvedLocation: Record<string, unknown> | null = null;
      if (recordType === "gps_verification" && eventData.latitude && eventData.longitude) {
        const geo = await reverseGeocode(eventData.latitude, eventData.longitude);
        if (geo.formatted) {
          resolvedLocation = geo;
          // Merge into eventData so it's included in the content hash
          eventData.resolvedAddress = geo.address;
          eventData.resolvedCity = geo.city;
          eventData.resolvedState = geo.state;
          eventData.resolvedCountry = geo.country;
          eventData.resolvedPostcode = geo.postcode;
          eventData.resolvedFormatted = geo.formatted;
        }
      }

      // Create deterministic content hash
      const canonicalData = JSON.stringify(eventData, Object.keys(eventData).sort());
      const contentHash = await sha256(canonicalData);
      const txRef = toBytes32(transactionId);

      // Get previous hash for chain linking
      const { data: lastRecord } = await supabase
        .from("blockchain_proofs")
        .select("content_hash")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const prevHash = lastRecord?.content_hash || "0x" + "0".repeat(64);

      // Determine initial chain status
      let chainStatus = "queued";
      let polygonTxHash: string | null = null;
      let anchoredAt: string | null = null;

      // ── Attempt on-chain anchoring if Polygon is configured ──
      if (polygonConfig) {
        chainStatus = "pending_tx";
        const result = await sendPolygonTx(polygonConfig, contentHash, txRef, typeNum);

        if ("txHash" in result && result.txHash) {
          polygonTxHash = result.txHash;
          chainStatus = "anchored";
          anchoredAt = new Date().toISOString();
          console.log(`[registry-anchor] ✅ Anchored on Polygon: ${result.txHash}`);
        } else {
          // TX failed or signing not wired yet — record stays pending
          console.log(`[registry-anchor] ⏳ On-chain pending: ${result.error}`);
          chainStatus = result.error === "signing_not_wired" ? "queued" : "failed";
        }
      }

      // Store in database
      const { data: proof, error: insertErr } = await supabase
        .from("blockchain_proofs")
        .insert({
          content_hash: contentHash,
          prev_hash: prevHash,
          record_type: recordType,
          tx_ref: txRef,
          transaction_id: transactionId,
          event_data: eventData,
          chain_status: chainStatus,
          polygon_tx_hash: polygonTxHash,
          anchored_at: anchoredAt,
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return json({ error: "Failed to store proof record" }, 500);
      }

      return json({
        success: true,
        proofId: proof.id,
        contentHash,
        prevHash,
        txRef,
        recordType,
        chainStatus,
        polygonTxHash,
        polygonConfigured: !!polygonConfig,
        resolvedLocation: resolvedLocation || null,
        verifyUrl: polygonTxHash
          ? `https://polygonscan.com/tx/${polygonTxHash}`
          : polygonConfig
            ? `https://polygonscan.com/address/${polygonConfig.contractAddress}`
            : null,
      });
    }

    // ═══════════════════════════════════════════
    //  ACTION: ANCHOR_BATCH — Batch anchor queued records
    // ═══════════════════════════════════════════
    if (action === "anchor_batch") {
      if (!polygonConfig) {
        return json({ error: "Polygon not configured. Set REGISTRY_CONTRACT_ADDRESS, POLYGON_WALLET_PRIVATE_KEY, and POLYGON_RPC_URL." }, 400);
      }

      const limit = body.limit || 50;
      const { data: queued } = await supabase
        .from("blockchain_proofs")
        .select("*")
        .eq("chain_status", "queued")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (!queued?.length) {
        return json({ success: true, anchored: 0, message: "No queued records" });
      }

      // Batch anchor using contract's anchorBatch() for gas efficiency
      const contentHashes: string[] = [];
      const txRefs: string[] = [];
      const recordTypes: number[] = [];

      for (const record of queued) {
        contentHashes.push(record.content_hash);
        txRefs.push(record.tx_ref);
        recordTypes.push(RECORD_TYPE_MAP[record.record_type] ?? 13);
      }

      try {
        const batchChainId = Number(Deno.env.get("POLYGON_CHAIN_ID") || "137");
        const provider = new ethers.JsonRpcProvider(polygonConfig.rpcUrl, {
          name: "polygon",
          chainId: batchChainId,
        });
        const wallet = new ethers.Wallet(polygonConfig.privateKey, provider);
        const contract = new ethers.Contract(polygonConfig.contractAddress, REGISTRY_ABI, wallet);

        console.log(`[registry-anchor] Sending anchorBatch TX for ${queued.length} records...`);
        const tx = await contract.anchorBatch(contentHashes, txRefs, recordTypes);
        const receipt = await tx.wait(1);
        console.log(`[registry-anchor] Batch TX confirmed: ${receipt.hash}, block: ${receipt.blockNumber}`);

        // Update all records as anchored
        const ids = queued.map((r: Record<string, unknown>) => r.id);
        const now = new Date().toISOString();
        for (const id of ids) {
          await supabase
            .from("blockchain_proofs")
            .update({
              chain_status: "anchored",
              polygon_tx_hash: receipt.hash,
              anchored_at: now,
            })
            .eq("id", id);
        }

        return json({
          success: true,
          total: queued.length,
          anchored: queued.length,
          failed: 0,
          batchTxHash: receipt.hash,
          errors: [],
        });
      } catch (err: any) {
        console.error("[registry-anchor] Batch TX failed, falling back to one-by-one:", err.message);

        // Fallback: process one-by-one
        let anchored = 0;
        const errors: string[] = [];

        for (const record of queued) {
          const typeNum = RECORD_TYPE_MAP[record.record_type] ?? 13;
          const result = await sendPolygonTx(polygonConfig, record.content_hash, record.tx_ref, typeNum);

          if ("txHash" in result && result.txHash) {
            await supabase
              .from("blockchain_proofs")
              .update({
                chain_status: "anchored",
                polygon_tx_hash: result.txHash,
                anchored_at: new Date().toISOString(),
              })
              .eq("id", record.id);
            anchored++;
          } else {
            errors.push(`${record.id}: ${result.error}`);
          }
        }

        return json({
          success: true,
          total: queued.length,
          anchored,
          failed: errors.length,
          errors: errors.slice(0, 10),
        });
      }
    }

    // ═══════════════════════════════════════════
    //  ACTION: VERIFY — Check if a hash exists
    // ═══════════════════════════════════════════
    if (action === "verify") {
      const { contentHash } = body;
      if (!contentHash) return json({ error: "contentHash required" }, 400);

      const { data: proof } = await supabase
        .from("blockchain_proofs")
        .select("*")
        .eq("content_hash", contentHash)
        .single();

      if (!proof) {
        return json({ verified: false, message: "Hash not found in registry" });
      }

      // If Polygon is configured, optionally verify on-chain too
      let onChainVerified: boolean | null = null;
      if (polygonConfig && proof.polygon_tx_hash) {
        try {
          const receiptRes = await fetch(polygonConfig.rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_getTransactionReceipt",
              params: [proof.polygon_tx_hash],
            }),
          });
          const receiptData = await receiptRes.json();
          onChainVerified = receiptData.result?.status === "0x1";
        } catch {
          onChainVerified = null;
        }
      }

      return json({
        verified: true,
        onChainVerified,
        proof: {
          id: proof.id,
          contentHash: proof.content_hash,
          prevHash: proof.prev_hash,
          recordType: proof.record_type,
          txRef: proof.tx_ref,
          chainStatus: proof.chain_status,
          polygonTxHash: proof.polygon_tx_hash,
          createdAt: proof.created_at,
        },
      });
    }

    // ═══════════════════════════════════════════
    //  ACTION: LIST — Get all proofs for a transaction
    // ═══════════════════════════════════════════
    if (action === "list") {
      const { transactionId } = body;
      if (!transactionId) return json({ error: "transactionId required" }, 400);

      const { data: proofs } = await supabase
        .from("blockchain_proofs")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("created_at", { ascending: true });

      return json({
        success: true,
        records: proofs || [],
        count: proofs?.length || 0,
      });
    }

    // ═══════════════════════════════════════════
    //  ACTION: CHAIN_STATUS — Verify hash chain integrity
    // ═══════════════════════════════════════════
    if (action === "chain_status") {
      const { data: allProofs } = await supabase
        .from("blockchain_proofs")
        .select("id, content_hash, prev_hash, created_at")
        .order("created_at", { ascending: true })
        .limit(1000);

      if (!allProofs?.length) {
        return json({ valid: true, totalRecords: 0, message: "No records yet" });
      }

      let chainValid = true;
      let brokenAt: number | null = null;

      for (let i = 1; i < allProofs.length; i++) {
        if (allProofs[i].prev_hash !== allProofs[i - 1].content_hash) {
          chainValid = false;
          brokenAt = i;
          break;
        }
      }

      return json({
        valid: chainValid,
        totalRecords: allProofs.length,
        brokenAt,
        latestHash: allProofs[allProofs.length - 1].content_hash,
        polygonConfigured: !!polygonConfig,
      });
    }

    // ═══════════════════════════════════════════
    //  ACTION: CONFIG_STATUS — Check Polygon readiness
    // ═══════════════════════════════════════════
    if (action === "config_status") {
      return json({
        polygonConfigured: !!polygonConfig,
        contractAddress: polygonConfig?.contractAddress ? `${polygonConfig.contractAddress.slice(0, 6)}...${polygonConfig.contractAddress.slice(-4)}` : null,
        rpcConfigured: !!Deno.env.get("POLYGON_RPC_URL"),
        relayerKeyConfigured: !!Deno.env.get("POLYGON_RELAYER_PRIVATE_KEY"),
        polygonscanConfigured: !!Deno.env.get("POLYGONSCAN_API_KEY"),
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("registry-anchor error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // ═══════════════════════════════════════════
    //  ACTION: ANCHOR — Hash and store a record
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

      // Store in database (off-chain ledger)
      const { data: proof, error: insertErr } = await supabase
        .from("blockchain_proofs")
        .insert({
          content_hash: contentHash,
          prev_hash: prevHash,
          record_type: recordType,
          tx_ref: txRef,
          transaction_id: transactionId,
          event_data: eventData,
          chain_status: "queued",
        })
        .select()
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return json({ error: "Failed to store proof record" }, 500);
      }

      // In production with deployed contract, this would call anchorRecord()
      // For now, records are queued and can be batch-anchored later
      const contractDeployed = !!Deno.env.get("REGISTRY_CONTRACT_ADDRESS");

      return json({
        success: true,
        proofId: proof.id,
        contentHash,
        prevHash,
        txRef,
        recordType,
        chainStatus: contractDeployed ? "pending_tx" : "queued",
        verifyUrl: `https://polygonscan.com/address/${Deno.env.get("REGISTRY_CONTRACT_ADDRESS") || "not_deployed"}`,
      });
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

      return json({
        verified: true,
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
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("registry-anchor error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

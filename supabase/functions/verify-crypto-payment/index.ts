import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ────────────────────────────────────────────
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const AZIX_WALLET = "0x7A3b1234567890abcdef1234567890abcdefF92d"; // Transaction Fee Wallet
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TOKEN_DECIMALS = 6; // Both USDC and USDT on Polygon use 6 decimals

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

// ─── Polygon RPC Call ─────────────────────────────────────
async function polygonRpc(method: string, params: unknown[]) {
  const rpcUrl = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-rpc.com";
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

// ─── Get transaction receipt ──────────────────────────────
async function getTransactionReceipt(txHash: string) {
  return await polygonRpc("eth_getTransactionReceipt", [txHash]);
}

// ─── Parse ERC-20 Transfer logs ───────────────────────────
function parseTransferLogs(
  receipt: Record<string, unknown>,
  expectedRecipient: string
): {
  token: string;
  tokenName: string;
  from: string;
  to: string;
  amount: number;
  rawAmount: bigint;
} | null {
  const logs = (receipt.logs || []) as Array<Record<string, unknown>>;
  const recipientPadded = "0x" + expectedRecipient.slice(2).toLowerCase().padStart(64, "0");

  for (const log of logs) {
    const address = (log.address as string || "").toLowerCase();
    const topics = (log.topics as string[]) || [];

    // Check if this is an ERC-20 Transfer event to our wallet
    if (
      topics[0] === ERC20_TRANSFER_TOPIC &&
      topics[2]?.toLowerCase() === recipientPadded.toLowerCase()
    ) {
      const isUSDC = address === USDC_ADDRESS.toLowerCase();
      const isUSDT = address === USDT_ADDRESS.toLowerCase();
      if (!isUSDC && !isUSDT) continue;

      const rawAmount = BigInt(log.data as string);
      const amount = Number(rawAmount) / Math.pow(10, TOKEN_DECIMALS);
      const from = "0x" + (topics[1] as string).slice(26);

      return {
        token: isUSDC ? USDC_ADDRESS : USDT_ADDRESS,
        tokenName: isUSDC ? "USDC" : "USDT",
        from,
        to: expectedRecipient,
        amount,
        rawAmount,
      };
    }
  }
  return null;
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const {
      txHash,
      expectedAmount,
      senderWallet,
      senderName,
      senderEmail,
      transactionId,
      sessionId,
      linkId,
    } = body;

    if (!txHash || typeof txHash !== "string") {
      return json({ error: "txHash is required" }, 400);
    }

    const supabase = getSupabase();

    // ── Step 1: Check for duplicate TxID ──────────────
    const { data: existing } = await supabase
      .from("crypto_support_queue")
      .select("id, status")
      .eq("tx_id", txHash)
      .limit(1);

    if (existing?.length) {
      return json({
        success: false,
        error: "This transaction ID has already been submitted.",
        existingStatus: existing[0].status,
      }, 409);
    }

    // ── Step 2: Fetch receipt from Polygon ────────────
    let receipt;
    try {
      receipt = await getTransactionReceipt(txHash);
    } catch (rpcErr) {
      console.error("RPC fetch failed:", rpcErr);
      // Route to manual queue
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_rpc_fail",
        status: "open",
        admin_notes: `RPC error: ${rpcErr.message}`,
      });

      return json({
        success: false,
        verification: "pending_manual",
        message: "Unable to verify on-chain. Routed to support for manual review.",
      });
    }

    // ── Step 3: Receipt not found (pending/invalid) ───
    if (!receipt) {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_no_receipt",
        status: "open",
        admin_notes: "Transaction receipt not found — may be pending or invalid.",
      });

      return json({
        success: false,
        verification: "pending_manual",
        message: "Transaction not found on Polygon. It may still be pending. Routed to support.",
      });
    }

    // ── Step 4: Check transaction status ──────────────
    const txStatus = receipt.status;
    if (txStatus !== "0x1") {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_tx_failed",
        status: "open",
        admin_notes: `On-chain transaction status: ${txStatus} (failed/reverted).`,
      });

      return json({
        success: false,
        verification: "failed",
        message: "Transaction failed on-chain. Routed to support for investigation.",
      });
    }

    // ── Step 5: Parse ERC-20 Transfer to Azix wallet ──
    const transfer = parseTransferLogs(receipt, AZIX_WALLET);

    if (!transfer) {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_no_transfer",
        status: "open",
        admin_notes: "No USDC/USDT transfer to Azix wallet found in transaction logs.",
      });

      return json({
        success: false,
        verification: "no_transfer",
        message: "No USDC/USDT transfer to the TrustLock wallet was found in this transaction.",
      });
    }

    // ── Step 6: Verify amount ─────────────────────────
    const verifiedAmount = transfer.amount;
    const required = Number(expectedAmount) || 0;
    const shortfall = required > 0 ? Math.max(0, required - verifiedAmount) : 0;
    const isFullyPaid = shortfall <= 0.01; // Allow 1 cent tolerance

    // ── Step 7: Record verified payment ───────────────
    if (isFullyPaid) {
      // Auto-confirm — update transaction status
      if (transactionId) {
        await supabase
          .from("transactions")
          .update({ status: "locked", updated_at: new Date().toISOString() })
          .eq("id", transactionId);
      }

      // Forward to checkout-widget for session confirmation
      if (sessionId) {
        const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/checkout-widget`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
          },
          body: JSON.stringify({ action: "confirm_payment", sessionId }),
        });
      }

      // Forward to escrow-bridge
      if (transactionId) {
        const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/escrow-bridge`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ action: "lock", transactionId }),
        });
      }

      return json({
        success: true,
        verification: "confirmed",
        transfer: {
          token: transfer.tokenName,
          from: transfer.from,
          to: transfer.to,
          amount: verifiedAmount,
          txHash,
        },
        message: `Payment of ${verifiedAmount} ${transfer.tokenName} verified on Polygon.`,
      });
    } else {
      // Partial payment — record shortfall
      return json({
        success: true,
        verification: "partial",
        transfer: {
          token: transfer.tokenName,
          from: transfer.from,
          to: transfer.to,
          amount: verifiedAmount,
          txHash,
        },
        shortfall: Math.round(shortfall * 100) / 100,
        required,
        message: `Partial payment detected: ${verifiedAmount} ${transfer.tokenName} received, $${shortfall.toFixed(2)} remaining.`,
      });
    }
  } catch (err) {
    console.error("verify-crypto-payment error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

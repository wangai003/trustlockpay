import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Network Configuration ────────────────────────────────
// Mainnet: Polygon PoS (chainId 137) — native bridged USDC + USDT
// Testnet: Polygon Amoy (chainId 80002) — Circle's official Amoy USDC
const NETWORKS = {
  mainnet: {
    name: "polygon",
    chainId: 137,
    rpcEnvVar: "POLYGON_RPC_URL",
    rpcFallback: "https://polygon-rpc.com",
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  },
  amoy: {
    name: "amoy",
    chainId: 80002,
    rpcEnvVar: "POLYGON_AMOY_RPC_URL",
    rpcFallback: "https://rpc-amoy.polygon.technology",
    // Circle's official native USDC on Polygon Amoy testnet
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    // No canonical USDT on Amoy — leave empty
    usdt: "",
  },
} as const;

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const TOKEN_DECIMALS = 6;

function getNetwork(isTestnet: boolean) {
  return isTestnet ? NETWORKS.amoy : NETWORKS.mainnet;
}

function getTransactionWallet(): string {
  const w = Deno.env.get("TRANSACTION_WALLET_ADDRESS");
  if (!w) throw new Error("TRANSACTION_WALLET_ADDRESS secret not configured");
  return w;
}

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
async function polygonRpc(rpcUrl: string, method: string, params: unknown[]) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC error: ${data.error.message}`);
  return data.result;
}

// ─── Parse ERC-20 Transfer logs ───────────────────────────
function parseTransferLogs(
  receipt: Record<string, unknown>,
  expectedRecipient: string,
  net: { usdc: string; usdt: string }
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
  const usdcAddr = net.usdc.toLowerCase();
  const usdtAddr = net.usdt.toLowerCase();

  for (const log of logs) {
    const address = (log.address as string || "").toLowerCase();
    const topics = (log.topics as string[]) || [];

    if (
      topics[0] === ERC20_TRANSFER_TOPIC &&
      topics[2]?.toLowerCase() === recipientPadded.toLowerCase()
    ) {
      const isUSDC = usdcAddr !== "" && address === usdcAddr;
      const isUSDT = usdtAddr !== "" && address === usdtAddr;
      if (!isUSDC && !isUSDT) continue;

      const rawAmount = BigInt(log.data as string);
      const amount = Number(rawAmount) / Math.pow(10, TOKEN_DECIMALS);
      const from = "0x" + (topics[1] as string).slice(26);

      return {
        token: isUSDC ? net.usdc : net.usdt,
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
      isTestnet,
      network: networkParam, // "amoy" | "polygon" — explicit override
    } = body;

    if (!txHash || typeof txHash !== "string") {
      return json({ error: "txHash is required" }, 400);
    }

    // Determine network: explicit param wins, else isTestnet flag, else mainnet
    const useTestnet =
      networkParam === "amoy" ||
      (networkParam !== "polygon" && Boolean(isTestnet));
    const net = getNetwork(useTestnet);
    const rpcUrl = Deno.env.get(net.rpcEnvVar) || net.rpcFallback;
    const transactionWallet = getTransactionWallet();

    console.log(`[verify-crypto-payment] network=${net.name} chainId=${net.chainId} wallet=${transactionWallet}`);

    const supabase = getSupabase();

    // ── Step 1: Duplicate TxID check ──────────────────
    const { data: existing } = await supabase
      .from("crypto_support_queue")
      .select("id, status")
      .eq("tx_id", txHash)
      .limit(1);

    const forceReroute = Boolean((body as any).forceReroute);

    if (existing?.length && !forceReroute) {
      return json({
        success: false,
        error: "This transaction ID has already been submitted.",
        existingStatus: existing[0].status,
      }, 409);
    }

    // Force-reroute path: skip on-chain re-verification, just trigger wallet-routing-bridge.
    if (existing?.length && forceReroute) {
      if (!transactionId) {
        return json({ success: false, error: "transactionId required for forceReroute" }, 400);
      }
      const routingUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/wallet-routing-bridge`;
      const r = await fetch(routingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify({
          action: "route_inbound",
          transactionId,
          processor: "direct",
          paymentMethod: "crypto",
          verifiedAmount: Number(expectedAmount) || undefined,
          network: net.name,
          isTestnet: useTestnet,
        }),
      });
      const text = await r.text();
      let parsed: unknown = text; try { parsed = JSON.parse(text); } catch {}
      return json({ success: r.ok, forceReroute: true, status: r.status, response: parsed }, r.ok ? 200 : 502);
    }


    // ── Step 2: Fetch receipt ─────────────────────────
    let receipt;
    try {
      receipt = await polygonRpc(rpcUrl, "eth_getTransactionReceipt", [txHash]);
    } catch (rpcErr) {
      console.error("RPC fetch failed:", rpcErr);
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_rpc_fail",
        status: "open",
        admin_notes: `[${net.name}] RPC error: ${rpcErr.message}`,
      });
      return json({
        success: false,
        verification: "pending_manual",
        network: net.name,
        message: "Unable to verify on-chain. Routed to support for manual review.",
      });
    }

    // ── Step 3: Receipt missing ───────────────────────
    if (!receipt) {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_no_receipt",
        status: "open",
        admin_notes: `[${net.name}] Receipt not found — pending or invalid.`,
      });
      return json({
        success: false,
        verification: "pending_manual",
        network: net.name,
        message: `Transaction not found on ${net.name}. It may still be pending. Routed to support.`,
      });
    }

    // ── Step 4: Tx status ─────────────────────────────
    if (receipt.status !== "0x1") {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_tx_failed",
        status: "open",
        admin_notes: `[${net.name}] On-chain status: ${receipt.status} (failed/reverted).`,
      });
      return json({
        success: false,
        verification: "failed",
        network: net.name,
        message: "Transaction failed on-chain. Routed to support for investigation.",
      });
    }

    // ── Step 5: Parse Transfer ────────────────────────
    const transfer = parseTransferLogs(receipt, transactionWallet, net);

    if (!transfer) {
      await supabase.from("crypto_support_queue").insert({
        sender_name: senderName || "Unknown",
        sender_email: senderEmail || "unknown@unknown.com",
        sender_wallet: senderWallet || null,
        tx_id: txHash,
        amount_sent: expectedAmount || null,
        source: "auto_verify_no_transfer",
        status: "open",
        admin_notes: `[${net.name}] No USDC/USDT transfer to ${transactionWallet} found.`,
      });
      return json({
        success: false,
        verification: "no_transfer",
        network: net.name,
        message: `No USDC/USDT transfer to the TrustLock wallet was found on ${net.name}.`,
      });
    }

    // ── Step 6: Verify amount ─────────────────────────
    const verifiedAmount = transfer.amount;
    const required = Number(expectedAmount) || 0;
    const shortfall = required > 0 ? Math.max(0, required - verifiedAmount) : 0;
    const isFullyPaid = shortfall <= 0.01;

    if (isFullyPaid) {
      if (transactionId) {
        const routingUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/wallet-routing-bridge`;
        await fetch(routingUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            action: "route_inbound",
            transactionId,
            processor: "direct",
            paymentMethod: "crypto",
            verifiedAmount,
            network: net.name,
            isTestnet: useTestnet,
          }),
        });
      }

      if (sessionId) {
        const url = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/checkout-widget`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}`,
          },
          body: JSON.stringify({ action: "confirm_payment", sessionId, network: net.name }),
        });
      }

      return json({
        success: true,
        verification: "confirmed",
        network: net.name,
        chainId: net.chainId,
        transfer: {
          token: transfer.tokenName,
          tokenAddress: transfer.token,
          from: transfer.from,
          to: transfer.to,
          amount: verifiedAmount,
          txHash,
        },
        message: `Payment of ${verifiedAmount} ${transfer.tokenName} verified on ${net.name}.`,
      });
    }

    return json({
      success: true,
      verification: "partial",
      network: net.name,
      transfer: {
        token: transfer.tokenName,
        tokenAddress: transfer.token,
        from: transfer.from,
        to: transfer.to,
        amount: verifiedAmount,
        txHash,
      },
      shortfall: Math.round(shortfall * 100) / 100,
      required,
      message: `Partial payment: ${verifiedAmount} ${transfer.tokenName} received, $${shortfall.toFixed(2)} remaining.`,
    });
  } catch (err) {
    console.error("verify-crypto-payment error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

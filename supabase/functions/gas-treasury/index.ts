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

// ═══════════════════════════════════════════════════════════
//  GAS TREASURY — Monitor wallet, batch-anchor, and report
// ═══════════════════════════════════════════════════════════

async function getWalletBalance(rpcUrl: string, walletAddress: string): Promise<{
  balanceWei: string;
  balanceMatic: number;
}> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [walletAddress, "latest"],
      }),
    });
    const data = await res.json();
    const balanceWei = data.result || "0x0";
    const balanceMatic = parseInt(balanceWei, 16) / 1e18;
    return { balanceWei, balanceMatic };
  } catch (err) {
    console.error("[gas-treasury] Balance check failed:", err);
    return { balanceWei: "0x0", balanceMatic: 0 };
  }
}

async function getGasPrice(rpcUrl: string): Promise<{
  gasPriceGwei: number;
  gasPriceWei: string;
}> {
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
    });
    const data = await res.json();
    const gasPriceWei = data.result || "0x0";
    const gasPriceGwei = parseInt(gasPriceWei, 16) / 1e9;
    return { gasPriceGwei, gasPriceWei };
  } catch {
    return { gasPriceGwei: 30, gasPriceWei: "0x6fc23ac00" };
  }
}

// Estimate cost for N anchoring transactions
function estimateAnchoringCost(numRecords: number, gasPriceGwei: number): {
  perRecordMatic: number;
  perRecordUsd: number;
  totalMatic: number;
  totalUsd: number;
} {
  const gasPerRecord = 75000; // average for anchorRecord()
  const gasPerBatch = 45000; // average per record in anchorBatch()
  const maticPriceUsd = 0.40; // conservative estimate

  const isBatch = numRecords > 5;
  const gasUsed = isBatch ? gasPerBatch : gasPerRecord;
  const perRecordMatic = (gasUsed * gasPriceGwei) / 1e9;
  const perRecordUsd = perRecordMatic * maticPriceUsd;

  return {
    perRecordMatic,
    perRecordUsd,
    totalMatic: perRecordMatic * numRecords,
    totalUsd: perRecordUsd * numRecords,
  };
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
    if (!action) return json({ error: "action required" }, 400);

    const supabase = getSupabase();
    const rpcUrl = Deno.env.get("POLYGON_RPC_URL");
    const contractAddress = Deno.env.get("REGISTRY_CONTRACT_ADDRESS");
    const walletKey = Deno.env.get("POLYGON_WALLET_PRIVATE_KEY");
    const polygonConfigured = !!(rpcUrl && contractAddress && walletKey);

    // ═══════════════════════════════════════════
    //  ACTION: STATUS — Full treasury dashboard data
    // ═══════════════════════════════════════════
    if (action === "status") {
      // Queue stats from DB
      const { count: queuedCount } = await supabase
        .from("blockchain_proofs")
        .select("*", { count: "exact", head: true })
        .eq("chain_status", "queued");

      const { count: anchoredCount } = await supabase
        .from("blockchain_proofs")
        .select("*", { count: "exact", head: true })
        .eq("chain_status", "anchored");

      const { count: failedCount } = await supabase
        .from("blockchain_proofs")
        .select("*", { count: "exact", head: true })
        .eq("chain_status", "failed");

      const { count: totalCount } = await supabase
        .from("blockchain_proofs")
        .select("*", { count: "exact", head: true });

      // Wallet balance (if configured)
      let wallet = {
        configured: polygonConfigured,
        address: null as string | null,
        balanceMatic: 0,
        balanceUsd: 0,
        lowBalance: false,
        gasPriceGwei: 30,
      };

      if (rpcUrl && walletKey) {
        // Derive address (stub — in production use ethers)
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(walletKey));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const address = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);

        const balance = await getWalletBalance(rpcUrl, address);
        const gasPrice = await getGasPrice(rpcUrl);
        const maticPriceUsd = 0.40;

        wallet = {
          configured: true,
          address: `${address.slice(0, 6)}...${address.slice(-4)}`,
          balanceMatic: Math.round(balance.balanceMatic * 10000) / 10000,
          balanceUsd: Math.round(balance.balanceMatic * maticPriceUsd * 100) / 100,
          lowBalance: balance.balanceMatic < 10,
          gasPriceGwei: Math.round(gasPrice.gasPriceGwei * 10) / 10,
        };
      }

      // Cost projections
      const gasPrice = wallet.gasPriceGwei;
      const costProjections = {
        next50: estimateAnchoringCost(50, gasPrice),
        next500: estimateAnchoringCost(500, gasPrice),
        next5000: estimateAnchoringCost(5000, gasPrice),
      };

      // Revenue vs cost analysis
      // Assume average order = $500, TrustLock fee = 1.5%
      const avgOrderValue = 500;
      const feeRate = 0.015;
      const revenuePerOrder = avgOrderValue * feeRate;
      const anchorCostPerOrder = estimateAnchoringCost(5, gasPrice).totalUsd; // ~5 proofs per order
      const anchorCostPercentOfRevenue = (anchorCostPerOrder / revenuePerOrder) * 100;

      return json({
        queue: {
          queued: queuedCount || 0,
          anchored: anchoredCount || 0,
          failed: failedCount || 0,
          total: totalCount || 0,
        },
        wallet,
        costProjections,
        sustainability: {
          revenuePerOrder: Math.round(revenuePerOrder * 100) / 100,
          anchorCostPerOrder: Math.round(anchorCostPerOrder * 10000) / 10000,
          costAsPercentOfRevenue: Math.round(anchorCostPercentOfRevenue * 1000) / 1000,
          proofsPerOrder: 5,
          maticPriceUsd: 0.40,
        },
        config: {
          contractAddress: contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : null,
          rpcConfigured: !!rpcUrl,
          walletConfigured: !!walletKey,
          thirdwebConfigured: !!Deno.env.get("THIRDWEB_API_KEY"),
        },
      });
    }

    // ═══════════════════════════════════════════
    //  ACTION: PROCESS_QUEUE — Batch anchor queued records
    // ═══════════════════════════════════════════
    if (action === "process_queue") {
      if (!polygonConfigured) {
        return json({
          success: false,
          error: "Polygon not configured. Add REGISTRY_CONTRACT_ADDRESS, POLYGON_WALLET_PRIVATE_KEY, and POLYGON_RPC_URL secrets.",
          secretsNeeded: ["REGISTRY_CONTRACT_ADDRESS", "POLYGON_WALLET_PRIVATE_KEY", "POLYGON_RPC_URL"],
        });
      }

      // Delegate to registry-anchor's anchor_batch
      const registryUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/registry-anchor`;
      const res = await fetch(registryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ action: "anchor_batch", limit: body.limit || 50 }),
      });
      const result = await res.json();
      return json(result);
    }

    // ═══════════════════════════════════════════
    //  ACTION: ESTIMATE — Cost estimate for N orders
    // ═══════════════════════════════════════════
    if (action === "estimate") {
      const numOrders = body.numOrders || 100;
      const proofsPerOrder = body.proofsPerOrder || 5;
      const totalRecords = numOrders * proofsPerOrder;

      let gasPriceGwei = 30;
      if (rpcUrl) {
        const gp = await getGasPrice(rpcUrl);
        gasPriceGwei = gp.gasPriceGwei;
      }

      const estimate = estimateAnchoringCost(totalRecords, gasPriceGwei);
      const avgOrderValue = body.avgOrderValue || 500;
      const revenue = numOrders * avgOrderValue * 0.015;

      return json({
        numOrders,
        proofsPerOrder,
        totalRecords,
        gasPriceGwei: Math.round(gasPriceGwei * 10) / 10,
        estimate,
        revenue: Math.round(revenue * 100) / 100,
        costAsPercentOfRevenue: Math.round((estimate.totalUsd / revenue) * 10000) / 100,
        maticNeeded: Math.round(estimate.totalMatic * 100) / 100,
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: any) {
    console.error("[gas-treasury] Error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

// Returns live MATIC + USDC + USDT balances for all system custodian wallets.
// Safe to expose addresses + balances (public on-chain data).
import { ethers } from "https://esm.sh/ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

function addressFromKey(pk?: string): string {
  if (!pk) return "";
  try {
    const k = pk.startsWith("0x") ? pk : `0x${pk}`;
    return new ethers.Wallet(k).address;
  } catch {
    return "";
  }
}

async function getBalances(provider: ethers.JsonRpcProvider, address: string) {
  if (!address) return { matic: 0, usdc: 0, usdt: 0 };
  try {
    const usdc = new ethers.Contract(USDC, ERC20_ABI, provider);
    const usdt = new ethers.Contract(USDT, ERC20_ABI, provider);
    const [maticRaw, usdcRaw, usdtRaw] = await Promise.all([
      provider.getBalance(address),
      usdc.balanceOf(address).catch(() => 0n),
      usdt.balanceOf(address).catch(() => 0n),
    ]);
    return {
      matic: Number(ethers.formatEther(maticRaw)),
      usdc: Number(ethers.formatUnits(usdcRaw, 6)),
      usdt: Number(ethers.formatUnits(usdtRaw, 6)),
    };
  } catch (e) {
    return { matic: 0, usdc: 0, usdt: 0, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rpcUrl = Deno.env.get("POLYGON_RPC_URL") || "https://polygon-rpc.com";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const wallets = [
      {
        key: "transaction",
        label: "Transaction Fee Wallet",
        purpose: "Receives checkout funds + 0.5% platform fee, routes principal to escrow",
        address: Deno.env.get("TRANSACTION_WALLET_ADDRESS") || addressFromKey(Deno.env.get("TRANSACTION_WALLET_PRIVATE_KEY")),
      },
      {
        key: "escrow",
        label: "Escrow Wallet",
        purpose: "Holds vendor principal until release; 1% escrow fee extracted at settlement",
        address: Deno.env.get("ESCROW_WALLET_ADDRESS") || "",
      },
      {
        key: "relayer",
        label: "Relayer Wallet (Gas)",
        purpose: "Pays all on-chain MATIC gas for ERC-2771 meta-transactions",
        address: addressFromKey(Deno.env.get("POLYGON_RELAYER_PRIVATE_KEY")),
      },
      {
        key: "deployer",
        label: "Deployer Wallet",
        purpose: "Deploys and upgrades TrustLock smart contracts",
        address: addressFromKey(Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY")),
      },
    ];

    const enriched = await Promise.all(
      wallets.map(async (w) => ({
        ...w,
        configured: Boolean(w.address),
        balances: await getBalances(provider, w.address),
      })),
    );

    // MATIC price (best-effort) for USD context on relayer/deployer
    let maticUsd = 0;
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd");
      const j = await r.json();
      maticUsd = j["matic-network"]?.usd || 0;
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({
        network: "polygon",
        chainId: 137,
        maticUsd,
        wallets: enriched,
        fetchedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

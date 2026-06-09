// Deploy pre-compiled TrustLock contracts to Polygon Amoy or Mainnet.
// Compilation happens client-side; this function only signs & broadcasts.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { ethers } from "npm:ethers@6.13.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NETWORKS = {
  amoy: { rpcEnv: "POLYGON_AMOY_RPC_URL", chainId: 80002, explorer: "https://amoy.polygonscan.com", name: "Polygon Amoy Testnet" },
  polygon: { rpcEnv: "POLYGON_RPC_URL", chainId: 137, explorer: "https://polygonscan.com", name: "Polygon Mainnet" },
};

interface Artifact { abi: any[]; bytecode: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const network: "amoy" | "polygon" = body.network === "polygon" ? "polygon" : "amoy";
    const adminId: string | undefined = body.admin_id;
    const artifacts: { forwarder?: Artifact; registry?: Artifact; escrow?: Artifact } = body.artifacts || {};

    const cfg = NETWORKS[network];
    const rpcUrl = Deno.env.get(cfg.rpcEnv);
    const deployerKey = Deno.env.get("DEPLOYER_WALLET_PRIVATE_KEY");
    const escrowWallet = Deno.env.get("ESCROW_WALLET_ADDRESS");
    const transactionWallet = Deno.env.get("TRANSACTION_WALLET_ADDRESS");
    const relayerKey = Deno.env.get("POLYGON_RELAYER_PRIVATE_KEY");

    if (!rpcUrl) throw new Error(`${cfg.rpcEnv} not configured`);
    if (!deployerKey) throw new Error("DEPLOYER_WALLET_PRIVATE_KEY not configured");
    if (!escrowWallet) throw new Error("ESCROW_WALLET_ADDRESS not configured");
    if (!transactionWallet) throw new Error("TRANSACTION_WALLET_ADDRESS not configured");
    if (!relayerKey) throw new Error("POLYGON_RELAYER_PRIVATE_KEY not configured");
    if (!artifacts.forwarder?.bytecode || !artifacts.registry?.bytecode || !artifacts.escrow?.bytecode) {
      throw new Error("Missing pre-compiled artifacts (forwarder, registry, escrow)");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(deployerKey, provider);
    const relayerAddr = new ethers.Wallet(relayerKey).address;

    const balance = await provider.getBalance(deployer.address);
    const minWei = ethers.parseEther(network === "polygon" ? "3" : "0.5");
    if (balance < minWei) {
      throw new Error(
        `Deployer ${deployer.address} balance too low: ${ethers.formatEther(balance)}. Need ≥ ${ethers.formatEther(minWei)}.`
      );
    }

    const deployments: any[] = [];

    async function deploy(name: string, art: Artifact, args: any[]) {
      const factory = new ethers.ContractFactory(art.abi, art.bytecode, deployer);
      const inst = await factory.deploy(...args);
      const tx = inst.deploymentTransaction()!;
      const receipt = await tx.wait();
      const addr = await inst.getAddress();
      const record = {
        network,
        contract_name: name,
        contract_address: addr,
        tx_hash: tx.hash,
        block_number: receipt!.blockNumber,
        deployer_address: deployer.address,
        gas_used: receipt!.gasUsed.toString(),
        constructor_args: args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
        status: "deployed",
        verification_status: "pending",
        initiated_by_admin_id: adminId ?? null,
        metadata: { abi: art.abi, explorer: `${cfg.explorer}/address/${addr}` },
      };
      await supabase.from("deployment_history").insert(record);
      deployments.push(record);
      return addr;
    }

    const forwarderAddr = await deploy("TrustLockForwarder", artifacts.forwarder, []);
    const registryAddr = await deploy("TrustLockRegistry", artifacts.registry, [relayerAddr]);
    const escrowAddr = await deploy("TrustLockEscrow", artifacts.escrow, [
      transactionWallet, escrowWallet, forwarderAddr,
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        network: cfg.name,
        chainId: cfg.chainId,
        deployer: deployer.address,
        relayer: relayerAddr,
        contracts: { forwarder: forwarderAddr, registry: registryAddr, escrow: escrowAddr },
        explorer: cfg.explorer,
        deployments,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Deploy error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

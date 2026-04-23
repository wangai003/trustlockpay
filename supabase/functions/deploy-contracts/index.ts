// Deploy TrustLock smart contracts to Polygon Amoy or Mainnet
// Order: MinimalForwarder → TrustLockRegistry → TrustLockEscrow
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { ethers } from "https://esm.sh/ethers@6.13.4";
import solc from "https://esm.sh/solc@0.8.24";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NETWORKS = {
  amoy: {
    rpcEnv: "POLYGON_AMOY_RPC_URL",
    chainId: 80002,
    explorer: "https://amoy.polygonscan.com",
    name: "Polygon Amoy Testnet",
  },
  polygon: {
    rpcEnv: "POLYGON_RPC_URL",
    chainId: 137,
    explorer: "https://polygonscan.com",
    name: "Polygon Mainnet",
  },
};

// Embedded contract sources (kept in sync with /contracts)
async function readContract(name: string): Promise<string> {
  // Sources are fetched at build/deploy time from the project files via raw GitHub or inline.
  // For edge runtime we inline the source. We'll fetch from the repo via Lovable's file read API.
  // Simpler approach: read from a public URL we control. For now, embed pointers.
  throw new Error(`Source for ${name} must be embedded`);
}

// Minimal in-function sources are too large; instead we compile using imports resolved
// from npm @openzeppelin/contracts. We'll inline the 3 contract sources below.
const FORWARDER_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
contract TrustLockForwarder is ERC2771Forwarder {
  constructor() ERC2771Forwarder("TrustLockForwarder") {}
}
`;

async function loadOZSource(path: string): Promise<string> {
  const url = `https://cdn.jsdelivr.net/npm/@openzeppelin/contracts@5.0.2/${path}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to fetch ${path}: ${r.status}`);
  return await r.text();
}

async function fetchProjectContract(filename: string): Promise<string> {
  // Read from the deployed project's public mirror. We host the .sol files
  // by reading them through a helper: we use raw GitHub if configured, else
  // require them to be passed in the request body.
  const url = `${SUPABASE_URL}/storage/v1/object/public/contracts/${filename}`;
  const r = await fetch(url);
  if (r.ok) return await r.text();
  throw new Error(`Cannot load ${filename} — upload contracts to Storage bucket 'contracts' first`);
}

async function compileAll(sources: Record<string, string>) {
  // Pre-fetch ALL transitive @openzeppelin imports recursively
  const imports: Record<string, string> = {};

  async function fetchAndScan(ozPath: string) {
    if (imports[`@openzeppelin/contracts/${ozPath}`]) return;
    const contents = await loadOZSource(ozPath);
    imports[`@openzeppelin/contracts/${ozPath}`] = contents;

    // Find imports inside this file and resolve them relative to ozPath
    const re = /import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g;
    const dir = ozPath.includes("/") ? ozPath.substring(0, ozPath.lastIndexOf("/")) : "";
    let m;
    const promises: Promise<void>[] = [];
    while ((m = re.exec(contents)) !== null) {
      const imp = m[1];
      let resolved: string | null = null;
      if (imp.startsWith("@openzeppelin/contracts/")) {
        resolved = imp.replace("@openzeppelin/contracts/", "");
      } else if (imp.startsWith("./") || imp.startsWith("../")) {
        // Resolve relative path against current dir
        const parts = (dir ? dir.split("/") : []);
        for (const seg of imp.split("/")) {
          if (seg === "." || seg === "") continue;
          if (seg === "..") parts.pop();
          else parts.push(seg);
        }
        resolved = parts.join("/");
      }
      if (resolved) promises.push(fetchAndScan(resolved));
    }
    await Promise.all(promises);
  }

  // Scan top-level user sources for @openzeppelin imports
  for (const src of Object.values(sources)) {
    const re = /import\s+(?:\{[^}]*\}\s+from\s+)?["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      if (m[1].startsWith("@openzeppelin/contracts/")) {
        await fetchAndScan(m[1].replace("@openzeppelin/contracts/", ""));
      }
    }
  }

  const findImports = (path: string) => {
    if (imports[path]) return { contents: imports[path] };
    return { error: "File not found: " + path };
  };

  const input = {
    language: "Solidity",
    sources: Object.fromEntries(
      Object.entries(sources).map(([n, c]) => [n, { content: c }])
    ),
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      evmVersion: "paris",
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports })
  );

  if (output.errors) {
    const fatal = output.errors.filter((e: any) => e.severity === "error");
    if (fatal.length > 0) {
      throw new Error("Compilation failed:\n" + fatal.map((e: any) => e.formattedMessage).join("\n"));
    }
  }
  return output.contracts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const network: "amoy" | "polygon" = body.network === "polygon" ? "polygon" : "amoy";
    const adminId: string | undefined = body.admin_id;
    const sources: Record<string, string> | undefined = body.sources;

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
    if (!sources || !sources["TrustLockEscrow.sol"] || !sources["TrustLockRegistry.sol"]) {
      throw new Error("Contract sources missing — pass them in request body");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer = new ethers.Wallet(deployerKey, provider);
    const relayerAddr = new ethers.Wallet(relayerKey).address;

    // Pre-flight: balance check
    const balance = await provider.getBalance(deployer.address);
    const minWei = ethers.parseEther(network === "polygon" ? "3" : "0.5");
    if (balance < minWei) {
      throw new Error(
        `Deployer ${deployer.address} balance too low: ${ethers.formatEther(balance)} ${network === "polygon" ? "MATIC" : "POL"}. Need at least ${ethers.formatEther(minWei)}.`
      );
    }

    // Compile
    sources["MinimalForwarder.sol"] = FORWARDER_SOURCE;
    const compiled = await compileAll(sources);

    const deployments: any[] = [];

    async function deploy(file: string, contract: string, args: any[]) {
      const c = compiled[file]?.[contract];
      if (!c) throw new Error(`Compiled artifact missing for ${contract}`);
      const factory = new ethers.ContractFactory(c.abi, c.evm.bytecode.object, deployer);
      const inst = await factory.deploy(...args);
      const tx = inst.deploymentTransaction()!;
      const receipt = await tx.wait();
      const addr = await inst.getAddress();
      const record = {
        network,
        contract_name: contract,
        contract_address: addr,
        tx_hash: tx.hash,
        block_number: receipt!.blockNumber,
        deployer_address: deployer.address,
        gas_used: receipt!.gasUsed.toString(),
        constructor_args: args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
        status: "deployed",
        verification_status: "pending",
        initiated_by_admin_id: adminId ?? null,
        metadata: { abi: c.abi, explorer: `${cfg.explorer}/address/${addr}` },
      };
      await supabase.from("deployment_history").insert(record);
      deployments.push(record);
      return addr;
    }

    // 1. Forwarder
    const forwarderAddr = await deploy("MinimalForwarder.sol", "TrustLockForwarder", []);
    // 2. Registry (operator = relayer)
    const registryAddr = await deploy("TrustLockRegistry.sol", "TrustLockRegistry", [relayerAddr]);
    // 3. Escrow (transactionWallet, escrowWallet, forwarder)
    const escrowAddr = await deploy("TrustLockEscrow.sol", "TrustLockEscrow", [
      transactionWallet,
      escrowWallet,
      forwarderAddr,
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        network: cfg.name,
        chainId: cfg.chainId,
        deployer: deployer.address,
        relayer: relayerAddr,
        contracts: {
          forwarder: forwarderAddr,
          registry: registryAddr,
          escrow: escrowAddr,
        },
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

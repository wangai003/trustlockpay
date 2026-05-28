/**
 * Reown AppKit + wagmi configuration for self-custody wallet connections.
 *
 * Supports: MetaMask, Coinbase Wallet, Trust Wallet, Rainbow, Rabby, Ledger,
 * and 400+ wallets via WalletConnect QR.
 *
 * Networks: Polygon mainnet (137) + Polygon Amoy testnet (80002)
 */
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { polygon, polygonAmoy } from "@reown/appkit/networks";

// PUBLIC publishable ID — safe to expose. Get yours free at https://cloud.reown.com
// Replace this placeholder once you create a Reown project (takes ~30 seconds).
export const REOWN_PROJECT_ID =
  (import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined) ||
  "REPLACE_WITH_REOWN_PROJECT_ID";

const networks = [polygon, polygonAmoy] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId: REOWN_PROJECT_ID,
  ssr: false,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Initialize AppKit modal (idempotent — safe to import many times)
let initialized = false;
export function initAppKit() {
  if (initialized) return;
  initialized = true;
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [...networks],
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: "TrustLock Pay",
      description: "TrustLock OS Pay — Polygon-anchored escrow",
      url: typeof window !== "undefined" ? window.location.origin : "https://trustlockpay.com",
      icons: ["https://trustlockpay.com/favicon.ico"],
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeMode: "dark",
  });
}

// USDC contract addresses (6 decimals)
export const USDC_ADDRESSES = {
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const,
  amoy: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582" as const,
};

// USDT contract addresses (6 decimals)
export const USDT_ADDRESSES = {
  polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" as const,
  amoy: "" as const, // No canonical USDT on Amoy
};

// Minimal ERC-20 ABI for balanceOf + transfer
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;

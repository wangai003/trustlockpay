/**
 * Polygon blockchain explorer URL helpers.
 * Auto-branches between mainnet (polygonscan) and Amoy testnet (amoy.polygonscan).
 *
 * `network` accepts: "polygon" | "amoy" | "mainnet" | "testnet" | undefined
 * Defaults to mainnet if unknown/undefined.
 */
export type PolygonNetwork = "polygon" | "amoy" | "mainnet" | "testnet" | string | null | undefined;

export function isTestnetNetwork(network: PolygonNetwork): boolean {
  if (!network) return false;
  const n = String(network).toLowerCase();
  return n === "amoy" || n === "testnet" || n === "polygon-amoy" || n === "80002";
}

export function explorerBase(network: PolygonNetwork): string {
  return isTestnetNetwork(network)
    ? "https://amoy.polygonscan.com"
    : "https://polygonscan.com";
}

export function explorerTxUrl(txHash: string, network: PolygonNetwork): string {
  return `${explorerBase(network)}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string, network: PolygonNetwork): string {
  return `${explorerBase(network)}/address/${address}`;
}

export function explorerBlockUrl(blockNumber: number | string, network: PolygonNetwork): string {
  return `${explorerBase(network)}/block/${blockNumber}`;
}

export function explorerName(network: PolygonNetwork): string {
  return isTestnetNetwork(network) ? "Amoy PolygonScan" : "PolygonScan";
}

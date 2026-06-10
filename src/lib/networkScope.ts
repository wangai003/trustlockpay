// Network scope (testnet | mainnet) is stamped at login and read everywhere else.
// In-app switching is disabled — to change scope, sign out and re-authenticate on
// the appropriate route. Mainnet is the fail-safe default.

import { supabase } from "@/integrations/supabase/client";

export type NetworkScope = "testnet" | "mainnet";
export type Portal = "admin" | "vendor" | "buyer" | "lender";

const PORTAL_NETWORK_KEY: Record<Portal, string> = {
  admin: "tl_admin_network",
  vendor: "tl_vendor_network",
  buyer: "tl_buyer_network",
  lender: "tl_lender_network",
};

/** Persist the login-stamped network scope locally and on the server. */
export async function stampNetworkScope(
  portal: Portal,
  scope: NetworkScope,
  opts: { authed?: boolean } = {}
): Promise<void> {
  try {
    localStorage.setItem("tl_network", scope);
    localStorage.setItem("tl_network_scope", scope);
    localStorage.setItem(PORTAL_NETWORK_KEY[portal], scope);
  } catch {
    // ignore storage errors (private mode etc.)
  }

  // Only attempt server stamping when the caller is in a real Supabase session
  // (testnet shell-only logins never have one). Mainnet logins always do.
  if (opts.authed === false) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    await supabase.functions.invoke("stamp-network-scope", {
      body: { portal, network_scope: scope },
    });
  } catch {
    // best-effort — never block login on stamping failure
  }
}

/** Clear local scope keys and revoke the server stamp. */
export async function clearNetworkScope(portal: Portal): Promise<void> {
  try {
    localStorage.removeItem("tl_network");
    localStorage.removeItem("tl_network_scope");
    localStorage.removeItem(PORTAL_NETWORK_KEY[portal]);
  } catch {
    // ignore
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    await supabase.functions.invoke("stamp-network-scope", {
      body: { revoke: true },
    });
  } catch {
    // best-effort
  }
}

export function readNetworkScope(): NetworkScope {
  const v = (typeof window !== "undefined" && localStorage.getItem("tl_network_scope")) || "mainnet";
  return v === "testnet" ? "testnet" : "mainnet";
}

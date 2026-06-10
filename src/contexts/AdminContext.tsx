import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";

interface AdminContextType {
  networkMode: NetworkMode;
  isTestnet: boolean;
}

/**
 * Network mode is STAMPED AT LOGIN ONLY (via `tl_network` key written by
 * AdminLogin). It is intentionally read-only inside the authenticated shell —
 * an admin cannot flip from Testnet to Mainnet (or vice versa) without
 * logging out and re-authenticating on the correct surface. This eliminates
 * the "muscle-memory" cross-network mistake.
 *
 * Legacy `tl_admin_network` key is migrated once and then ignored.
 */
const readNetworkFromLogin = (): NetworkMode => {
  if (typeof window === "undefined") return "testnet";
  const stamped = localStorage.getItem("tl_network");
  if (stamped === "mainnet" || stamped === "testnet") return stamped;
  // Legacy migration — preserve previous selection on first load only.
  const legacy = localStorage.getItem("tl_admin_network");
  if (legacy === "mainnet" || legacy === "testnet") {
    localStorage.setItem("tl_network", legacy);
    localStorage.removeItem("tl_admin_network");
    return legacy;
  }
  return "testnet";
};

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>(readNetworkFromLogin);

  // Re-sync when the login stamp changes in another tab (cross-tab safety).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tl_network" && (e.newValue === "mainnet" || e.newValue === "testnet")) {
        setNetworkMode(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AdminContext.Provider value={{ networkMode, isTestnet: networkMode === "testnet" }}>
      {children}
    </AdminContext.Provider>
  );
};

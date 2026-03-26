import { createContext, useContext, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";

interface AdminContextType {
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  isTestnet: boolean;
}

const getInitialAdminMode = (): NetworkMode => {
  if (typeof window === "undefined") return "testnet";
  return localStorage.getItem("tl_admin_network") === "mainnet" ? "mainnet" : "testnet";
};

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkModeState] = useState<NetworkMode>(getInitialAdminMode);

  const setNetworkMode = (mode: NetworkMode) => {
    setNetworkModeState(mode);
    localStorage.setItem("tl_admin_network", mode);
  };

  return (
    <AdminContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet" }}>
      {children}
    </AdminContext.Provider>
  );
};

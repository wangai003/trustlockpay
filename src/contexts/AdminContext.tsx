import { createContext, useContext, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";

interface AdminContextType {
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  isTestnet: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("testnet");

  return (
    <AdminContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet" }}>
      {children}
    </AdminContext.Provider>
  );
};

import { createContext, useContext, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";

interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  location: string;
}

interface BuyerContextType {
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  isTestnet: boolean;
  buyer: BuyerProfile;
}

const defaultTestnetBuyer: BuyerProfile = {
  id: "BYR-2026-0102",
  name: "James O.",
  email: "james@trustlocktest.com",
  location: "Chicago, USA",
};

const getInitialBuyerMode = (): NetworkMode => {
  if (typeof window === "undefined") return "testnet";
  return localStorage.getItem("tl_buyer_network") === "mainnet" ? "mainnet" : "testnet";
};

const BuyerContext = createContext<BuyerContextType | null>(null);

export const useBuyer = () => {
  const ctx = useContext(BuyerContext);
  if (!ctx) throw new Error("useBuyer must be used within BuyerProvider");
  return ctx;
};

export const BuyerProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkModeState] = useState<NetworkMode>(getInitialBuyerMode);

  const setNetworkMode = (mode: NetworkMode) => {
    setNetworkModeState(mode);
    localStorage.setItem("tl_buyer_network", mode);
  };

  return (
    <BuyerContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet", buyer: defaultTestnetBuyer }}>
      {children}
    </BuyerContext.Provider>
  );
};

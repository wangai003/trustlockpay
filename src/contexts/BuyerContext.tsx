import { createContext, useContext, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";

interface BuyerProfile {
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
  name: "James O.",
  email: "james@trustlocktest.com",
  location: "Chicago, USA",
};

const BuyerContext = createContext<BuyerContextType | null>(null);

export const useBuyer = () => {
  const ctx = useContext(BuyerContext);
  if (!ctx) throw new Error("useBuyer must be used within BuyerProvider");
  return ctx;
};

export const BuyerProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("testnet");

  return (
    <BuyerContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet", buyer: defaultTestnetBuyer }}>
      {children}
    </BuyerContext.Provider>
  );
};

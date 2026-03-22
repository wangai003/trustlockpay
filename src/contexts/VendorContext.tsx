import { createContext, useContext, useState, ReactNode } from "react";

type NetworkMode = "testnet" | "mainnet";
type VendorType = "product" | "service" | null;

interface VendorProfile {
  id: string;
  name: string;
  email: string;
  type: VendorType;
  categories: string[];
  subTypes: string[];
  location: string;
  sites: { id: string; name: string; platform: string; url: string }[];
  kycTier: number;
  onboardingComplete: boolean;
}

interface VendorContextType {
  networkMode: NetworkMode;
  setNetworkMode: (mode: NetworkMode) => void;
  isTestnet: boolean;
  vendor: VendorProfile;
  setVendor: (v: VendorProfile) => void;
}

const defaultTestnetVendor: VendorProfile = {
  name: "Kente Craft Ltd",
  email: "vendor@kentetest.com",
  type: "product",
  categories: [],
  subTypes: [],
  location: "Accra, Ghana",
  sites: [
    { id: "site-1", name: "Main Store", platform: "Shopify", url: "kentestore.myshopify.com" },
    { id: "site-2", name: "WooCommerce Shop", platform: "WooCommerce", url: "shop.kentecraft.com" },
  ],
  kycTier: 2,
  onboardingComplete: true,
};

const VendorContext = createContext<VendorContextType | null>(null);

export const useVendor = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendor must be used within VendorProvider");
  return ctx;
};

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("testnet");
  const [vendor, setVendor] = useState<VendorProfile>(defaultTestnetVendor);

  return (
    <VendorContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet", vendor, setVendor }}>
      {children}
    </VendorContext.Provider>
  );
};

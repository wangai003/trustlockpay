import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
  id: "VND-2026-0041",
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

const getInitialVendorMode = (): NetworkMode => {
  if (typeof window === "undefined") return "testnet";
  return localStorage.getItem("tl_vendor_network") === "mainnet" ? "mainnet" : "testnet";
};

const VendorContext = createContext<VendorContextType | null>(null);

export const useVendor = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error("useVendor must be used within VendorProvider");
  return ctx;
};

export const VendorProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [networkMode, setNetworkModeState] = useState<NetworkMode>(getInitialVendorMode);
  const [vendor, setVendor] = useState<VendorProfile>(defaultTestnetVendor);

  const setNetworkMode = (mode: NetworkMode) => {
    setNetworkModeState(mode);
    localStorage.setItem("tl_vendor_network", mode);
  };

  // Only auto-switch to mainnet on first login when no explicit network preference exists
  useEffect(() => {
    if (!authLoading && user && !localStorage.getItem("tl_vendor_network")) {
      setNetworkModeState("mainnet");
      localStorage.setItem("tl_vendor_network", "mainnet");
      localStorage.setItem("tl_vendor_auth", "true");
    }
  }, [authLoading, user]);

  useEffect(() => {
    let active = true;

    const metadataName = typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

    const fallbackName = metadataName || user?.email?.split("@")[0] || "Vendor";

    const loadMainnetProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,email")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setVendor((prev) => ({
          ...prev,
          name: fallbackName,
          email: user.email || prev.email,
        }));
        return;
      }

      const fullName = (data.full_name || "").trim();

      setVendor((prev) => ({
        ...prev,
        name: fullName || fallbackName,
        email: data.email || user.email || prev.email,
      }));
    };

    if (networkMode === "mainnet") {
      void loadMainnetProfile();
    } else {
      setVendor(defaultTestnetVendor);
    }

    return () => {
      active = false;
    };
  }, [networkMode, user]);

  return (
    <VendorContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet", vendor, setVendor }}>
      {children}
    </VendorContext.Provider>
  );
};

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NetworkMode = "testnet" | "mainnet";

interface BuyerProfile {
  id: string;
  name: string;
  email: string;
  location: string;
  phone?: string;
  companyName?: string;
  entityType?: string;
}

interface BuyerContextType {
  networkMode: NetworkMode;
  isTestnet: boolean;
  buyer: BuyerProfile;
  setBuyer: (buyer: BuyerProfile | ((prev: BuyerProfile) => BuyerProfile)) => void;
}

const defaultTestnetBuyer: BuyerProfile = {
  id: "BYR-2026-0102",
  name: "Test Buyer",
  email: "james@trustlocktest.com",
  location: "Chicago, USA",
};

const defaultMainnetBuyer: BuyerProfile = {
  id: "",
  name: "Buyer",
  email: "",
  location: "",
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
  const { user, loading: authLoading } = useAuth();
  const [networkMode, setNetworkModeState] = useState<NetworkMode>(getInitialBuyerMode);
  const [buyer, setBuyer] = useState<BuyerProfile>(() => getInitialBuyerMode() === "mainnet" ? defaultMainnetBuyer : defaultTestnetBuyer);

  const setNetworkMode = (mode: NetworkMode) => {
    setNetworkModeState(mode);
    localStorage.setItem("tl_buyer_network", mode);
  };

  useEffect(() => {
    if (!authLoading && user && !localStorage.getItem("tl_buyer_network")) {
      setNetworkModeState("mainnet");
      localStorage.setItem("tl_buyer_network", "mainnet");
    }
  }, [authLoading, user]);

  useEffect(() => {
    let active = true;

    const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
    const fallbackName = metadataName || user?.email?.split("@")[0] || "Buyer";

    const loadMainnetProfile = async () => {
      if (!user) return;

      setBuyer({ id: user.id, name: fallbackName, email: user.email || "", location: "" });

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,email,location,phone,company_name,entity_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setBuyer({ id: user.id, name: fallbackName, email: user.email || "", location: "" });
        return;
      }

      setBuyer({
        id: user.id,
        name: (data.full_name || "").trim() || fallbackName,
        email: data.email || user.email || "",
        location: data.location || "",
        phone: data.phone || "",
        companyName: data.company_name || "",
        entityType: data.entity_type || "individual",
      });
    };

    if (networkMode === "mainnet") {
      void loadMainnetProfile();
    } else {
      try {
        const saved = JSON.parse(localStorage.getItem("tl_buyer_profile_demo") || "{}");
        setBuyer({
          ...defaultTestnetBuyer,
          name: saved.fullName || defaultTestnetBuyer.name,
          location: saved.location || defaultTestnetBuyer.location,
          phone: saved.phone || "",
          companyName: saved.companyName || "",
          entityType: saved.entityType || "individual",
        });
      } catch {
        setBuyer(defaultTestnetBuyer);
      }
    }

    return () => {
      active = false;
    };
  }, [networkMode, user, authLoading]);

  return (
    <BuyerContext.Provider value={{ networkMode, setNetworkMode, isTestnet: networkMode === "testnet", buyer, setBuyer }}>
      {children}
    </BuyerContext.Provider>
  );
};

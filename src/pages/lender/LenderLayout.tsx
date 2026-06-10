import { useState } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import LenderSidebar from "@/components/lender/LenderSidebar";
import LenderLiabilityContract from "@/components/lender/LenderLiabilityContract";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMessageToast } from "@/hooks/useMessageToast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import { MissionChecklist } from "@/components/testnet/MissionChecklist";
import { GraduationBanner } from "@/components/testnet/GraduationBanner";

const CURRENT_CONTRACT_VERSION = 1;

const LenderLayoutInner = () => {
  useSessionTimeout("/trustlock/lender/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("vendor", user?.id, (path) => navigate(path.replace("/vendor/", "/lender/")));

  const [contractJustSigned, setContractJustSigned] = useState(false);

  // Check if lender has signed the current liability contract version
  const { data: hasSignedContract, isLoading: checkingContract } = useQuery({
    queryKey: ["lender-liability-contract", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await (supabase as any)
        .from("liability_contracts")
        .select("id")
        .eq("lender_id", user.id)
        .eq("contract_version", CURRENT_CONTRACT_VERSION)
        .eq("is_active", true)
        .maybeSingle();
      return !!data && !error;
    },
    enabled: !!user?.id,
  });

  const isTestnet = localStorage.getItem("tl_lender_network") === "testnet";

  // Show loading while checking contract status
  if (!isTestnet && checkingContract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show liability contract overlay if not signed (mainnet only)
  if (!isTestnet && !hasSignedContract && !contractJustSigned && user?.id) {
    return (
      <LanguageProvider>
        <LenderLiabilityContract
          userId={user.id}
          onSigned={() => setContractJustSigned(true)}
        />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-background">
        <LenderSidebar />
        <main className="flex-1 min-w-0 lg:ml-64 pb-28 lg:pb-0">
          <GraduationBanner role="lender" />
          <Outlet />
        </main>
        <MissionChecklist role="lender" />
        <MobileBottomNav role="lender" />
      </div>
    </LanguageProvider>
  );
};

const LenderLayout = () => {
  const { user, loading } = useAuth();

  const isTestnetAuth = localStorage.getItem("tl_lender_network") === "testnet" &&
    localStorage.getItem("tl_lender_auth") === "true";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isTestnetAuth) {
    return <Navigate to="/trustlock/lender/login" replace />;
  }

  return <LenderLayoutInner />;
};

export default LenderLayout;

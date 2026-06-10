import { Outlet, Navigate, useNavigate } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { VendorProvider } from "@/contexts/VendorContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TrialBanner from "@/components/vendor/TrialBanner";
import TestnetGuide from "@/components/shared/TestnetGuide";
import CommandPalette from "@/components/shared/CommandPalette";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import BlockchainExplorerPanel from "@/components/shared/BlockchainExplorerPanel";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMessageToast } from "@/hooks/useMessageToast";
import { useAuth } from "@/hooks/useAuth";
import EntityClassificationPrompt from "@/components/shared/EntityClassificationPrompt";
import { MissionChecklist } from "@/components/testnet/MissionChecklist";
import { GraduationBanner } from "@/components/testnet/GraduationBanner";

const VendorLayoutInner = () => {
  useSessionTimeout("/trustlock/vendor/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("vendor", user?.id, navigate);

  return (
    <LanguageProvider>
      <VendorProvider>
        <div className="flex min-h-screen bg-background">
          <VendorSidebar />
          <main className="flex-1 min-w-0 lg:ml-64 pb-28 lg:pb-0">
            <GraduationBanner role="vendor" />
            <TrialBanner />
            <TestnetGuide role="vendor" />
            <Outlet />
          </main>
          <MissionChecklist role="vendor" />
          <CommandPalette role="vendor" />
          <MobileBottomNav role="vendor" />
          <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 lg:bottom-4 lg:right-4 z-30">
            <BlockchainExplorerPanel />
          </div>
          <EntityClassificationPrompt />
        </div>
      </VendorProvider>
    </LanguageProvider>
  );
};

const VendorLayout = () => {
  const { user, loading } = useAuth();

  // Allow testnet access via localStorage (demo environment only)
  const isTestnetAuth = localStorage.getItem("tl_vendor_network") === "testnet" &&
    localStorage.getItem("tl_vendor_auth") === "true";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mainnet: require real Supabase session. Testnet: allow localStorage fallback.
  if (!user && !isTestnetAuth) {
    return <Navigate to="/trustlock/vendor/login" replace />;
  }

  return <VendorLayoutInner />;
};

export default VendorLayout;

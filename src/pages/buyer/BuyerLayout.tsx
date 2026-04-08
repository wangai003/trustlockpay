import { Outlet, Navigate, useNavigate } from "react-router-dom";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import { BuyerProvider } from "@/contexts/BuyerContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
import CommandPalette from "@/components/shared/CommandPalette";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import BlockchainExplorerPanel from "@/components/shared/BlockchainExplorerPanel";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMessageToast } from "@/hooks/useMessageToast";
import { useAuth } from "@/hooks/useAuth";
import EntityClassificationPrompt from "@/components/shared/EntityClassificationPrompt";

const BuyerLayoutInner = () => {
  useSessionTimeout("/trustlock/buyer/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("buyer", user?.id, navigate);

  return (
    <LanguageProvider>
      <BuyerProvider>
        <div className="flex min-h-screen bg-background">
          <BuyerSidebar />
          <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
            <TestnetGuide role="buyer" />
            <Outlet />
          </main>
          <CommandPalette role="buyer" />
          <MobileBottomNav role="buyer" />
          <div className="fixed bottom-20 right-4 lg:bottom-4 z-40">
            <BlockchainExplorerPanel />
          </div>
          <EntityClassificationPrompt />
        </div>
      </BuyerProvider>
    </LanguageProvider>
  );
};

const BuyerLayout = () => {
  const { user, loading } = useAuth();

  // Allow testnet access via localStorage (demo environment only)
  const isTestnetAuth = localStorage.getItem("tl_buyer_network") === "testnet" &&
    localStorage.getItem("tl_buyer_auth") === "true";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mainnet: require real Supabase session. Testnet: allow localStorage fallback.
  if (!user && !isTestnetAuth) {
    return <Navigate to="/trustlock/buyer/login" replace />;
  }

  return <BuyerLayoutInner />;
};

export default BuyerLayout;

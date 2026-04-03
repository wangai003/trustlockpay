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
        </div>
      </BuyerProvider>
    </LanguageProvider>
  );
};

const BuyerLayout = () => {
  const isAuth = localStorage.getItem("tl_buyer_auth") === "true";
  if (!isAuth) return <Navigate to="/trustlock/buyer/login" replace />;
  return <BuyerLayoutInner />;
};

export default BuyerLayout;

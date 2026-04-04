import { Outlet, useNavigate } from "react-router-dom";
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

const VendorLayout = () => {
  useSessionTimeout("/trustlock/vendor/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("vendor", user?.id, navigate);

  return (
    <LanguageProvider>
      <VendorProvider>
        <div className="flex min-h-screen bg-background">
          <VendorSidebar />
          <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
            <TrialBanner />
            <TestnetGuide role="vendor" />
            <Outlet />
          </main>
          <CommandPalette role="vendor" />
          <MobileBottomNav role="vendor" />
          <EntityClassificationPrompt />
        </div>
      </VendorProvider>
    </LanguageProvider>
  );
};

export default VendorLayout;

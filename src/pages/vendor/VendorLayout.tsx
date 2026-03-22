import { Outlet } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { VendorProvider } from "@/contexts/VendorContext";
import TrialBanner from "@/components/vendor/TrialBanner";
import TestnetGuide from "@/components/shared/TestnetGuide";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

const VendorLayout = () => {
  useSessionTimeout("/trustlock/vendor/login");

  return (
    <VendorProvider>
      <div className="flex min-h-screen bg-background">
        <VendorSidebar />
        <main className="flex-1 lg:ml-64">
          <TrialBanner />
          <TestnetGuide role="vendor" />
          <Outlet />
        </main>
      </div>
    </VendorProvider>
  );
};

export default VendorLayout;

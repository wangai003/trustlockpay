import { Outlet, Navigate } from "react-router-dom";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { VendorProvider } from "@/contexts/VendorContext";
import TrialBanner from "@/components/vendor/TrialBanner";
import TestnetGuide from "@/components/shared/TestnetGuide";

const VendorLayout = () => {
  const isAuth = localStorage.getItem("tl_vendor_auth") === "true";

  if (!isAuth) {
    return <Navigate to="/trustlock/vendor/login" replace />;
  }

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

import { Outlet, Navigate, useNavigate } from "react-router-dom";
import LenderSidebar from "@/components/lender/LenderSidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMessageToast } from "@/hooks/useMessageToast";
import { useAuth } from "@/hooks/useAuth";

const LenderLayoutInner = () => {
  useSessionTimeout("/trustlock/lender/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("vendor", user?.id, (path) => navigate(path.replace("/vendor/", "/lender/")));

  return (
    <LanguageProvider>
      <div className="flex min-h-screen bg-background">
        <LenderSidebar />
        <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
          <Outlet />
        </main>
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

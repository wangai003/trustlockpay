import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import SystemWalletBalancesPanel from "@/components/admin/SystemWalletBalancesPanel";
import { AdminProvider } from "@/contexts/AdminContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
import TestnetWatermark from "@/components/admin/TestnetWatermark";
import CommandPalette from "@/components/shared/CommandPalette";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import BlockchainExplorerPanel from "@/components/shared/BlockchainExplorerPanel";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useMessageToast } from "@/hooks/useMessageToast";
import { useAuth } from "@/hooks/useAuth";
import { AdminVerificationProvider, useAdminVerification } from "@/hooks/useIsChief";
import { Loader2 } from "lucide-react";

const AdminLayoutShell = () => {
  useSessionTimeout("/trustlock/admin/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("admin", user?.id, navigate);
  const { status } = useAdminVerification();

  // Server verification failed — wipe the spoofable localStorage shell and
  // force re-authentication. This kills the "paste a UUID into DevTools"
  // attack because the layout will not render without a backend handshake.
  useEffect(() => {
    if (status === "failed") {
      const isTestnet = localStorage.getItem("tl_network") === "testnet";
      // Preserve the testnet stub session — it intentionally bypasses backend
      // verification using the hardcoded testnet password.
      if (!isTestnet) {
        localStorage.removeItem("tl_admin_auth");
        sessionStorage.removeItem("tl_admin_session_pw");
        navigate("/trustlock/admin/login", { replace: true });
      }
    }
  }, [status, navigate]);

  const isTestnet = typeof window !== "undefined" && localStorage.getItem("tl_network") === "testnet";

  if (status === "verifying" && !isTestnet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying admin session…
        </div>
      </div>
    );
  }

  if (status === "failed" && !isTestnet) {
    return null;
  }

  return (
    <>
      <TestnetWatermark />
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 min-w-0 lg:ml-64 pb-28 lg:pb-0">
          <SystemWalletBalancesPanel />
          <TestnetGuide role="admin" />
          <Outlet />
        </main>
        <CommandPalette role="admin" />
        <MobileBottomNav role="admin" />
        <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 lg:bottom-4 lg:right-4 z-30">
          <BlockchainExplorerPanel />
        </div>
      </div>
    </>
  );
};

const AdminLayoutInner = () => (
  <LanguageProvider>
    <AdminProvider>
      <AdminVerificationProvider>
        <AdminLayoutShell />
      </AdminVerificationProvider>
    </AdminProvider>
  </LanguageProvider>
);

const AdminLayout = () => {
  const authRaw = localStorage.getItem("tl_admin_auth");
  let isAuth = false;

  try {
    const parsed = JSON.parse(authRaw || "{}");
    // Require both authenticated flag AND a valid adminId (UUID format)
    isAuth = parsed.authenticated === true &&
      typeof parsed.adminId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.adminId);
  } catch { /* invalid JSON = not authed */ }

  if (!isAuth) return <Navigate to="/trustlock/admin/login" replace />;
  return <AdminLayoutInner />;
};

export default AdminLayout;

import { Outlet, Navigate, useNavigate } from "react-router-dom";
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

const AdminLayoutInner = () => {
  useSessionTimeout("/trustlock/admin/login");
  const { user } = useAuth();
  const navigate = useNavigate();
  useMessageToast("admin", user?.id, navigate);

  return (
    <LanguageProvider>
      <AdminProvider>
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
      </AdminProvider>
    </LanguageProvider>
  );
};

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

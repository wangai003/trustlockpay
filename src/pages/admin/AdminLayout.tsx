import { Outlet, Navigate, useNavigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminProvider } from "@/contexts/AdminContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
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
          <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
            <TestnetGuide role="admin" />
            <Outlet />
          </main>
          <CommandPalette role="admin" />
          <MobileBottomNav role="admin" />
          <div className="fixed bottom-20 right-4 lg:bottom-4 z-40">
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

import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminProvider } from "@/contexts/AdminContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
import CommandPalette from "@/components/shared/CommandPalette";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import BlockchainExplorerPanel from "@/components/shared/BlockchainExplorerPanel";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

const AdminLayoutInner = () => {
  useSessionTimeout("/trustlock/admin/login");

  return (
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
  );
};

const AdminLayout = () => {
  const isAuth = localStorage.getItem("tl_admin_auth") === "true";
  if (!isAuth) return <Navigate to="/trustlock/admin/login" replace />;
  return <AdminLayoutInner />;
};

export default AdminLayout;

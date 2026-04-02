import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminProvider } from "@/contexts/AdminContext";
import TestnetGuide from "@/components/shared/TestnetGuide";
import CommandPalette from "@/components/shared/CommandPalette";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
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

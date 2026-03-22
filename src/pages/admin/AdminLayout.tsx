import { Outlet, Navigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminProvider } from "@/contexts/AdminContext";

const AdminLayout = () => {
  const isAuth = localStorage.getItem("tl_admin_auth") === "true";

  if (!isAuth) {
    return <Navigate to="/trustlock/admin/login" replace />;
  }

  return (
    <AdminProvider>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 ml-64">
          <Outlet />
        </main>
      </div>
    </AdminProvider>
  );
};

export default AdminLayout;

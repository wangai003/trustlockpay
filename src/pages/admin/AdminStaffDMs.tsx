import AdminHeader from "@/components/admin/AdminHeader";
import AdminDirectMessages from "@/components/admin/AdminDirectMessages";

const AdminStaffDMs = () => (
  <div>
    <AdminHeader title="Staff Direct Messages" />
    <div className="p-4 sm:p-6">
      <div className="h-[calc(100dvh-10rem)] min-h-[400px] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
        <AdminDirectMessages />
      </div>
    </div>
  </div>
);

export default AdminStaffDMs;

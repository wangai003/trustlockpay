import AdminHeader from "@/components/admin/AdminHeader";
import DepartmentTeamChat from "@/components/admin/DepartmentTeamChat";

const AdminTeamChat = () => (
  <div>
    <AdminHeader title="Team Chat" />
    <div className="p-4 sm:p-6">
      <div className="h-[calc(100dvh-10rem)] min-h-[400px] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
        <DepartmentTeamChat />
      </div>
    </div>
  </div>
);

export default AdminTeamChat;

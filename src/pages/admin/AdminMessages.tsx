import MessageInbox from "@/components/shared/MessageInbox";
import AdminHeader from "@/components/admin/AdminHeader";

const AdminMessages = () => (
  <div>
    <AdminHeader title="Client Inbox" />
    <div className="p-4 sm:p-6">
      <MessageInbox role="admin" />
    </div>
  </div>
);

export default AdminMessages;

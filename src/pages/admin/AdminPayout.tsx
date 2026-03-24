import AdminHeader from "@/components/admin/AdminHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";

const AdminPayout = () => (
  <div>
    <AdminHeader title="TrustLock OS Payout" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPayout role="admin" />
    </div>
  </div>
);

export default AdminPayout;

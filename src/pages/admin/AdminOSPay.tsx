import AdminHeader from "@/components/admin/AdminHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";

const AdminOSPay = () => (
  <div>
    <AdminHeader title="TrustLock OS Pay" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPay role="admin" />
    </div>
  </div>
);

export default AdminOSPay;

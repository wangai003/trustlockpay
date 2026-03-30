import AdminHeader from "@/components/admin/AdminHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useAdmin } from "@/contexts/AdminContext";

const AdminPayout = () => {
  const { isTestnet } = useAdmin();
  return (
    <div>
      <AdminHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPayout role="admin" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default AdminPayout;

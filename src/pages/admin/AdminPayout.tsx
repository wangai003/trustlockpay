import AdminHeader from "@/components/admin/AdminHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import RoutingRetryQueuePanel from "@/components/admin/RoutingRetryQueuePanel";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/hooks/useAuth";

const AdminPayout = () => {
  const { isTestnet } = useAdmin();
  const { user } = useAuth();
  return (
    <div>
      <AdminHeader title="Admin OS Payout" />
      <div className="p-3 sm:p-6 space-y-4">
        <PendingRoutingCard surface="admin_os_pay" userId={user?.id} />
        <TrustLockOSPayout role="admin" isTestnet={isTestnet} />
        <RoutingRetryQueuePanel />
      </div>
    </div>
  );
};

export default AdminPayout;

import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import { useBuyer } from "@/contexts/BuyerContext";
import { useAuth } from "@/hooks/useAuth";

const BuyerPayout = () => {
  const { isTestnet } = useBuyer();
  const { user } = useAuth();
  return (
    <div>
      <BuyerHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6 space-y-4">
        <PendingRoutingCard surface="trustlock_os_payout" userId={user?.id} />
        <TrustLockOSPayout role="buyer" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default BuyerPayout;

import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import { useVendor } from "@/contexts/VendorContext";
import { useAuth } from "@/hooks/useAuth";

const VendorPayout = () => {
  const { isTestnet } = useVendor();
  const { user } = useAuth();
  return (
    <div>
      <VendorHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6">
        <PendingRoutingCard surface="trustlock_os_payout" userId={user?.id} />
        <TrustLockOSPayout
            role="vendor"
            isTestnet={isTestnet}
            prefillOrderNumber={isTestnet ? "TL-00042" : ""}
            prefillAmount={isTestnet ? "4500.00" : ""}
          />
      </div>
    </div>
  );
};

export default VendorPayout;

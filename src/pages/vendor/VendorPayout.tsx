import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useVendor } from "@/contexts/VendorContext";

const VendorPayout = () => {
  const { isTestnet } = useVendor();
  return (
    <div>
      <VendorHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPayout role="vendor" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default VendorPayout;

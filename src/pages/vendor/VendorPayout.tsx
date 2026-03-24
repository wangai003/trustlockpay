import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";

const VendorPayout = () => (
  <div>
    <VendorHeader title="TrustLock OS Payout" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPayout role="vendor" />
    </div>
  </div>
);

export default VendorPayout;

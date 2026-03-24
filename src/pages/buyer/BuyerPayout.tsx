import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";

const BuyerPayout = () => (
  <div>
    <BuyerHeader title="TrustLock OS Payout" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPayout role="buyer" />
    </div>
  </div>
);

export default BuyerPayout;

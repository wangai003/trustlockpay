import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";

const BuyerOSPay = () => (
  <div>
    <BuyerHeader title="TrustLock OS Pay" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPay role="buyer" />
    </div>
  </div>
);

export default BuyerOSPay;

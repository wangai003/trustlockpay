import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";

const VendorOSPay = () => (
  <div>
    <VendorHeader title="TrustLock OS Pay" />
    <div className="p-3 sm:p-6">
      <TrustLockOSPay role="vendor" />
    </div>
  </div>
);

export default VendorOSPay;

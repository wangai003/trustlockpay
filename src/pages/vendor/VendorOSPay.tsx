import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useVendor } from "@/contexts/VendorContext";

const VendorOSPay = () => {
  const { isTestnet } = useVendor();
  return (
    <div>
      <VendorHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPay role="vendor" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default VendorOSPay;

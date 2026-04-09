import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useVendor } from "@/contexts/VendorContext";

const VendorPayout = () => {
  const { isTestnet } = useVendor();
  return (
    <div>
      <VendorHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6">
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

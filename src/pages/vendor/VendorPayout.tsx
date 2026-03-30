import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useVendor } from "@/contexts/VendorContext";
import TLId from "@/components/shared/TLId";

const VendorPayout = () => {
  const { isTestnet } = useVendor();
  return (
    <div>
      <VendorHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6">
        <TLId code="TL-V-PYO-BTN-REQUEST">
          <TrustLockOSPayout
            role="vendor"
            isTestnet={isTestnet}
            prefillOrderNumber={isTestnet ? "TL-00042" : ""}
            prefillAmount={isTestnet ? "4500.00" : ""}
          />
        </TLId>
      </div>
    </div>
  );
};

export default VendorPayout;

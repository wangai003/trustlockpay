import { useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useVendor } from "@/contexts/VendorContext";

const VendorOSPay = () => {
  const { isTestnet } = useVendor();
  const [params] = useSearchParams();
  const prefillService = params.get("service") || "";
  const prefillAmount = params.get("amount") || "";

  return (
    <div>
      <VendorHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPay
          role="vendor"
          isTestnet={isTestnet}
          prefillService={prefillService}
          prefillAmount={prefillAmount}
        />
      </div>
    </div>
  );
};

export default VendorOSPay;

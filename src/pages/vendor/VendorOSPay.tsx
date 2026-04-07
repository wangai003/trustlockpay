import { useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useVendor } from "@/contexts/VendorContext";
import TLId from "@/components/shared/TLId";

const VendorOSPay = () => {
  const { isTestnet } = useVendor();
  const [params] = useSearchParams();
  const prefillService = params.get("service") || "";
  const prefillAmount = params.get("amount") || "";
  const arbitrationOrderId = params.get("arbitration_order_id") || undefined;

  return (
    <div>
      <VendorHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TLId code="TL-V-PAY-BTN-PAY">
          <TrustLockOSPay
            role="vendor"
            isTestnet={isTestnet}
            prefillService={prefillService}
            prefillAmount={prefillAmount}
          />
        </TLId>
      </div>
    </div>
  );
};

export default VendorOSPay;

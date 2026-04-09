import { useSearchParams } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useBuyer } from "@/contexts/BuyerContext";

const BuyerOSPay = () => {
  const { isTestnet } = useBuyer();
  const [params] = useSearchParams();
  const prefillService = params.get("service") || "";
  const prefillAmount = params.get("amount") || "";
  const arbitrationOrderId = params.get("arbitration_order_id") || undefined;

  return (
    <div>
      <BuyerHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPay
            role="buyer"
            isTestnet={isTestnet}
            prefillService={prefillService}
            prefillAmount={prefillAmount}
            arbitrationOrderId={arbitrationOrderId}
          />
      </div>
    </div>
  );
};

export default BuyerOSPay;

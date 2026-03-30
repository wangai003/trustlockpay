import { useSearchParams } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useBuyer } from "@/contexts/BuyerContext";
import TLId from "@/components/shared/TLId";

const BuyerOSPay = () => {
  const { isTestnet } = useBuyer();
  const [params] = useSearchParams();
  const prefillService = params.get("service") || "";
  const prefillAmount = params.get("amount") || "";

  return (
    <div>
      <BuyerHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TLId code="TL-B-PAY-BTN-PAY">
          <TrustLockOSPay
            role="buyer"
            isTestnet={isTestnet}
            prefillService={prefillService}
            prefillAmount={prefillAmount}
          />
        </TLId>
      </div>
    </div>
  );
};

export default BuyerOSPay;

import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import { useBuyer } from "@/contexts/BuyerContext";

const BuyerOSPay = () => {
  const { isTestnet } = useBuyer();
  return (
    <div>
      <BuyerHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPay role="buyer" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default BuyerOSPay;

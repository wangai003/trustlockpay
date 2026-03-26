import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useBuyer } from "@/contexts/BuyerContext";

const BuyerPayout = () => {
  const { isTestnet } = useBuyer();
  return (
    <div>
      <BuyerHeader title="TrustLock OS Payout" />
      <div className="p-3 sm:p-6">
        <TrustLockOSPayout role="buyer" isTestnet={isTestnet} />
      </div>
    </div>
  );
};

export default BuyerPayout;

import BuyerHeader from "@/components/buyer/BuyerHeader";
import TrustLockOSPayout from "@/components/shared/TrustLockOSPayout";
import { useBuyer } from "@/contexts/BuyerContext";
import TLId from "@/components/shared/TLId";

const BuyerPayout = () => {
  const { isTestnet } = useBuyer();
  return (
    <div>
      <BuyerHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <TLId code="TL-B-PYO-BTN-REQUEST">
          <TrustLockOSPayout role="buyer" isTestnet={isTestnet} />
        </TLId>
      </div>
    </div>
  );
};

export default BuyerPayout;

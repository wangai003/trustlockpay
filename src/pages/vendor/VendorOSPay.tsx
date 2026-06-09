import { useSearchParams } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import PendingRoutingCard from "@/components/shared/PendingRoutingCard";
import { useVendor } from "@/contexts/VendorContext";
import { useAuth } from "@/hooks/useAuth";

const VendorOSPay = () => {
  const { isTestnet } = useVendor();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const prefillService = params.get("service") || "";
  const prefillAmount = params.get("amount") || "";
  const arbitrationOrderId = params.get("arbitration_order_id") || undefined;

  return (
    <div>
      <VendorHeader title="TrustLock OS Pay" />
      <div className="p-3 sm:p-6">
        <PendingRoutingCard surface="trustlock_os_pay" userId={user?.id} />
        <TrustLockOSPay
            role="vendor"
            isTestnet={isTestnet}
            prefillService={prefillService}
            prefillAmount={prefillAmount}
            arbitrationOrderId={arbitrationOrderId}
          />
      </div>
    </div>
  );
};

export default VendorOSPay;

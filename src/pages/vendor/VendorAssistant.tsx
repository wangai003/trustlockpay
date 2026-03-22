import VendorHeader from "@/components/vendor/VendorHeader";
import AssistantChat from "@/components/shared/AssistantChat";

const VendorAssistant = () => (
  <div>
    <VendorHeader title="Amani — TrustLock Assist" />
    <div className="p-3 sm:p-6 max-w-4xl">
      <AssistantChat
        role="vendor"
        title="TrustLock Vendor Support"
        placeholder="Ask Amani about orders, payouts, disputes, KYC..."
      />
    </div>
  </div>
);

export default VendorAssistant;

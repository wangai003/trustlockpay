import VendorHeader from "@/components/vendor/VendorHeader";
import AssistantChat from "@/components/shared/AssistantChat";

const VendorAssistant = () => (
  <div>
    <VendorHeader title="TrustLock Assist" />
    <div className="p-3 sm:p-6 max-w-4xl">
      <AssistantChat
        role="vendor"
        title="TrustLock Assist"
        placeholder="Ask about orders, payouts, disputes, KYC..."
      />
    </div>
  </div>
);

export default VendorAssistant;

import VendorHeader from "@/components/vendor/VendorHeader";
import AssistantChat from "@/components/shared/AssistantChat";
import TLId from "@/components/shared/TLId";

const VendorAssistant = () => (
  <div>
    <VendorHeader title="Amani — TrustLock Assist" />
    <div className="p-3 sm:p-6 max-w-4xl">
      <TLId code="TL-V-AST-INP-CHAT">
        <AssistantChat
          role="vendor"
          title="TrustLock Vendor Support"
          placeholder="Ask Amani about orders, payouts, disputes, KYC..."
        />
      </TLId>
    </div>
  </div>
);

export default VendorAssistant;

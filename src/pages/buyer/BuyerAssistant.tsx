import BuyerHeader from "@/components/buyer/BuyerHeader";
import AssistantChat from "@/components/shared/AssistantChat";

const BuyerAssistant = () => (
  <div>
    <BuyerHeader title="Zawadi — Support Assistant" />
    <div className="p-3 sm:p-6 max-w-4xl">
      <AssistantChat
          role="buyer"
          assistantName="zawadi"
          title="TrustLock Buyer Support"
          placeholder="Ask Zawadi about orders, escrow protection, disputes..."
        />
    </div>
  </div>
);

export default BuyerAssistant;

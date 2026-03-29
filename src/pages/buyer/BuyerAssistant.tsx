import BuyerHeader from "@/components/buyer/BuyerHeader";
import AssistantChat from "@/components/shared/AssistantChat";
import TLId from "@/components/shared/TLId";

const BuyerAssistant = () => (
  <div>
    <BuyerHeader title="Zawadi — Support Assistant" />
    <div className="p-3 sm:p-6 max-w-4xl">
      <TLId code="TL-B-AST-INP-CHAT">
        <AssistantChat
          role="buyer"
          title="TrustLock Buyer Support"
          placeholder="Ask Zawadi about orders, escrow protection, disputes..."
        />
      </TLId>
    </div>
  </div>
);

export default BuyerAssistant;

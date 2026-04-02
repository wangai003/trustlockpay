import MessageInbox from "@/components/shared/MessageInbox";
import BuyerHeader from "@/components/buyer/BuyerHeader";

const BuyerMessages = () => (
  <div>
    <BuyerHeader title="Messages" />
    <div className="p-4 sm:p-6">
      <MessageInbox role="buyer" />
    </div>
  </div>
);

export default BuyerMessages;

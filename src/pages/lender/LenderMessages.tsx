import LenderHeader from "@/components/lender/LenderHeader";
import MessageInbox from "@/components/shared/MessageInbox";

const LenderMessages = () => (
  <div>
    <LenderHeader title="Messages" />
    <div className="p-4 sm:p-6">
      <MessageInbox role="lender" />
    </div>
  </div>
);

export default LenderMessages;

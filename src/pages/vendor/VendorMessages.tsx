import MessageInbox from "@/components/shared/MessageInbox";
import VendorHeader from "@/components/vendor/VendorHeader";

const VendorMessages = () => (
  <div>
    <VendorHeader title="Messages" />
    <div className="p-4 sm:p-6">
      <MessageInbox role="vendor" />
    </div>
  </div>
);

export default VendorMessages;

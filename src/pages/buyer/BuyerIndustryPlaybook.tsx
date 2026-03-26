import { BuyerHeader } from "@/components/buyer/BuyerHeader";
import IndustryPlaybookView from "@/components/shared/IndustryPlaybookView";

const BuyerIndustryPlaybook = () => (
  <div>
    <BuyerHeader title="Industry Capabilities Playbook" />
    <div className="p-3 sm:p-6">
      <IndustryPlaybookView />
    </div>
  </div>
);

export default BuyerIndustryPlaybook;

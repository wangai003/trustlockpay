import VendorHeader from "@/components/vendor/VendorHeader";
import IndustryPlaybookView from "@/components/shared/IndustryPlaybookView";

const VendorIndustryPlaybook = () => (
  <div>
    <VendorHeader title="Industry Capabilities Playbook" />
    <div className="p-3 sm:p-6">
      <IndustryPlaybookView />
    </div>
  </div>
);

export default VendorIndustryPlaybook;

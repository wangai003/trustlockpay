import AdminHeader from "@/components/admin/AdminHeader";
import IndustryPlaybookView from "@/components/shared/IndustryPlaybookView";

const AdminIndustryPlaybook = () => (
  <div>
    <AdminHeader title="Industry Capabilities Playbook" />
    <div className="p-3 sm:p-6">
      <IndustryPlaybookView />
    </div>
  </div>
);

export default AdminIndustryPlaybook;

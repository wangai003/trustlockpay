import AdminHeader from "@/components/admin/AdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminActionLogViewer from "@/components/admin/AdminActionLogViewer";
import ChiefAdminOverridePanel from "@/components/admin/ChiefAdminOverridePanel";
import AdminSharedInbox from "@/components/admin/AdminSharedInbox";
import { ClipboardList, Gavel, MessageSquare } from "lucide-react";

const AdminAccountability = () => (
  <div>
    <AdminHeader title="Accountability & Oversight" />
    <div className="p-4 sm:p-6">
      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Shared Inbox
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Action Log
          </TabsTrigger>
          <TabsTrigger value="override" className="gap-1.5">
            <Gavel className="w-3.5 h-3.5" /> Chief Override
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox"><AdminSharedInbox /></TabsContent>
        <TabsContent value="log"><AdminActionLogViewer /></TabsContent>
        <TabsContent value="override"><ChiefAdminOverridePanel /></TabsContent>
      </Tabs>
    </div>
  </div>
);

export default AdminAccountability;

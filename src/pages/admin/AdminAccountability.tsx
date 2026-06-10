import AdminHeader from "@/components/admin/AdminHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminActionLogViewer from "@/components/admin/AdminActionLogViewer";
import ChiefAdminOverridePanel from "@/components/admin/ChiefAdminOverridePanel";
import AdminSharedInbox from "@/components/admin/AdminSharedInbox";
import AdminStaffManager from "@/components/admin/AdminStaffManager";
import ChiefOnlyGate from "@/components/admin/ChiefOnlyGate";
import { useIsChief } from "@/hooks/useIsChief";
import { ClipboardList, Gavel, MessageSquare, Users } from "lucide-react";

const AdminAccountability = () => {
  const isChief = useIsChief();

  return (
    <ChiefOnlyGate pageName="Accountability & Oversight">
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
            {isChief && (
              <TabsTrigger value="staff" className="gap-1.5">
                <Users className="w-3.5 h-3.5" /> Staff Management
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="inbox"><AdminSharedInbox /></TabsContent>
          <TabsContent value="log"><AdminActionLogViewer /></TabsContent>
          <TabsContent value="override"><ChiefAdminOverridePanel /></TabsContent>
          {isChief && <TabsContent value="staff"><AdminStaffManager /></TabsContent>}
        </Tabs>
      </div>
    </div>
    </ChiefOnlyGate>
  );
};

export default AdminAccountability;

import MessageInbox from "@/components/shared/MessageInbox";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminDirectMessages from "@/components/admin/AdminDirectMessages";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users } from "lucide-react";

const AdminMessages = () => (
  <div>
    <AdminHeader title="Messages" />
    <div className="p-4 sm:p-6">
      <Tabs defaultValue="user-inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="user-inbox" className="gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" /> User Inbox
          </TabsTrigger>
          <TabsTrigger value="team-chat" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Team Chat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="user-inbox">
          <MessageInbox role="admin" />
        </TabsContent>
        <TabsContent value="team-chat">
          <div className="h-[calc(100dvh-14rem)] sm:h-[calc(100dvh-12rem)] min-h-[300px] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
            <AdminDirectMessages />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
);

export default AdminMessages;

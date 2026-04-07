import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AdminStaff {
  id: string;
  name: string;
  username: string;
  alias?: string;
  is_chief?: boolean;
  department_slug?: string;
}

interface DM {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const AdminDirectMessages = () => {
  const [staffList, setStaffList] = useState<AdminStaff[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<AdminStaff | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentAdminId = (() => {
    try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}").id || null; } catch { return null; }
  })();

  const isChief = (() => {
    try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}").isChief === true; } catch { return false; }
  })();

  // Load staff list
  const loadStaff = useCallback(async () => {
    if (!currentAdminId) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "list", chiefAdminId: currentAdminId }),
    });
    const json = await res.json();
    if (json.staff) {
      // Also load aliases
      const { data: aliases } = await supabase.from("admin_aliases").select("*");
      const aliasMap = Object.fromEntries((aliases || []).map((a: any) => [a.admin_id, a.alias]));
      const list: AdminStaff[] = json.staff
        .filter((s: any) => s.id !== currentAdminId && !s.is_deleted)
        .map((s: any) => ({ ...s, alias: aliasMap[s.id] }));
      setStaffList(list);
    }
  }, [currentAdminId]);

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!currentAdminId) return;
    const { data } = await supabase
      .from("admin_direct_messages")
      .select("sender_id")
      .eq("recipient_id", currentAdminId)
      .eq("is_read", false);
    const counts: Record<string, number> = {};
    data?.forEach((m) => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
    setUnreadCounts(counts);
  }, [currentAdminId]);

  // Load conversation with a peer
  const loadConversation = useCallback(async (peerId: string) => {
    if (!currentAdminId) return;
    const { data } = await supabase
      .from("admin_direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${currentAdminId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${currentAdminId})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as DM[]);

    // Mark as read
    await supabase
      .from("admin_direct_messages")
      .update({ is_read: true })
      .eq("sender_id", peerId)
      .eq("recipient_id", currentAdminId)
      .eq("is_read", false);

    loadUnreadCounts();
  }, [currentAdminId, loadUnreadCounts]);

  useEffect(() => { loadStaff(); loadUnreadCounts(); }, [loadStaff, loadUnreadCounts]);

  // Realtime subscription for incoming DMs
  useEffect(() => {
    if (!currentAdminId) return;
    const channel = supabase
      .channel("admin-dm-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_direct_messages" }, (payload) => {
        const msg = payload.new as DM;
        if (msg.recipient_id === currentAdminId || msg.sender_id === currentAdminId) {
          if (selectedPeer && (msg.sender_id === selectedPeer.id || msg.recipient_id === selectedPeer.id)) {
            setMessages((prev) => [...prev, msg]);
            if (msg.sender_id !== currentAdminId) {
              supabase.from("admin_direct_messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
            }
          }
          loadUnreadCounts();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentAdminId, selectedPeer, loadUnreadCounts]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPeer || !currentAdminId) return;
    const { error } = await supabase.from("admin_direct_messages").insert({
      sender_id: currentAdminId,
      recipient_id: selectedPeer.id,
      body: newMessage.trim(),
    });
    if (error) { toast.error("Failed to send"); return; }
    setNewMessage("");
    loadConversation(selectedPeer.id);
  };

  const getPeerLabel = (peer: AdminStaff) => {
    if (isChief) return `${peer.alias || peer.username} (${peer.name})`;
    return peer.alias || peer.username;
  };

  if (selectedPeer) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setSelectedPeer(null); loadUnreadCounts(); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-sm font-medium">{getPeerLabel(selectedPeer)}</p>
            {selectedPeer.is_chief && <Badge variant="default" className="text-[9px]">Chief</Badge>}
          </div>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation.</p>
            )}
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentAdminId;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={cn("text-[9px] mt-1", isMine ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                      {format(new Date(msg.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="min-h-[40px] max-h-[100px] text-sm resize-none flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" className="shrink-0 self-end" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" /> Admin Team ({staffList.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {staffList.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No other admin staff found.</p>
          )}
          {staffList.map((peer) => (
            <button
              key={peer.id}
              onClick={() => { setSelectedPeer(peer); loadConversation(peer.id); }}
              className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-0.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getPeerLabel(peer)}</span>
                  {peer.is_chief && <Badge variant="default" className="text-[9px]">Chief</Badge>}
                </div>
              </div>
              {(unreadCounts[peer.id] || 0) > 0 && (
                <Badge className="text-[9px] px-1.5 min-w-[18px] justify-center">
                  {unreadCounts[peer.id]}
                </Badge>
              )}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDirectMessages;

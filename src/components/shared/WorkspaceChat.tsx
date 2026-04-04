import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type MemberInfo = {
  user_id: string;
  display_name: string | null;
};

interface WorkspaceChatProps {
  workspaceId: string;
  members: MemberInfo[];
}

const WorkspaceChat = ({ workspaceId, members }: WorkspaceChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getMemberName = (senderId: string) => {
    const m = members.find((mb) => mb.user_id === senderId);
    return m?.display_name || senderId.slice(0, 8) + "...";
  };

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("team_workspace_messages")
      .select("id, sender_id, body, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages(data);
  }, [workspaceId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`ws-chat-${workspaceId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "team_workspace_messages",
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("team_workspace_messages").insert({
      workspace_id: workspaceId,
      sender_id: user.id,
      body: newMsg.trim(),
    });
    if (error) toast.error("Failed to send message");
    else setNewMsg("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Team Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto px-4 py-2 space-y-2 border-y border-border"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-muted-foreground mb-0.5">
                    {isMe ? "You" : getMemberName(msg.sender_id)}
                  </span>
                  <div
                    className={`rounded-lg px-3 py-1.5 max-w-[80%] text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-2 p-3">
          <Input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button size="icon" onClick={sendMessage} disabled={sending || !newMsg.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkspaceChat;

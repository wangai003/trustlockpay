import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/adminDepartments";
import { serverEncrypt, serverDecryptBatch } from "@/lib/cryptoUtils";

interface ChatMsg {
  id: string;
  department_slug: string;
  sender_id: string;
  body: string;
  is_encrypted: boolean;
  encryption_version: number | null;
  created_at: string;
}

function getAdminAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); } catch { return {}; }
}

const DepartmentTeamChat = () => {
  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const adminName = auth.name || auth.username || "You";
  const isChief = auth.isChief === true;
  const myDept = auth.departmentSlug || "executive";

  const availableDepts = isChief ? DEPARTMENTS : DEPARTMENTS.filter(d => d.slug === myDept);
  const [activeDept, setActiveDept] = useState(myDept);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({});
  const [newMsg, setNewMsg] = useState("");
  const [staffNames, setStaffNames] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadStaffNames = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: "list", chiefAdminId: adminId }),
      });
      const json = await res.json();
      if (json.accounts) {
        const map: Record<string, string> = {};
        json.accounts.forEach((a: any) => {
          map[a.id] = isChief ? a.name : (a.alias || a.username);
        });
        setStaffNames(map);
      }
    } catch {}
  }, [adminId, isChief]);

  // Decrypt encrypted messages
  const decryptMessages = useCallback(async (msgs: ChatMsg[]) => {
    const encrypted = msgs.filter(m => m.is_encrypted && !decryptedBodies[m.id]);
    if (encrypted.length === 0) return;
    try {
      // For encrypted messages, body contains JSON with ciphertext+nonce
      const toDecrypt = encrypted.map(m => {
        try {
          const parsed = JSON.parse(m.body);
          return { id: m.id, body: parsed.ciphertext, nonce: parsed.nonce };
        } catch {
          return { id: m.id, body: m.body, nonce: "" };
        }
      }).filter(m => m.nonce);

      if (toDecrypt.length > 0) {
        const results = await serverDecryptBatch(toDecrypt);
        setDecryptedBodies(prev => ({ ...prev, ...results }));
      }
    } catch {
      // Silently fail – messages show [encrypted]
    }
  }, [decryptedBodies]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("admin_dept_chat_messages")
      .select("*")
      .eq("department_slug", activeDept)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      const msgs = data as ChatMsg[];
      setMessages(msgs);
      decryptMessages(msgs);
    }
  }, [activeDept, decryptMessages]);

  useEffect(() => { loadStaffNames(); }, [loadStaffNames]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`dept-chat-${activeDept}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "admin_dept_chat_messages",
        filter: `department_slug=eq.${activeDept}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMsg;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.is_encrypted) {
          decryptMessages([newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeDept, decryptMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !adminId || sending) return;
    setSending(true);
    try {
      const { ciphertext, nonce } = await serverEncrypt(newMsg.trim());
      const encryptedBody = JSON.stringify({ ciphertext, nonce });

      const { error } = await supabase.from("admin_dept_chat_messages").insert({
        department_slug: activeDept,
        sender_id: adminId,
        body: encryptedBody,
        is_encrypted: true,
        encryption_version: 1,
      });
      if (error) toast.error("Failed to send");
      else {
        // Pre-populate decrypted cache
        setDecryptedBodies(prev => ({ ...prev }));
        setNewMsg("");
      }
    } catch {
      toast.error("Encryption failed");
    } finally {
      setSending(false);
    }
  };

  const getSenderName = (id: string) => {
    if (id === adminId) return "You";
    return staffNames[id] || id.slice(0, 8) + "...";
  };

  const getDisplayBody = (msg: ChatMsg) => {
    if (!msg.is_encrypted) return msg.body;
    if (decryptedBodies[msg.id]) return decryptedBodies[msg.id];
    return "🔒 Decrypting...";
  };

  const deptLabel = DEPARTMENTS.find(d => d.slug === activeDept)?.name || activeDept;

  return (
    <div className="flex flex-col h-full">
      {isChief && availableDepts.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
          {availableDepts.map(d => (
            <Button
              key={d.slug}
              size="sm"
              variant={activeDept === d.slug ? "default" : "ghost"}
              className="text-xs shrink-0"
              onClick={() => setActiveDept(d.slug)}
            >
              {d.name.split(" ")[0]}
            </Button>
          ))}
        </div>
      )}

      <div className="p-3 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{deptLabel} — Team Chat</span>
        <Lock className="w-3 h-3 text-green-500" />
        <span className="text-[9px] text-green-600">Encrypted</span>
        {auth.isTeamLead && <Badge variant="secondary" className="text-[9px]">Team Lead</Badge>}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === adminId;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <span className="text-[10px] text-muted-foreground mb-0.5">{getSenderName(msg.sender_id)}</span>
                <div className={cn("rounded-lg px-3 py-1.5 max-w-[80%] text-sm", isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  {getDisplayBody(msg)}
                </div>
                <span className="text-[9px] text-muted-foreground mt-0.5">
                  {format(new Date(msg.created_at), "h:mm a")}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <Textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          className="min-h-[40px] max-h-[80px] text-sm resize-none flex-1"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button size="icon" className="shrink-0 self-end" onClick={handleSend} disabled={!newMsg.trim() || sending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default DepartmentTeamChat;

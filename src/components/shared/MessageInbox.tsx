import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Plus, Shield, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

// URL pattern to detect and neutralize links in messages
const URL_REGEX = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s<>\"')\]]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\/[^\s<>\"')\]]*)?/gi;

/** Strips all URLs from text and replaces with a safe placeholder */
const sanitizeLinks = (text: string): { sanitized: string; hadLinks: boolean } => {
  const hadLinks = URL_REGEX.test(text);
  URL_REGEX.lastIndex = 0; // reset regex state
  const sanitized = text.replace(URL_REGEX, "[link removed]");
  return { sanitized, hadLinks };
};

const CONTACT_REASONS = [
  { value: "dispute", label: "Dispute Resolution" },
  { value: "milestone", label: "Milestone Question" },
  { value: "payout", label: "Payout Issue" },
  { value: "kyc", label: "KYC / Verification Help" },
  { value: "document", label: "Document Request" },
  { value: "billing", label: "Billing & Fees" },
  { value: "technical", label: "Technical Issue" },
  { value: "general", label: "General Inquiry" },
  { value: "other", label: "Other" },
];

interface Thread {
  id: string;
  participant_1: string;
  participant_2: string;
  transaction_id: string | null;
  subject: string | null;
  category: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  label: string;
  type: "admin" | "counterparty";
  transaction_id?: string;
}

interface MessageInboxProps {
  role: "vendor" | "buyer" | "admin";
}

const MessageInbox = ({ role }: MessageInboxProps) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Admin uses the sentinel ID for thread participation
  const effectiveUserId = role === "admin" ? ADMIN_SENTINEL_ID : userId;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeCategory, setComposeCategory] = useState("general");
  const [composeBody, setComposeBody] = useState("");
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    let query = supabase
      .from("message_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    // Admin sees threads where ADMIN_SENTINEL_ID is a participant (messages sent TO admin)
    if (role === "admin") {
      query = query.or(`participant_1.eq.${ADMIN_SENTINEL_ID},participant_2.eq.${ADMIN_SENTINEL_ID}`);
    }

    const { data, error } = await query;
    if (!error && data) setThreads(data as Thread[]);
    setLoading(false);
  }, [userId, role]);

  // Load contacts (counterparties from transactions + admin)
  const loadContacts = useCallback(async () => {
    if (!userId) return;
    const contactList: Contact[] = [];

    if (role === "admin") {
      // Admin can message any user who has a profile
      // Load recent thread participants first, then all profiles as fallback
      const { data: recentThreads } = await supabase
        .from("message_threads")
        .select("participant_1, participant_2, subject")
        .or(`participant_1.eq.${ADMIN_SENTINEL_ID},participant_2.eq.${ADMIN_SENTINEL_ID}`)
        .order("last_message_at", { ascending: false })
        .limit(50);

      const participantIds = new Set<string>();
      recentThreads?.forEach((t) => {
        if (t.participant_1 !== ADMIN_SENTINEL_ID) participantIds.add(t.participant_1);
        if (t.participant_2 !== ADMIN_SENTINEL_ID) participantIds.add(t.participant_2);
      });

      // Also load profiles to allow admin to initiate conversations
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("created_at", { ascending: false })
        .limit(100);

      const seen = new Set<string>();
      profiles?.forEach((p) => {
        if (!seen.has(p.id) && p.id !== userId) {
          seen.add(p.id);
          contactList.push({
            id: p.id,
            label: `${p.full_name || p.email || p.id.slice(0, 8)}${participantIds.has(p.id) ? " (active)" : ""}`,
            type: "counterparty",
          });
        }
      });
    } else {
      // Buyer/Vendor: add admin as first contact
      contactList.push({ id: ADMIN_SENTINEL_ID, label: "TrustLock Admin Support", type: "admin" });

      const col = role === "vendor" ? "vendor_id" : "buyer_id";
      const otherNameCol = role === "vendor" ? "buyer_name" : "vendor_name";
      const otherIdCol = role === "vendor" ? "buyer_id" : "vendor_id";

      const { data: txns } = await supabase
        .from("transactions")
        .select(`id, ${otherIdCol}, ${otherNameCol}, tx_id`)
        .eq(col, userId)
        .not(otherIdCol, "is", null);

      if (txns) {
        const seen = new Set<string>();
        for (const tx of txns) {
          const otherId = (tx as any)[otherIdCol];
          const otherName = (tx as any)[otherNameCol] || "Unknown";
          if (otherId && !seen.has(otherId)) {
            seen.add(otherId);
            contactList.push({
              id: otherId,
              label: `${otherName} (${(tx as any).tx_id || tx.id.slice(0, 8)})`,
              type: "counterparty",
              transaction_id: tx.id,
            });
          }
        }
      }
    }
    setContacts(contactList);
  }, [userId, role]);

  // Load messages for a thread
  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    // Mark unread messages as read
    if (userId) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("thread_id", threadId)
        .neq("sender_id", userId)
        .eq("is_read", false);
    }
  }, [userId]);

  // Resolve participant names
  const resolveNames = useCallback(async (threadList: Thread[]) => {
    const ids = new Set<string>();
    threadList.forEach((t) => {
      ids.add(t.participant_1);
      ids.add(t.participant_2);
    });
    ids.delete(ADMIN_SENTINEL_ID);
    if (ids.size === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(ids));

    const names: Record<string, string> = { [ADMIN_SENTINEL_ID]: "TrustLock Admin" };
    data?.forEach((p) => {
      names[p.id] = p.full_name || p.email || p.id.slice(0, 8);
    });
    setParticipantNames(names);
  }, []);

  useEffect(() => { loadThreads(); loadContacts(); }, [loadThreads, loadContacts]);
  useEffect(() => { if (threads.length > 0) resolveNames(threads); }, [threads, resolveNames]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (selectedThread && msg.thread_id === selectedThread.id) {
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id !== userId) {
            supabase.from("messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
          }
        }
        loadThreads();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_threads" }, () => {
        loadThreads();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedThread, userId, loadThreads]);

  const getOtherParticipant = (thread: Thread) => {
    if (!effectiveUserId) return "";
    const otherId = thread.participant_1 === effectiveUserId ? thread.participant_2 : thread.participant_1;
    if (otherId === ADMIN_SENTINEL_ID) return "TrustLock Admin";
    return participantNames[otherId] || otherId.slice(0, 8);
  };

  const getUnreadCount = (threadId: string) => {
    // We'd need a separate query for this; skip for now
    return 0;
  };

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThread || !userId) return;
    // Admin sends as ADMIN_SENTINEL_ID so RLS thread-participant check passes
    const senderId = role === "admin" ? ADMIN_SENTINEL_ID : userId;
    const { error } = await supabase.from("messages").insert({
      thread_id: selectedThread.id,
      sender_id: senderId,
      body: newMessage.trim(),
    });
    if (error) {
      toast.error("Failed to send message");
      return;
    }
    await supabase.from("message_threads").update({ last_message_at: new Date().toISOString() }).eq("id", selectedThread.id);
    setNewMessage("");
  };

  // Create new thread
  const handleCompose = async () => {
    if (!composeRecipient || !composeBody.trim() || !userId) return;
    const contact = contacts.find((c) => c.id === composeRecipient);
    // Admin uses sentinel ID as their participant identity
    const myParticipantId = role === "admin" ? ADMIN_SENTINEL_ID : userId;

    const { data: thread, error: tErr } = await supabase
      .from("message_threads")
      .insert({
        participant_1: myParticipantId,
        participant_2: composeRecipient,
        subject: composeSubject || CONTACT_REASONS.find((r) => r.value === composeCategory)?.label || "New Message",
        category: composeCategory,
        transaction_id: contact?.transaction_id || null,
      })
      .select()
      .single();

    if (tErr || !thread) {
      toast.error("Failed to create conversation");
      return;
    }

    await supabase.from("messages").insert({
      thread_id: thread.id,
      sender_id: myParticipantId,
      body: composeBody.trim(),
    });

    setComposeOpen(false);
    setComposeRecipient("");
    setComposeSubject("");
    setComposeCategory("general");
    setComposeBody("");
    loadThreads();
    setSelectedThread(thread as Thread);
    loadMessages(thread.id);
    toast.success("Message sent");
  };

  // Thread list view
  const ThreadList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-heading font-bold text-sm">Inbox</h2>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs h-8">
              <Plus className="w-3.5 h-3.5" /> New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
                <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.type === "admin" && <Shield className="w-3 h-3 text-primary" />}
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
                <Select value={composeCategory} onValueChange={setComposeCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject (optional)</label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Brief description"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                <Textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Type your message..."
                  className="min-h-[100px] text-sm"
                />
              </div>
              <Button onClick={handleCompose} className="w-full" disabled={!composeRecipient || !composeBody.trim()}>
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
        ) : threads.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground text-xs">Start a conversation using the "New Message" button</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {threads.map((thread) => {
              const other = getOtherParticipant(thread);
              const isAdmin = thread.participant_1 === ADMIN_SENTINEL_ID || thread.participant_2 === ADMIN_SENTINEL_ID;
              return (
                <button
                  key={thread.id}
                  onClick={() => { setSelectedThread(thread); loadMessages(thread.id); }}
                  className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                      {isAdmin && <Shield className="w-3 h-3 text-primary shrink-0" />}
                      {other}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {format(new Date(thread.last_message_at), "MMM d")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                      {CONTACT_REASONS.find((r) => r.value === thread.category)?.label || thread.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {thread.subject || "No subject"}
                    </span>
                  </div>
                  {thread.status === "locked" && (
                    <Badge variant="destructive" className="text-[9px] mt-1">Locked</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Message thread view
  const ThreadView = () => {
    if (!selectedThread) return null;
    const isLocked = selectedThread.status === "locked";
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getOtherParticipant(selectedThread)}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {selectedThread.subject || "No subject"} · {CONTACT_REASONS.find((r) => r.value === selectedThread.category)?.label || selectedThread.category}
            </p>
          </div>
          {isLocked && <Badge variant="destructive" className="text-[9px]">Locked</Badge>}
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {(() => {
                      const { sanitized, hadLinks } = sanitizeLinks(msg.body);
                      return (
                        <>
                          <p className="whitespace-pre-wrap break-words">{sanitized}</p>
                          {hadLinks && (
                            <span className={cn("flex items-center gap-1 text-[9px] mt-0.5", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                              <LinkIcon className="w-2.5 h-2.5" /> Links removed for security
                            </span>
                          )}
                        </>
                      );
                    })()}
                    <p className={cn("text-[9px] mt-1", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {format(new Date(msg.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {isLocked ? (
          <div className="p-3 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">This conversation has been locked.</p>
          </div>
        ) : (
          <div className="p-3 border-t border-border flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="shrink-0 self-end">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Admin view: show all threads, for admin role contacts are loaded differently
  useEffect(() => {
    if (role === "admin" && userId) {
      // Admin sees all threads; contacts are populated from thread participants
    }
  }, [role, userId]);

  return (
    <div className="h-[calc(100dvh-14rem)] sm:h-[calc(100dvh-12rem)] min-h-[300px] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
      {selectedThread ? <ThreadView /> : <ThreadList />}
    </div>
  );
};

export default MessageInbox;

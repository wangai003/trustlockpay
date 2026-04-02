import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, User, Search, Archive, X, Paperclip, FileText, ImageIcon, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import aiEmmanuel from "@/assets/ai-emmanuel.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Attachment = {
  type: "image" | "document";
  name: string;
  data?: string;
  extractedText?: string;
  preview?: string;
};

type Msg = { role: "user" | "assistant"; content: string; attachments?: Attachment[] };
type CaseInfo = { caseRef: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/emmanuel-chat`;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EmmanuelChat = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(true);
  const [caseInfo, setCaseInfo] = useState<CaseInfo>({ caseRef: "" });
  const [archivedCases, setArchivedCases] = useState<{ id?: string; info: CaseInfo; messages: Msg[]; date: string }[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load archived conversations from database
  useEffect(() => {
    const loadArchive = async () => {
      try {
        const { data } = await supabase
          .from("emmanuel_conversations")
          .select("id, case_ref, title, messages, created_at")
          .eq("is_archived", true)
          .order("created_at", { ascending: false })
          .limit(20);
        if (data) {
          setArchivedCases(data.map((c: any) => ({
            id: c.id,
            info: { caseRef: c.case_ref || "" },
            messages: c.messages as Msg[],
            date: new Date(c.created_at).toLocaleDateString(),
          })));
        }
      } catch {
        // Fallback to localStorage
        const saved = localStorage.getItem("emmanuel_archive");
        if (saved) setArchivedCases(JSON.parse(saved));
      }
    };
    loadArchive();
  }, []);

  // Auto-save conversation to database
  const persistConversation = useCallback(async (msgs: Msg[], caseRef: string, archived = false) => {
    try {
      if (conversationId) {
        await supabase.from("emmanuel_conversations").update({
          messages: msgs as any,
          case_ref: caseRef,
          is_archived: archived,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      } else if (msgs.length > 0) {
        const { data } = await supabase.from("emmanuel_conversations").insert({
          case_ref: caseRef,
          title: caseRef || "New Session",
          messages: msgs as any,
          is_archived: archived,
        }).select("id").single();
        if (data) setConversationId(data.id);
      }
    } catch {
      // Silent fallback — localStorage backup
      localStorage.setItem("emmanuel_current", JSON.stringify({ caseRef, messages: msgs }));
    }
  }, [conversationId]);

  const saveToArchive = async () => {
    if (messages.length === 0) return;
    await persistConversation(messages, caseInfo.caseRef, true);
    const entry = { info: caseInfo, messages, date: new Date().toLocaleDateString() };
    setArchivedCases(prev => [entry, ...prev]);
  };

  const loadFromArchive = (index: number) => {
    const entry = archivedCases[index];
    setCaseInfo(entry.info);
    setMessages(entry.messages);
    setConversationId(entry.id || null);
    setShowArchive(false);
    setShowLookup(false);
  };

  const startCase = () => {
    if (!caseInfo.caseRef.trim()) return;
    const intro = `Pull up case **${caseInfo.caseRef.trim()}** — give me the full breakdown (buyer, vendor, amount, reason, evidence, and your recommendation).`;
    setShowLookup(false);
    sendMessage(intro);
  };

  const newCase = async () => {
    await saveToArchive();
    setMessages([]);
    setCaseInfo({ caseRef: "" });
    setPendingAttachments([]);
    setConversationId(null);
    setShowLookup(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      if (IMAGE_TYPES.includes(file.type)) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPendingAttachments(prev => [...prev, {
            type: "image", name: file.name, data: dataUrl, preview: dataUrl,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (file.type === "text/plain" || file.type === "text/csv" || file.type === "application/json" || file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.name.endsWith(".json") || file.name.endsWith(".md")) {
        const text = await file.text();
        const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n...[truncated]" : text;
        setPendingAttachments(prev => [...prev, {
          type: "document", name: file.name, extractedText: truncated,
        }]);
      } else if (file.type === "application/pdf") {
        setPendingAttachments(prev => [...prev, {
          type: "document", name: file.name,
          extractedText: `[PDF document: ${file.name}, ${(file.size / 1024).toFixed(1)}KB — Please describe the key contents if the AI cannot read it.]`,
        }]);
        toast.info("PDF uploaded — Emmanuel will analyze filename and context.");
      } else {
        toast.error(`Unsupported file type: ${file.type || file.name}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (text: string) => {
    const attachments = [...pendingAttachments];
    const userMsg: Msg = {
      role: "user",
      content: text,
      ...(attachments.length > 0 ? { attachments } : {}),
    };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setPendingAttachments([]);
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, attachments }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Something went wrong."}` }]);
        setIsLoading(false);
        return;
      }

      const contentType = resp.headers.get("content-type") || "";

      // Handle non-streamed JSON response (from tool-call resolution)
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || "I processed the data but couldn't generate a summary.";
        setMessages(prev => [...prev, { role: "assistant", content }]);
        setIsLoading(false);
        return;
      }

      // Handle SSE streaming response
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
    setIsLoading(false);
  };

  const handleSend = () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;
    sendMessage(input.trim() || "Please analyze the attached evidence.");
  };

  return (
    <Card className="flex flex-col h-[600px] lg:h-[700px]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src={aiEmmanuel} alt="Emmanuel" className="w-8 h-8 rounded-full object-cover border-2 border-primary/20" />
          <div>
            <CardTitle className="text-base">Emmanuel</CardTitle>
            <p className="text-[10px] text-muted-foreground">Dispute Resolution Analyst · Vision Enabled</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setShowArchive(!showArchive)} className="gap-1 text-xs">
            <Archive className="w-3 h-3" /> Archive
          </Button>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={newCase} className="text-xs">New Case</Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
        {showArchive && (
          <div className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Archived Cases</span>
              <Button variant="ghost" size="sm" onClick={() => setShowArchive(false)}><X className="w-3 h-3" /></Button>
            </div>
            {archivedCases.length === 0 ? (
              <p className="text-xs text-muted-foreground">No archived cases yet.</p>
            ) : (
              archivedCases.map((c, i) => (
                <button key={i} onClick={() => loadFromArchive(i)}
                  className="w-full text-left bg-background rounded p-2 hover:bg-accent/10 transition-colors">
                  <div className="text-xs font-semibold">{c.info.caseRef || "Unknown"}</div>
                  <div className="text-[10px] text-muted-foreground">{c.date} · {c.messages.length} messages</div>
                </button>
              ))
            )}
          </div>
        )}

        {showLookup && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 mb-3 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Case Lookup</span>
            </div>
            <div>
              <Label className="text-[10px]">Transaction ID or Dispute #</Label>
              <Input
                placeholder="e.g. TL-2026-0894 or DSP-001"
                value={caseInfo.caseRef}
                onChange={e => setCaseInfo({ caseRef: e.target.value })}
                onKeyDown={e => e.key === "Enter" && startCase()}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Emmanuel will pull up all linked details. You can also upload evidence images/documents.</p>
            </div>
            <Button size="sm" onClick={startCase} disabled={!caseInfo.caseRef.trim()} className="w-full gap-1 text-xs">
              <img src={aiEmmanuel} alt="" className="w-4 h-4 rounded-full" /> Pull Up Case
            </Button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.length === 0 && !showLookup && (
            <div className="text-center py-8">
              <img src={aiEmmanuel} alt="Emmanuel" className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-primary/20 mb-3" />
              <p className="text-sm text-muted-foreground">Enter case details above, upload evidence, or type a message to begin.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <img src={aiEmmanuel} alt="Emmanuel" className="w-6 h-6 rounded-full object-cover shrink-0 mt-1 border border-primary/20" />
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-xs ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"
              }`}>
                {/* Show attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.attachments.map((att, ai) => (
                      <div key={ai} className="flex items-center gap-1 px-2 py-1 rounded bg-background/20 text-[10px]">
                        {att.type === "image" ? (
                          att.preview ? (
                            <img src={att.preview} alt={att.name} className="w-6 h-6 rounded object-cover" />
                          ) : (
                            <ImageIcon className="w-3 h-3" />
                          )
                        ) : (
                          <FileText className="w-3 h-3" />
                        )}
                        {att.name}
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs max-w-none [&_p]:mb-1 [&_li]:mb-0.5 [&_strong]:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3 h-3 text-accent-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <img src={aiEmmanuel} alt="Emmanuel" className="w-6 h-6 rounded-full object-cover shrink-0 border border-primary/20" />
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                {pendingAttachments.length > 0 ? "Analyzing evidence..." : "Analyzing..."}
              </div>
            </div>
          )}
        </div>

        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-[10px]">
                {att.type === "image" && att.preview ? (
                  <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
                ) : att.type === "image" ? (
                  <ImageIcon className="w-4 h-4 text-primary" />
                ) : (
                  <FileText className="w-4 h-4 text-primary" />
                )}
                <span className="max-w-[100px] truncate">{att.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 shrink-0">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.txt,.csv,.json,.md,.pdf"
            multiple
            onChange={handleFileSelect}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            className="h-9 px-2 shrink-0"
            title="Attach evidence (images, documents)"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder={pendingAttachments.length > 0 ? "Describe the evidence..." : "Ask Emmanuel about the case..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="text-xs h-9"
          />
          <Button size="sm" onClick={handleSend} disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)} className="h-9 px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmmanuelChat;

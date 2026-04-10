import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send, User, AlertTriangle, Paperclip, X, FileText, ImageIcon,
  Zap, Shield, Search, BarChart3, FileSearch, Globe, HelpCircle
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Attachment = {
  type: "image" | "document";
  name: string;
  data?: string;
  extractedText?: string;
  preview?: string;
};

type Msg = { role: "user" | "assistant"; content: string; attachments?: Attachment[] };

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = ["text/plain", "text/csv", "application/json"];

const QUICK_ACTIONS = [
  { icon: Search, label: "Analyze Vendor", prompt: "Help me research a vendor's track record on TrustLock." },
  { icon: FileSearch, label: "Check Document", prompt: "I'd like to analyze a document for authenticity. Let me upload it." },
  { icon: BarChart3, label: "Portfolio Risk", prompt: "Analyze my current portfolio for concentration risks and exposure." },
  { icon: Globe, label: "Industry Brief", prompt: "Give me a risk brief on the agriculture & export industry." },
  { icon: Shield, label: "Review Application", prompt: "Help me review a pending financing application." },
  { icon: HelpCircle, label: "Platform FAQ", prompt: "How does TrustLock's escrow protection work?" },
];

const FlashVetChat = () => {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flashvet-chat`;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [queryCount, setQueryCount] = useState(() => {
    const saved = localStorage.getItem("tl_lender_ai_queries");
    return saved ? parseInt(saved, 10) : 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const FREE_QUERIES = 20;
  const remainingFree = Math.max(FREE_QUERIES - queryCount, 0);

  useEffect(() => {
    const saved = localStorage.getItem("tl_lender_flashvet_messages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("tl_lender_flashvet_messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

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
          setPendingAttachments(prev => [...prev, { type: "image", name: file.name, data: dataUrl, preview: dataUrl }]);
        };
        reader.readAsDataURL(file);
      } else if (DOC_TYPES.includes(file.type) || file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.name.endsWith(".json") || file.name.endsWith(".md")) {
        const text = await file.text();
        const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n...[truncated]" : text;
        setPendingAttachments(prev => [...prev, { type: "document", name: file.name, extractedText: truncated }]);
      } else if (file.type === "application/pdf") {
        setPendingAttachments(prev => [...prev, {
          type: "document",
          name: file.name,
          extractedText: `[PDF document: ${file.name}, ${(file.size / 1024).toFixed(1)}KB — PDF text extraction requires server-side processing. Please describe the key contents if the AI cannot read it.]`,
        }]);
        toast.info("PDF uploaded — FlashVet AI will analyze the filename and context.");
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

    const newCount = queryCount + 1;
    setQueryCount(newCount);
    localStorage.setItem("tl_lender_ai_queries", String(newCount));

    let assistantSoFar = "";

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages, attachments }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.error || "Something went wrong."}` }]);
        setIsLoading(false);
        return;
      }

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
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection error. Please try again." }]);
    }
    setIsLoading(false);
  };

  const handleSend = () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;
    sendMessage(input.trim() || "Please analyze the attached file(s) for authenticity.");
  };

  const clearHistory = () => {
    setMessages([]);
    setPendingAttachments([]);
    localStorage.removeItem("tl_lender_flashvet_messages");
  };

  // Strip signal tags from display
  const cleanContent = (content: string) => content.replace(/<signal\s[^>]*>/g, "").trim();

  return (
    <Card className="flex flex-col h-full border-emerald-700/60 bg-background">
      {/* Header */}
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0 border-b border-emerald-700/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-md">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              FlashVet AI
              <Badge variant="outline" className="text-[9px] border-emerald-600/40 text-emerald-700 dark:text-emerald-400">
                BETA
              </Badge>
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">Instant Vetting. Informed Lending.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={clearHistory} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          )}
          <div className="text-[10px] text-muted-foreground">
            {remainingFree > 0
              ? <span>{remainingFree} free queries</span>
              : <span className="text-emerald-600">$0.05/query</span>
            }
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 mt-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shadow-lg mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm font-medium text-foreground">Welcome to FlashVet AI</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Your intelligence assistant for vendor research, document forensics, portfolio risk analysis, and platform Q&A.
                Upload documents for authenticity scoring or ask about any vendor.
              </p>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5 max-w-lg mx-auto">
                {QUICK_ACTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(prompt)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-emerald-600/20 hover:border-emerald-600/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-center group"
                  >
                    <Icon className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                    <span className="text-[10px] font-medium text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shrink-0 mt-1">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-xs ${
                msg.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-background border-l-2 border-emerald-600/40"
              }`}>
                {/* Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.attachments.map((att, ai) => (
                      <div key={ai} className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-[10px]">
                        {att.type === "image" ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {att.name}
                      </div>
                    ))}
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs max-w-none [&_p]:mb-1 [&_li]:mb-0.5 [&_strong]:text-foreground [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_table]:text-[10px] [&_th]:px-2 [&_td]:px-2">
                    <ReactMarkdown>{cleanContent(msg.content)}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground border-l-2 border-emerald-600/40">
                {pendingAttachments.length > 0 ? "Analyzing document..." : "Processing..."}
              </div>
            </div>
          )}
        </div>

        {/* Escalation hint */}
        {messages.length >= 4 && messages.filter(m => m.role === "user").length >= 2 && (
          <div className="flex items-center gap-2 p-2 mb-2 rounded-lg border border-emerald-600/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-[10px]">
            <AlertTriangle className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Need human support? Use <strong>Messages</strong> to contact TrustLock admin directly.</span>
          </div>
        )}

        {/* Pending Attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50/30 dark:bg-emerald-950/20 text-[10px]">
                {att.type === "image" ? (
                  att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                  )
                ) : (
                  <FileText className="w-4 h-4 text-emerald-600" />
                )}
                <span className="max-w-[100px] truncate">{att.name}</span>
                <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
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
            className="h-9 px-2 shrink-0 hover:text-emerald-600"
            title="Attach file or image for analysis"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder={pendingAttachments.length > 0 ? "Describe what to analyze..." : "Ask about vendors, documents, or platform..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="text-xs h-9 focus-visible:ring-emerald-600/40"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && pendingAttachments.length === 0)}
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlashVetChat;

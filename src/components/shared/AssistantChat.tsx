import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User, AlertTriangle, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import aiTwinGrey from "@/assets/ai-twin-grey.png";
import aiTwinBlack from "@/assets/ai-twin-black.png";
import { toast } from "sonner";

type Attachment = {
  type: "image" | "document";
  name: string;
  data?: string; // base64 data URL for images
  extractedText?: string; // for text-based docs
  preview?: string; // thumbnail URL
};

type Msg = { role: "user" | "assistant"; content: string; attachments?: Attachment[] };

interface AssistantChatProps {
  role: "vendor" | "buyer";
  title: string;
  placeholder?: string;
  assistantName?: "amani" | "zawadi";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const DOC_TYPES = ["text/plain", "text/csv", "application/json"];

const AssistantChat = ({ role, title, placeholder = "Ask a question...", assistantName }: AssistantChatProps) => {
  const aiName = role === "vendor" ? "Amani" : "Zawadi";
  const aiAvatar = role === "vendor" ? aiTwinGrey : aiTwinBlack;

  const edgeFn = assistantName ? `${assistantName}-chat` : "trustlock-assist";
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFn}`;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [queryCount, setQueryCount] = useState(() => {
    const saved = localStorage.getItem(`tl_${role}_ai_queries`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const FREE_QUERIES = 20;
  const remainingFree = Math.max(FREE_QUERIES - queryCount, 0);

  useEffect(() => {
    const saved = localStorage.getItem(`tl_${role}_ai_messages`);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, [role]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`tl_${role}_ai_messages`, JSON.stringify(messages));
    }
  }, [messages, role]);

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
        // Convert image to base64 data URL
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPendingAttachments(prev => [...prev, {
            type: "image",
            name: file.name,
            data: dataUrl,
            preview: dataUrl,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (DOC_TYPES.includes(file.type) || file.name.endsWith(".txt") || file.name.endsWith(".csv") || file.name.endsWith(".json") || file.name.endsWith(".md")) {
        // Read text content
        const text = await file.text();
        const truncated = text.length > 8000 ? text.slice(0, 8000) + "\n...[truncated]" : text;
        setPendingAttachments(prev => [...prev, {
          type: "document",
          name: file.name,
          extractedText: truncated,
        }]);
      } else if (file.type === "application/pdf") {
        // PDF — we can't extract text client-side but we can note it
        setPendingAttachments(prev => [...prev, {
          type: "document",
          name: file.name,
          extractedText: `[PDF document: ${file.name}, ${(file.size / 1024).toFixed(1)}KB — PDF text extraction requires server-side processing. Please describe the key contents if the AI cannot read it.]`,
        }]);
        toast.info("PDF uploaded — AI will attempt to analyze the filename and context.");
      } else {
        toast.error(`Unsupported file type: ${file.type || file.name}`);
      }
    }

    // Reset input
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
    localStorage.setItem(`tl_${role}_ai_queries`, String(newCount));

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(
          assistantName
            ? { messages: allMessages, attachments }
            : { messages: allMessages, role, attachments }
        ),
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
    sendMessage(input.trim() || "Please analyze the attached file(s).");
  };

  const clearHistory = () => {
    setMessages([]);
    setPendingAttachments([]);
    localStorage.removeItem(`tl_${role}_ai_messages`);
  };

  return (
    <Card className="flex flex-col h-[500px] lg:h-[600px]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src={aiAvatar} alt={aiName} className="w-8 h-8 rounded-full object-cover border-2 border-primary/20" />
          <div>
            <CardTitle className="text-base">{aiName}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{title}</p>
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
              ? <span>{remainingFree} free queries left</span>
              : <span className="text-accent">$0.05/query</span>
            }
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <img src={aiAvatar} alt={aiName} className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-primary/20 mb-3" />
              <p className="text-sm font-medium">Good day! I'm {aiName}, your TrustLock assistant.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {role === "vendor"
                  ? "I handle orders, payouts, KYC, delivery management, and platform queries. You can also upload documents or images for me to analyze."
                  : "I handle orders, escrow protection, disputes, and platform queries. Upload receipts, photos, or documents for analysis."}
              </p>
              {role === "vendor" && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["How do payouts work?", "How to handle a dispute?", "Analyze my invoice"].map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {role === "buyer" && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["How is my money protected?", "How do I file a dispute?", "Check delivery status"].map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <img src={aiAvatar} alt={aiName} className="w-6 h-6 rounded-full object-cover shrink-0 mt-1 border border-primary/20" />
              )}
              <div className={`max-w-[85%] rounded-lg p-3 text-xs ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50"
              }`}>
                {/* Show attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.attachments.map((att, ai) => (
                      <div key={ai} className="flex items-center gap-1 px-2 py-1 rounded bg-background/20 text-[10px]">
                        {att.type === "image" ? <ImageIcon className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
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
              <img src={aiAvatar} alt={aiName} className="w-6 h-6 rounded-full object-cover shrink-0 border border-primary/20" />
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                {pendingAttachments.length > 0 ? "Analyzing document..." : "Thinking..."}
              </div>
            </div>
          )}
        </div>

        {messages.length >= 4 && messages.filter(m => m.role === "user").length >= 2 && (
          <div className="flex items-center gap-2 p-2 mb-2 rounded-lg border border-accent/30 bg-accent/5 text-[10px]">
            <AlertTriangle className="w-3 h-3 text-accent shrink-0" />
            <span>Need more help? Use <strong>Contact Admin</strong> in Messages to escalate to a human.</span>
          </div>
        )}

        {/* Pending Attachments Preview */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-muted/30 text-[10px]">
                {att.type === "image" ? (
                  att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-primary" />
                  )
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
            title="Attach file or image"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            placeholder={pendingAttachments.length > 0 ? "Describe what to analyze..." : placeholder}
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

export default AssistantChat;

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User, AlertTriangle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import aiTwinGrey from "@/assets/ai-twin-grey.png";
import aiTwinBlack from "@/assets/ai-twin-black.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trustlock-assist`;

interface AssistantChatProps {
  role: "vendor" | "buyer";
  title: string;
  placeholder?: string;
}

const AssistantChat = ({ role, title, placeholder = "Ask a question..." }: AssistantChatProps) => {
  const aiName = role === "vendor" ? "Amani" : "Zawadi";
  const aiAvatar = role === "vendor" ? aiTwinGrey : aiTwinBlack;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(() => {
    const saved = localStorage.getItem(`tl_${role}_ai_queries`);
    return saved ? parseInt(saved, 10) : 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const FREE_QUERIES = 20;
  const remainingFree = Math.max(FREE_QUERIES - queryCount, 0);

  // Load previous messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`tl_${role}_ai_messages`);
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch {}
    }
  }, [role]);

  // Save messages to localStorage for conversation memory
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`tl_${role}_ai_messages`, JSON.stringify(messages));
    }
  }, [messages, role]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
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
        body: JSON.stringify({ messages: allMessages, role }),
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
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  };

  const clearHistory = () => {
    setMessages([]);
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
                  ? "How may I assist you today? I handle orders, payouts, KYC, delivery management, and platform queries."
                  : "How may I assist you today? I handle orders, escrow protection, disputes, and platform queries."}
              </p>
              {role === "vendor" && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["How do payouts work?", "How to handle a dispute?", "Explain auto-delivery"].map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[10px] px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {role === "buyer" && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {["How is my money protected?", "How do I file a dispute?", "What is auto-release?"].map(q => (
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
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">Thinking...</div>
            </div>
          )}
        </div>

        {messages.length >= 4 && messages.filter(m => m.role === "user").length >= 2 && (
          <div className="flex items-center gap-2 p-2 mb-2 rounded-lg border border-accent/30 bg-accent/5 text-[10px]">
            <AlertTriangle className="w-3 h-3 text-accent shrink-0" />
            <span>Need more help? Use <strong>Contact Admin</strong> in Messages to escalate to a human.</span>
          </div>
        )}

        <div className="flex gap-2 shrink-0">
          <Input
            placeholder={placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="text-xs h-9"
          />
          <Button size="sm" onClick={handleSend} disabled={isLoading || !input.trim()} className="h-9 px-3">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AssistantChat;

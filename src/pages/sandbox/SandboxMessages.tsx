import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SANDBOX_MESSAGES } from "./sandboxData";
import { Send } from "lucide-react";

const SandboxMessages = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<Record<string, string[]>>({});

  const msg = selected ? SANDBOX_MESSAGES.find(m => m.id === selected) : null;

  const handleSend = () => {
    if (!reply.trim() || !selected) return;
    setReplies(prev => ({ ...prev, [selected]: [...(prev[selected] || []), reply.trim()] }));
    setReply("");
  };

  if (msg) {
    const threadReplies = replies[msg.id] || [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>← Back</Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{msg.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">From: {msg.from} · {msg.time} · Order: {msg.orderId}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm">{msg.preview}</p>
            </div>
            {threadReplies.map((r, i) => (
              <div key={i} className="bg-primary/5 rounded-lg p-3 ml-6">
                <p className="text-xs text-muted-foreground mb-1">You</p>
                <p className="text-sm">{r}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type a reply…" onKeyDown={e => e.key === "Enter" && handleSend()} />
              <Button size="sm" onClick={handleSend} disabled={!reply.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Messages</h1>
      <div className="space-y-2">
        {SANDBOX_MESSAGES.map(m => (
          <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(m.id)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{m.from}</span>
                <div className="flex items-center gap-2">
                  {m.unread && <Badge className="text-[10px] h-4">New</Badge>}
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </div>
              </div>
              <p className="text-sm font-medium">{m.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{m.preview}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SandboxMessages;

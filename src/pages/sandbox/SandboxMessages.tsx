import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowLeft, Globe } from "lucide-react";
import { getSandboxLiveOrders, SandboxLiveOrder } from "./sandboxIndustryData";

interface DerivedMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  orderId: string;
  time: string;
  unread: boolean;
}

function deriveMessages(orders: SandboxLiveOrder[], role: string): DerivedMessage[] {
  const msgs: DerivedMessage[] = [];

  for (const order of orders) {
    if (role === "buyer" && !order.claimedByBuyer) continue;

    // System message — escrow locked
    msgs.push({
      id: `${order.id}-sys`,
      from: "TrustLock System",
      subject: `Escrow Locked — ${order.orderNumber}`,
      preview: `Funds of $${order.total.toLocaleString()} have been secured in escrow for ${order.items[0]?.name || "your order"}.`,
      orderId: order.orderNumber,
      time: new Date(order.createdAt).toLocaleDateString(),
      unread: false,
    });

    // Milestone update
    const inProgress = order.milestones.find(m => m.status === "in_progress");
    if (inProgress) {
      msgs.push({
        id: `${order.id}-ms`,
        from: role === "buyer" ? order.vendorName : order.buyerName,
        subject: `Milestone Update — ${inProgress.title}`,
        preview: `${order.orderNumber}: "${inProgress.title}" is now in progress. ${inProgress.documentGate ? `Document required: ${inProgress.documentGate}` : ""}`,
        orderId: order.orderNumber,
        time: "Active",
        unread: order.status === "in_progress" || order.status === "escrow_locked",
      });
    }

    // Completed notification
    if (order.status === "completed") {
      msgs.push({
        id: `${order.id}-done`,
        from: "TrustLock System",
        subject: `Order Complete — ${order.orderNumber}`,
        preview: `All milestones for ${order.items[0]?.name} have been completed. Funds released to ${order.vendorName}.`,
        orderId: order.orderNumber,
        time: "Completed",
        unread: false,
      });
    }
  }

  return msgs;
}

const SandboxMessages = () => {
  const session = useOutletContext<{ role: string; name: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const [messages, setMessages] = useState<DerivedMessage[]>([]);

  const refresh = useCallback(() => {
    const orders = getSandboxLiveOrders();
    setMessages(deriveMessages(orders, session.role));
  }, [session.role]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const msg = selected ? messages.find(m => m.id === selected) : null;

  const handleSend = () => {
    if (!reply.trim() || !selected) return;
    setReplies(prev => ({ ...prev, [selected]: [...(prev[selected] || []), reply.trim()] }));
    setReply("");
  };

  if (msg) {
    const threadReplies = replies[msg.id] || [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
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

      {messages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {session.role === "buyer"
                ? "No messages yet. Claim an order to see messages here."
                : "No messages yet. Messages will appear when orders are created."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
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
      )}
    </div>
  );
};

export default SandboxMessages;

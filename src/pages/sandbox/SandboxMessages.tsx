import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Send, Plus, Shield, Search, Paperclip, FileText, Image, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────── Demo contacts per role ──────── */
interface DemoContact { id: string; name: string; email: string; role: string; badge: string; tlId?: string; company?: string; }

const DEMO_CONTACTS: Record<string, DemoContact[]> = {
  vendor: [
    { id: "demo-admin", name: "TrustLock Admin Support", email: "support@trustlock.app", role: "Admin", badge: "Admin" },
    { id: "demo-buyer-1", name: "Michael Evans", email: "michael@sandbox.test", role: "Buyer", badge: "Buyer", tlId: "TL-B-0042" },
    { id: "demo-buyer-2", name: "Amara Johnson", email: "amara@sandbox.test", role: "Buyer", badge: "Buyer", tlId: "TL-B-0089" },
    { id: "demo-buyer-3", name: "Trade Corp Inc.", email: "ops@tradecorp.test", role: "Buyer", badge: "Buyer", tlId: "TL-B-0115" },
    { id: "demo-lender-1", name: "Kwame Asante", email: "kwame@equityafrica.test", role: "Lender", badge: "Lender", company: "Equity Africa Finance", tlId: "TL-L-0003" },
  ],
  buyer: [
    { id: "demo-admin", name: "TrustLock Admin Support", email: "support@trustlock.app", role: "Admin", badge: "Admin" },
    { id: "demo-vendor-1", name: "Kente Craft Ltd", email: "vendor@sandbox.trustlock.test", role: "Vendor", badge: "Vendor", tlId: "TL-V-0001" },
    { id: "demo-vendor-2", name: "AfroCraft Designs", email: "hello@afrocraft.test", role: "Vendor", badge: "Vendor", tlId: "TL-V-0017" },
    { id: "demo-lender-1", name: "Kwame Asante", email: "kwame@equityafrica.test", role: "Lender", badge: "Lender", company: "Equity Africa Finance", tlId: "TL-L-0003" },
  ],
  lender: [
    { id: "demo-admin", name: "TrustLock Admin Support", email: "support@trustlock.app", role: "Admin", badge: "Admin" },
    { id: "demo-vendor-1", name: "Kente Craft Ltd", email: "vendor@sandbox.trustlock.test", role: "Vendor", badge: "Vendor", tlId: "TL-V-0001" },
    { id: "demo-buyer-1", name: "Michael Evans", email: "michael@sandbox.test", role: "Buyer", badge: "Buyer", tlId: "TL-B-0042" },
  ],
};

/* ──────── Demo threads per role ──────── */
interface DemoThread {
  id: string;
  contactId: string;
  subject: string;
  category: string;
  lastMessageAt: string;
  unread: number;
  messages: { sender: "me" | "them" | "system"; body: string; time: string; attachments?: { name: string; type: string; size: string }[] }[];
}

const VENDOR_THREADS: DemoThread[] = [
  {
    id: "t1", contactId: "demo-buyer-1", subject: "Kente Cloth — Color Confirmation", category: "milestone",
    lastMessageAt: "2h ago", unread: 1,
    messages: [
      { sender: "them", body: "Hi, I wanted to confirm the gold and black pattern for my 3-yard order. Can you share a sample photo?", time: "Today, 10:15 AM" },
      { sender: "me", body: "Sure! Here's the sample swatch for your approval.", time: "Today, 10:42 AM", attachments: [{ name: "kente-swatch-gold-black.jpg", type: "image/jpeg", size: "1.2 MB" }] },
      { sender: "them", body: "That looks perfect! Please proceed with production.", time: "Today, 11:05 AM" },
    ],
  },
  {
    id: "t2", contactId: "demo-admin", subject: "KYC Verification Question", category: "kyc",
    lastMessageAt: "1d ago", unread: 0,
    messages: [
      { sender: "me", body: "My business license was rejected. It's a valid document issued by the Accra Metropolitan Assembly. Can you review again?", time: "Yesterday, 2:30 PM" },
      { sender: "them", body: "We've escalated your document to our compliance team for a second review. You'll receive a notification within 24 hours.", time: "Yesterday, 3:15 PM" },
    ],
  },
  {
    id: "t3", contactId: "demo-lender-1", subject: "Financing Application Status", category: "general",
    lastMessageAt: "3d ago", unread: 0,
    messages: [
      { sender: "them", body: "Your financing application for $15,000 has been received. We're reviewing your transaction history and lender certificate.", time: "3 days ago" },
      { sender: "me", body: "Thank you. Please let me know if you need any additional documents.", time: "3 days ago" },
      { sender: "them", body: "We'll need your latest quarterly revenue report. You can attach it here.", time: "2 days ago" },
      { sender: "me", body: "Here it is — Q3 2025 revenue report.", time: "2 days ago", attachments: [{ name: "Q3-2025-Revenue-Report.pdf", type: "application/pdf", size: "842 KB" }] },
    ],
  },
];

const BUYER_THREADS: DemoThread[] = [
  {
    id: "t1", contactId: "demo-vendor-1", subject: "Kente Cloth — Color Confirmation", category: "milestone",
    lastMessageAt: "2h ago", unread: 1,
    messages: [
      { sender: "me", body: "Hi, I wanted to confirm the gold and black pattern for my 3-yard order. Can you share a sample photo?", time: "Today, 10:15 AM" },
      { sender: "them", body: "Sure! Here's the sample swatch for your approval.", time: "Today, 10:42 AM", attachments: [{ name: "kente-swatch-gold-black.jpg", type: "image/jpeg", size: "1.2 MB" }] },
      { sender: "them", body: "Let me know if you'd like any adjustments before we start production.", time: "Today, 10:43 AM" },
    ],
  },
  {
    id: "t2", contactId: "demo-admin", subject: "Delivery Dispute — Order #SBX-ORD-1002", category: "dispute",
    lastMessageAt: "5d ago", unread: 0,
    messages: [
      { sender: "me", body: "The necklace set arrived but one piece was damaged. I've attached a photo of the damage.", time: "5 days ago", attachments: [{ name: "damaged-necklace.png", type: "image/png", size: "2.1 MB" }] },
      { sender: "them", body: "Thank you for reporting this. We've opened a dispute case (DSP-0047) and notified the vendor. You'll receive a resolution within 72 hours.", time: "5 days ago" },
      { sender: "them", body: "Update: The vendor has agreed to send a replacement at no cost. Your escrow remains protected.", time: "4 days ago" },
    ],
  },
];

const LENDER_THREADS: DemoThread[] = [
  {
    id: "t1", contactId: "demo-vendor-1", subject: "Financing Application — Kente Craft Ltd", category: "financing_status",
    lastMessageAt: "2d ago", unread: 0,
    messages: [
      { sender: "me", body: "We've reviewed your application for $15,000 trade financing. Your lender certificate and transaction history look solid.", time: "3 days ago" },
      { sender: "them", body: "Thank you. Please let me know if you need any additional documents.", time: "3 days ago" },
      { sender: "me", body: "We'll need your latest quarterly revenue report to finalize.", time: "2 days ago" },
      { sender: "them", body: "Here it is — Q3 2025 revenue report.", time: "2 days ago", attachments: [{ name: "Q3-2025-Revenue-Report.pdf", type: "application/pdf", size: "842 KB" }] },
    ],
  },
  {
    id: "t2", contactId: "demo-buyer-1", subject: "Payment Confirmation — Order #SBX-ORD-1001", category: "disbursement",
    lastMessageAt: "1d ago", unread: 1,
    messages: [
      { sender: "me", body: "This is a notification that escrow funds for Order #SBX-ORD-1001 ($450) have been released. Partial repayment of $67.50 is now due.", time: "Yesterday, 9:00 AM" },
      { sender: "them", body: "Understood. When is the repayment deadline?", time: "Yesterday, 11:30 AM" },
    ],
  },
  {
    id: "t3", contactId: "demo-admin", subject: "Compliance Hold on Financed Vendor", category: "compliance",
    lastMessageAt: "4d ago", unread: 0,
    messages: [
      { sender: "me", body: "I received a notification that one of my financed vendors (TL-V-0001) has a compliance hold. Can you provide details?", time: "4 days ago" },
      { sender: "them", body: "The hold was triggered by an AML screening flag. The vendor's funds remain in escrow. We're reviewing and will update within 48 hours.", time: "4 days ago" },
    ],
  },
];

const CONTACT_REASONS_DEFAULT = [
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

const CONTACT_REASONS_LENDER = [
  { value: "financing_status", label: "Financing Status Update" },
  { value: "repayment", label: "Repayment Inquiry" },
  { value: "disbursement", label: "Disbursement Confirmation" },
  { value: "exposure_review", label: "Exposure / Portfolio Review" },
  { value: "kyb", label: "KYB / Verification" },
  { value: "certificate", label: "Lender Certificate" },
  { value: "dispute", label: "Dispute — Financed Order" },
  { value: "compliance", label: "Compliance Hold Query" },
  { value: "document", label: "Document Request" },
  { value: "general", label: "General Inquiry" },
  { value: "other", label: "Other" },
];

const ALL_REASONS = [...CONTACT_REASONS_DEFAULT, ...CONTACT_REASONS_LENDER];

/* ──────── Component ──────── */
const SandboxMessages = () => {
  const session = useOutletContext<{ role: string; name: string }>();
  const role = session.role as "vendor" | "buyer" | "lender";
  const contacts = DEMO_CONTACTS[role] || DEMO_CONTACTS.vendor;
  const contactReasons = role === "lender" ? CONTACT_REASONS_LENDER : CONTACT_REASONS_DEFAULT;
  const demoThreads = role === "vendor" ? VENDOR_THREADS : role === "buyer" ? BUYER_THREADS : LENDER_THREADS;

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [localReplies, setLocalReplies] = useState<Record<string, { sender: "me"; body: string; time: string }[]>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeCategory, setComposeCategory] = useState("general");
  const [composeBody, setComposeBody] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");

  const selectedThread = demoThreads.find((t) => t.id === selectedThreadId) || null;
  const getContact = (id: string) => contacts.find((c) => c.id === id);

  const filteredContacts = recipientSearch.trim().length >= 1
    ? contacts.filter((c) =>
        [c.name, c.email, c.company, c.tlId].filter(Boolean).join(" ").toLowerCase().includes(recipientSearch.toLowerCase())
      )
    : contacts;

  const handleSend = () => {
    if (!newMessage.trim() || !selectedThreadId) return;
    setLocalReplies((prev) => ({
      ...prev,
      [selectedThreadId]: [...(prev[selectedThreadId] || []), { sender: "me", body: newMessage.trim(), time: "Just now" }],
    }));
    setNewMessage("");
  };

  const handleCompose = () => {
    if (!composeRecipient || !composeBody.trim()) return;
    // In sandbox, just show a toast-like effect
    setComposeOpen(false);
    setComposeRecipient("");
    setComposeSubject("");
    setComposeCategory("general");
    setComposeBody("");
    setRecipientSearch("");
  };

  const badgeColor: Record<string, string> = {
    Admin: "bg-destructive/10 text-destructive border-destructive/20",
    Vendor: "bg-primary/10 text-primary border-primary/20",
    Buyer: "bg-accent/10 text-accent-foreground border-accent/20",
    Lender: "bg-secondary text-secondary-foreground border-secondary",
  };

  /* ── Thread View ── */
  if (selectedThread) {
    const contact = getContact(selectedThread.contactId);
    const extras = localReplies[selectedThread.id] || [];
    const allMessages = [...selectedThread.messages, ...extras];
    return (
      <div className="h-[calc(100dvh-14rem)] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => setSelectedThreadId(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {contact?.role === "Admin" && <Shield className="w-3 h-3 text-primary shrink-0" />}
              <p className="text-sm font-medium truncate">{contact?.name}</p>
              {contact?.badge && (
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", badgeColor[contact.badge])}>
                  {contact.badge}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              {selectedThread.subject} · {ALL_REASONS.find((r) => r.value === selectedThread.category)?.label || selectedThread.category}
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-3">
            {allMessages.map((msg, i) => {
              const isMine = msg.sender === "me";
              return (
                <div key={i} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-sm", isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    {msg.attachments?.map((att, j) => (
                      <div key={j} className={cn("flex items-center gap-1.5 mt-1 px-2 py-1 rounded-md text-[10px]",
                        isMine ? "bg-primary-foreground/10 text-primary-foreground" : "bg-foreground/5 text-foreground")}>
                        {att.type.startsWith("image/") ? <Image className="w-3.5 h-3.5 shrink-0" /> : <FileText className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate max-w-[120px]">{att.name}</span>
                        <span className="opacity-60">{att.size}</span>
                        <Download className="w-3 h-3 opacity-60" />
                      </div>
                    ))}
                    <p className={cn("text-[9px] mt-1", isMine ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>{msg.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Reply */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="w-9 h-9 shrink-0 self-end" title="Attach files (demo)">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[120px] text-sm resize-none flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="shrink-0 self-end">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Thread List ── */
  return (
    <div className="h-[calc(100dvh-14rem)] border border-border rounded-lg bg-background overflow-hidden flex flex-col">
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
              {/* Recipient */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">To</label>
                <div className="space-y-1.5">
                  {/* Admin auto-chip */}
                  {!composeRecipient && !recipientSearch.trim() && (
                    <button
                      onClick={() => { setComposeRecipient("demo-admin"); setRecipientSearch(""); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/10 text-xs hover:bg-primary/20 transition-colors border border-primary/20 w-full text-left"
                    >
                      <Shield className="w-3.5 h-3.5 text-primary" />
                      <span>TrustLock Admin Support</span>
                      <Badge variant="outline" className={cn("text-[9px] ml-auto", badgeColor.Admin)}>Admin</Badge>
                    </button>
                  )}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={recipientSearch}
                      onChange={(e) => { setRecipientSearch(e.target.value); setComposeRecipient(""); }}
                      placeholder="Search by name, company, email, or ID..."
                      className="h-9 text-sm pl-8"
                    />
                  </div>
                  {/* Selected recipient chip */}
                  {composeRecipient && (() => {
                    const c = contacts.find((x) => x.id === composeRecipient);
                    return c ? (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted text-xs">
                        {c.role === "Admin" && <Shield className="w-3 h-3 text-primary" />}
                        <span className="font-medium">{c.name}</span>
                        {c.badge && <Badge variant="outline" className={cn("text-[9px] px-1 py-0", badgeColor[c.badge])}>{c.badge}</Badge>}
                        <button onClick={() => { setComposeRecipient(""); setRecipientSearch(""); }} className="ml-auto text-muted-foreground hover:text-foreground text-[10px]">✕</button>
                      </div>
                    ) : null;
                  })()}
                  {/* Search results */}
                  {recipientSearch.trim().length >= 1 && !composeRecipient && (
                    <ScrollArea className="max-h-40 border border-border rounded-md">
                      {filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setComposeRecipient(c.id); setRecipientSearch(""); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 transition-colors border-b border-border last:border-0 flex items-center gap-2"
                        >
                          {c.role === "Admin" && <Shield className="w-3 h-3 text-primary shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <span className="truncate block font-medium">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {[c.company, c.email, c.tlId].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                          {c.badge && <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", badgeColor[c.badge])}>{c.badge}</Badge>}
                        </button>
                      ))}
                      {filteredContacts.length === 0 && (
                        <p className="text-[10px] text-muted-foreground p-3">No users found</p>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </div>
              {/* Category */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Select value={composeCategory} onValueChange={setComposeCategory}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contactReasons.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Subject */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <Input
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Brief description"
                  className="h-9 text-sm"
                />
              </div>
              {/* Body */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                <Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Type your message..." className="min-h-[100px] text-sm" />
              </div>
              {/* Attach hint */}
              <div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                  <Paperclip className="w-3.5 h-3.5" /> Attach Files <span className="text-muted-foreground">(0/5)</span>
                </Button>
                <p className="text-[9px] text-muted-foreground mt-1">PDF, JPEG, PNG · Max 10MB each · Up to 5 files</p>
              </div>
              <Button onClick={handleCompose} className="w-full" disabled={!composeRecipient || !composeBody.trim()}>
                Send Message
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {demoThreads.map((thread) => {
            const contact = getContact(thread.contactId);
            return (
              <button
                key={thread.id}
                onClick={() => setSelectedThreadId(thread.id)}
                className="w-full text-left px-3 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                    {contact?.role === "Admin" && <Shield className="w-3 h-3 text-primary shrink-0" />}
                    {contact?.name || "Unknown"}
                    {contact?.badge && (
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", badgeColor[contact.badge])}>
                        {contact.badge}
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {thread.unread > 0 && (
                      <Badge className="text-[9px] px-1.5 py-0 min-w-[18px] justify-center">{thread.unread}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{thread.lastMessageAt}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                    {ALL_REASONS.find((r) => r.value === thread.category)?.label || thread.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground truncate">{thread.subject}</span>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SandboxMessages;

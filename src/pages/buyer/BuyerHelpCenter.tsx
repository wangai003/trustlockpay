import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldCheck, Package, AlertTriangle, Clock, FileText, MessageSquare, CheckCircle
} from "lucide-react";

const guides = [
  {
    title: "How Your Money Is Protected",
    icon: ShieldCheck,
    steps: [
      "When you pay, your money goes into a secure escrow — NOT to the vendor",
      "Funds are held in a smart contract on the blockchain",
      "Only released when you confirm you received what you ordered",
      "If something goes wrong, you can file a dispute before release",
      "TrustLock acts as a neutral third party to protect both sides",
    ],
  },
  {
    title: "Tracking Your Orders",
    icon: Package,
    steps: [
      "Go to 'My Orders' to see all your transactions",
      "Each order shows a 4-step progress: Paid → Shipped → Delivered → Released",
      "You'll receive Email/SMS notifications at each stage",
      "Overview dashboard shows funds currently in escrow",
      "'Action Required' alerts highlight orders needing your attention",
    ],
  },
  {
    title: "Confirming Delivery",
    icon: CheckCircle,
    steps: [
      "When your order arrives, go to My Orders → click 'Confirm Receipt'",
      "Or use the confirmation link sent to your Email/SMS (no login needed)",
      "Once confirmed, funds are released to the vendor",
      "This action is final — make sure you're satisfied first",
      "If something is wrong, file a dispute BEFORE confirming",
    ],
  },
  {
    title: "The 48-Hour Auto-Release",
    icon: Clock,
    steps: [
      "When the vendor marks your order as 'Delivered', a 48-hour countdown starts",
      "You'll get notifications at 48h, 24h, and 6h remaining",
      "If you don't confirm OR dispute within 48 hours, funds auto-release",
      "This protects vendors from being held up indefinitely",
      "Always check your orders promptly when you receive delivery notifications",
    ],
  },
  {
    title: "Filing a Dispute",
    icon: AlertTriangle,
    steps: [
      "Go to My Orders → Find the order → Click 'Dispute'",
      "Select a reason: Item not received, not as described, quality issue, etc.",
      "Upload evidence: photos, screenshots, or correspondence",
      "Your dispute gets a ticket number (AZ-DSP-YYYY-XXXX)",
      "Vendor has 48 hours to respond, then AI + Admin review evidence",
    ],
  },
  {
    title: "Your Documents",
    icon: FileText,
    steps: [
      "Access policies and guides in the Documents tab",
      "Upload receipts or evidence for disputes",
      "Max 5 files, 50MB total storage",
      "For larger files, use the Message Inbox to send to support",
      "All uploaded documents are stored for 6 months",
    ],
  },
  {
    title: "Using the Support Assistant",
    icon: MessageSquare,
    steps: [
      "Click 'Support Assistant' in the sidebar for instant help",
      "Ask about orders, escrow protection, disputes, or platform features",
      "The AI assistant is completely free for buyers",
      "If the AI can't resolve your issue, it'll suggest contacting Admin",
      "Use Contact Admin for complex issues requiring human review",
    ],
  },
];

const BuyerHelpCenter = () => (
  <div>
    <BuyerHeader title="Help Center" />
    <div className="p-3 sm:p-6 space-y-6 max-w-4xl">
      <div>
        <h2 className="font-heading text-lg font-bold">How TrustLock Protects You</h2>
        <p className="text-sm text-muted-foreground">Everything you need to know about using TrustLock as a buyer.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <guide.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">{guide.title}</h3>
              </div>
              <ol className="space-y-2 pl-1">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

export default BuyerHelpCenter;

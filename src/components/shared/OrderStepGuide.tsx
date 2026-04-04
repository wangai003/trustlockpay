import { Badge } from "@/components/ui/badge";
import { Info, Truck, PackageCheck, CheckCircle, AlertTriangle, Clock, FileText, Unlock } from "lucide-react";

interface OrderStepGuideProps {
  status: string;
  role: "vendor" | "buyer" | "admin";
  industry?: string | null;
}

const VENDOR_GUIDANCE: Record<string, { title: string; description: string; icon: any; color: string }> = {
  locked: {
    title: "Funds are locked in escrow",
    description: "The buyer has paid. Review the order details, prepare the item/service, then click 'Ship' when ready. Add a tracking number if shipping physical goods.",
    icon: Clock,
    color: "bg-accent/10 border-accent/20 text-accent-foreground",
  },
  shipped: {
    title: "Order shipped — awaiting delivery",
    description: "You've marked this order as shipped. The buyer will confirm delivery once received. Click 'Delivered' when you have proof of delivery.",
    icon: Truck,
    color: "bg-primary/10 border-primary/20 text-primary",
  },
  delivered: {
    title: "Delivery confirmed — awaiting release",
    description: "The buyer has been notified. They need to confirm receipt and release funds. If the buyer doesn't respond, funds auto-release after the protection period.",
    icon: PackageCheck,
    color: "bg-primary/10 border-primary/20 text-primary",
  },
  released: {
    title: "Funds released — order complete",
    description: "Payment has been released to your account. Check your Payout tab for withdrawal options.",
    icon: CheckCircle,
    color: "bg-primary/10 border-primary/20 text-primary",
  },
  disputed: {
    title: "Order is under dispute",
    description: "A dispute has been filed. Provide evidence and documentation in the Disputes tab. An admin will review and mediate.",
    icon: AlertTriangle,
    color: "bg-destructive/10 border-destructive/20 text-destructive",
  },
};

const BUYER_GUIDANCE: Record<string, { title: string; description: string; icon: any; color: string }> = {
  locked: {
    title: "Your payment is secured in escrow",
    description: "The vendor has been notified. They will prepare and ship your order. You can track progress here or file a dispute if there's an issue.",
    icon: Clock,
    color: "bg-accent/10 border-accent/20 text-accent-foreground",
  },
  shipped: {
    title: "Order has been shipped",
    description: "The vendor has shipped your order. Track delivery using the tracking number provided. Once you receive it, click 'Confirm Delivery'.",
    icon: Truck,
    color: "bg-primary/10 border-primary/20 text-primary",
  },
  delivered: {
    title: "Confirm receipt and release funds",
    description: "The vendor marked this as delivered. Inspect the goods/services. If satisfactory, click 'Release Funds' to pay the vendor. If not, file a dispute.",
    icon: Unlock,
    color: "bg-accent/10 border-accent/20 text-accent-foreground",
  },
  released: {
    title: "Order complete — funds released",
    description: "You've confirmed delivery and released funds. This order is complete. You can view receipts and documents in your Documents tab.",
    icon: CheckCircle,
    color: "bg-primary/10 border-primary/20 text-primary",
  },
  disputed: {
    title: "Dispute in progress",
    description: "Your dispute is being reviewed. Upload supporting evidence in the Disputes tab. An admin will mediate and reach a resolution.",
    icon: AlertTriangle,
    color: "bg-destructive/10 border-destructive/20 text-destructive",
  },
};

const ADMIN_GUIDANCE: Record<string, { title: string; description: string; icon: any; color: string }> = {
  locked: { title: "Funds locked", description: "Awaiting vendor action.", icon: Clock, color: "bg-accent/10 border-accent/20 text-accent-foreground" },
  shipped: { title: "Shipped", description: "Awaiting buyer delivery confirmation.", icon: Truck, color: "bg-primary/10 border-primary/20 text-primary" },
  delivered: { title: "Delivered", description: "Awaiting buyer fund release.", icon: PackageCheck, color: "bg-primary/10 border-primary/20 text-primary" },
  released: { title: "Complete", description: "Order finalized.", icon: CheckCircle, color: "bg-primary/10 border-primary/20 text-primary" },
  disputed: { title: "Disputed", description: "Requires mediation.", icon: AlertTriangle, color: "bg-destructive/10 border-destructive/20 text-destructive" },
  compliance_hold: { title: "Compliance Hold", description: "Transaction frozen. Review compliance details and take action.", icon: AlertTriangle, color: "bg-destructive/10 border-destructive/20 text-destructive" },
};

const OrderStepGuide = ({ status, role, industry }: OrderStepGuideProps) => {
  const guidanceMap = role === "vendor" ? VENDOR_GUIDANCE : role === "buyer" ? BUYER_GUIDANCE : ADMIN_GUIDANCE;
  const guidance = guidanceMap[status];

  if (!guidance) return null;

  const Icon = guidance.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${guidance.color}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{guidance.title}</p>
        <p className="mt-0.5 opacity-80">{guidance.description}</p>
      </div>
      <Badge variant="outline" className="text-[9px] shrink-0">{status}</Badge>
    </div>
  );
};

export default OrderStepGuide;

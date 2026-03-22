import { useState } from "react";
import { Bell, CheckCircle, AlertTriangle, ArrowLeftRight, DollarSign, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "transaction";
  time: string;
  read: boolean;
}

const vendorNotifications: Notification[] = [
  { id: "n1", title: "New Order Received", message: "James O. placed order TL-2026-0891 for $200.00 — Kente Cloth Set", type: "transaction", time: "2 min ago", read: false },
  { id: "n2", title: "Payment Released", message: "Funds for TL-2026-0892 ($4,500.00) have been released to your account", type: "success", time: "1 hour ago", read: false },
  { id: "n3", title: "Dispute Filed", message: "Buyer Amara D. filed a dispute on TL-2026-0894 — Custom Fabric", type: "warning", time: "3 hours ago", read: false },
  { id: "n4", title: "Plan Reminder", message: "Your Starter plan renews in 14 days. Renew to avoid downgrade.", type: "info", time: "1 day ago", read: true },
  { id: "n5", title: "Order Confirmed", message: "Buyer Emmanuel K. confirmed delivery for TL-2026-0896", type: "success", time: "1 day ago", read: true },
];

const buyerNotifications: Notification[] = [
  { id: "n1", title: "Order Shipped", message: "Kente Craft Ltd shipped your order TL-2026-0896 — tracking: GH2026XYZ", type: "transaction", time: "5 min ago", read: false },
  { id: "n2", title: "Delivery Confirmed", message: "Funds for TL-2026-0889 ($120.00) released to vendor after your confirmation", type: "success", time: "2 hours ago", read: false },
  { id: "n3", title: "Dispute Update", message: "Emmanuel AI is reviewing your dispute on TL-2026-0894. Evidence received.", type: "info", time: "5 hours ago", read: false },
  { id: "n4", title: "Action Required", message: "Order TL-2026-0892 delivered. Confirm delivery within 48hrs or auto-release.", type: "warning", time: "1 day ago", read: true },
];

const adminNotifications: Notification[] = [
  { id: "n1", title: "New Dispute", message: "Dispute filed on TL-2026-0894 between Amara D. and Kente Craft Ltd", type: "warning", time: "3 hours ago", read: false },
  { id: "n2", title: "Vendor KYC Submitted", message: "GreenFarm Co submitted Tier 2 KYC verification documents", type: "info", time: "4 hours ago", read: false },
  { id: "n3", title: "High Volume Alert", message: "Daily transaction volume exceeded $50,000 threshold", type: "transaction", time: "6 hours ago", read: false },
  { id: "n4", title: "Emmanuel AI Resolution", message: "Emmanuel auto-resolved dispute TL-2026-0887 in favor of buyer", type: "success", time: "1 day ago", read: true },
  { id: "n5", title: "Vendor Plan Expired", message: "Safari Dreams vendor plan expired — reverted to Basic", type: "warning", time: "2 days ago", read: true },
];

const notifMap = { vendor: vendorNotifications, buyer: buyerNotifications, admin: adminNotifications };

const typeIcons = {
  success: CheckCircle,
  warning: AlertTriangle,
  info: Shield,
  transaction: ArrowLeftRight,
};

const typeColors = {
  success: "text-primary",
  warning: "text-accent",
  info: "text-blue-500",
  transaction: "text-foreground",
};

const NotificationCenter = ({ role }: { role: "vendor" | "buyer" | "admin" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(notifMap[role]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                notifications.map(n => {
                  const Icon = typeIcons[n.type];
                  return (
                    <div key={n.id} className={cn("p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors", !n.read && "bg-primary/5")}>
                      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", typeColors[n.type])} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground mt-1">{n.time}</p>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;

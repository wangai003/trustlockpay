import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle, AlertTriangle, ArrowLeftRight, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "transaction";
  time: string;
  read: boolean;
}

// --- Testnet mock data (unchanged) ---
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

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function mapDbType(type: string): Notification["type"] {
  if (type === "success" || type === "warning" || type === "info" || type === "transaction") return type;
  if (type === "dispute" || type === "alert") return "warning";
  if (type === "payment" || type === "order") return "transaction";
  return "info";
}

// AI triage priority levels
const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function triagePriority(n: Notification): keyof typeof priorityOrder {
  const text = `${n.title} ${n.message}`.toLowerCase();
  // Critical: fraud, sanctions, arbitration, $10k+
  if (text.includes("sanction") || text.includes("fraud") || text.includes("arbitrat") || text.includes("blocked")) return "critical";
  if (/\$\d{2,3},\d{3}/.test(text) || /\$\d{5,}/.test(text.replace(/,/g, ""))) return "critical";
  // High: disputes, observer failures, escalation
  if (n.type === "warning" || text.includes("dispute") || text.includes("escalat") || text.includes("observer")) return "high";
  // Medium: KYC, payouts, milestones
  if (text.includes("kyc") || text.includes("payout") || text.includes("milestone") || text.includes("verification")) return "medium";
  // Low: confirmations, routine
  return "low";
}

const priorityLabels: Record<string, { label: string; color: string }> = {
  critical: { label: "CRITICAL", color: "bg-destructive text-destructive-foreground" },
  high: { label: "HIGH", color: "bg-accent/20 text-accent-foreground" },
  medium: { label: "MED", color: "bg-muted text-muted-foreground" },
  low: { label: "LOW", color: "bg-muted text-muted-foreground" },
};

const NotificationCenter = ({ role }: { role: "vendor" | "buyer" | "admin" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(notifMap[role]);
  const [isMainnet, setIsMainnet] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      setNotifications(
        data.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message || "",
          type: mapDbType(n.type),
          time: formatTimeAgo(n.created_at),
          read: n.is_read,
        }))
      );
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Testnet fallback — use mock data
        setNotifications(notifMap[role]);
        return;
      }

      setIsMainnet(true);
      const userId = session.user.id;
      await fetchNotifications(userId);

      // Subscribe to realtime inserts
      channel = supabase
        .channel(`notifications-${role}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as any;
            setNotifications((prev) => [
              {
                id: n.id,
                title: n.title,
                message: n.message || "",
                type: mapDbType(n.type),
                time: formatTimeAgo(n.created_at),
                read: n.is_read,
              },
              ...prev,
            ]);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [role, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => !n.read && triagePriority(n) === "critical").length;

  // Sort by priority then recency
  const sortedNotifications = useMemo(() => {
    const filtered = filterPriority
      ? notifications.filter((n) => triagePriority(n) === filterPriority)
      : notifications;
    return [...filtered].sort((a, b) => {
      const pa = priorityOrder[triagePriority(a)];
      const pb = priorityOrder[triagePriority(b)];
      if (pa !== pb) return pa - pb;
      return a.read === b.read ? 0 : a.read ? 1 : -1;
    });
  }, [notifications, filterPriority]);

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (isMainnet) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (isMainnet) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }
    }
  };

  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
            criticalCount > 0 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-destructive text-destructive-foreground"
          )}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold">
                Notifications
                {criticalCount > 0 && (
                  <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold">
                    {criticalCount} CRITICAL
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>
                )}
              </div>
            </div>

            {/* Priority filter tabs */}
            {role === "admin" && (
              <div className="flex gap-1 px-3 py-2 border-b border-border">
                {[null, "critical", "high", "medium", "low"].map((p) => (
                  <button
                    key={p || "all"}
                    onClick={() => setFilterPriority(p)}
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-medium transition-colors",
                      filterPriority === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {p ? p.toUpperCase() : "ALL"}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {sortedNotifications.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                sortedNotifications.map((n) => {
                  const Icon = typeIcons[n.type];
                  const prio = triagePriority(n);
                  const prioMeta = priorityLabels[prio];
                  return (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        "p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer",
                        !n.read && "bg-primary/5",
                        !n.read && prio === "critical" && "bg-destructive/5 border-l-2 border-destructive"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", typeColors[n.type])} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={cn("text-xs flex-1", !n.read && "font-semibold")}>{n.title}</p>
                          <span className={cn("text-[8px] px-1 py-0.5 rounded font-bold shrink-0", prioMeta.color)}>
                            {prioMeta.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-[9px] text-muted-foreground mt-1">{n.time}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} className="text-muted-foreground hover:text-foreground shrink-0">
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

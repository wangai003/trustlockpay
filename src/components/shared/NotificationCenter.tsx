import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle, X, Trash2, ChevronDown, ChevronUp, ExternalLink, Copy, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ─── Types ─────────────────────────────────────────────── */
type Priority = "critical" | "high" | "medium" | "low";

interface DbNotification {
  id: string;
  title: string;
  message: string | null;
  type: string; // priority stored here by triage engine
  is_read: boolean;
  created_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  user_id: string;
  is_action_required?: boolean;
  action_url?: string | null;
  action_completed_at?: string | null;
}

/* ─── Priority meta ─────────────────────────────────────── */
const priorityMeta: Record<Priority, { label: string; badgeCls: string; borderCls: string; Icon: typeof AlertOctagon }> = {
  critical: { label: "CRITICAL", badgeCls: "bg-destructive text-destructive-foreground", borderCls: "border-l-2 border-destructive bg-destructive/5", Icon: AlertOctagon },
  high:     { label: "HIGH",     badgeCls: "bg-orange-500/20 text-orange-700 dark:text-orange-400", borderCls: "border-l-2 border-orange-500 bg-orange-500/5", Icon: AlertTriangle },
  medium:   { label: "MED",      badgeCls: "bg-blue-500/20 text-blue-700 dark:text-blue-400", borderCls: "", Icon: Info },
  low:      { label: "LOW",      badgeCls: "bg-muted text-muted-foreground", borderCls: "", Icon: CheckCircle },
};

const TABS: (Priority | "all")[] = ["all", "critical", "high", "medium", "low"];

function toPriority(type: string): Priority {
  if (type === "critical" || type === "high" || type === "medium" || type === "low") return type;
  return "low";
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Testnet mock data ─────────────────────────────────── */
const mockNotifications: Record<string, DbNotification[]> = {
  vendor: [
    { id: "m1", title: "🚨 Sanctions Block", message: "Buyer flagged by OFAC list — transaction blocked", type: "critical", is_read: false, created_at: new Date(Date.now() - 120000).toISOString(), related_entity_type: "sanctions_block", related_entity_id: null, user_id: "" },
    { id: "m2", title: "⚠️ Dispute Opened", message: "Amara D. filed a dispute on TL-2026-0894", type: "high", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString(), related_entity_type: "dispute_opened", related_entity_id: null, user_id: "" },
    { id: "m3", title: "✅ Milestone Completed", message: "Inspection milestone completed for TL-2026-0891", type: "medium", is_read: false, created_at: new Date(Date.now() - 7200000).toISOString(), related_entity_type: "milestone_completed", related_entity_id: null, user_id: "" },
    { id: "m4", title: "⚙️ Settings Updated", message: "Auto-delivery preference changed", type: "low", is_read: true, created_at: new Date(Date.now() - 86400000).toISOString(), related_entity_type: "settings_changed", related_entity_id: null, user_id: "" },
  ],
  buyer: [
    { id: "m1", title: "💰 Milestone Payment Released", message: "Payment for Shipping milestone released", type: "high", is_read: false, created_at: new Date(Date.now() - 300000).toISOString(), related_entity_type: "milestone_payment_release", related_entity_id: null, user_id: "" },
    { id: "m2", title: "📄 Document Uploaded", message: "Bill of Lading uploaded for TL-2026-0896", type: "medium", is_read: false, created_at: new Date(Date.now() - 5400000).toISOString(), related_entity_type: "document_uploaded", related_entity_id: null, user_id: "" },
    { id: "m3", title: "⏱️ Auto-Release Countdown", message: "48hr countdown started for TL-2026-0892", type: "high", is_read: false, created_at: new Date(Date.now() - 86400000).toISOString(), related_entity_type: "auto_release_countdown", related_entity_id: null, user_id: "" },
    { id: "m4", title: "👤 Profile Updated", message: "Your location was updated", type: "low", is_read: true, created_at: new Date(Date.now() - 172800000).toISOString(), related_entity_type: "profile_updated", related_entity_id: null, user_id: "" },
  ],
  admin: [
    { id: "m1", title: "🚨 Fraud Alert", message: "Suspicious activity detected on vendor account VND-0042", type: "critical", is_read: false, created_at: new Date(Date.now() - 60000).toISOString(), related_entity_type: "fraud_alert", related_entity_id: null, user_id: "" },
    { id: "m2", title: "🚨 Escrow Release Failed", message: "Smart contract release failed for TL-2026-0900", type: "critical", is_read: false, created_at: new Date(Date.now() - 180000).toISOString(), related_entity_type: "escrow_release_failure", related_entity_id: null, user_id: "" },
    { id: "m3", title: "❌ KYC Rejected", message: "GreenFarm Co KYC tier 2 rejected — missing documents", type: "high", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString(), related_entity_type: "kyc_rejection", related_entity_id: null, user_id: "" },
    { id: "m4", title: "💸 Payout Processed", message: "$4,500 payout completed for Kente Craft Ltd", type: "medium", is_read: false, created_at: new Date(Date.now() - 14400000).toISOString(), related_entity_type: "payout_processed", related_entity_id: null, user_id: "" },
    { id: "m5", title: "🔐 Login Detected", message: "Admin login from new IP address", type: "low", is_read: true, created_at: new Date(Date.now() - 86400000).toISOString(), related_entity_type: "login", related_entity_id: null, user_id: "" },
  ],
};

/* ─── Component ─────────────────────────────────────────── */
const NotificationCenter = ({ role }: { role: "vendor" | "buyer" | "admin" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [activeTab, setActiveTab] = useState<Priority | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isMainnet, setIsMainnet] = useState(false);
  const [loading, setLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);
  

  /* ── Fetch via edge function ──────────────────────────── */
  const fetchTriaged = useCallback(async (userId: string, fallbackRole: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("notification-triage", {
        body: { action: "get_triaged", user_id: userId, include_read: true },
      });
      if (!error && data?.success) {
        const all: DbNotification[] = [];
        for (const prio of ["critical", "high", "medium", "low", "other"]) {
          if (data.grouped?.[prio]) all.push(...data.grouped[prio]);
        }
        if (all.length > 0) {
          setNotifications(all);
          return;
        }
      }
      // Fall back to mock data if edge function returns empty or fails
      setNotifications(mockNotifications[fallbackRole] || []);
    } catch (e) {
      console.error("notification-triage fetch error:", e);
      setNotifications(mockNotifications[fallbackRole] || []);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Critical notifications are only shown inside the notification panel ── */

  /* ── Init + realtime ──────────────────────────────────── */
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setNotifications(mockNotifications[role] || []);
        return;
      }

      setIsMainnet(true);
      const userId = session.user.id;
      userIdRef.current = userId;
      await fetchTriaged(userId, role);

      // Realtime subscription — admin sees all, others see own
      const channelConfig: any = {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      };
      if (role !== "admin") {
        channelConfig.filter = `user_id=eq.${userId}`;
      }

      channel = supabase
        .channel(`notif-triage-${role}`)
        .on("postgres_changes", channelConfig, (payload) => {
          const n = payload.new as DbNotification;
          setNotifications((prev) => {
            if (prev.some((x) => x.id === n.id)) return prev;
            return [n, ...prev];
          });
          // Critical notifications handled inside panel only
        })
        .subscribe();
    };

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [role, fetchTriaged]);


  /* ── Counts ───────────────────────────────────────────── */
  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const n of notifications) {
      if (n.is_read) continue;
      c.all++;
      c[toPriority(n.type)]++;
    }
    return c;
  }, [notifications]);

  /* ── Filtered list ────────────────────────────────────── */
  const filtered = useMemo(() => {
    const list = activeTab === "all" ? notifications : notifications.filter((n) => toPriority(n.type) === activeTab);
    return list.slice(0, 100);
  }, [notifications, activeTab]);

  /* ── Actions ──────────────────────────────────────────── */
  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    if (isMainnet) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    if (isMainnet) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }
    }
  };

  const dismissLow = async () => {
    const lowIds = notifications.filter((n) => !n.is_read && toPriority(n.type) === "low").map((n) => n.id);
    if (lowIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => lowIds.includes(n.id) ? { ...n, is_read: true } : n));
    if (isMainnet && userIdRef.current) {
      await supabase.functions.invoke("notification-triage", {
        body: { action: "bulk_dismiss", user_id: userIdRef.current, priority: "low" },
      });
    }
    toast.success(`Dismissed ${lowIds.length} low-priority notifications`);
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (isMainnet) {
      supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="relative">
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {counts.all > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center",
            counts.critical > 0 ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-destructive text-destructive-foreground"
          )}>
            {counts.all}
          </span>
        )}
        {/* Priority sub-badges */}
        {counts.critical > 0 && (
          <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-destructive animate-ping" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Notifications
                {counts.critical > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground font-bold animate-pulse">
                    {counts.critical} CRITICAL
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {counts.low > 0 && (
                  <button onClick={dismissLow} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5" title="Dismiss all low priority">
                    <Trash2 className="w-3 h-3" /> Low
                  </button>
                )}
                {counts.all > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">Mark all read</button>
                )}
                <button onClick={() => setOpen(false)} className="ml-1 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Close notifications">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
              {TABS.map((tab) => {
                const count = tab === "all" ? counts.all : counts[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded-full font-medium transition-colors shrink-0 flex items-center gap-1",
                      activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {tab === "all" ? "ALL" : tab.toUpperCase()}
                    {count > 0 && (
                      <span className={cn(
                        "text-[8px] min-w-[14px] h-3.5 rounded-full flex items-center justify-center px-1",
                        activeTab === tab ? "bg-primary-foreground/20" : (tab === "critical" ? "bg-destructive/20 text-destructive" : tab === "high" ? "bg-orange-500/20 text-orange-600" : "bg-muted-foreground/20")
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {loading ? (
                <p className="p-6 text-center text-sm text-muted-foreground animate-pulse">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">No notifications</p>
              ) : (
                filtered.map((n) => {
                  const prio = toPriority(n.type);
                  const meta = priorityMeta[prio];
                  const PrioIcon = meta.Icon;
                  const isExpanded = expandedId === n.id;
                  return (
                    <div key={n.id} className="border-b border-border last:border-0">
                      <div
                        onClick={() => {
                          markRead(n.id);
                          setExpandedId(isExpanded ? null : n.id);
                        }}
                        className={cn(
                          "p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors cursor-pointer",
                          !n.is_read && "bg-primary/5",
                          !n.is_read && meta.borderCls
                        )}
                      >
                        <PrioIcon className={cn("w-4 h-4 mt-0.5 shrink-0", prio === "critical" ? "text-destructive" : prio === "high" ? "text-orange-500" : prio === "medium" ? "text-blue-500" : "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={cn("text-xs flex-1 truncate", !n.is_read && "font-semibold")}>{n.title}</p>
                            <span className={cn("text-[8px] px-1 py-0.5 rounded font-bold shrink-0", meta.badgeCls)}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[9px] text-muted-foreground">{formatTimeAgo(n.created_at)}</p>
                            {n.related_entity_type && (
                              <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{n.related_entity_type.replace(/_/g, " ")}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                          <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* ── Expanded Detail Panel ── */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-muted/20 border-t border-border space-y-3 animate-in slide-in-from-top-1 duration-200">
                          {/* Full message */}
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Details</p>
                            <p className="text-xs text-foreground">{n.message || "No additional details available."}</p>
                          </div>

                          {/* Metadata grid */}
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="bg-background rounded p-2 border border-border">
                              <p className="text-muted-foreground mb-0.5">Priority</p>
                              <span className={cn("px-1.5 py-0.5 rounded font-bold text-[9px]", meta.badgeCls)}>{meta.label}</span>
                            </div>
                            <div className="bg-background rounded p-2 border border-border">
                              <p className="text-muted-foreground mb-0.5">Category</p>
                              <p className="font-medium text-foreground">{n.related_entity_type?.replace(/_/g, " ") || "General"}</p>
                            </div>
                            <div className="bg-background rounded p-2 border border-border">
                              <p className="text-muted-foreground mb-0.5">Timestamp</p>
                              <p className="font-medium text-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-background rounded p-2 border border-border">
                              <p className="text-muted-foreground mb-0.5">Status</p>
                              <p className="font-medium text-foreground">{n.is_read ? "Read" : "Unread"}</p>
                            </div>
                          </div>

                          {/* Suggested Actions */}
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Actions</p>
                            <div className="flex flex-wrap gap-1.5">
                              {prio === "critical" && (
                                <button
                                  onClick={() => { toast.info("Navigating to related record..."); setOpen(false); }}
                                  className="text-[10px] px-2 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Investigate
                                </button>
                              )}
                              {prio === "high" && (
                                <button
                                  onClick={() => { toast.info("Opening related record..."); setOpen(false); }}
                                  className="text-[10px] px-2 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 font-medium flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> Review
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(`[${n.title}] ${n.message || ""} — ${new Date(n.created_at).toISOString()}`);
                                  toast.success("Notification details copied to clipboard");
                                }}
                                className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                              <button
                                onClick={() => { dismiss(n.id); setExpandedId(null); }}
                                className="text-[10px] px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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

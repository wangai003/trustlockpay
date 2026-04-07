import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

function getAdminAuth() {
  try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}"); } catch { return {}; }
}

/**
 * Returns unread counts for admin sidebar badges:
 * - teamChat: unread dept chat messages
 * - chiefDMs: unread direct messages from staff
 * - clientInbox: unread user messages (existing useUnreadMessages covers this)
 */
export function useAdminUnreadBadges() {
  const [teamChat, setTeamChat] = useState(0);
  const [chiefDMs, setChiefDMs] = useState(0);
  const [deptAlerts, setDeptAlerts] = useState(0);

  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const myDept = auth.departmentSlug || "executive";
  const isChief = auth.isChief === true;

  const fetchCounts = useCallback(async () => {
    if (!adminId) return;

    // DM unread count
    const { count: dmCount } = await supabase
      .from("admin_direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", adminId)
      .eq("is_read", false);
    setChiefDMs(dmCount || 0);

    // Team chat: messages in last 24h in my dept that I didn't send
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: chatCount } = await supabase
      .from("admin_dept_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("department_slug", myDept)
      .neq("sender_id", adminId)
      .gte("created_at", oneDayAgo);
    setTeamChat(chatCount || 0);

    // Cross-department alerts: pending alerts for my department (or all if chief)
    let alertQuery = supabase
      .from("admin_cross_department_alerts")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    if (!isChief) {
      alertQuery = alertQuery.eq("target_department", myDept);
    }
    const { count: alertCount } = await alertQuery;
    setDeptAlerts(alertCount || 0);
  }, [adminId, myDept, isChief]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);

    const ch1 = supabase
      .channel("admin-badge-dm")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_direct_messages" }, fetchCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_direct_messages" }, fetchCounts)
      .subscribe();

    const ch2 = supabase
      .channel("admin-badge-dept-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_dept_chat_messages" }, fetchCounts)
      .subscribe();

    const ch3 = supabase
      .channel("admin-badge-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_cross_department_alerts" }, fetchCounts)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetchCounts]);

  return { teamChat, chiefDMs, deptAlerts };
}

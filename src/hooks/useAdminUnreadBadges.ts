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

  const auth = getAdminAuth();
  const adminId = auth.adminId || auth.id || "";
  const myDept = auth.departmentSlug || "executive";

  const fetchCounts = useCallback(async () => {
    if (!adminId) return;

    // DM unread count
    const { count: dmCount } = await supabase
      .from("admin_direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", adminId)
      .eq("is_read", false);
    setChiefDMs(dmCount || 0);

    // For team chat, we don't track read per-message — just use a simple approach:
    // Count messages in last 24h in my dept that I didn't send
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: chatCount } = await supabase
      .from("admin_dept_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("department_slug", myDept)
      .neq("sender_id", adminId)
      .gte("created_at", oneDayAgo);
    setTeamChat(chatCount || 0);
  }, [adminId, myDept]);

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

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [fetchCounts]);

  return { teamChat, chiefDMs };
}

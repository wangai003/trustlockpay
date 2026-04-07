import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Generic unread badge hook for vendor/buyer sidebars.
 * Returns counts for messages, disputes, orders needing attention.
 */
export function useSidebarBadges(role: "vendor" | "buyer") {
  const { user } = useAuth();
  const [messages, setMessages] = useState(0);
  const [disputes, setDisputes] = useState(0);

  const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;

    // Unread messages
    const { data: threads } = await supabase
      .from("message_threads")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (threads && threads.length > 0) {
      const threadIds = threads.map(t => t.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("thread_id", threadIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);
      setMessages(count || 0);
    } else {
      setMessages(0);
    }

    // Open disputes count
    const disputeFilter = role === "buyer"
      ? `buyer_id.eq.${user.id}`
      : `vendor_id.eq.${user.id}`;
    const { count: dCount } = await supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .or(disputeFilter)
      .in("status", ["open", "under_review", "arbitration_requested"]);
    setDisputes(dCount || 0);
  }, [user?.id, role]);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);

    const channel = supabase
      .channel(`sidebar-badges-${role}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, fetchCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "disputes" }, fetchCounts)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCounts, role]);

  return { messages, disputes };
}

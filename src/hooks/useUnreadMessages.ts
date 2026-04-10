import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Returns live unread message count for the current user.
 * For admin role, checks threads where the admin sentinel is a participant.
 */
export const useUnreadMessages = (role: "vendor" | "buyer" | "admin" | "lender", userId?: string) => {
  const [count, setCount] = useState(0);

  const effectiveId = role === "admin" ? ADMIN_SENTINEL_ID : userId;

  const fetchCount = useCallback(async () => {
    if (!userId) return;

    // Get all thread IDs this user participates in
    const { data: threads } = await supabase
      .from("message_threads")
      .select("id")
      .or(`participant_1.eq.${effectiveId},participant_2.eq.${effectiveId}`);

    if (!threads || threads.length === 0) { setCount(0); return; }

    const threadIds = threads.map((t) => t.id);

    // Count unread messages not sent by this user
    const { count: unread } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", threadIds)
      .neq("sender_id", effectiveId!)
      .eq("is_read", false);

    setCount(unread || 0);
  }, [userId, effectiveId]);

  useEffect(() => {
    fetchCount();

    // Poll every 30s for new messages
    const interval = setInterval(fetchCount, 30000);

    // Also listen to realtime inserts on messages table
    const channel = supabase
      .channel("unread-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return count;
};

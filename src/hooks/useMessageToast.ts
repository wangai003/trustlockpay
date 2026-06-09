import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Shows a sonner toast whenever a new message arrives for the current user.
 * Must be mounted inside a layout that persists across pages.
 */
export const useMessageToast = (
  role: "vendor" | "buyer" | "admin" | "lender",
  userId?: string,
  navigateFn?: (path: string) => void
) => {
  const effectiveId = role === "admin" ? ADMIN_SENTINEL_ID : userId;
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`msg-toast-${role}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            sender_id: string;
            thread_id: string;
            body: string;
          };

          // Skip own messages or already-seen
          if (msg.sender_id === effectiveId) return;
          if (seenRef.current.has(msg.id)) return;
          seenRef.current.add(msg.id);

          // Verify this thread belongs to us
          const { data: thread } = await supabase
            .from("message_threads")
            .select("id, subject")
            .eq("id", msg.thread_id)
            .or(`participant_1.eq.${effectiveId},participant_2.eq.${effectiveId}`)
            .maybeSingle();

          if (!thread) return;

          // Look up sender name
          const { data: senderRows } = await supabase.rpc("get_counterparty_profiles" as any, {
            _ids: [msg.sender_id],
          });
          const sender = ((senderRows as any[]) || [])[0] || null;

          const senderName =
            msg.sender_id === ADMIN_SENTINEL_ID
              ? "TrustLock Admin"
              : sender?.full_name || sender?.email || "Someone";

          const preview =
            msg.body.length > 60 ? msg.body.slice(0, 60) + "…" : msg.body;

          const messagesPath =
            role === "admin"
              ? "/trustlock/admin/messages"
              : role === "lender"
              ? "/trustlock/lender/messages"
              : role === "vendor"
              ? "/trustlock/vendor/messages"
              : "/trustlock/buyer/messages";

          toast.info(`New message from ${senderName}`, {
            description: preview,
            duration: 8000,
            action: navigateFn
              ? {
                  label: "View",
                  onClick: () => navigateFn(messagesPath),
                }
              : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, effectiveId, role, navigateFn]);
};

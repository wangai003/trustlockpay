import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    const validActions = [
      "create", "mark_read", "mark_all_read", "get_unread_count",
      "contract_auto_signed", "contract_manual_required", "contract_buyer_signed",
      "contract_fully_signed", "contract_declined", "check_stale_contracts",
    ];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Contract notification helpers ---
    const insertNotification = async (
      userId: string, title: string, message: string, type: string,
      entityType?: string, entityId?: string,
      opts?: { is_action_required?: boolean; action_url?: string }
    ) => {
      const { data, error } = await supabaseAdmin.from("notifications").insert({
        user_id: userId, title, message, type,
        related_entity_type: entityType || null,
        related_entity_id: entityId || null,
        is_action_required: opts?.is_action_required || false,
        action_url: opts?.action_url || null,
      }).select().single();
      if (error) throw error;
      return data;
    };

    if (action === "contract_auto_signed") {
      const { vendor_id, order_number, contract_id } = params;
      if (!vendor_id) return json({ success: false, error: "vendor_id required" }, 400);
      const n = await insertNotification(
        vendor_id,
        "Order Auto-Accepted",
        `Order ${order_number || "N/A"} was auto-signed by your TrustLock protocol. Work order is active.`,
        "info", "pre_order_contract", contract_id
      );
      return json({ success: true, notification: n });
    }

    if (action === "contract_manual_required") {
      const { vendor_id, order_number, contract_id } = params;
      if (!vendor_id) return json({ success: false, error: "vendor_id required" }, 400);
      const n = await insertNotification(
        vendor_id,
        "⚠️ Manual Signature Required",
        `Order ${order_number || "N/A"} requires your manual signature. Go to Work Log to review and sign.`,
        "high", "pre_order_contract", contract_id,
        { is_action_required: true, action_url: "/trustlock/vendor/transactions" }
      );
      return json({ success: true, notification: n });
    }

    if (action === "contract_buyer_signed") {
      const { vendor_id, order_number, contract_id } = params;
      if (!vendor_id) return json({ success: false, error: "vendor_id required" }, 400);
      const n = await insertNotification(
        vendor_id,
        "Buyer Signed Contract",
        `The buyer has signed the Pre-Order Signatory Contract for order ${order_number || "N/A"}.`,
        "info", "pre_order_contract", contract_id
      );
      return json({ success: true, notification: n });
    }

    if (action === "contract_fully_signed") {
      const { vendor_id, buyer_id, order_number, contract_id } = params;
      if (!vendor_id && !buyer_id) return json({ success: false, error: "vendor_id or buyer_id required" }, 400);
      const msg = `Both parties have signed. Order ${order_number || "N/A"} work order is now active.`;
      const notifications = [];
      if (vendor_id) notifications.push(await insertNotification(vendor_id, "Contract Complete — Work Order Active", msg, "info", "pre_order_contract", contract_id));
      if (buyer_id) notifications.push(await insertNotification(buyer_id, "Contract Complete — Work Order Active", msg, "info", "pre_order_contract", contract_id));
      return json({ success: true, notifications });
    }

    if (action === "contract_declined") {
      const { buyer_id, order_number, contract_id, reason } = params;
      if (!buyer_id) return json({ success: false, error: "buyer_id required" }, 400);
      const n = await insertNotification(
        buyer_id,
        "Order Declined by Vendor",
        `The vendor has declined order ${order_number || "N/A"}. Your funds will be refunded.${reason ? " Reason: " + reason : ""}`,
        "warning", "pre_order_contract", contract_id
      );
      return json({ success: true, notification: n });
    }

    if (action === "check_stale_contracts") {
      // Find contracts stuck in 'pending' for 14+ days and notify vendors
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: stale, error: staleErr } = await supabaseAdmin
        .from("pre_order_contracts")
        .select("id, vendor_id, order_number")
        .eq("status", "pending")
        .lte("created_at", fourteenDaysAgo.toISOString());

      if (staleErr) throw staleErr;

      let reminded = 0;
      for (const c of stale || []) {
        if (!c.vendor_id) continue;
        // Avoid duplicate reminders: check if one was already sent in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count } = await supabaseAdmin
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", c.vendor_id)
          .eq("related_entity_id", c.id)
          .eq("type", "reminder")
          .gte("created_at", sevenDaysAgo.toISOString());

        if ((count || 0) === 0) {
          await insertNotification(
            c.vendor_id,
            "⚠️ Pending Contract Reminder",
            `Order ${c.order_number || "N/A"} has been awaiting your signature for over 14 days. Please sign or decline in your Work Log.`,
            "high", "pre_order_contract", c.id,
            { is_action_required: true, action_url: "/trustlock/vendor/transactions" }
          );
          reminded++;
        }
      }
      return json({ success: true, stale_count: stale?.length || 0, reminded });
    }

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    if (action === "create") {
      const { user_id, title, message, type, related_entity_type, related_entity_id } = params;
      if (!title) return json({ success: false, error: "title is required" }, 400);

      // Use service role client so we can insert for any user
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const targetUserId = user_id || user.id;

      const { data, error } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: targetUserId,
          title,
          message: message || null,
          type: type || "info",
          related_entity_type: related_entity_type || null,
          related_entity_id: related_entity_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return json({ success: true, notification: data });
    }

    if (action === "mark_read") {
      const { notification_id } = params;
      if (!notification_id) return json({ success: false, error: "notification_id required" }, 400);

      const { error } = await supabaseUser
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification_id)
        .eq("user_id", user.id);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "mark_all_read") {
      const { error } = await supabaseUser
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return json({ success: true });
    }

    if (action === "get_unread_count") {
      const { count, error } = await supabaseUser
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return json({ success: true, unread_count: count ?? 0 });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

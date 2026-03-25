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
    const validActions = ["create", "mark_read", "mark_all_read", "get_unread_count"];
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

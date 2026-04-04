import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { action, chiefAdminId, ...params } = await req.json();

    // Verify the caller is a chief admin
    const { data: chiefCheck } = await supabase
      .from("chief_admin_config")
      .select("id")
      .eq("admin_id", chiefAdminId)
      .eq("is_active", true)
      .maybeSingle();

    if (!chiefCheck) return json({ error: "Unauthorized — chief admin only." }, 403);

    // ── ADD NEW ADMIN ──────────────────────────────────────
    if (action === "add") {
      const { username, name } = params;
      if (!username || !name) return json({ error: "Username and name required." }, 400);

      // Check if username exists (including deleted)
      const { data: existing } = await supabase
        .from("admin_accounts")
        .select("id, is_deleted")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();

      if (existing && !existing.is_deleted) {
        return json({ error: "Username already exists and is active." }, 409);
      }

      // If previously deleted, reinstate instead
      if (existing && existing.is_deleted) {
        return json({ error: "This username belongs to a deleted account. Use reinstate instead." }, 409);
      }

      const { data: result, error } = await supabase.rpc("add_admin_account", {
        _username: username,
        _name: name,
      });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, account: result });
    }

    // ── DELETE (SOFT) ──────────────────────────────────────
    if (action === "delete") {
      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);

      // Prevent deleting yourself
      if (adminId === chiefAdminId) return json({ error: "Cannot delete yourself." }, 400);

      // Prevent deleting another chief
      const { data: isChief } = await supabase
        .from("chief_admin_config")
        .select("id")
        .eq("admin_id", adminId)
        .eq("is_active", true)
        .maybeSingle();

      if (isChief) return json({ error: "Cannot delete another chief admin. Demote first." }, 400);

      const { error } = await supabase
        .from("admin_accounts")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: chiefAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adminId)
        .eq("is_deleted", false);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── REINSTATE ──────────────────────────────────────────
    if (action === "reinstate") {
      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);

      // Generate new temp password
      const { data: tempPw } = await supabase.rpc("generate_temp_password");

      const { data: hash } = await supabase.rpc("hash_password", { _password: tempPw });

      const { error } = await supabase
        .from("admin_accounts")
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          reinstated_at: new Date().toISOString(),
          is_setup: false,
          password_hash: null,
          email: null,
          temp_password_hash: hash,
          failed_attempts: 0,
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", adminId)
        .eq("is_deleted", true);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, temp_password: tempPw });
    }

    // ── PROMOTE TO CHIEF ───────────────────────────────────
    if (action === "promote") {
      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);

      // Check not already chief
      const { data: alreadyChief } = await supabase
        .from("chief_admin_config")
        .select("id")
        .eq("admin_id", adminId)
        .eq("is_active", true)
        .maybeSingle();

      if (alreadyChief) return json({ error: "Already a chief admin." }, 409);

      const { error } = await supabase
        .from("chief_admin_config")
        .insert({
          admin_id: adminId,
          designated_by: chiefAdminId,
          is_active: true,
          override_window_hours: 48,
        });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── DEMOTE FROM CHIEF ──────────────────────────────────
    if (action === "demote") {
      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);
      if (adminId === chiefAdminId) return json({ error: "Cannot demote yourself." }, 400);

      const { error } = await supabase
        .from("chief_admin_config")
        .update({ is_active: false })
        .eq("admin_id", adminId)
        .eq("is_active", true);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── LIST ALL ───────────────────────────────────────────
    if (action === "list") {
      const { data: accounts, error } = await supabase
        .from("admin_accounts")
        .select("id, username, name, email, is_setup, is_deleted, deleted_at, reinstated_at, created_at")
        .order("created_at", { ascending: true });

      if (error) return json({ error: error.message }, 500);

      // Get chief status
      const { data: chiefs } = await supabase
        .from("chief_admin_config")
        .select("admin_id")
        .eq("is_active", true);

      const chiefIds = new Set((chiefs || []).map((c: any) => c.admin_id));

      const enriched = (accounts || []).map((a: any) => ({
        ...a,
        is_chief: chiefIds.has(a.id),
      }));

      return json({ accounts: enriched });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: "Internal error" }, 500);
  }
});

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

async function getChiefRank(supabase: any, adminId: string): Promise<number | null> {
  const { data } = await supabase
    .from("chief_admin_config")
    .select("rank")
    .eq("admin_id", adminId)
    .eq("is_active", true)
    .maybeSingle();
  return data?.rank ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { action, chiefAdminId, chiefPassword, ...params } = await req.json();

    if (!chiefAdminId) {
      return json({ error: "Unauthorized — chiefAdminId required." }, 401);
    }

    // Verify caller is a chief admin
    const callerRank = await getChiefRank(supabase, chiefAdminId);
    if (callerRank === null) return json({ error: "Unauthorized — chief admin only." }, 403);

    const isOriginalChief = callerRank === 1;

    // ALL actions (including read-only list) require password proof to
    // prevent an attacker who knows/guesses a chief admin UUID from
    // enumerating admin accounts.
    if (!chiefPassword) {
      return json({ error: "Unauthorized — chief password required." }, 401);
    }
    const { data: pwOk } = await supabase.rpc("verify_admin_password", {
      _admin_id: chiefAdminId,
      _password: chiefPassword,
    });
    if (!pwOk) return json({ error: "Unauthorized — invalid credentials." }, 401);



    // ── ADD NEW ADMIN (any chief can add) ──────────────────
    if (action === "add") {
      const { username, name, departmentSlug } = params;
      if (!username || !name) return json({ error: "Username and name required." }, 400);

      const { data: existing } = await supabase
        .from("admin_accounts")
        .select("id, is_deleted")
        .eq("username", username.toLowerCase().trim())
        .maybeSingle();

      if (existing && !existing.is_deleted) {
        return json({ error: "Username already exists and is active." }, 409);
      }
      if (existing && existing.is_deleted) {
        return json({ error: "This username belongs to a deleted account. Use reinstate instead." }, 409);
      }

      // Resolve department ID from slug
      let deptId: string | null = null;
      if (departmentSlug) {
        const { data: dept } = await supabase
          .from("admin_departments")
          .select("id")
          .eq("slug", departmentSlug)
          .maybeSingle();
        deptId = dept?.id || null;
      }

      const { data: result, error } = await supabase.rpc("add_admin_account", {
        _username: username,
        _name: name,
      });

      if (error) return json({ error: error.message }, 500);

      // Set department if resolved
      if (deptId && result?.id) {
        await supabase
          .from("admin_accounts")
          .update({ department_id: deptId })
          .eq("id", result.id);
      }

      return json({ success: true, account: { ...result, department_slug: departmentSlug } });
    }

    // ── DELETE (SOFT) — original chief only ────────────────
    if (action === "delete") {
      if (!isOriginalChief) {
        return json({ error: "Only the original Chief Admin can delete staff." }, 403);
      }

      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);
      if (adminId === chiefAdminId) return json({ error: "Cannot delete yourself." }, 400);

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

    // ── REINSTATE — original chief only ────────────────────
    if (action === "reinstate") {
      if (!isOriginalChief) {
        return json({ error: "Only the original Chief Admin can reinstate staff." }, 403);
      }

      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);

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

    // ── PROMOTE TO CHIEF — original chief only ─────────────
    if (action === "promote") {
      if (!isOriginalChief) {
        return json({ error: "Only the original Chief Admin can promote staff." }, 403);
      }

      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);

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
          rank: 2,
        });

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── DEMOTE — original chief only ─────────────────────
    if (action === "demote") {
      if (!isOriginalChief) {
        return json({ error: "Only the original Chief Admin can demote staff." }, 403);
      }

      const { adminId } = params;
      if (!adminId) return json({ error: "Admin ID required." }, 400);
      if (adminId === chiefAdminId) return json({ error: "Cannot demote yourself." }, 400);

      const { data: chiefRecord } = await supabase
        .from("chief_admin_config")
        .select("id, rank")
        .eq("admin_id", adminId)
        .eq("is_active", true)
        .maybeSingle();

      if (!chiefRecord) return json({ error: "This admin is not a chief." }, 409);
      if (chiefRecord.rank === 1) return json({ error: "Cannot demote the original chief." }, 400);

      const { error } = await supabase
        .from("chief_admin_config")
        .update({ is_active: false })
        .eq("id", chiefRecord.id);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ── DELETE SELF (original chief removing themselves — triggers succession) ──
    if (action === "deleteSelf") {
      if (!isOriginalChief) {
        return json({ error: "Only the original Chief Admin can use this action." }, 403);
      }

      // Check there's at least one other active chief to succeed
      const { data: otherChiefs } = await supabase
        .from("chief_admin_config")
        .select("admin_id")
        .eq("is_active", true)
        .neq("admin_id", chiefAdminId);

      if (!otherChiefs || otherChiefs.length === 0) {
        return json({ error: "Cannot delete yourself — no successor chief exists. Promote someone first." }, 400);
      }

      // Soft-delete self — trigger handles succession
      const { error } = await supabase
        .from("admin_accounts")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: chiefAdminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", chiefAdminId)
        .eq("is_deleted", false);

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, succession: true });
    }

    // ── LIST ALL ───────────────────────────────────────────
    if (action === "list") {
      const { data: accounts, error } = await supabase
        .from("admin_accounts")
        .select("id, username, name, email, is_setup, is_deleted, deleted_at, reinstated_at, created_at, department_id")
        .order("created_at", { ascending: true });

      if (error) return json({ error: error.message }, 500);

      const { data: chiefs } = await supabase
        .from("chief_admin_config")
        .select("admin_id, rank")
        .eq("is_active", true);

      const { data: departments } = await supabase
        .from("admin_departments")
        .select("id, slug, name");

      const chiefMap = new Map((chiefs || []).map((c: any) => [c.admin_id, c.rank]));
      const deptMap = new Map((departments || []).map((d: any) => [d.id, d.slug]));

      const enriched = (accounts || []).map((a: any) => ({
        ...a,
        is_chief: chiefMap.has(a.id),
        chief_rank: chiefMap.get(a.id) || null,
        department_slug: deptMap.get(a.department_id) || null,
      }));

      return json({ accounts: enriched, callerRank });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: "Internal error" }, 500);
  }
});

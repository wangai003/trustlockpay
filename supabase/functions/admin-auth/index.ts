import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, ...params } = await req.json();

    // ── LOGIN ──────────────────────────────────────────────
    if (action === "login") {
      const { identifier, password, network } = params;
      if (!identifier || !password) return json({ error: "Missing fields" }, 400);

      // Network gate only applies to mainnet logins. Testnet/sandbox is open
      // to every active admin for training & QA.
      const isMainnet = network === "mainnet";

      const id = identifier.toLowerCase().trim();

      // Look up by username OR email
      const { data: account, error: lookupErr } = await supabase
        .from("admin_accounts")
        .select("*")
        .or(`username.eq.${id},email.eq.${id}`)
        .maybeSingle();

      if (lookupErr || !account) {
        return json({ success: false, error: "Invalid credentials." });
      }

      // Block deleted accounts
      if (account.is_deleted) {
        return json({ success: false, error: "This account has been deactivated." });
      }

      // Check lockout (5 failed attempts, locked for 30 min)
      if (account.failed_attempts >= 5) {
        const lockedAt = account.locked_at ? new Date(account.locked_at) : null;
        const now = new Date();
        if (lockedAt && now.getTime() - lockedAt.getTime() < 30 * 60 * 1000) {
          return json({ success: false, locked: true, error: "Account locked. Please reset your password." });
        }
        // Auto-unlock after 30 min
        await supabase
          .from("admin_accounts")
          .update({ failed_attempts: 0, locked_at: null })
          .eq("id", account.id);
        account.failed_attempts = 0;
      }

      // First-time login: check temp password
      if (!account.is_setup) {
        const { data: tempMatch } = await supabase.rpc("verify_admin_temp_password", {
          _account_id: account.id,
          _password: password,
        });

        if (tempMatch) {
          return json({ success: true, needsSetup: true, username: account.username, name: account.name, adminId: account.id });
        }
      }

      // Post-setup login: check hashed password
      if (account.is_setup && account.password_hash) {
        const { data: passMatch } = await supabase.rpc("verify_admin_password", {
          _account_id: account.id,
          _password: password,
        });

        if (passMatch) {
          await supabase
            .from("admin_accounts")
            .update({ failed_attempts: 0, locked_at: null })
            .eq("id", account.id);

          // Check chief status
          const { data: chiefRecord } = await supabase
            .from("chief_admin_config")
            .select("id, rank")
            .eq("admin_id", account.id)
            .eq("is_active", true)
            .maybeSingle();

          // Get department slug
          let departmentSlug: string | null = null;
          if (account.department_id) {
            const { data: dept } = await supabase
              .from("admin_departments")
              .select("slug")
              .eq("id", account.department_id)
              .maybeSingle();
            departmentSlug = dept?.slug || null;
          }

          return json({
            success: true,
            needsSetup: false,
            name: account.name,
            adminId: account.id,
            isChief: !!chiefRecord,
            chiefRank: chiefRecord?.rank || null,
            departmentSlug,
          });
        }
      }

      // Failed attempt
      const newAttempts = account.failed_attempts + 1;
      await supabase
        .from("admin_accounts")
        .update({
          failed_attempts: newAttempts,
          locked_at: newAttempts >= 5 ? new Date().toISOString() : account.locked_at,
        })
        .eq("id", account.id);

      const remaining = 5 - newAttempts;
      const locked = newAttempts >= 5;
      return json({
        success: false,
        locked,
        remaining: remaining > 0 ? remaining : 0,
        error: locked
          ? "Account locked after 5 failed attempts. Please reset your password."
          : remaining <= 3 && remaining > 0
          ? `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
          : "Invalid credentials.",
      });
    }

    // ── SETUP (first-time password + email) ────────────────
    // Requires the temp password issued at account creation.
    if (action === "setup") {
      const { username, email, password, tempPassword } = params;
      if (!username || !email || !password || !tempPassword) {
        return json({ error: "username, email, password, and tempPassword are required" }, 400);
      }
      if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

      const { data: account } = await supabase
        .from("admin_accounts")
        .select("id, is_setup")
        .eq("username", username.toLowerCase().trim())
        .single();

      if (!account) return json({ error: "Account not found." }, 404);
      if (account.is_setup) {
        return json({ error: "Account is already set up. Use login or contact a chief admin to reset." }, 403);
      }

      const { data: tempMatch } = await supabase.rpc("verify_admin_temp_password", {
        _account_id: account.id,
        _password: tempPassword,
      });
      if (!tempMatch) {
        return json({ error: "Invalid temporary password." }, 401);
      }

      const { data: hash } = await supabase.rpc("hash_password", { _password: password });

      const { error: updateErr } = await supabase
        .from("admin_accounts")
        .update({
          is_setup: true,
          email: email.toLowerCase().trim(),
          password_hash: hash,
          failed_attempts: 0,
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (updateErr) return json({ error: "Setup failed." }, 500);
      return json({ success: true });
    }

    // ── RESET PASSWORD ─────────────────────────────────────
    // Requires the caller to prove possession of the CURRENT password.
    // Forgotten-password recovery must be handled by a chief admin via
    // manage-admin-staff (which issues a fresh temp password).
    if (action === "reset") {
      const { email, password, currentPassword } = params;
      if (!email || !password || !currentPassword) {
        return json({ error: "email, currentPassword, and password are required" }, 400);
      }
      if (password.length < 6) return json({ error: "Password must be at least 6 characters." }, 400);

      const { data: account } = await supabase
        .from("admin_accounts")
        .select("id, is_setup")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (!account) return json({ error: "No account found with that email." }, 404);
      if (!account.is_setup) {
        return json({ error: "Account is not set up yet. Complete first-time setup with your temporary password." }, 403);
      }

      const { data: currentMatch } = await supabase.rpc("verify_admin_password", {
        _account_id: account.id,
        _password: currentPassword,
      });
      if (!currentMatch) return json({ error: "Current password is incorrect." }, 401);

      const { data: hash } = await supabase.rpc("hash_password", { _password: password });

      const { error: updateErr } = await supabase
        .from("admin_accounts")
        .update({
          password_hash: hash,
          failed_attempts: 0,
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      if (updateErr) return json({ error: "Reset failed." }, 500);
      return json({ success: true });
    }

    // ── LOOKUP (check if account exists/is setup — no side effects) ──
    if (action === "lookup") {
      const { identifier } = params;
      if (!identifier) return json({ exists: false });

      const id = identifier.toLowerCase().trim();
      const { data: account } = await supabase
        .from("admin_accounts")
        .select("username, is_setup")
        .or(`username.eq.${id},email.eq.${id}`)
        .maybeSingle();

      return json({ exists: !!account, isSetup: account?.is_setup ?? false });
    }

    // checkPassword action removed — it allowed an unauthenticated oracle
    // for guessing whether any password matched any admin account.


    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: "Internal error" }, 500);
  }
});

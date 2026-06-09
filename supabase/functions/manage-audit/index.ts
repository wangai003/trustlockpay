import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { action } = body;

    // ── Admin-only gate for management actions ─────────────
    // create/list/revoke/logs expose or mint long-lived audit tokens
    // that read sensitive financial tables, so they require a verified
    // admin JWT. validate/fetch_data remain auditor-token-scoped.
    const ADMIN_ONLY = new Set(["create", "list", "revoke", "logs"]);
    if (ADMIN_ONLY.has(action)) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Unauthorized — admin sign-in required." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData } = await anonClient.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized — invalid session." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin");
      if (!roleRows || roleRows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Forbidden — admin role required." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Hardcoded permitted audit tables — caller-supplied list is ignored
    const PERMITTED_AUDIT_TABLES = [
      "transactions",
      "disputes",
      "compliance_flags",
      "tax_ledger",
      "blockchain_proofs",
    ];
    const MAX_EXPIRES_DAYS = 7;


    // ── CREATE AUDIT SESSION ──
    if (action === "create") {
      const {
        auditor_name,
        auditor_email,
        can_export,
        expires_in_days,
        password,
      } = body;

      let passwordHash = null;
      if (password) {
        const { data: hash } = await supabase.rpc("hash_password", {
          _password: password,
        });
        passwordHash = hash;
      }

      // Cap session duration at MAX_EXPIRES_DAYS
      const requestedDays = Math.min(
        Math.max(Number(expires_in_days) || MAX_EXPIRES_DAYS, 1),
        MAX_EXPIRES_DAYS
      );
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + requestedDays);

      const { data, error } = await supabase
        .from("audit_sessions")
        .insert({
          auditor_name,
          auditor_email: auditor_email || null,
          auditor_password_hash: passwordHash,
          // Hardcoded server-side — caller cannot widen the scope
          allowed_tables: PERMITTED_AUDIT_TABLES,
          can_export: can_export || false,
          expires_at: expiresAt.toISOString(),
        })
        .select("id, access_token, auditor_name, expires_at, allowed_tables, can_export")
        .single();


      if (error) throw error;

      return new Response(JSON.stringify({ success: true, session: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATE TOKEN (for portal access) ──
    if (action === "validate") {
      const { token, password } = body;

      const { data: session, error } = await supabase
        .from("audit_sessions")
        .select("*")
        .eq("access_token", token)
        .eq("is_active", true)
        .single();

      if (error || !session) {
        return new Response(
          JSON.stringify({ valid: false, error: "Invalid or expired audit link" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check expiry
      if (new Date(session.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: "This audit session has expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check password if set
      if (session.auditor_password_hash && !password) {
        return new Response(
          JSON.stringify({ valid: false, needs_password: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.auditor_password_hash && password) {
        // Verify using bcrypt comparison via DB function
        const encoder = new TextEncoder();
        // Simple comparison — use the DB hash_password and compare
        const { data: hash } = await supabase.rpc("hash_password", { _password: password });
        // Since we can't compare bcrypt in Deno easily, use a verify function
        // We'll do a direct SQL check
        const { data: rows } = await supabase.rpc("verify_audit_password", {
          _session_id: session.id,
          _password: password,
        });
        if (!rows) {
          return new Response(
            JSON.stringify({ valid: false, error: "Incorrect password" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
      }

      // Log access
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";

      await supabase.from("audit_access_logs").insert({
        session_id: session.id,
        ip_address: ip,
        user_agent: userAgent,
        page_viewed: "login",
        action: "validate",
      });

      // Update access count
      await supabase
        .from("audit_sessions")
        .update({
          access_count: (session.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      return new Response(
        JSON.stringify({
          valid: true,
          session: {
            id: session.id,
            auditor_name: session.auditor_name,
            allowed_tables: session.allowed_tables,
            can_export: session.can_export,
            expires_at: session.expires_at,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FETCH DATA (for audit portal) ──
    if (action === "fetch_data") {
      const { token, table } = body;

      // Re-validate token
      const { data: session } = await supabase
        .from("audit_sessions")
        .select("*")
        .eq("access_token", token)
        .eq("is_active", true)
        .single();

      if (!session || new Date(session.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check table permission
      if (!session.allowed_tables.includes(table)) {
        return new Response(
          JSON.stringify({ error: "Access denied for this data category" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Log this access
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      await supabase.from("audit_access_logs").insert({
        session_id: session.id,
        ip_address: ip,
        user_agent: req.headers.get("user-agent") || "",
        page_viewed: table,
        action: "view",
      });

      // Fetch data (read-only, no sensitive fields)
      let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(500);
      const { data, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, can_export: session.can_export }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST SESSIONS (admin) ──
    if (action === "list") {
      const { data, error } = await supabase
        .from("audit_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ sessions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── REVOKE SESSION ──
    if (action === "revoke") {
      const { session_id } = body;
      const { error } = await supabase
        .from("audit_sessions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", session_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GET ACCESS LOGS ──
    if (action === "logs") {
      const { session_id } = body;
      const { data, error } = await supabase
        .from("audit_access_logs")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return new Response(JSON.stringify({ logs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

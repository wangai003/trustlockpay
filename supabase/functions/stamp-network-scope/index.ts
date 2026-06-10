// Stamps the caller's session with a network_scope (testnet | mainnet).
// Called by every portal login surface immediately after a successful sign-in.
// Also supports revoking the active scope on logout.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_NETWORKS = new Set(["testnet", "mainnet"]);
const ALLOWED_PORTALS = new Set(["admin", "vendor", "buyer", "lender"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate JWT against Auth server
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "invalid_session" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const revoke = body?.revoke === true;
    const network = (body?.network_scope ?? "").toString().toLowerCase();
    const portal = (body?.portal ?? "").toString().toLowerCase();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    if (revoke) {
      await admin
        .from("user_network_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("revoked_at", null);
      return json({ ok: true, revoked: true });
    }

    if (!ALLOWED_NETWORKS.has(network)) {
      return json({ error: "invalid_network_scope" }, 400);
    }
    if (!ALLOWED_PORTALS.has(portal)) {
      return json({ error: "invalid_portal" }, 400);
    }

    // Revoke any previous active stamp, then issue a fresh one.
    await admin
      .from("user_network_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("revoked_at", null);

    const { data: inserted, error: insertErr } = await admin
      .from("user_network_sessions")
      .insert({
        user_id: userId,
        network_scope: network,
        portal,
        user_agent: req.headers.get("user-agent") ?? null,
        ip_address:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      })
      .select("id, network_scope, portal, issued_at")
      .single();

    if (insertErr) {
      return json({ error: insertErr.message }, 500);
    }

    return json({ ok: true, session: inserted });
  } catch (e) {
    return json({ error: (e as Error).message ?? "unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

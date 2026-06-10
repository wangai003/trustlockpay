// Guided Testnet — mission progress tracker.
// Receives { role, mission_id, action } from the testnet UI when a mission step
// is completed, and updates the user's testnet_onboarding row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const VALID_ROLES = new Set(["vendor", "buyer", "lender"]);
const VALID_ACTIONS = new Set(["start", "done", "skip", "graduate"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: "invalid_session" }, 401);
    }
    const userId = userRes.user.id;

    const body = await req.json().catch(() => ({}));
    const { role, mission_id, action } = body ?? {};

    if (!VALID_ROLES.has(role)) return json({ error: "invalid_role" }, 400);
    if (!VALID_ACTIONS.has(action)) return json({ error: "invalid_action" }, 400);
    if (action !== "graduate" && (typeof mission_id !== "string" || mission_id.length === 0)) {
      return json({ error: "invalid_mission_id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Ensure onboarding row exists
    const { data: existing } = await admin
      .from("testnet_onboarding")
      .select("id, missions, graduated_at")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    let missions: Record<string, string> = existing?.missions ?? {};

    if (action === "graduate") {
      await admin
        .from("testnet_onboarding")
        .upsert(
          {
            user_id: userId,
            role,
            missions,
            graduated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,role" }
        );
      return json({ ok: true, graduated: true });
    }

    missions = { ...missions, [mission_id]: action };

    await admin
      .from("testnet_onboarding")
      .upsert(
        { user_id: userId, role, missions },
        { onConflict: "user_id,role" }
      );

    return json({ ok: true, missions });
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

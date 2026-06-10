// One-shot seeder for the three guided-testnet demo bot accounts.
// Creates auth.users + profiles (is_system=true) for demo_vendor_bot,
// demo_buyer_bot, demo_lender_bot, then populates
// testnet_demo_counterparties.bot_user_id. Idempotent — re-running is a no-op
// for already-seeded roles.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Role = "vendor" | "buyer" | "lender";

interface BotSpec {
  role: Role;
  email: string;
  display_name: string;
}

const BOTS: BotSpec[] = [
  { role: "vendor", email: "demo-vendor-bot@testnet.trustlock.local", display_name: "Demo Vendor (Bot)" },
  { role: "buyer", email: "demo-buyer-bot@testnet.trustlock.local", display_name: "Demo Buyer (Bot)" },
  { role: "lender", email: "demo-lender-bot@testnet.trustlock.local", display_name: "Demo Lender (Bot)" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Caller must be authenticated AND hold the admin role.
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: auth } },
    });
    const { data: who } = await userClient.auth.getUser();
    if (!who?.user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", who.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "admin role required" }, 403);



    const results: Array<Record<string, unknown>> = [];

    for (const bot of BOTS) {
      // Skip if counterparty row already wired up.
      const { data: existing } = await admin
        .from("testnet_demo_counterparties")
        .select("id, bot_user_id, is_active")
        .eq("role", bot.role)
        .maybeSingle();
      if (existing?.bot_user_id) {
        results.push({ role: bot.role, status: "already_seeded", bot_user_id: existing.bot_user_id });
        continue;
      }

      // Find or create the auth user.
      let botUserId: string | null = null;
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list?.users?.find((u) => u.email?.toLowerCase() === bot.email.toLowerCase());
      if (found) {
        botUserId = found.id;
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: bot.email,
          email_confirm: true,
          password: crypto.randomUUID() + crypto.randomUUID(),
          user_metadata: { is_system: true, demo_role: bot.role, full_name: bot.display_name },
        });
        if (createErr || !created.user) {
          results.push({ role: bot.role, status: "auth_create_failed", error: createErr?.message });
          continue;
        }
        botUserId = created.user.id;
      }

      // Upsert profile flagged as system.
      const { error: profErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: botUserId,
            email: bot.email,
            full_name: bot.display_name,
            is_system: true,
            entity_type: "individual",
            status: "active",
          },
          { onConflict: "id" },
        );
      if (profErr) {
        results.push({ role: bot.role, status: "profile_failed", error: profErr.message });
        continue;
      }

      // Wire the counterparty row.
      const { error: cpErr } = await admin
        .from("testnet_demo_counterparties")
        .upsert(
          {
            role: bot.role,
            bot_user_id: botUserId,
            display_name: bot.display_name,
            response_delay_seconds: 30,
            is_active: true,
          },
          { onConflict: "role" },
        );
      if (cpErr) {
        results.push({ role: bot.role, status: "counterparty_failed", error: cpErr.message });
        continue;
      }

      results.push({ role: bot.role, status: "seeded", bot_user_id: botUserId });
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

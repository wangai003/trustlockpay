// Guided Testnet — first-login provisioning.
// Idempotent: seeds an onboarding row, demo transactions wired to the
// role-appropriate bot counterparty, and (for lenders) sample financing
// applications + 1 issued certificate. Rate-limited 1/hr per (user, role).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Role = "vendor" | "buyer" | "lender";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return jsonResponse({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const role = body?.role as Role | undefined;
    if (!role || !["vendor", "buyer", "lender"].includes(role)) {
      return jsonResponse({ error: "invalid role" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Onboarding row (idempotent, rate-limited 1/hr)
    const { data: existing } = await admin
      .from("testnet_onboarding")
      .select("id, seeded_at, missions, graduated_at")
      .eq("user_id", userId)
      .eq("role", role)
      .maybeSingle();

    if (existing?.seeded_at) {
      const ageMs = Date.now() - new Date(existing.seeded_at).getTime();
      if (ageMs < 60 * 60 * 1000) {
        return jsonResponse({
          status: "already_seeded",
          onboarding: existing,
        });
      }
    }

    // 2. Resolve demo counterparty (vendor user gets buyer bot, buyer gets vendor bot, lender gets vendor bot)
    const counterpartyRole: Role =
      role === "vendor" ? "buyer" : role === "buyer" ? "vendor" : "vendor";
    const { data: bot } = await admin
      .from("testnet_demo_counterparties")
      .select("bot_user_id, display_name")
      .eq("role", counterpartyRole)
      .eq("is_active", true)
      .maybeSingle();

    // 3. Upsert onboarding row
    const { data: onboarding, error: obErr } = await admin
      .from("testnet_onboarding")
      .upsert(
        {
          user_id: userId,
          role,
          seeded_at: new Date().toISOString(),
          missions: existing?.missions ?? {},
        },
        { onConflict: "user_id,role" },
      )
      .select()
      .single();
    if (obErr) return jsonResponse({ error: obErr.message }, 500);

    // 4. Seed demo transactions only if none exist yet for this user+role
    const userFilter = role === "vendor" ? "vendor_id" : "buyer_id";
    const { count: existingCount } = await admin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq(userFilter, userId)
      .eq("is_testnet_demo", true);

    const seededTransactions: string[] = [];
    if ((existingCount ?? 0) === 0 && bot?.bot_user_id && role !== "lender") {
      const lifecycleStates = [
        { status: "negotiating", milestone_status: "proposed", amount: 500 },
        { status: "escrowed", milestone_status: "in_progress", amount: 1200 },
        { status: "disputed", milestone_status: "in_progress", amount: 850 },
        { status: "released", milestone_status: "complete", amount: 320 },
      ];

      for (const s of lifecycleStates) {
        const tx_id = `TL-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const { data: tx, error: txErr } = await admin
          .from("transactions")
          .insert({
            tx_id,
            buyer_id: role === "buyer" ? userId : bot.bot_user_id,
            vendor_id: role === "vendor" ? userId : bot.bot_user_id,
            buyer_name: role === "buyer" ? "You (Demo)" : bot.display_name,
            vendor_name: role === "vendor" ? "You (Demo)" : bot.display_name,
            amount: s.amount,
            fee: Number((s.amount * 0.005).toFixed(2)),
            item: "Guided Testnet — Demo Transaction",
            status: s.status,
            milestone_status: s.milestone_status,
            type: "service",
            industry: "general",
            order_type: "fixed_price",
            trade_scope: "domestic",
            network_scope: "testnet",
            is_testnet_demo: true,
          })
          .select("id")
          .single();
        if (!txErr && tx) seededTransactions.push(tx.id);
      }
    }

    // 5. Lender extras — 2 sample applications + 1 issued certificate
    const seededLenderRecords: { applications: number } = {
      applications: 0,
    };
    if (role === "lender") {
      const { count: appCount } = await admin
        .from("financing_applications")
        .select("id", { count: "exact", head: true })
        .eq("lender_id", userId);

      if ((appCount ?? 0) === 0 && bot?.bot_user_id) {
        for (let i = 0; i < 2; i++) {
          const { error } = await admin.from("financing_applications").insert({
            lender_id: userId,
            vendor_id: bot.bot_user_id,
            requested_amount: 5000 + i * 2500,
            status: "pending_review",
          });
          if (!error) seededLenderRecords.applications += 1;
        }
        // Certificate issuance is mission L2 — left for the user to perform
        // through the real UI rather than auto-seeded, since it must be tied
        // to a real transaction_id under the current schema.
      }
    }

    return jsonResponse({
      status: "seeded",
      onboarding,
      counterparty: bot ?? null,
      transactions_seeded: seededTransactions.length,
      lender: role === "lender" ? seededLenderRecords : undefined,
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});

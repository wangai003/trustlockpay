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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, user_id } = body;

    if (!action || !user_id) {
      return new Response(
        JSON.stringify({ error: "action and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── PAUSE ────────────────────────────────────────────────
    if (action === "pause") {
      const { reason } = body;

      // Set profile status to paused
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", user_id);
      if (profileErr) throw profileErr;

      // Log pause event in protection_documents
      await supabase.from("protection_documents").insert({
        document_type: "account_pause_record",
        title: `Account Paused — ${new Date().toISOString()}`,
        user_id,
        role: body.role || null,
        metadata: {
          event: "account_paused",
          reason: reason || "User requested pause",
          paused_at: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ success: true, status: "paused", message: "Account paused. No data deleted." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── REACTIVATE ───────────────────────────────────────────
    if (action === "reactivate") {
      // Verify account is actually paused
      const { data: profile, error: fetchErr } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user_id)
        .single();
      if (fetchErr) throw fetchErr;

      if (profile?.status !== "paused") {
        return new Response(
          JSON.stringify({ error: "Account is not paused" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", user_id);
      if (updateErr) throw updateErr;

      // Log reactivation event
      await supabase.from("protection_documents").insert({
        document_type: "account_reactivation_record",
        title: `Account Reactivated — ${new Date().toISOString()}`,
        user_id,
        metadata: {
          event: "account_reactivated",
          reactivated_at: new Date().toISOString(),
        },
      });

      return new Response(
        JSON.stringify({ success: true, status: "active", message: "Account reactivated." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DELETE ────────────────────────────────────────────────
    if (action === "delete") {
      const { confirmation_text } = body;

      if (confirmation_text !== "DELETE MY ACCOUNT") {
        return new Response(
          JSON.stringify({ error: "Confirmation text must be exactly: DELETE MY ACCOUNT" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const now = new Date().toISOString();
      const purgeDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const retainedTables = [
        "transactions",
        "disputes",
        "dispute_evidence",
        "order_carbon_copies",
        "payout_requests",
        "payouts",
        "protection_documents",
        "audit_access_logs",
        "sanctions_screening_logs",
        "acknowledgement_forms",
      ];

      // 1. Archive pause/suspension record
      await supabase.from("protection_documents").insert({
        document_type: "account_deletion_archive",
        title: `Account Deletion Archive — ${now}`,
        user_id,
        role: body.role || null,
        metadata: {
          event: "account_deletion_archive",
          archived_at: now,
          retained_tables: retainedTables,
          purge_date: purgeDate,
        },
        retention_years: 7,
      });

      // 2. Archive data deletion confirmation
      await supabase.from("protection_documents").insert({
        document_type: "data_deletion_confirmation",
        title: `Data Deletion Confirmation — ${now}`,
        user_id,
        role: body.role || null,
        metadata: {
          event: "data_deletion_confirmed",
          confirmed_at: now,
          confirmation_text: "DELETE MY ACCOUNT",
          deleted_tables: [
            "profiles",
            "vendor_settings",
            "vendor_sites",
            "vendor_plans",
            "vendor_widget_fees",
            "notifications",
            "user_onboarding_tasks",
            "seed_tokens",
            "kyc_documents",
          ],
          retained_tables: retainedTables,
          purge_date: purgeDate,
        },
        retention_years: 7,
      });

      // 3. Delete user data from non-compliance tables
      const deletions = [
        supabase.from("notifications").delete().eq("user_id", user_id),
        supabase.from("user_onboarding_tasks").delete().eq("user_id", user_id),
        supabase.from("seed_tokens").delete().eq("user_id", user_id),
        supabase.from("vendor_settings").delete().eq("vendor_id", user_id),
        supabase.from("vendor_sites").delete().eq("vendor_id", user_id),
        supabase.from("vendor_plans").delete().eq("vendor_id", user_id),
        supabase.from("vendor_widget_fees").delete().eq("vendor_id", user_id),
        supabase.from("kyc_documents").delete().eq("vendor_id", user_id),
      ];
      await Promise.all(deletions);

      // 4. Mark profile as deleted (keep row for FK integrity)
      await supabase
        .from("profiles")
        .update({
          status: "deleted",
          full_name: "[Deleted User]",
          phone: null,
          avatar_url: null,
          location: null,
          updated_at: now,
        })
        .eq("id", user_id);

      // 5. Delete auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(user_id);
      if (authErr) {
        console.error("Auth deletion error (non-fatal):", authErr.message);
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "deleted",
          message: "Account deleted. Compliance data retained for 7 years.",
          purge_date: purgeDate,
          retained_tables: retainedTables,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}. Use pause, reactivate, or delete.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

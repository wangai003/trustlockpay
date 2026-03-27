import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VENDOR_TASKS = [
  { task_key: "complete_profile", label: "Complete your profile" },
  { task_key: "add_site", label: "Add your first site" },
  { task_key: "install_widget", label: "Install TrustLock widget" },
  { task_key: "kyc_verification", label: "Complete KYC verification" },
  { task_key: "first_transaction", label: "Create first transaction" },
  { task_key: "configure_payouts", label: "Configure payout settings" },
];

const BUYER_TASKS = [
  { task_key: "complete_profile", label: "Complete your profile" },
  { task_key: "consent_form", label: "Sign consent form" },
  { task_key: "first_purchase", label: "Make your first purchase" },
  { task_key: "confirm_delivery", label: "Confirm a delivery" },
  { task_key: "review_milestones", label: "Review milestone progress" },
];

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
    const { action, user_id, role, task_key } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Return all tasks for user
    if (action === "get" || req.method === "GET") {
      const { data, error } = await supabase
        .from("user_onboarding_tasks")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ tasks: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Initialize default tasks for new user
    if (action === "initialize") {
      if (!role) {
        return new Response(JSON.stringify({ error: "role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tasks = role === "vendor" ? VENDOR_TASKS : BUYER_TASKS;
      const rows = tasks.map((t) => ({
        user_id,
        task_key: t.task_key,
        role,
        completed: false,
      }));

      const { data, error } = await supabase
        .from("user_onboarding_tasks")
        .upsert(rows, { onConflict: "user_id,task_key" })
        .select();

      if (error) throw error;
      return new Response(JSON.stringify({ tasks: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH: Mark task as completed
    if (action === "complete") {
      if (!task_key) {
        return new Response(JSON.stringify({ error: "task_key required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("user_onboarding_tasks")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("user_id", user_id)
        .eq("task_key", task_key)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ task: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

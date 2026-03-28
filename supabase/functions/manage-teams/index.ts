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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // Auto-archive: find completed/dissolved workspaces older than 90 days
    if (action === "auto_archive") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const { data: stale } = await supabase
        .from("team_workspaces")
        .select("id")
        .in("status", ["complete", "dissolved"])
        .is("archived_at", null)
        .lt("updated_at", cutoff.toISOString());

      if (stale && stale.length > 0) {
        const ids = stale.map((w: any) => w.id);
        await supabase
          .from("team_workspaces")
          .update({ status: "archived", archived_at: new Date().toISOString() })
          .in("id", ids);
      }

      return new Response(
        JSON.stringify({ archived: stale?.length || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark task as completed by assigned member (enforces sequential handoff)
    if (action === "complete_task") {
      const { task_id } = body;
      if (!task_id) {
        return new Response(JSON.stringify({ error: "task_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the user is the assigned member
      const { data: task } = await supabase
        .from("team_task_assignments")
        .select("*, team_members!inner(user_id, workspace_id)")
        .eq("id", task_id)
        .single();

      if (!task || task.team_members.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check sequential gate: all prior tasks must be completed
      const { data: priorTasks } = await supabase
        .from("team_task_assignments")
        .select("id, status, sort_order")
        .eq("workspace_id", task.team_members.workspace_id)
        .lt("sort_order", task.sort_order)
        .neq("status", "completed");

      if (priorTasks && priorTasks.length > 0) {
        return new Response(
          JSON.stringify({ error: "Previous tasks must be completed first" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("team_task_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", task_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    // ── Auto-archive: completed/dissolved > 90 days ──
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
        await supabase
          .from("team_workspaces")
          .update({ status: "archived", archived_at: new Date().toISOString() })
          .in("id", stale.map((w: any) => w.id));
      }
      return new Response(JSON.stringify({ archived: stale?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Complete task (sequential handoff) ──
    if (action === "complete_task") {
      const { task_id } = body;
      if (!task_id) {
        return new Response(JSON.stringify({ error: "task_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: task } = await supabase
        .from("team_task_assignments")
        .select("*, team_members!inner(user_id, workspace_id)")
        .eq("id", task_id)
        .single();
      if (!task || task.team_members.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      const updatePayload: any = { status: "completed", completed_at: new Date().toISOString() };
      if (body.evidence_url) updatePayload.evidence_url = body.evidence_url;
      await supabase
        .from("team_task_assignments")
        .update(updatePayload)
        .eq("id", task_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Apply template: clone template rules into task assignments ──
    if (action === "apply_template") {
      const { template_id, workspace_id, transaction_id } = body;
      if (!template_id || !workspace_id) {
        return new Response(JSON.stringify({ error: "template_id and workspace_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify ownership
      const { data: ws } = await supabase
        .from("team_workspaces")
        .select("owner_id")
        .eq("id", workspace_id)
        .single();
      if (!ws || ws.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Link transaction if provided
      if (transaction_id) {
        await supabase
          .from("team_workspaces")
          .update({ transaction_id, updated_at: new Date().toISOString() })
          .eq("id", workspace_id);
      }

      // Fetch template rules
      const { data: rules } = await supabase
        .from("team_template_rules")
        .select("*")
        .eq("template_id", template_id)
        .order("sort_order", { ascending: true });

      if (!rules || rules.length === 0) {
        return new Response(JSON.stringify({ error: "Template has no rules" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create task assignments from auto-assign rules
      const assignments = rules
        .filter((r: any) => r.auto_assign && r.member_id)
        .map((r: any) => ({
          workspace_id,
          member_id: r.member_id,
          milestone_key: r.milestone_key,
          milestone_label: r.milestone_label,
          instructions: r.instructions,
          sort_order: r.sort_order,
          status: "pending",
        }));

      if (assignments.length > 0) {
        const { error } = await supabase.from("team_task_assignments").insert(assignments);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Return which rules were skipped (manual assignment needed)
      const manual = rules.filter((r: any) => !r.auto_assign || !r.member_id);

      return new Response(JSON.stringify({
        success: true,
        auto_assigned: assignments.length,
        manual_pending: manual.length,
        manual_rules: manual.map((r: any) => ({
          milestone_key: r.milestone_key,
          milestone_label: r.milestone_label,
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Auto-trigger: match new transaction to workspaces with auto_match_industry ──
    if (action === "auto_trigger_check") {
      const { transaction_id, industry } = body;
      if (!transaction_id || !industry) {
        return new Response(JSON.stringify({ error: "transaction_id and industry required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find workspaces with auto-match enabled for this industry
      const { data: matchingWs } = await supabase
        .from("team_workspaces")
        .select("id, owner_id")
        .eq("industry", industry)
        .eq("auto_match_industry", true)
        .eq("status", "active")
        .is("transaction_id", null);

      if (!matchingWs || matchingWs.length === 0) {
        return new Response(JSON.stringify({ matched: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let totalAssigned = 0;
      for (const ws of matchingWs) {
        // Get default template
        const { data: defaultTemplate } = await supabase
          .from("team_assignment_templates")
          .select("id")
          .eq("workspace_id", ws.id)
          .eq("is_default", true)
          .eq("auto_trigger_mode", "auto")
          .single();

        if (!defaultTemplate) continue;

        // Link transaction
        await supabase
          .from("team_workspaces")
          .update({ transaction_id, updated_at: new Date().toISOString() })
          .eq("id", ws.id);

        // Fetch and apply rules
        const { data: rules } = await supabase
          .from("team_template_rules")
          .select("*")
          .eq("template_id", defaultTemplate.id)
          .eq("auto_assign", true)
          .order("sort_order", { ascending: true });

        if (rules && rules.length > 0) {
          const assignments = rules
            .filter((r: any) => r.member_id)
            .map((r: any) => ({
              workspace_id: ws.id,
              member_id: r.member_id,
              milestone_key: r.milestone_key,
              milestone_label: r.milestone_label,
              instructions: r.instructions,
              sort_order: r.sort_order,
              status: "pending",
            }));
          if (assignments.length > 0) {
            await supabase.from("team_task_assignments").insert(assignments);
            totalAssigned += assignments.length;
          }
        }
      }

      return new Response(JSON.stringify({ matched: matchingWs.length, assigned: totalAssigned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

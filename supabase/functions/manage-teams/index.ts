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
    const json = (data: any, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── Auto-archive: completed/dissolved > 90 days ──
    if (action === "auto_archive") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const { data: stale } = await supabase
        .from("team_workspaces").select("id")
        .in("status", ["complete", "dissolved"])
        .is("archived_at", null)
        .lt("updated_at", cutoff.toISOString());
      if (stale && stale.length > 0) {
        await supabase.from("team_workspaces")
          .update({ status: "archived", archived_at: new Date().toISOString() })
          .in("id", stale.map((w: any) => w.id));
      }
      return json({ archived: stale?.length || 0 });
    }

    // ── Complete task (sequential handoff) ──
    if (action === "complete_task") {
      const { task_id } = body;
      if (!task_id) return json({ error: "task_id required" }, 400);

      const { data: task } = await supabase
        .from("team_task_assignments")
        .select("*, team_members!inner(user_id, workspace_id)")
        .eq("id", task_id).single();
      if (!task || task.team_members.user_id !== user.id) {
        return json({ error: "Not authorized" }, 403);
      }

      const { data: priorTasks } = await supabase
        .from("team_task_assignments")
        .select("id, status, sort_order")
        .eq("workspace_id", task.team_members.workspace_id)
        .lt("sort_order", task.sort_order)
        .neq("status", "completed");
      if (priorTasks && priorTasks.length > 0) {
        return json({ error: "Previous tasks must be completed first" }, 400);
      }

      const updatePayload: any = { status: "completed", completed_at: new Date().toISOString() };
      if (body.evidence_url) updatePayload.evidence_url = body.evidence_url;
      await supabase.from("team_task_assignments").update(updatePayload).eq("id", task_id);

      // Notify workspace owner (team lead)
      const { data: ws } = await supabase
        .from("team_workspaces").select("owner_id, title").eq("id", task.team_members.workspace_id).single();
      if (ws) {
        await supabase.from("notifications").insert({
          user_id: ws.owner_id,
          title: "✅ Team Task Completed",
          message: `${task.milestone_label || task.milestone_key} has been completed in "${ws.title}". Review and verify it.`,
          type: "info",
          is_action_required: true,
          action_url: "/trustlock/vendor/teams",
          related_entity_type: "team_task",
          related_entity_id: task_id,
        });
      }

      return json({ success: true });
    }

    // ── Lead verifies a completed task → bridges to work order milestone ──
    if (action === "verify_task") {
      const { task_id } = body;
      if (!task_id) return json({ error: "task_id required" }, 400);

      const { data: task } = await supabase
        .from("team_task_assignments")
        .select("*, team_members!inner(workspace_id)")
        .eq("id", task_id).single();
      if (!task) return json({ error: "Task not found" }, 404);

      // Check caller is workspace owner
      const { data: ws } = await supabase
        .from("team_workspaces").select("owner_id, transaction_id, title")
        .eq("id", task.team_members.workspace_id).single();
      if (!ws || ws.owner_id !== user.id) return json({ error: "Only team lead can verify" }, 403);
      if (task.status !== "completed") return json({ error: "Task must be completed first" }, 400);

      // Mark as verified by lead
      await supabase.from("team_task_assignments").update({
        lead_verified_at: new Date().toISOString(),
        lead_verified_by: user.id,
      }).eq("id", task_id);

      // If linked to a transaction milestone, update milestone status
      if (task.transaction_milestone_id && ws.transaction_id) {
        await supabase.from("transaction_milestones").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", task.transaction_milestone_id);

        // Notify the other party (buyer if vendor workspace, vendor if buyer workspace)
        const { data: tx } = await supabase
          .from("transactions").select("buyer_id, vendor_id").eq("id", ws.transaction_id).single();
        if (tx) {
          const { data: wsRole } = await supabase
            .from("team_workspaces").select("role").eq("id", task.team_members.workspace_id).single();
          const notifyUserId = wsRole?.role === "vendor" ? tx.buyer_id : tx.vendor_id;
          if (notifyUserId) {
            await supabase.from("notifications").insert({
              user_id: notifyUserId,
              title: "📋 Milestone Updated",
              message: `"${task.milestone_label || task.milestone_key}" has been verified and completed for order linked to "${ws.title}".`,
              type: "info",
              related_entity_type: "transaction",
              related_entity_id: ws.transaction_id,
            });
          }
        }
      }

      return json({ success: true, verified: true });
    }

    // ── Reassign task to another member ──
    if (action === "reassign_task") {
      const { task_id, new_member_id } = body;
      if (!task_id || !new_member_id) return json({ error: "task_id and new_member_id required" }, 400);

      const { data: task } = await supabase
        .from("team_task_assignments")
        .select("*, team_members!inner(workspace_id)")
        .eq("id", task_id).single();
      if (!task) return json({ error: "Task not found" }, 404);

      const { data: ws } = await supabase
        .from("team_workspaces").select("owner_id")
        .eq("id", task.team_members.workspace_id).single();
      if (!ws || ws.owner_id !== user.id) return json({ error: "Only team lead can reassign" }, 403);

      const oldMemberId = task.member_id;
      await supabase.from("team_task_assignments").update({
        member_id: new_member_id,
        reassigned_from: oldMemberId,
        status: "pending",
        completed_at: null,
        lead_verified_at: null,
        lead_verified_by: null,
        evidence_url: null,
      }).eq("id", task_id);

      // Notify new member
      const { data: newMember } = await supabase
        .from("team_members").select("user_id").eq("id", new_member_id).single();
      if (newMember) {
        await supabase.from("notifications").insert({
          user_id: newMember.user_id,
          title: "📌 Task Reassigned to You",
          message: `You've been assigned: "${task.milestone_label || task.milestone_key}". Check your Teams tab.`,
          type: "info",
          is_action_required: true,
          action_url: "/trustlock/vendor/teams",
        });
      }

      return json({ success: true });
    }

    // ── Generate invite code for a workspace (if missing) ──
    if (action === "generate_invite_code") {
      const { workspace_id } = body;
      if (!workspace_id) return json({ error: "workspace_id required" }, 400);

      const { data: ws } = await supabase
        .from("team_workspaces").select("owner_id, invite_code")
        .eq("id", workspace_id).single();
      if (!ws || ws.owner_id !== user.id) return json({ error: "Not authorized" }, 403);

      if (ws.invite_code) return json({ invite_code: ws.invite_code });

      // Generate new code
      const code = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 12);
      await supabase.from("team_workspaces")
        .update({ invite_code: code }).eq("id", workspace_id);

      return json({ invite_code: code });
    }

    // ── Apply template: clone template rules into task assignments ──
    if (action === "apply_template") {
      const { template_id, workspace_id, transaction_id } = body;
      if (!template_id || !workspace_id) return json({ error: "template_id and workspace_id required" }, 400);

      const { data: ws } = await supabase
        .from("team_workspaces").select("owner_id").eq("id", workspace_id).single();
      if (!ws || ws.owner_id !== user.id) return json({ error: "Not authorized" }, 403);

      if (transaction_id) {
        await supabase.from("team_workspaces")
          .update({ transaction_id, updated_at: new Date().toISOString() })
          .eq("id", workspace_id);
      }

      const { data: rules } = await supabase
        .from("team_template_rules").select("*")
        .eq("template_id", template_id)
        .order("sort_order", { ascending: true });

      if (!rules || rules.length === 0) return json({ error: "Template has no rules" }, 400);

      const assignments = rules
        .filter((r: any) => r.auto_assign && r.member_id)
        .map((r: any) => ({
          workspace_id, member_id: r.member_id,
          milestone_key: r.milestone_key, milestone_label: r.milestone_label,
          instructions: r.instructions, sort_order: r.sort_order, status: "pending",
        }));

      if (assignments.length > 0) {
        const { error } = await supabase.from("team_task_assignments").insert(assignments);
        if (error) return json({ error: error.message }, 500);
      }

      const manual = rules.filter((r: any) => !r.auto_assign || !r.member_id);
      return json({
        success: true, auto_assigned: assignments.length,
        manual_pending: manual.length,
        manual_rules: manual.map((r: any) => ({ milestone_key: r.milestone_key, milestone_label: r.milestone_label })),
      });
    }

    // ── Auto-trigger: match new transaction to workspaces with auto_match_industry ──
    if (action === "auto_trigger_check") {
      const { transaction_id, industry } = body;
      if (!transaction_id || !industry) return json({ error: "transaction_id and industry required" }, 400);

      const { data: matchingWs } = await supabase
        .from("team_workspaces").select("id, owner_id")
        .eq("industry", industry).eq("auto_match_industry", true)
        .eq("status", "active").is("transaction_id", null);

      if (!matchingWs || matchingWs.length === 0) return json({ matched: 0 });

      let totalAssigned = 0;
      for (const ws of matchingWs) {
        const { data: defaultTemplate } = await supabase
          .from("team_assignment_templates").select("id")
          .eq("workspace_id", ws.id).eq("is_default", true)
          .eq("auto_trigger_mode", "auto").single();
        if (!defaultTemplate) continue;

        await supabase.from("team_workspaces")
          .update({ transaction_id, updated_at: new Date().toISOString() })
          .eq("id", ws.id);

        const { data: rules } = await supabase
          .from("team_template_rules").select("*")
          .eq("template_id", defaultTemplate.id).eq("auto_assign", true)
          .order("sort_order", { ascending: true });

        if (rules && rules.length > 0) {
          const assignments = rules
            .filter((r: any) => r.member_id)
            .map((r: any) => ({
              workspace_id: ws.id, member_id: r.member_id,
              milestone_key: r.milestone_key, milestone_label: r.milestone_label,
              instructions: r.instructions, sort_order: r.sort_order, status: "pending",
            }));
          if (assignments.length > 0) {
            await supabase.from("team_task_assignments").insert(assignments);
            totalAssigned += assignments.length;
          }
        }
      }

      return json({ matched: matchingWs.length, assigned: totalAssigned });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

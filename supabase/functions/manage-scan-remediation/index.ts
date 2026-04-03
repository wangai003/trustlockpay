import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const { action, scan_id, user_id, transaction_id, admin_notes } = await req.json();

    // ── ADMIN: Clear a scan flag and restore access ─────────────────────
    if (action === "clear_flag") {
      if (!scan_id) throw new Error("scan_id required");

      const { data: scan } = await adminClient
        .from("document_scan_results")
        .select("*")
        .eq("id", scan_id)
        .single();

      if (!scan) throw new Error("Scan not found");

      // Mark scan as reviewed
      await adminClient.from("document_scan_results").update({
        is_reviewed: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: "admin",
      }).eq("id", scan_id);

      // Resolve related AI signals
      await adminClient.from("ai_signals").update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      }).eq("context->>scan_id", scan_id);

      // Resolve related compliance flags
      await adminClient.from("compliance_flags").update({
        status: "resolved",
      }).like("flag_id", `%${scan_id}%`);

      // Restore user profile if it was paused
      if (scan.user_id) {
        await adminClient.from("profiles").update({
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", scan.user_id).eq("status", "paused");

        await adminClient.from("notifications").insert({
          user_id: scan.user_id,
          title: "Account Restored",
          message: admin_notes
            ? `Your account has been reviewed and restored. Admin note: ${admin_notes}`
            : "Your account has been reviewed and restored. You may continue using the platform.",
          type: "info",
          is_action_required: false,
        });
      }

      // Restore transaction if it was held
      if (scan.transaction_id) {
        await adminClient.from("transactions").update({
          status: "locked", // restore to escrow-locked state
          updated_at: new Date().toISOString(),
        }).eq("id", scan.transaction_id).in("status", ["compliance_hold", "compliance_review"]);
      }

      return new Response(JSON.stringify({ success: true, message: "Flag cleared, access restored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADMIN: Confirm fraud and escalate ────────────────────────────────
    if (action === "confirm_fraud") {
      if (!scan_id) throw new Error("scan_id required");

      const { data: scan } = await adminClient
        .from("document_scan_results")
        .select("*")
        .eq("id", scan_id)
        .single();

      if (!scan) throw new Error("Scan not found");

      // Mark reviewed
      await adminClient.from("document_scan_results").update({
        is_reviewed: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: "admin",
        verdict: "likely_fraudulent",
      }).eq("id", scan_id);

      // Hard lock user
      if (scan.user_id) {
        await adminClient.from("profiles").update({
          status: "deleted", // effectively banned
          updated_at: new Date().toISOString(),
        }).eq("id", scan.user_id);

        // Reject all pending KYC
        await adminClient.from("kyc_documents").update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        }).eq("vendor_id", scan.user_id);

        await adminClient.from("notifications").insert({
          user_id: scan.user_id,
          title: "Account Suspended",
          message: "Your account has been suspended due to document verification failure. Please contact support for further assistance.",
          type: "warning",
          is_action_required: false,
        });
      }

      // Cancel all active transactions for this user
      if (scan.user_id) {
        await adminClient.from("transactions").update({
          status: "compliance_hold",
          updated_at: new Date().toISOString(),
        }).or(`buyer_id.eq.${scan.user_id},vendor_id.eq.${scan.user_id}`)
          .in("status", ["locked", "shipped", "delivered", "pending"]);
      }

      return new Response(JSON.stringify({ success: true, message: "Fraud confirmed, account suspended" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── USER: Request re-verification ───────────────────────────────────
    if (action === "request_reverification") {
      if (!user_id) throw new Error("user_id required");

      // Check that user is actually in paused state
      const { data: profile } = await adminClient
        .from("profiles")
        .select("status")
        .eq("id", user_id)
        .single();

      if (!profile || profile.status !== "paused") {
        return new Response(JSON.stringify({ error: "Account is not in review status" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset KYC docs to allow re-upload
      await adminClient.from("kyc_documents").update({
        status: "pending",
        reviewed_at: null,
      }).eq("vendor_id", user_id).eq("status", "rejected");

      // Notify admin
      const { data: admins } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(5);

      if (admins) {
        for (const a of admins) {
          await adminClient.from("notifications").insert({
            user_id: a.user_id,
            title: "Re-verification Requested",
            message: `User ${user_id} has requested re-verification after a document scan flag. Please review their new submissions.`,
            type: "info",
            is_action_required: true,
            action_url: "/admin/compliance",
            related_entity_type: "reverification",
            related_entity_id: user_id,
          });
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Re-verification requested. Upload new documents." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ADMIN: Get scan enforcement summary ─────────────────────────────
    if (action === "enforcement_summary") {
      const { data: flaggedScans } = await adminClient
        .from("document_scan_results")
        .select("*")
        .in("verdict", ["red_flags", "likely_fraudulent"])
        .eq("is_reviewed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: heldTx } = await adminClient
        .from("transactions")
        .select("id, tx_id, status, buyer_name, vendor_name, amount")
        .in("status", ["compliance_hold", "compliance_review"])
        .order("updated_at", { ascending: false })
        .limit(50);

      const { data: pausedProfiles } = await adminClient
        .from("profiles")
        .select("id, full_name, email, status")
        .eq("status", "paused")
        .limit(50);

      return new Response(JSON.stringify({
        success: true,
        flagged_scans: flaggedScans?.length || 0,
        held_transactions: heldTx?.length || 0,
        paused_accounts: pausedProfiles?.length || 0,
        scans: flaggedScans,
        transactions: heldTx,
        profiles: pausedProfiles,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: clear_flag, confirm_fraud, request_reverification, enforcement_summary" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-scan-remediation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

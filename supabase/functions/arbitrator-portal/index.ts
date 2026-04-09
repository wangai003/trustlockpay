import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, token, password, ...params } = await req.json();

    // ── VERIFY: Validate token + password for arbitrator access ──
    if (action === "verify") {
      const { data: session } = await supabase
        .from("arbitrator_sessions")
        .select("*")
        .eq("access_token", token)
        .single();

      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid access link" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (session.status !== "active") {
        return new Response(JSON.stringify({ error: "This case portal has been closed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (new Date(session.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Access link has expired" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Verify password using bcrypt via DB function
      const { data: pwValid } = await supabase.rpc("verify_arbitrator_password", { _session_id: session.id, _password: password });
      if (!pwValid) {
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Increment access count
      await supabase.from("arbitrator_sessions").update({
        access_count: session.access_count + 1,
        last_accessed_at: new Date().toISOString(),
      }).eq("id", session.id);

      return new Response(JSON.stringify({ ok: true, session_id: session.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GET CASE BUNDLE: Return all case data for the arbitrator ──
    if (action === "get_case") {
      const { data: session } = await supabase
        .from("arbitrator_sessions")
        .select("*")
        .eq("access_token", token)
        .single();

      if (!session || session.status !== "active") {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch dispute
      const { data: dispute } = await supabase.from("disputes").select("*").eq("id", session.dispute_id).single();

      // Fetch transaction
      const { data: transaction } = await supabase.from("transactions").select("*").eq("id", session.transaction_id).single();

      // Fetch evidence
      const { data: evidence } = await supabase.from("dispute_evidence").select("*").eq("dispute_id", session.dispute_id);

      // Fetch milestones
      const { data: milestones } = await supabase.from("transaction_milestones").select("*").eq("transaction_id", session.transaction_id).order("milestone_index");

      // Fetch blockchain proofs
      const { data: proofs } = await supabase.from("blockchain_proofs").select("*").eq("transaction_id", session.transaction_id).order("created_at");

      // Fetch acknowledgement forms
      const { data: ackForms } = await supabase.from("acknowledgement_forms").select("*").eq("transaction_id", session.transaction_id);

      // Fetch arbitration fee order
      const { data: feeOrders } = await supabase.from("arbitration_fee_orders").select("*").eq("dispute_id", session.dispute_id);

      const caseBundle = {
        dispute,
        transaction: transaction ? {
          tx_id: transaction.tx_id,
          amount: transaction.amount,
          currency: transaction.currency,
          industry: transaction.industry,
          status: transaction.status,
          buyer_name: transaction.buyer_name,
          vendor_name: transaction.vendor_name,
          created_at: transaction.created_at,
          description: transaction.description,
        } : null,
        evidence: evidence || [],
        milestones: milestones || [],
        blockchain_proofs: (proofs || []).map((p: any) => ({
          record_type: p.record_type,
          content_hash: p.content_hash,
          chain_status: p.chain_status,
          created_at: p.created_at,
          polygon_tx_hash: p.polygon_tx_hash,
        })),
        acknowledgement_forms: ackForms || [],
        arbitration_fee_orders: feeOrders || [],
        escrow_mechanics: {
          description: "TrustLock holds buyer funds in escrow until milestones are completed and both parties sign acknowledgement forms. Funds are released per milestone or in full upon completion.",
          fee_structure: "TrustLock charges a 1% escrow fee on the transaction amount, deducted from the vendor's payout at release.",
          dispute_flow: "Either party may raise a dispute. Admin reviews with AI assistance. If unresolved, professional arbitration can be requested for disputes ≥ $10,000.",
          ruling_enforcement: "Arbitration rulings are binding. TrustLock executes the escrow release/refund per the ruling terms and anchors the ruling to the Polygon blockchain.",
          retention: "All trade data, signatures, and rulings are retained for 7 years per compliance requirements.",
        },
        session: {
          arbitrator_name: session.arbitrator_name,
          created_at: session.created_at,
          expires_at: session.expires_at,
        },
      };

      return new Response(JSON.stringify(caseBundle), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── GENERATE BUNDLE: Admin triggers case file packaging ──
    if (action === "generate_bundle") {
      const { dispute_id } = params;

      const { data: dispute } = await supabase.from("disputes").select("*").eq("id", dispute_id).single();
      if (!dispute) {
        return new Response(JSON.stringify({ error: "Dispute not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Gather all relevant data
      const { data: transaction } = await supabase.from("transactions").select("*").eq("id", dispute.transaction_id).single();
      const { data: evidence } = await supabase.from("dispute_evidence").select("*").eq("dispute_id", dispute_id);
      const { data: milestones } = transaction?.id
        ? await supabase.from("transaction_milestones").select("*").eq("transaction_id", transaction.id).order("milestone_index")
        : { data: [] };
      const { data: proofs } = transaction?.id
        ? await supabase.from("blockchain_proofs").select("*").eq("transaction_id", transaction.id).order("created_at")
        : { data: [] };
      const { data: ackForms } = transaction?.id
        ? await supabase.from("acknowledgement_forms").select("*").eq("transaction_id", transaction.id)
        : { data: [] };

      const bundle = {
        generated_at: new Date().toISOString(),
        dispute: {
          id: dispute.dispute_id,
          reason: dispute.reason,
          description: dispute.description,
          status: dispute.status,
          amount: dispute.amount,
          buyer: dispute.buyer_name,
          vendor: dispute.vendor_name,
          filed: dispute.created_at,
          ai_confidence: dispute.ai_confidence,
          ai_recommendation: dispute.ai_recommendation,
        },
        transaction: transaction ? {
          tx_id: transaction.tx_id,
          amount: transaction.amount,
          currency: transaction.currency,
          industry: transaction.industry,
          status: transaction.status,
          created_at: transaction.created_at,
        } : null,
        evidence_count: (evidence || []).length,
        evidence_files: (evidence || []).map((e: any) => ({ file_name: e.file_name, file_type: e.file_type, uploaded_at: e.created_at })),
        milestones: (milestones || []).map((m: any) => ({ title: m.title, status: m.status, index: m.milestone_index })),
        blockchain_proof_count: (proofs || []).length,
        acknowledgement_forms_count: (ackForms || []).length,
      };

      // Update session if one exists
      const { data: existingSession } = await supabase
        .from("arbitrator_sessions")
        .select("id")
        .eq("dispute_id", dispute_id)
        .eq("status", "active")
        .single();

      if (existingSession) {
        await supabase.from("arbitrator_sessions").update({
          case_bundle_generated: true,
        }).eq("id", existingSession.id);
      }

      return new Response(JSON.stringify({ ok: true, bundle }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── CREATE SESSION: Generate arbitrator onboarding link ──
    if (action === "create_session") {
      const { dispute_id, arbitrator_name, arbitrator_email } = params;

      const { data: dispute } = await supabase.from("disputes").select("*, transactions:transaction_id(id, tx_id)").eq("id", dispute_id).single();
      if (!dispute) {
        return new Response(JSON.stringify({ error: "Dispute not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Generate a simple readable password, then hash it for storage
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let pwd = "";
      for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];

      // Hash password using DB function
      const { data: hashedPwd } = await supabase.rpc("hash_arbitrator_password", { _password: pwd });

      const { data: session, error } = await supabase.from("arbitrator_sessions").insert({
        dispute_id,
        transaction_id: dispute.transaction_id,
        arbitrator_name,
        arbitrator_email: arbitrator_email || null,
        access_password_hash: hashedPwd,
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        ok: true,
        session_id: session.id,
        access_token: session.access_token,
        access_password: pwd,
        portal_url: `/arbitrator/${session.access_token}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── REVOKE SESSION: Close arbitrator access ──
    if (action === "revoke_session") {
      const { session_id } = params;
      await supabase.from("arbitrator_sessions").update({ status: "revoked" }).eq("id", session_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── UPLOAD RULING: Arbitrator uploads ruling document ──
    if (action === "record_ruling") {
      const { session_id, ruling_file_url, ruling_file_name } = params;

      const { data: session } = await supabase.from("arbitrator_sessions").select("*").eq("id", session_id).single();
      if (!session || session.status !== "active") {
        return new Response(JSON.stringify({ error: "Session not active" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update session with ruling and auto-close
      await supabase.from("arbitrator_sessions").update({
        ruling_file_url,
        ruling_file_name,
        ruling_uploaded_at: new Date().toISOString(),
        status: "ruling_submitted",
      }).eq("id", session_id);

      // Archive ruling to protection_documents for all parties
      const { data: dispute } = await supabase.from("disputes").select("*").eq("id", session.dispute_id).single();
      const { data: transaction } = session.transaction_id
        ? await supabase.from("transactions").select("*").eq("id", session.transaction_id).single()
        : { data: null };

      const roles = ["admin", "buyer", "vendor"];
      const userIds = [null, dispute?.buyer_id, dispute?.vendor_id];

      for (let i = 0; i < roles.length; i++) {
        if (userIds[i] || roles[i] === "admin") {
          await supabase.from("protection_documents").insert({
            document_type: "arbitrator_ruling",
            title: `Arbitrator Ruling — ${dispute?.dispute_id || "Unknown"}`,
            transaction_id: session.transaction_id,
            user_id: userIds[i],
            role: roles[i],
            industry: transaction?.industry || "general",
            retention_years: 7,
            file_url: ruling_file_url,
            metadata: {
              arbitrator_name: session.arbitrator_name,
              dispute_id: session.dispute_id,
              ruling_file_name,
              uploaded_at: new Date().toISOString(),
              auto_distributed: true,
            },
          });
        }
      }

      // Update dispute status to ruling_issued
      await supabase.from("disputes").update({
        status: "ruling_issued",
        updated_at: new Date().toISOString(),
      }).eq("id", session.dispute_id);

      // Mark session as distributed and anchored
      await supabase.from("arbitrator_sessions").update({
        ruling_distributed: true,
      }).eq("id", session_id);

      // Send notifications to buyer, vendor, and admins
      const notifyUsers: { userId: string | null; title: string; message: string }[] = [];
      
      if (dispute?.buyer_id) {
        notifyUsers.push({
          userId: dispute.buyer_id,
          title: "⚖️ Arbitration Ruling Issued",
          message: `The arbitrator has issued a binding ruling for dispute ${dispute.dispute_id}. The ruling document has been added to your Documents section under "Arbitrator Ruling."`,
        });
      }
      if (dispute?.vendor_id) {
        notifyUsers.push({
          userId: dispute.vendor_id,
          title: "⚖️ Arbitration Ruling Issued",
          message: `The arbitrator has issued a binding ruling for dispute ${dispute.dispute_id}. The ruling document has been added to your Documents section under "Arbitrator Ruling."`,
        });
      }

      // Notify admins
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      for (const ar of adminRoles || []) {
        notifyUsers.push({
          userId: ar.user_id,
          title: "⚖️ Arbitration Ruling Received",
          message: `Arbitrator ${session.arbitrator_name} has uploaded a ruling for dispute ${dispute?.dispute_id || "unknown"}. Review and execute the ruling.`,
        });
      }

      for (const n of notifyUsers) {
        if (n.userId) {
          await supabase.from("notifications").insert({
            user_id: n.userId,
            title: n.title,
            message: n.message,
            type: "info",
            is_action_required: true,
            related_entity_type: "dispute",
            related_entity_id: dispute?.id,
          });
        }
      }

      // Anchor to blockchain
      const txRef = transaction?.tx_id || dispute?.tx_id || `DSP-${session.dispute_id.slice(0, 8)}`;

      const { data: lastProof } = await supabase
        .from("blockchain_proofs")
        .select("content_hash")
        .eq("transaction_id", session.transaction_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const encoder = new TextEncoder();
      const hashData = encoder.encode(JSON.stringify({
        ruling_file_url,
        arbitrator: session.arbitrator_name,
        dispute_id: session.dispute_id,
        timestamp: new Date().toISOString(),
      }));
      const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
      const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      await supabase.from("blockchain_proofs").insert({
        tx_ref: txRef,
        transaction_id: session.transaction_id,
        record_type: "dispute_ruling",
        content_hash: contentHash,
        prev_hash: lastProof?.content_hash || "genesis",
        event_data: {
          arbitrator_name: session.arbitrator_name,
          dispute_id: session.dispute_id,
          ruling_file_name,
          ruling_file_url,
        },
        chain_status: "queued",
      });

      await supabase.from("arbitrator_sessions").update({ ruling_anchored: true }).eq("id", session_id);

      return new Response(JSON.stringify({ ok: true, distributed: true, anchored: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

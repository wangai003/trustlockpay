import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KYC_TIERS: Record<string, { label: string; docs: string }> = {
  basic: { label: "Basic", docs: "Email + Phone verification" },
  standard: { label: "Standard", docs: "Government-issued ID" },
  enhanced: { label: "Enhanced", docs: "Business documentation" },
  premium: { label: "Premium", docs: "Full compliance audit" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Blockchain Anchor Helper ─────────────────────────────
    async function anchorProofKyc(
      transactionId: string,
      recordType: string,
      eventData: Record<string, unknown>
    ) {
      try {
        const canonical = JSON.stringify(eventData, Object.keys(eventData).sort());
        const enc = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(canonical));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        const txData = enc.encode(transactionId);
        let txRef = "0x";
        for (let i = 0; i < 32; i++) {
          const byte = txData[i % txData.length] ^ (i * 37);
          txRef += (byte & 0xff).toString(16).padStart(2, "0");
        }
        const { data: lastRecord } = await supabaseAdmin
          .from("blockchain_proofs").select("content_hash").order("created_at", { ascending: false }).limit(1).single();
        const prevHash = lastRecord?.content_hash || "0x" + "0".repeat(64);
        await supabaseAdmin.from("blockchain_proofs").insert({
          content_hash: contentHash, prev_hash: prevHash, record_type: recordType,
          tx_ref: txRef, transaction_id: transactionId, event_data: eventData, chain_status: "queued",
        });
        console.log(`[anchor] ${recordType} for ${transactionId.slice(0, 8)}...`);
      } catch (err) { console.error("[anchor] Failed:", err); }
    }

    const { action, ...params } = await req.json();

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const isAdmin = async (): Promise<boolean> => {
      const { data } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    };

    // --- submit_document ---
    if (action === "submit_document") {
      const { document_name, file_url, tier } = params;
      if (!document_name) return json({ success: false, error: "document_name required" }, 400);

      const tierInfo = KYC_TIERS[tier || "basic"];

      const { data: doc, error: docErr } = await supabaseUser
        .from("kyc_documents")
        .insert({
          vendor_id: user.id,
          name: document_name,
          file_url: file_url || null,
          status: "pending",
        })
        .select()
        .single();
      if (docErr) throw docErr;

      const kycId = `KYC-${Date.now().toString(36).toUpperCase()}`;

      // Fetch vendor name from profiles
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { error: queueErr } = await supabaseAdmin
        .from("kyc_queue")
        .insert({
          kyc_id: kycId,
          vendor_id: user.id,
          vendor_name: profile?.full_name || "Unknown",
          tier_change: tierInfo?.label || tier || "Basic",
          documents: document_name,
          status: "pending",
        });
      if (queueErr) throw queueErr;

      return json({ success: true, document: doc, kyc_id: kycId, tier: tierInfo });
    }

    // --- review_document ---
    if (action === "review_document") {
      if (!(await isAdmin())) return json({ success: false, error: "Admin only" }, 403);

      const { document_id, queue_id, decision } = params;
      if (!decision || !["approved", "rejected"].includes(decision)) {
        return json({ success: false, error: "decision must be approved or rejected" }, 400);
      }

      if (document_id) {
        const { error } = await supabaseAdmin
          .from("kyc_documents")
          .update({ status: decision, reviewed_at: new Date().toISOString() })
          .eq("id", document_id);
        if (error) throw error;
      }

      let vendorId: string | null = null;

      if (queue_id) {
        // Fetch vendor_id before updating so we can notify them
        const { data: queueRecord } = await supabaseAdmin
          .from("kyc_queue")
          .select("vendor_id")
          .eq("id", queue_id)
          .single();
        vendorId = queueRecord?.vendor_id || null;

        const { error } = await supabaseAdmin
          .from("kyc_queue")
          .update({ status: decision })
          .eq("id", queue_id);
        if (error) throw error;
      }

      // Notify the user about the KYC decision
      if (vendorId) {
        const isApproved = decision === "approved";

        // If approved, release any transactions stuck in kyc_hold
        if (isApproved) {
          const { data: heldTxs } = await supabaseAdmin
            .from("transactions")
            .select("id, tx_id")
            .or(`buyer_id.eq.${vendorId},vendor_id.eq.${vendorId}`)
            .eq("status", "kyc_hold");

          if (heldTxs && heldTxs.length > 0) {
            for (const tx of heldTxs) {
              await supabaseAdmin
                .from("transactions")
                .update({ status: "locked", updated_at: new Date().toISOString() })
                .eq("id", tx.id);

              // Notify parties that the hold is lifted
              await supabaseAdmin.from("notifications").insert({
                user_id: vendorId,
                title: "🔓 Escrow Hold Released",
                message: `Order ${tx.tx_id || tx.id} has been released from KYC hold and is now active in escrow. Fulfillment can proceed.`,
                type: "success",
                related_entity_type: "transaction",
                related_entity_id: tx.id,
              });
            }
          }
        }

        await supabaseAdmin.from("notifications").insert({
          user_id: vendorId,
          title: isApproved
            ? "✅ Identity Verification Approved"
            : "❌ Identity Verification Rejected",
          message: isApproved
            ? "Your KYC has been approved. Any escrow orders on hold have been released and can now proceed to fulfillment."
            : "Your KYC submission was rejected. Please review your documents and resubmit. Escrow orders above $5,000 will remain on hold until verification is complete.",
          type: isApproved ? "success" : "warning",
          is_action_required: !isApproved,
          action_url: isApproved ? null : "/trustlock/vendor/kyc",
        });
      }

      return json({ success: true, decision });
    }

    // --- get_vendor_kyc ---
    if (action === "get_vendor_kyc") {
      const { vendor_id } = params;
      const admin = await isAdmin();

      const targetId = admin && vendor_id ? vendor_id : user.id;

      const { data: docs, error: docsErr } = await supabaseAdmin
        .from("kyc_documents")
        .select("*")
        .eq("vendor_id", targetId)
        .order("created_at", { ascending: false });
      if (docsErr) throw docsErr;

      const { data: queue, error: queueErr } = await supabaseAdmin
        .from("kyc_queue")
        .select("*")
        .eq("vendor_id", targetId)
        .order("submitted_at", { ascending: false });
      if (queueErr) throw queueErr;

      return json({ success: true, documents: docs, queue, tiers: KYC_TIERS });
    }

    // --- get_queue ---
    if (action === "get_queue") {
      if (!(await isAdmin())) return json({ success: false, error: "Admin only" }, 403);

      const { status: filterStatus } = params;

      let query = supabaseAdmin
        .from("kyc_queue")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (filterStatus) {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      return json({ success: true, queue: data });
    }

    return json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

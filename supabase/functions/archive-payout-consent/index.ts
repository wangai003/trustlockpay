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
    const {
      user_id,
      role,
      order_number,
      transaction_id,
      wallet_address,
      chain,
      consent_type,         // "crypto_payout_liability" | "split_payout_acceptance"
      disclaimer_text,
      ip_address,
      user_agent,
      metadata,
    } = body;

    if (!user_id || !consent_type || !disclaimer_text) {
      return new Response(
        JSON.stringify({ error: "user_id, consent_type, and disclaimer_text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Archive the consent as a protection document with full audit trail
    const { data: doc, error: docErr } = await supabase
      .from("protection_documents")
      .insert({
        document_type: consent_type,
        title: consent_type === "crypto_payout_liability"
          ? `Crypto Payout Liability Acknowledgement — ${order_number || "N/A"}`
          : `Split Payout Acceptance — ${order_number || "N/A"}`,
        transaction_id: transaction_id || null,
        user_id,
        role: role || null,
        retention_years: 7,
        is_archived: true,
        archived_at: new Date().toISOString(),
        metadata: {
          consent_type,
          order_number: order_number || null,
          wallet_address: wallet_address || null,
          chain: chain || null,
          disclaimer_text,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          consented_at: new Date().toISOString(),
          ...(metadata || {}),
        },
      })
      .select()
      .single();

    if (docErr) throw docErr;

    // Also log in seed_token_audit_logs for cross-reference
    await supabase.from("seed_token_audit_logs").insert({
      user_id,
      token_value: "consent_archive",
      purpose: consent_type,
      action: "consent_recorded",
      role: role || null,
      order_number: order_number || null,
      transaction_id: transaction_id || null,
      target_wallet_address: wallet_address || null,
      target_wallet_label: chain || null,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
      metadata: {
        disclaimer_text_hash: await hashText(disclaimer_text),
        archived_document_id: doc.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, document_id: doc.id, archived_at: doc.archived_at }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

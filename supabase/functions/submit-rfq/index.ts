import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      vendor_id, rfq_number, buyer_name, buyer_email, buyer_company,
      buyer_location, buyer_phone_1, buyer_country_code_1,
      buyer_phone_2, buyer_country_code_2, buyer_phone_3, buyer_country_code_3,
      industry, specifications, quantity, unit, incoterms,
      requested_delivery_date, notes, rfq_label,
    } = body;

    // Validate required fields
    if (!buyer_name?.trim() || !buyer_email?.trim() || !rfq_number) {
      return new Response(
        JSON.stringify({ error: "buyer_name, buyer_email, and rfq_number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabaseAdmin
      .from("rfq_requests")
      .insert({
        vendor_id: vendor_id || null,
        rfq_number,
        status: "submitted",
        buyer_name: buyer_name.trim(),
        buyer_email: buyer_email.trim(),
        buyer_company: buyer_company?.trim() || null,
        buyer_location: buyer_location?.trim() || null,
        buyer_phone_1: buyer_phone_1?.trim() || null,
        buyer_country_code_1: buyer_phone_1?.trim() ? (buyer_country_code_1 || "+1") : null,
        buyer_phone_2: buyer_phone_2?.trim() || null,
        buyer_country_code_2: buyer_phone_2?.trim() ? (buyer_country_code_2 || "+1") : null,
        buyer_phone_3: buyer_phone_3?.trim() || null,
        buyer_country_code_3: buyer_phone_3?.trim() ? (buyer_country_code_3 || "+1") : null,
        industry: industry || null,
        specifications: specifications || {},
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        incoterms: incoterms || null,
        requested_delivery_date: requested_delivery_date || null,
        notes: notes?.trim() || null,
        rfq_label: rfq_label || "Request for Quote",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id, rfq_number")
      .single();

    if (error) {
      console.error("RFQ insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id, rfq_number: data.rfq_number }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-rfq error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

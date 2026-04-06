import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify user from JWT
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { rows, network_mode = "mainnet", site_id = null } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: "rows must be a non-empty array" }), { status: 400, headers: corsHeaders });
    }

    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: "Max 500 rows per batch" }), { status: 400, headers: corsHeaders });
    }

    // Create import job
    const { data: job, error: jobErr } = await supabase
      .from("bulk_import_jobs")
      .insert({ vendor_id: user.id, total_rows: rows.length, status: "processing" })
      .select("id")
      .single();

    if (jobErr) {
      return new Response(JSON.stringify({ error: jobErr.message }), { status: 500, headers: corsHeaders });
    }

    const validTypes = ["product", "service", "project"];
    const errors: { row: number; error: string }[] = [];
    const validPayloads: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name || typeof r.name !== "string" || r.name.trim().length === 0) {
        errors.push({ row: i + 1, error: "Missing name" });
        continue;
      }
      const offeringType = validTypes.includes(r.offering_type) ? r.offering_type : "product";
      validPayloads.push({
        vendor_id: user.id,
        site_id: r.site_id || site_id || null,
        name: r.name.trim().slice(0, 255),
        offering_type: offeringType,
        industry_key: r.industry_key || "ecommerce",
        category: r.category?.trim() || null,
        description: r.description?.trim() || null,
        base_price: r.base_price ? parseFloat(r.base_price) : null,
        currency: r.currency || "USD",
        unit_label: r.unit_label || null,
        is_active: r.is_active !== false,
        network_mode,
      });
    }

    let insertedCount = 0;
    if (validPayloads.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("vendor_offerings")
        .insert(validPayloads)
        .select("id");

      if (insertErr) {
        errors.push({ row: 0, error: `Batch insert failed: ${insertErr.message}` });
      } else {
        insertedCount = inserted?.length || 0;
      }
    }

    // Update job status
    await supabase.from("bulk_import_jobs").update({
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      processed_rows: insertedCount,
      error_log: errors,
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      job_id: job.id,
      total: rows.length,
      inserted: insertedCount,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

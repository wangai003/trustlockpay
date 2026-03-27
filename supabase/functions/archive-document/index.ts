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

    if (req.method === "POST") {
      const body = await req.json();
      const {
        document_type,
        title,
        transaction_id,
        user_id,
        role,
        industry,
        signed_by_buyer,
        signed_by_vendor,
        metadata,
        retention_years,
      } = body;

      if (!document_type || !title) {
        return new Response(
          JSON.stringify({ error: "document_type and title are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("protection_documents")
        .insert({
          document_type,
          title,
          transaction_id: transaction_id || null,
          user_id: user_id || null,
          role: role || null,
          industry: industry || null,
          signed_by_buyer: signed_by_buyer || null,
          signed_by_vendor: signed_by_vendor || null,
          metadata: metadata || {},
          retention_years: retention_years || 7,
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, document: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const transaction_id = url.searchParams.get("transaction_id");
      const user_id = url.searchParams.get("user_id");
      const document_type = url.searchParams.get("document_type");
      const search = url.searchParams.get("search");

      let query = supabase.from("protection_documents").select("*");

      if (transaction_id) query = query.eq("transaction_id", transaction_id);
      if (user_id) query = query.eq("user_id", user_id);
      if (document_type) query = query.eq("document_type", document_type);
      if (search) query = query.ilike("title", `%${search}%`);

      query = query.order("created_at", { ascending: false }).limit(100);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ documents: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

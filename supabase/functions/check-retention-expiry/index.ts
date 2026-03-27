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

    // Find protection_documents where retention period has expired
    // created_at + retention_years < now()
    const { data: expiredDocs, error: fetchError } = await supabase
      .from("protection_documents")
      .select("*")
      .not("retention_years", "is", null);

    if (fetchError) throw fetchError;

    const now = new Date();
    const flaggedDocs: string[] = [];

    for (const doc of expiredDocs || []) {
      const createdAt = new Date(doc.created_at);
      const retentionYears = doc.retention_years || 7;
      const expiryDate = new Date(createdAt);
      expiryDate.setFullYear(expiryDate.getFullYear() + retentionYears);

      if (now >= expiryDate) {
        // Check if already flagged
        const alreadyFlagged = doc.metadata?.retention_expired === true;
        if (!alreadyFlagged) {
          // Flag for admin review — do NOT delete (immutable policy)
          const { error: updateError } = await supabase
            .from("protection_documents")
            .update({
              metadata: {
                ...((doc.metadata as Record<string, unknown>) || {}),
                retention_expired: true,
                retention_flagged_at: now.toISOString(),
                admin_review_required: true,
              },
            })
            .eq("id", doc.id);

          if (!updateError) {
            flaggedDocs.push(doc.id);
          }
        }
      }
    }

    // If any docs were flagged, create an admin notification
    if (flaggedDocs.length > 0) {
      // Get an admin user to notify
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      const adminId = adminRoles?.[0]?.user_id;

      if (adminId) {
        await supabase.from("notifications").insert({
          user_id: adminId,
          title: "Retention Period Expired",
          message: `${flaggedDocs.length} protection document(s) have exceeded their retention period and require admin review. Documents are preserved per immutable retention policy.`,
          type: "warning",
          related_entity_type: "protection_documents",
          related_entity_id: flaggedDocs[0],
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: (expiredDocs || []).length,
        flagged: flaggedDocs.length,
        flagged_ids: flaggedDocs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

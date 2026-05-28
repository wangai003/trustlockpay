import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyCaller(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return "__service_role__";
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await anon.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callerId = await verifyCaller(req);
    if (!callerId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vendor actions: enforce vendorId matches caller (or admin).
    if (callerId !== "__service_role__") {
      const claimedVendorId = body.vendorId;
      if (claimedVendorId && claimedVendorId !== callerId) {
        const { data: adminRole } = await supabase
          .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
        if (!adminRole) {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (!claimedVendorId) {
        // Default vendorId to caller for vendor self-service actions
        body.vendorId = callerId;
      }
    }

    let result;

    switch (action) {
      case "add_site": {
        const { name, platform, url, vendorId, industry } = body;
        const { data, error } = await supabase
          .from("vendor_sites")
          .insert({ vendor_id: vendorId || null, name, platform, url, industry: industry || null })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "delete_site": {
        const { siteId } = body;
        const { error } = await supabase.from("vendor_sites").delete().eq("id", siteId);
        if (error) throw error;
        result = { deleted: true };
        break;
      }

      case "save_settings": {
        const { vendorId, autoDelivery, payEnabled, payoutTier, notifications } = body;
        const { data, error } = await supabase
          .from("vendor_settings")
          .upsert({
            vendor_id: vendorId || null,
            auto_delivery: autoDelivery,
            pay_enabled: payEnabled,
            payout_tier: payoutTier,
            notifications: notifications || {},
            updated_at: new Date().toISOString(),
          }, { onConflict: "vendor_id" })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "activate_plan": {
        const { vendorId, planId, billingCycle, expiresAt } = body;
        const { data, error } = await supabase
          .from("vendor_plans")
          .insert({
            vendor_id: vendorId || null,
            plan_id: planId,
            billing_cycle: billingCycle,
            expires_at: expiresAt,
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "upload_kyc": {
        const { vendorId, documentName, fileUrl } = body;
        const { data, error } = await supabase
          .from("kyc_documents")
          .insert({
            vendor_id: vendorId || null,
            name: documentName,
            file_url: fileUrl || null,
            status: "pending",
          })
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

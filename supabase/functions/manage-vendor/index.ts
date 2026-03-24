import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let result;

    switch (action) {
      case "add_site": {
        const { name, platform, url, vendorId } = body;
        const { data, error } = await supabase
          .from("vendor_sites")
          .insert({ vendor_id: vendorId || null, name, platform, url })
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

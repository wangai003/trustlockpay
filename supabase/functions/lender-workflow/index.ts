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

    // Get current lender from JWT
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") || ""
    );
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lenderId = user.id;

    let result;

    switch (action) {
      case "list_applications": {
        // Get applications directed to this lender + public applications
        const { data, error } = await supabase
          .from("financing_applications")
          .select(`
            id,
            vendor_id,
            requested_amount,
            proposed_tenure_days,
            purpose_type,
            status,
            submitted_at,
            profiles:vendor_id (company_name, industry)
          `)
          .or(`lender_target_id.eq.${lenderId},visibility.eq.public`)
          .order("submitted_at", { ascending: false });

        if (error) throw error;

        // Get item counts and document status
        const appsWithMeta = await Promise.all(
          (data || []).map(async (app: any) => {
            const { count: itemCount } = await supabase
              .from("financing_application_items")
              .select("*", { count: "exact", head: true })
              .eq("application_id", app.id);

            const { count: docCount } = await supabase
              .from("financing_application_documents")
              .select("*", { count: "exact", head: true })
              .eq("application_id", app.id);

            return {
              id: app.id,
              vendor_name: app.profiles?.company_name || "Unknown",
              vendor_industry: app.profiles?.industry || "—",
              requested_amount: app.requested_amount,
              proposed_tenure_days: app.proposed_tenure_days,
              purpose_type: app.purpose_type,
              status: app.status,
              submitted_at: app.submitted_at,
              item_count: itemCount || 0,
              has_documents: (docCount || 0) > 0,
            };
          })
        );

        result = { applications: appsWithMeta };
        break;
      }

      case "get_application": {
        const { application_id } = body;
        
        const { data: app, error } = await supabase
          .from("financing_applications")
          .select(`
            *,
            profiles:vendor_id (company_name, industry, business_type),
            financing_application_items (*),
            financing_application_documents (*),
            financing_application_messages (*)
          `)
          .eq("id", application_id)
          .single();

        if (error) throw error;

        result = {
          application: {
            id: app.id,
            vendor_name: app.profiles?.company_name || "Unknown",
            vendor_industry: app.profiles?.industry || "—",
            requested_amount: app.requested_amount,
            proposed_tenure_days: app.proposed_tenure_days,
            purpose_type: app.purpose_type,
            status: app.status,
            submitted_at: app.submitted_at,
            description: app.description,
            trade_scope: app.trade_scope,
            item_count: app.financing_application_items?.length || 0,
            has_documents: (app.financing_application_documents?.length || 0) > 0,
            items: app.financing_application_items || [],
            documents: app.financing_application_documents || [],
            messages: app.financing_application_messages || [],
          }
        };
        break;
      }

      case "start_review": {
        const { application_id } = body;
        
        const { data, error } = await supabase
          .from("financing_applications")
          .update({ 
            status: "under_review",
            review_started_at: new Date().toISOString(),
            reviewing_lender_id: lenderId,
          })
          .eq("id", application_id)
          .select()
          .single();

        if (error) throw error;

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: data.vendor_id,
          type: "financing_review_started",
          title: "Application Under Review",
          message: "A lender has started reviewing your financing application",
          data: { application_id },
        });

        result = { success: true, message: "Review started", application: data };
        break;
      }

      case "approve": {
        const { application_id, approved_amount, interest_rate_percent, approved_tenure_days } = body;
        
        const { data, error } = await supabase
          .from("financing_applications")
          .update({ 
            status: "approved",
            approved_amount,
            interest_rate_percent,
            approved_tenure_days,
            decision_at: new Date().toISOString(),
            decided_by: lenderId,
          })
          .eq("id", application_id)
          .select()
          .single();

        if (error) throw error;

        // Update lender exposure
        await supabase.rpc("increment_lender_exposure", {
          p_lender_id: lenderId,
          p_amount: approved_amount,
        });

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: data.vendor_id,
          type: "financing_approved",
          title: "Financing Approved!",
          message: `Your application for $${approved_amount.toLocaleString()} has been approved`,
          data: { application_id, approved_amount },
        });

        result = { success: true, message: "Application approved", application: data };
        break;
      }

      case "reject": {
        const { application_id, rejection_reason } = body;
        
        const { data, error } = await supabase
          .from("financing_applications")
          .update({ 
            status: "rejected",
            rejection_reason,
            decision_at: new Date().toISOString(),
            decided_by: lenderId,
          })
          .eq("id", application_id)
          .select()
          .single();

        if (error) throw error;

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: data.vendor_id,
          type: "financing_rejected",
          title: "Financing Application Declined",
          message: "Your application was not approved at this time",
          data: { application_id, reason: rejection_reason },
        });

        result = { success: true, message: "Application rejected", application: data };
        break;
      }

      case "counter_offer": {
        const { application_id, counter_amount, counter_rate, counter_tenure, message } = body;
        
        const { data, error } = await supabase
          .from("financing_applications")
          .update({ 
            status: "counter_offered",
            counter_amount,
            counter_rate_percent: counter_rate,
            counter_tenure_days: counter_tenure,
            counter_offered_at: new Date().toISOString(),
            counter_offered_by: lenderId,
          })
          .eq("id", application_id)
          .select()
          .single();

        if (error) throw error;

        // Add message thread
        await supabase.from("financing_application_messages").insert({
          application_id,
          sender_id: lenderId,
          sender_role: "lender",
          body: message || `Counter offer: $${counter_amount} at ${counter_rate}% for ${counter_tenure} days`,
        });

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: data.vendor_id,
          type: "financing_counter",
          title: "Counter Offer Received",
          message: "A lender has proposed different terms for your application",
          data: { application_id, counter_amount },
        });

        result = { success: true, message: "Counter offer sent", application: data };
        break;
      }

      case "send_message": {
        const { application_id, message } = body;
        
        const { data, error } = await supabase
          .from("financing_application_messages")
          .insert({
            application_id,
            sender_id: lenderId,
            sender_role: "lender",
            body: message,
          })
          .select()
          .single();

        if (error) throw error;

        result = { success: true, message: "Message sent", chat_message: data };
        break;
      }

      case "get_portfolio": {
        // Get lender exposure data
        const { data: exposureData, error: expError } = await supabase
          .from("lender_exposure")
          .select("*")
          .eq("lender_id", lenderId)
          .single();

        if (expError && expError.code !== "PGRST116") throw expError;

        // Get approved applications as facilities
        const { data: apps, error: appsError } = await supabase
          .from("financing_applications")
          .select(`
            id,
            vendor_id,
            approved_amount,
            interest_rate_percent,
            approved_tenure_days,
            decision_at,
            profiles:vendor_id (company_name)
          `)
          .eq("status", "approved")
          .eq("decided_by", lenderId);

        if (appsError) throw appsError;

        const limit = exposureData?.exposure_limit || 1000000;
        const totalApproved = apps?.reduce((sum: number, a: any) => sum + (a.approved_amount || 0), 0) || 0;

        // Transform to facilities
        const facilities = (apps || []).map((app: any) => ({
          id: app.id,
          vendor_name: app.profiles?.company_name || "Unknown",
          approved_amount: app.approved_amount || 0,
          interest_rate: app.interest_rate_percent || 0,
          tenure_days: app.approved_tenure_days || 0,
          start_date: app.decision_at,
          maturity_date: new Date(new Date(app.decision_at).getTime() + (app.approved_tenure_days || 0) * 24 * 60 * 60 * 1000).toISOString(),
        }));

        result = {
          success: true,
          data: {
            total_exposure: exposureData?.total_exposure || totalApproved,
            exposure_limit: limit,
            active_facilities: exposureData?.active_facilities || apps?.length || 0,
            utilization_percent: (totalApproved / limit) * 100,
            facilities,
          }
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

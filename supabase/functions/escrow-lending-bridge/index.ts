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

    // Get current user from JWT
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") || ""
    );
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    let result;

    switch (action) {
      case "create_from_application": {
        const { application_id } = body;
        
        // Get the approved application
        const { data: app, error: appError } = await supabase
          .from("financing_applications")
          .select("*")
          .eq("id", application_id)
          .eq("status", "approved")
          .single();

        if (appError) throw new Error("Application not found or not approved");

        // Calculate maturity date
        const maturityDate = new Date();
        maturityDate.setDate(maturityDate.getDate() + (app.approved_tenure_days || app.proposed_tenure_days));

        // Create financing order
        const { data: order, error: orderError } = await supabase
          .from("financing_orders")
          .insert({
            application_id,
            lender_id: app.decided_by,
            vendor_id: app.vendor_id,
            principal_amount: app.approved_amount,
            interest_rate_percent: app.interest_rate_percent,
            tenure_days: app.approved_tenure_days,
            maturity_date: maturityDate.toISOString().split('T')[0],
            status: "pending_disbursement",
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Update application with order reference
        await supabase
          .from("financing_applications")
          .update({ financing_order_id: order.id })
          .eq("id", application_id);

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: app.vendor_id,
          type: "financing_order_created",
          title: "Financing Order Created",
          message: `Your financing for $${app.approved_amount.toLocaleString()} has been ordered and is pending disbursement`,
          data: { order_id: order.id, application_id },
        });

        result = { success: true, order };
        break;
      }

      case "disburse": {
        const { order_id } = body;
        
        // Get the order
        const { data: order, error: orderError } = await supabase
          .from("financing_orders")
          .select("*, profiles:vendor_id (company_name)")
          .eq("id", order_id)
          .eq("lender_id", userId)
          .eq("status", "pending_disbursement")
          .single();

        if (orderError) throw new Error("Order not found or already disbursed");

        // Simulate blockchain anchor (in production, this would call a blockchain service)
        const mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        // Update order as disbursed
        const { data: updatedOrder, error: updateError } = await supabase
          .from("financing_orders")
          .update({
            status: "disbursed",
            disbursed_at: new Date().toISOString(),
            disbursed_by: userId,
            disbursement_tx_hash: mockTxHash,
          })
          .eq("id", order_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Create a blockchain proof record
        await supabase.from("blockchain_proofs").insert({
          transaction_id: order.transaction_id,
          record_type: "financing_disbursement",
          tx_ref: mockTxHash,
          content_hash: mockTxHash, // Simplified - would be actual hash
          chain_status: "confirmed",
          polygon_tx_hash: mockTxHash,
          event_data: {
            financing_order_id: order_id,
            principal_amount: order.principal_amount,
            lender_id: userId,
            vendor_id: order.vendor_id,
          },
        });

        // Create notification for vendor
        await supabase.from("notifications").insert({
          user_id: order.vendor_id,
          type: "financing_disbursed",
          title: "Financing Disbursed!",
          message: `$${order.principal_amount.toLocaleString()} has been disbursed to your escrow account`,
          data: { order_id, tx_hash: mockTxHash },
        });

        result = { success: true, order: updatedOrder, tx_hash: mockTxHash };
        break;
      }

      case "link_to_transaction": {
        const { order_id, transaction_id } = body;
        
        // Verify the order belongs to the user
        const { data: order, error: orderError } = await supabase
          .from("financing_orders")
          .select("*")
          .eq("id", order_id)
          .eq("lender_id", userId)
          .single();

        if (orderError) throw new Error("Order not found");

        // Update order with transaction link
        const { data: updatedOrder, error: updateError } = await supabase
          .from("financing_orders")
          .update({ transaction_id })
          .eq("id", order_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update transaction with financing link
        await supabase
          .from("transactions")
          .update({ financing_order_id: order_id })
          .eq("id", transaction_id);

        result = { success: true, order: updatedOrder };
        break;
      }

      case "process_repayment": {
        const { order_id, repayment_amount, source } = body;
        
        // Get the order
        const { data: order, error: orderError } = await supabase
          .from("financing_orders")
          .select("*")
          .eq("id", order_id)
          .eq("status", "disbursed")
          .single();

        if (orderError) throw new Error("Order not found or not in disbursed status");

        // Generate repayment tx hash
        const mockTxHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        // Update order as repaid
        const { data: updatedOrder, error: updateError } = await supabase
          .from("financing_orders")
          .update({
            status: "repaid",
            repaid_at: new Date().toISOString(),
            repayment_amount,
            repayment_tx_hash: mockTxHash,
          })
          .eq("id", order_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Create blockchain proof for repayment
        await supabase.from("blockchain_proofs").insert({
          transaction_id: order.transaction_id,
          record_type: "financing_repayment",
          tx_ref: mockTxHash,
          content_hash: mockTxHash,
          chain_status: "confirmed",
          polygon_tx_hash: mockTxHash,
          event_data: {
            financing_order_id: order_id,
            repayment_amount,
            source, // 'escrow_payout', 'vendor_direct', etc.
          },
        });

        // Create notifications
        await supabase.from("notifications").insert([{
          user_id: order.lender_id,
          type: "financing_repaid",
          title: "Financing Repaid",
          message: `Repayment of $${repayment_amount.toLocaleString()} received for order #${order_id.slice(0, 8)}`,
          data: { order_id, repayment_amount },
        }, {
          user_id: order.vendor_id,
          type: "financing_settled",
          title: "Financing Settled",
          message: `Your financing has been fully repaid. Thank you!`,
          data: { order_id },
        }]);

        result = { success: true, order: updatedOrder };
        break;
      }

      case "get_lender_orders": {
        const { data: orders, error } = await supabase
          .from("financing_orders")
          .select(`
            *,
            profiles:vendor_id (company_name)
          `)
          .eq("lender_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        result = { success: true, orders };
        break;
      }

      case "get_vendor_orders": {
        const { data: orders, error } = await supabase
          .from("financing_orders")
          .select(`
            *,
            lender_profiles:lender_id (institution_name)
          `)
          .eq("vendor_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        result = { success: true, orders };
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

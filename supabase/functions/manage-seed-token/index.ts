import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSeedToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const segments = 4;
  const segLen = 6;
  const parts: string[] = [];
  for (let s = 0; s < segments; s++) {
    let seg = "";
    for (let i = 0; i < segLen; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(seg);
  }
  return `TL-${parts.join("-")}`;
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TLC-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data } = await anonClient.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    switch (action) {
      // ─── Generate or retrieve seed token for user ───────────
      case "get_or_create_token": {
        const targetUserId = params.userId || userId;
        if (!targetUserId) throw new Error("User ID required");

        // Check for existing active token
        const { data: existing } = await supabase
          .from("seed_tokens")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("is_active", true)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ success: true, token: existing }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate new token
        const token = generateSeedToken();
        const { data: newToken, error } = await supabase
          .from("seed_tokens")
          .insert({
            user_id: targetUserId,
            token,
            wallet_public_key: "0x7A3b...F92d", // Azix custodian wallet public key
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, token: newToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Initiate payout request ────────────────────────────
      case "initiate_payout": {
        const {
          seedToken, role: payoutRole, payoutType, transactionId, orderNumber,
          amount, paymentCategory, paymentProvider, providerDetails, mode,
        } = params;

        if (!amount || parseFloat(amount) <= 0) throw new Error("Valid amount required");
        if (!paymentProvider) throw new Error("Payment provider required");

        // Calculate fees
        const amountNum = parseFloat(amount);
        const isCrypto = paymentCategory === "crypto_wallet";
        const feeType = isCrypto ? "crypto_to_crypto" : "crypto_to_fiat";

        let feeRate: number;
        if (isCrypto) {
          feeRate = 0.015; // 1.5%
        } else {
          feeRate = 0.035; // 3.5% average
        }

        const fee = amountNum * feeRate;
        const netAmount = amountNum - fee;
        const confirmationCode = generateConfirmationCode();

        const { data: payout, error } = await supabase
          .from("payout_requests")
          .insert({
            user_id: userId,
            seed_token: seedToken,
            role: payoutRole,
            payout_type: payoutType || "release",
            transaction_id: transactionId || null,
            order_number: orderNumber || null,
            amount: amountNum,
            fee,
            net_amount: netAmount,
            payment_category: paymentCategory,
            payment_provider: paymentProvider,
            provider_details: providerDetails || {},
            mode: mode || "local",
            status: "processing",
            confirmation_code: confirmationCode,
          })
          .select()
          .single();

        if (error) throw error;

        // Simulate processing (in production, this triggers Azix wallet API)
        // Update status to completed after a brief delay
        setTimeout(async () => {
          await supabase
            .from("payout_requests")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", payout.id);
        }, 3000);

        return new Response(
          JSON.stringify({ success: true, payout, confirmationCode }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Cancel payout request ──────────────────────────────
      case "cancel_payout": {
        const { payoutId, reason } = params;
        if (!payoutId) throw new Error("Payout ID required");

        const { data: existing } = await supabase
          .from("payout_requests")
          .select("status")
          .eq("id", payoutId)
          .single();

        if (!existing) throw new Error("Payout not found");
        if (existing.status === "completed") throw new Error("Cannot cancel completed payout");

        const { error } = await supabase
          .from("payout_requests")
          .update({
            status: "cancelled",
            cancellation_reason: reason || "Cancelled by user",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payoutId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Get payout history ─────────────────────────────────
      case "get_payouts": {
        const targetUserId = params.userId || userId;
        let query = supabase
          .from("payout_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (targetUserId && !params.isAdmin) {
          query = query.eq("user_id", targetUserId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, payouts: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Create order carbon copy ──────────────────────────
      case "create_carbon_copy": {
        const {
          transactionId: ccTxId, orderNumber: ccOrderNum,
          buyerName, vendorName, item, amount: ccAmount, fee: ccFee,
          buyerId, vendorId, checkoutDetails,
        } = params;

        const confirmCode = generateConfirmationCode();

        const { data, error } = await supabase
          .from("order_carbon_copies")
          .insert({
            transaction_id: ccTxId || null,
            order_number: ccOrderNum,
            buyer_name: buyerName,
            vendor_name: vendorName,
            item,
            amount: parseFloat(ccAmount),
            fee: parseFloat(ccFee || "0"),
            status: "inactive",
            confirmation_code: confirmCode,
            buyer_id: buyerId || null,
            vendor_id: vendorId || null,
            checkout_details: checkoutDetails || {},
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, carbonCopy: data, confirmationCode: confirmCode }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Admin: activate carbon copy ───────────────────────
      case "activate_carbon_copy": {
        const { carbonCopyId } = params;
        if (!carbonCopyId) throw new Error("Carbon copy ID required");

        const { error } = await supabase
          .from("order_carbon_copies")
          .update({
            status: "active",
            admin_activated: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", carbonCopyId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

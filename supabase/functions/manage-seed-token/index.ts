import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Dual Azix Wallet Addresses ────────────────────────────
const AZIX_TRANSACTION_WALLET = "0x7A3b...F92d"; // Collects checkout/processing fees
const AZIX_ESCROW_WALLET = "0x4E1c...A83b";       // Collects escrow service fees

// ─── Processor Fee Rates ───────────────────────────────────
const PROCESSOR_FEES: Record<string, number> = {
  stripe: 0.029,        // 2.9%
  coinbase: 0.015,      // 1.5%
  transak: 0.015,       // 1.5%
  direct: 0,            // 0% (on-chain)
};

function generateSeedToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const parts: string[] = [];
  for (let s = 0; s < 4; s++) {
    let seg = "";
    for (let i = 0; i < 6; i++) seg += chars[Math.floor(Math.random() * chars.length)];
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

// ─── Fee Calculation with Dual Wallet Routing ──────────────
// Fee trickle-down logic:
//   RELEASE: Escrow deducts 1% → vendor gets net → 1% fee forwarded to Transaction Wallet
//   REFUND:  Escrow returns full principal → buyer gets 100% → NO fees to Transaction Wallet
//   SPLIT:   Both parties paid equally → 1% fee from VENDOR share only → forwarded to Transaction Wallet
interface FeeResult {
  trustlockFee: number;
  processorFee: number;
  escrowFee: number;
  gasFee: number;
  totalFees: number;
  netAmount: number;
  transactionWalletReceives: number;
  escrowWalletReceives: number;
  feeTrickleToTransactionWallet: number; // Amount forwarded from escrow → transaction wallet
}

function calculatePayoutFees(
  amount: number,
  payoutType: string,
  paymentCategory: string,
  processorId: string,
  splitVendorShare?: number
): FeeResult {
  const isCrypto = paymentCategory === "crypto_wallet";
  const processorRate = PROCESSOR_FEES[processorId] || 0;

  let trustlockRate = 0;
  let escrowRate = 0;
  let gasEstimate = 0.02;
  let applyEscrow = true;
  let escrowVendorOnly = false;

  switch (payoutType) {
    case "release":
      trustlockRate = 0;
      escrowRate = 0.01; // 1%
      applyEscrow = true;
      break;
    case "refund":
      trustlockRate = 0;
      escrowRate = 0;     // NO escrow fee on refunds
      applyEscrow = false;
      gasEstimate = isCrypto ? 0.05 : 0.02;
      break;
    case "split":
      trustlockRate = 0;
      escrowRate = 0.01;  // 1% but ONLY on vendor's share
      applyEscrow = true;
      escrowVendorOnly = true;
      gasEstimate = 0.04; // 2x gas for dual disbursement
      break;
    default:
      trustlockRate = isCrypto ? 0.01 : 0.015;
      escrowRate = 0.005;
      break;
  }

  const trustlockFee = amount * trustlockRate;
  const processorFee = isCrypto ? 0 : amount * processorRate;

  let escrowFee = 0;
  if (applyEscrow) {
    if (escrowVendorOnly && splitVendorShare !== undefined) {
      escrowFee = (amount * splitVendorShare) * escrowRate;
    } else {
      escrowFee = amount * escrowRate;
    }
  }

  const totalFees = trustlockFee + processorFee + escrowFee + gasEstimate;

  // Fee trickle-down: escrow service fees are forwarded to the transaction wallet
  // EXCEPT on refunds (no fees) and the escrow wallet retains nothing — it forwards all collected fees
  const feeTrickleToTransactionWallet = applyEscrow ? escrowFee : 0;

  return {
    trustlockFee,
    processorFee,
    escrowFee,
    gasFee: gasEstimate,
    totalFees,
    netAmount: amount - totalFees,
    transactionWalletReceives: trustlockFee + feeTrickleToTransactionWallet,  // Platform fee + trickled escrow fee → AZIX_TRANSACTION_WALLET
    escrowWalletReceives: 0,  // Escrow wallet forwards all fees — net zero retention
    feeTrickleToTransactionWallet,  // Specifically the amount forwarded from escrow → transaction wallet
  };
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
      // ─── Generate or retrieve seed token ─────────────────────
      case "get_or_create_token": {
        const targetUserId = params.userId || userId;
        if (!targetUserId) throw new Error("User ID required");

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

        const token = generateSeedToken();
        const { data: newToken, error } = await supabase
          .from("seed_tokens")
          .insert({
            user_id: targetUserId,
            token,
            wallet_public_key: AZIX_TRANSACTION_WALLET,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, token: newToken }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Initiate payout with dual wallet fee routing ────────
      case "initiate_payout": {
        const {
          seedToken, role: payoutRole, payoutType, transactionId, orderNumber,
          amount, paymentCategory, paymentProvider, providerDetails, mode,
          processorId, splitVendorShare,
        } = params;

        if (!amount || parseFloat(amount) <= 0) throw new Error("Valid amount required");
        if (!paymentProvider) throw new Error("Payment provider required");

        const amountNum = parseFloat(amount);
        const processor = processorId || (paymentCategory === "crypto_wallet" ? "direct" : "yellow_card");

        const fees = calculatePayoutFees(
          amountNum,
          payoutType || "release",
          paymentCategory,
          processor,
          splitVendorShare
        );

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
            fee: fees.totalFees,
            net_amount: fees.netAmount,
            payment_category: paymentCategory,
            payment_provider: paymentProvider,
            provider_details: {
              ...providerDetails,
              processor,
                feeBreakdown: {
                  trustlockFee: fees.trustlockFee,
                  processorFee: fees.processorFee,
                  escrowFee: fees.escrowFee,
                  gasFee: fees.gasFee,
                  transactionWallet: AZIX_TRANSACTION_WALLET,
                  escrowWallet: AZIX_ESCROW_WALLET,
                  transactionWalletReceives: fees.transactionWalletReceives,
                  escrowWalletReceives: fees.escrowWalletReceives,
                  feeTrickleToTransactionWallet: fees.feeTrickleToTransactionWallet,
                  trickleRule: payoutType === "refund" ? "none" : payoutType === "split" ? "vendor_share_only" : "full_escrow_fee",
                },
            },
            mode: mode || "local",
            status: "processing",
            confirmation_code: confirmationCode,
          })
          .select()
          .single();

        if (error) throw error;

        // Simulate async processing (production: triggers Azix wallet disbursement)
        setTimeout(async () => {
          await supabase
            .from("payout_requests")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", payout.id);
        }, 3000);

        return new Response(
          JSON.stringify({
            success: true,
            payout,
            confirmationCode,
            walletRouting: {
              transactionWallet: AZIX_TRANSACTION_WALLET,
              transactionWalletReceives: fees.transactionWalletReceives,
              escrowWallet: AZIX_ESCROW_WALLET,
              escrowWalletReceives: fees.escrowWalletReceives,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Cancel payout ──────────────────────────────────────
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

      // ─── Get wallet info ───────────────────────────────────
      case "get_wallet_info": {
        return new Response(
          JSON.stringify({
            success: true,
            wallets: {
              transaction: {
                address: AZIX_TRANSACTION_WALLET,
                purpose: "Collects platform processing fees at checkout",
              },
              escrow: {
                address: AZIX_ESCROW_WALLET,
                purpose: "Collects escrow service fees upon fund release",
              },
            },
            processors: ["stripe", "coinbase", "yellow_card", "transak", "direct"],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Verify payout (seed token + order matching) ────────
      case "verify_payout": {
        const { orderId, seedToken, payoutType } = params;
        if (!userId) throw new Error("Authentication required");
        if (!orderId || !seedToken || !payoutType) throw new Error("orderId, seedToken, and payoutType are required");
        if (!["release", "refund", "split"].includes(payoutType)) throw new Error("payoutType must be release, refund, or split");

        // Verify seed token matches user's active token
        const { data: tokenRecord } = await supabase
          .from("seed_tokens")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .single();

        if (!tokenRecord || tokenRecord.token !== seedToken) {
          return new Response(
            JSON.stringify({ success: false, verified: false, error: "Seed token mismatch" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify order exists and belongs to user
        const { data: order } = await supabase
          .from("order_carbon_copies")
          .select("*")
          .eq("order_number", orderId)
          .single();

        if (!order) throw new Error("Order not found");

        const isOwner = order.buyer_id === userId || order.vendor_id === userId;
        if (!isOwner) {
          return new Response(
            JSON.stringify({ success: false, verified: false, error: "Order does not belong to user" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Determine role in this order
        const userRole = order.buyer_id === userId ? "buyer" : "vendor";

        // Create verified payout request
        const confirmationCode = generateConfirmationCode();
        const fees = calculatePayoutFees(
          order.amount || 0,
          payoutType,
          "crypto_wallet",
          "direct",
          payoutType === "split" && userRole === "vendor" ? 1 : undefined
        );

        const { data: payoutReq, error: prErr } = await supabase
          .from("payout_requests")
          .insert({
            user_id: userId,
            seed_token: seedToken,
            role: userRole,
            payout_type: payoutType,
            order_number: orderId,
            amount: order.amount || 0,
            fee: fees.totalFees,
            net_amount: fees.netAmount,
            status: "verified",
            confirmation_code: confirmationCode,
            provider_details: {
              feeBreakdown: {
                trustlockFee: fees.trustlockFee,
                processorFee: fees.processorFee,
                escrowFee: fees.escrowFee,
                gasFee: fees.gasFee,
                transactionWallet: AZIX_TRANSACTION_WALLET,
                escrowWallet: AZIX_ESCROW_WALLET,
                transactionWalletReceives: fees.transactionWalletReceives,
                escrowWalletReceives: fees.escrowWalletReceives,
                feeTrickleToTransactionWallet: fees.feeTrickleToTransactionWallet,
                trickleRule: payoutType === "refund" ? "none" : payoutType === "split" ? "vendor_share_only" : "full_escrow_fee",
              },
            },
          })
          .select()
          .single();

        if (prErr) throw prErr;

        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            payoutRequest: payoutReq,
            walletRouting: {
              transactionWallet: AZIX_TRANSACTION_WALLET,
              escrowWallet: AZIX_ESCROW_WALLET,
            },
            confirmationCode,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Match split payout (dual-party verification) ───────
      case "match_split_payout": {
        const { orderId: splitOrderId } = params;
        if (!splitOrderId) throw new Error("orderId is required");

        // Find all verified payout requests for this order
        const { data: requests, error: rErr } = await supabase
          .from("payout_requests")
          .select("*")
          .eq("order_number", splitOrderId)
          .eq("payout_type", "split")
          .eq("status", "verified");

        if (rErr) throw rErr;

        const buyerReq = requests?.find((r) => r.role === "buyer");
        const vendorReq = requests?.find((r) => r.role === "vendor");

        if (!buyerReq && !vendorReq) {
          return new Response(
            JSON.stringify({ success: true, matched: false, waiting: "both" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!buyerReq) {
          return new Response(
            JSON.stringify({ success: true, matched: false, waiting: "buyer" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!vendorReq) {
          return new Response(
            JSON.stringify({ success: true, matched: false, waiting: "vendor" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Both matched — update statuses
        const now = new Date().toISOString();
        await supabase
          .from("payout_requests")
          .update({ status: "matched", updated_at: now })
          .in("id", [buyerReq.id, vendorReq.id]);

        return new Response(
          JSON.stringify({
            success: true,
            matched: true,
            buyerPayout: { id: buyerReq.id, amount: buyerReq.net_amount, confirmationCode: buyerReq.confirmation_code },
            vendorPayout: { id: vendorReq.id, amount: vendorReq.net_amount, confirmationCode: vendorReq.confirmation_code },
            walletRouting: {
              transactionWallet: AZIX_TRANSACTION_WALLET,
              escrowWallet: AZIX_ESCROW_WALLET,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Get wallet routing (public, no auth) ──────────────
      case "get_wallet_routing": {
        return new Response(
          JSON.stringify({
            success: true,
            transactionWallet: {
              address: AZIX_TRANSACTION_WALLET,
              purpose: "Collects transactional fees from checkout payments",
            },
            escrowWallet: {
              address: AZIX_ESCROW_WALLET,
              purpose: "Collects escrow service fees upon fund release",
            },
            feeRules: {
              release: "1% escrow fee on full amount",
              refund: "0% escrow fee — gas only ($0.02–$0.05)",
              split: "1% escrow fee on vendor share only, gas doubled ($0.04)",
            },
          }),
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

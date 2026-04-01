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

// ─── Fee Calculation with Dual Wallet + Dual Token Routing ─
// DUAL SEED TOKEN ARCHITECTURE:
//   OS Pay token  → hardwired to AZIX_TRANSACTION_WALLET (revenue/fees)
//   OS Payout token → hardwired to AZIX_ESCROW_WALLET (escrow disbursement)
//
// Fee trickle-down logic:
//   RELEASE: Escrow deducts 1% → trickles USDC (stablecoins) to Transaction Wallet
//            → NO conversion needed, Transaction Wallet accepts USDC natively
//            → this transfer follows the OS Pay token's hardwire route
//   REFUND:  Escrow returns full principal → buyer gets 100% → NO fees → NO trickle-down
//   SPLIT:   1% fee from VENDOR share only → trickles to Transaction Wallet
//            → buyer receives full split amount with zero fee deduction
interface FeeResult {
  trustlockFee: number;
  processorFee: number;
  escrowFee: number;
  gasFee: number;
  totalFees: number;
  netAmount: number;
  transactionWalletReceives: number;
  escrowWalletReceives: number;
  feeTrickleToTransactionWallet: number; // USDC amount forwarded from escrow → transaction wallet (no conversion)
}

function calculatePayoutFees(
  amount: number,
  payoutType: string,
  paymentCategory: string,
  processorId: string,
  splitVendorShare?: number,
  milestoneCount?: number
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
      // 1.0% escrow service fee — fractionalized across milestones
      // If milestoneCount > 1, each milestone release only charges 1% / milestoneCount
      trustlockRate = 0;
      escrowRate = 0.01;  // 1.0% total across all milestones
      gasEstimate = 0.02;
      applyEscrow = true;
      break;
    case "refund":
      // ALL fees waived — gas only
      trustlockRate = 0;
      escrowRate = 0;
      applyEscrow = false;
      gasEstimate = isCrypto ? 0.02 : 0.05;
      break;
    case "split":
      // 1.0% escrow fee on VENDOR share only + $0.04 gas
      trustlockRate = 0;
      escrowRate = 0.01;
      applyEscrow = true;
      escrowVendorOnly = true;
      gasEstimate = 0.04;
      break;
    default:
      // os_payment: 1.5% platform fee, no escrow
      trustlockRate = isCrypto ? 0.01 : 0.015;
      escrowRate = 0;
      applyEscrow = false;
      break;
  }

  const trustlockFee = amount * trustlockRate;
  const processorFee = isCrypto ? 0 : amount * processorRate;

  let escrowFee = 0;
  if (applyEscrow) {
    if (escrowVendorOnly && splitVendorShare !== undefined) {
      escrowFee = (amount * splitVendorShare) * escrowRate;
    } else {
      // Fractionalize: 1% of TOTAL transaction divided by number of milestones
      // For atomic (non-milestone) releases, milestoneCount is 1 → full 1%
      const effectiveMilestoneCount = (milestoneCount && milestoneCount > 0) ? milestoneCount : 1;
      escrowFee = (amount * escrowRate) / effectiveMilestoneCount;
    }
  }

  const totalFees = trustlockFee + processorFee + escrowFee + gasEstimate;

  // Trickle-down: escrow wallet forwards collected fees to transaction wallet
  // Escrow wallet net balance = 0 after forwarding
  const feeTrickleToTransactionWallet = applyEscrow ? escrowFee : 0;

  return {
    trustlockFee,
    processorFee,
    escrowFee,
    gasFee: gasEstimate,
    totalFees,
    netAmount: amount - totalFees,
    transactionWalletReceives: trustlockFee + feeTrickleToTransactionWallet,
    escrowWalletReceives: 0,  // Escrow wallet net balance = 0 after trickle-down
    feeTrickleToTransactionWallet,
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
      // ─── Generate or retrieve seed token (dual-token architecture) ─────
      // wallet_purpose='pay'    → hardwired to AZIX_TRANSACTION_WALLET (revenue/fees)
      // wallet_purpose='payout' → hardwired to AZIX_ESCROW_WALLET (escrow disbursement)
      case "get_or_create_token": {
        const targetUserId = params.userId || userId;
        if (!targetUserId) throw new Error("User ID required");

        // Accept wallet_purpose ('pay' | 'payout') — maps to internal purpose
        const walletPurpose: string = params.wallet_purpose || params.purpose || "pay";
        const purpose = walletPurpose === "payout" ? "os_payout" : "os_pay";
        const walletAddress = walletPurpose === "payout"
          ? AZIX_ESCROW_WALLET
          : AZIX_TRANSACTION_WALLET;
        const walletPurposeLabel = walletPurpose === "payout" ? "payout" : "pay";

        const { data: existing } = await supabase
          .from("seed_tokens")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("purpose", purpose)
          .eq("is_active", true)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({
              success: true,
              token: existing,
              purpose,
              wallet_purpose: walletPurposeLabel,
              wallet_address: walletAddress,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const token = generateSeedToken();
        const { data: newToken, error } = await supabase
          .from("seed_tokens")
          .insert({
            user_id: targetUserId,
            token,
            wallet_public_key: walletAddress,
            wallet_purpose: walletPurposeLabel,
            purpose,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            token: newToken,
            purpose,
            wallet_purpose: walletPurposeLabel,
            wallet_address: walletAddress,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── Initiate payout with dual wallet fee routing ────────
      case "initiate_payout": {
        const {
          seedToken, role: payoutRole, payoutType, transactionId, orderNumber,
          amount, paymentCategory, paymentProvider, providerDetails, mode,
          processorId, splitVendorShare, milestoneCount: paramMilestoneCount,
        } = params;

        if (!amount || parseFloat(amount) <= 0) throw new Error("Valid amount required");
        if (!paymentProvider) throw new Error("Payment provider required");

        const amountNum = parseFloat(amount);
        const processor = processorId || (paymentCategory === "crypto_wallet" ? "direct" : "coinbase");

        // Resolve milestone count for fractionalized escrow fee
        // If not passed, look up from transaction_milestones (count payment milestones with amount > 0)
        let resolvedMilestoneCount = paramMilestoneCount ? parseInt(paramMilestoneCount) : 1;
        if (!paramMilestoneCount && transactionId) {
          const { count } = await supabase
            .from("transaction_milestones")
            .select("id", { count: "exact", head: true })
            .eq("transaction_id", transactionId);
          if (count && count > 1) resolvedMilestoneCount = count;
        }

        const fees = calculatePayoutFees(
          amountNum,
          payoutType || "release",
          paymentCategory,
          processor,
          splitVendorShare,
          resolvedMilestoneCount
        );

        const confirmationCode = generateConfirmationCode();

        // Compute trickle metadata
        const effectivePayoutType = payoutType || "release";
        const trickleRule = effectivePayoutType === "refund"
          ? "none"
          : effectivePayoutType === "split"
            ? "vendor_share_only"
            : "full_escrow_fee";
        const trickleAmount = effectivePayoutType === "refund" ? 0 : fees.feeTrickleToTransactionWallet;

        const { data: payout, error } = await supabase
          .from("payout_requests")
          .insert({
            user_id: userId,
            seed_token: seedToken,
            role: payoutRole,
            payout_type: effectivePayoutType,
            transaction_id: transactionId || null,
            order_number: orderNumber || null,
            amount: amountNum,
            fee: fees.totalFees,
            net_amount: fees.netAmount,
            payment_category: paymentCategory,
            payment_provider: paymentProvider,
            trickle_amount: trickleAmount,
            trickle_rule: trickleRule,
            escrow_fee_deducted: fees.escrowFee,
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
                feeTrickleToTransactionWallet: trickleAmount,
                trickleRule,
              },
            },
            mode: mode || "local",
            status: "processing",
            confirmation_code: confirmationCode,
          })
          .select()
          .single();

        if (error) throw error;

        // Route through wallet-routing-bridge for actual fund movement
        // This triggers: Escrow Wallet → deduct fees → trickle to Transaction Wallet → vendor/buyer payout
        try {
          const routingAction = payoutType === "refund" ? "route_refund"
            : payoutType === "split" ? "route_split"
            : "route_release";

          const routingBody: Record<string, unknown> = {
            action: routingAction,
            transactionId: transactionId || null,
          };

          // For split payouts, include share ratios
          if (payoutType === "split" && splitVendorShare !== undefined) {
            routingBody.buyerShare = 1 - splitVendorShare;
            routingBody.vendorShare = splitVendorShare;
          }

          const routingUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/wallet-routing-bridge`;
          const routingRes = await fetch(routingUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
            },
            body: JSON.stringify(routingBody),
          });
          const routingResult = await routingRes.json();

          if (routingResult.success) {
            await supabase
              .from("payout_requests")
              .update({ status: "completed", completed_at: new Date().toISOString() })
              .eq("id", payout.id);
          } else {
            // Mark as pending manual processing
            await supabase
              .from("payout_requests")
              .update({ status: "pending_routing", updated_at: new Date().toISOString() })
              .eq("id", payout.id);
          }
        } catch (routeErr) {
          console.error("Wallet routing bridge call failed:", routeErr);
          // Fallback: mark as pending for admin review
          await supabase
            .from("payout_requests")
            .update({ status: "pending_routing", updated_at: new Date().toISOString() })
            .eq("id", payout.id);
        }

        const trickle_metadata = effectivePayoutType === "refund"
          ? null
          : {
              trickle_to: "transaction_wallet",
              trickle_amount: trickleAmount,
              trickle_rule: trickleRule,
            };

        return new Response(
          JSON.stringify({
            success: true,
            payout,
            confirmationCode,
            trickle_metadata,
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
            processors: ["stripe", "coinbase", "transak", "direct"],
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

        // Verify seed token matches user's active payout token
        const { data: tokenRecord } = await supabase
          .from("seed_tokens")
          .select("*")
          .eq("user_id", userId)
          .eq("purpose", "os_payout")
          .eq("is_active", true)
          .maybeSingle();

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
        // Resolve milestone count for fractionalized escrow fee
        let verifyMilestoneCount = 1;
        if (order.transaction_id) {
          const { count } = await supabase
            .from("transaction_milestones")
            .select("id", { count: "exact", head: true })
            .eq("transaction_id", order.transaction_id);
          if (count && count > 1) verifyMilestoneCount = count;
        }

        const fees = calculatePayoutFees(
          order.amount || 0,
          payoutType,
          "crypto_wallet",
          "direct",
          payoutType === "split" && userRole === "vendor" ? 1 : undefined,
          verifyMilestoneCount
        );

        const vpTrickleRule = payoutType === "refund"
          ? "none"
          : payoutType === "split"
            ? "vendor_share_only"
            : "full_escrow_fee";
        const vpTrickleAmount = payoutType === "refund" ? 0 : fees.feeTrickleToTransactionWallet;

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
            trickle_amount: vpTrickleAmount,
            trickle_rule: vpTrickleRule,
            escrow_fee_deducted: fees.escrowFee,
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
                feeTrickleToTransactionWallet: vpTrickleAmount,
                trickleRule: vpTrickleRule,
              },
            },
          })
          .select()
          .single();

        if (prErr) throw prErr;

        const vpTrickleMeta = payoutType === "refund"
          ? null
          : {
              trickle_to: "transaction_wallet",
              trickle_amount: vpTrickleAmount,
              trickle_rule: vpTrickleRule,
            };

        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            payoutRequest: payoutReq,
            trickle_metadata: vpTrickleMeta,
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

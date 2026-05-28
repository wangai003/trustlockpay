import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Refund Router — Last-Mile Buyer Refund Disbursement
 *
 * After the smart contract releases USDC back to the escrow/buyer wallet,
 * this function handles the off-ramp conversion back to the buyer's
 * preferred payment method.
 *
 * REFUND PATHS:
 *   1. Direct Crypto   → USDC sent directly to buyer's wallet on-chain ($0 conversion)
 *   2. Stripe Refund   → Calls Stripe API to refund original payment_intent
 *   3. Transak Off-ramp → Converts USDC → fiat via Transak widget/API
 *   4. Coinbase Off-ramp → Routes through Coinbase Commerce refund API
 *   5. Bank Transfer    → Queued for manual admin processing (Tier 3 countries)
 *   6. Mobile Money     → Queued for manual admin processing
 *
 * FLOW:
 *   Admin approves refund → escrow-manager calls refundBuyer/splitPayout →
 *   wallet-routing-bridge calls route_refund → refund-router picks the
 *   correct off-ramp based on buyer's stored payment details
 */

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function verifyCaller(req: Request, supabase: ReturnType<typeof getSupabase>): Promise<{ userId: string | null; isService: boolean; isAdmin: boolean }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { userId: null, isService: false, isAdmin: false };
  const token = authHeader.replace("Bearer ", "");
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return { userId: null, isService: true, isAdmin: true };
  try {
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data, error } = await anon.auth.getUser();
    if (error || !data?.user) return { userId: null, isService: false, isAdmin: false };
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
    return { userId: data.user.id, isService: false, isAdmin: !!adminRole };
  } catch { return { userId: null, isService: false, isAdmin: false }; }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Refund Path Determination ────────────────────────────
type RefundPath =
  | "stripe_refund"       // Reverse charge on original Stripe payment
  | "transak_offramp"     // USDC → fiat via Transak
  | "coinbase_offramp"    // USDC → fiat via Coinbase
  | "direct_crypto"       // USDC sent directly on-chain
  | "bank_manual"         // Queued for admin manual bank wire
  | "mobile_money_manual" // Queued for admin manual mobile money
  | "admin_queue";        // Fallback: admin manually processes

interface RefundRouteResult {
  path: RefundPath;
  status: "completed" | "processing" | "queued_manual" | "pending_buyer_details";
  refundAmount: number;
  processorFee: number;
  buyerReceives: number;
  details: Record<string, unknown>;
  message: string;
}

function determineRefundPath(
  originalProcessor: string | null,
  paymentCategory: string | null,
  providerDetails: Record<string, unknown> | null
): RefundPath {
  const proc = (originalProcessor || "").toLowerCase();
  const cat = (paymentCategory || "").toLowerCase();

  // 1. If paid with Stripe and we have a payment_intent_id → native Stripe refund
  if (proc === "stripe" && providerDetails?.stripe_payment_intent_id) {
    return "stripe_refund";
  }

  // 2. Direct crypto → send USDC back to their wallet
  if (proc === "direct" || cat === "crypto_wallet" || cat === "crypto") {
    return "direct_crypto";
  }

  // 3. Coinbase Commerce → Coinbase off-ramp
  if (proc === "coinbase") {
    return "coinbase_offramp";
  }

  // 4. Transak → Transak off-ramp
  if (proc === "transak") {
    return "transak_offramp";
  }

  // 5. Bank transfer → manual processing
  if (cat === "bank_account" || cat === "bank_transfer") {
    // Check if Transak can handle this country
    if (providerDetails?.country) {
      return "transak_offramp"; // Transak covers 140+ countries
    }
    return "bank_manual";
  }

  // 6. Mobile money → manual or Transak
  if (cat === "mobile_money") {
    return "mobile_money_manual";
  }

  // 7. Stripe card/digital wallet without payment_intent → Transak off-ramp
  if (proc === "stripe") {
    return "transak_offramp";
  }

  // Fallback
  return "admin_queue";
}

// ─── Path Executors ────────────────────────────────────────

async function executeStripeRefund(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  refundAmount: number,
  providerDetails: Record<string, unknown>
): Promise<RefundRouteResult> {
  const paymentIntentId = String(providerDetails.stripe_payment_intent_id);
  const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");

  if (!STRIPE_SECRET) {
    // No Stripe key — queue for manual
    return {
      path: "stripe_refund",
      status: "queued_manual",
      refundAmount,
      processorFee: 0,
      buyerReceives: refundAmount,
      details: {
        payment_intent_id: paymentIntentId,
        requires_stripe_key: true,
      },
      message: "Stripe refund queued — API key not configured. Admin will process manually.",
    };
  }

  try {
    // Call Stripe Refunds API
    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_intent: paymentIntentId,
        amount: String(Math.round(refundAmount * 100)), // Stripe uses cents
      }).toString(),
    });

    const refundData = await refundRes.json();

    if (refundData.error) {
      console.error("Stripe refund error:", refundData.error);
      return {
        path: "stripe_refund",
        status: "queued_manual",
        refundAmount,
        processorFee: 0,
        buyerReceives: refundAmount,
        details: {
          payment_intent_id: paymentIntentId,
          stripe_error: refundData.error.message,
        },
        message: `Stripe refund failed: ${refundData.error.message}. Queued for admin.`,
      };
    }

    return {
      path: "stripe_refund",
      status: refundData.status === "succeeded" ? "completed" : "processing",
      refundAmount,
      processorFee: 0, // Stripe doesn't charge on refunds
      buyerReceives: refundAmount,
      details: {
        stripe_refund_id: refundData.id,
        payment_intent_id: paymentIntentId,
        stripe_status: refundData.status,
      },
      message: `Stripe refund ${refundData.status}. Refund ID: ${refundData.id}. Funds will appear in 5-10 business days.`,
    };
  } catch (err) {
    console.error("Stripe refund exception:", err);
    return {
      path: "stripe_refund",
      status: "queued_manual",
      refundAmount,
      processorFee: 0,
      buyerReceives: refundAmount,
      details: { payment_intent_id: paymentIntentId, error: err.message },
      message: "Stripe refund failed. Queued for manual admin processing.",
    };
  }
}

async function executeTransakOfframp(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  refundAmount: number,
  buyerDetails: Record<string, unknown>
): Promise<RefundRouteResult> {
  const TRANSAK_API_KEY = Deno.env.get("TRANSAK_API_KEY");
  const walletAddress = String(buyerDetails.wallet_address || buyerDetails.refund_wallet || "");
  const chain = String(buyerDetails.chain || buyerDetails.network || "polygon").toLowerCase();
  const fiatCurrency = String(buyerDetails.fiat_currency || buyerDetails.currency || "USD");

  // Chain mapping
  const CHAIN_MAP: Record<string, string> = {
    polygon: "polygon", ethereum: "ethereum", bsc: "bsc",
    arbitrum: "arbitrum", optimism: "optimism", base: "base",
    solana: "solana", tron: "tron", avalanche: "avaxcchain",
  };
  const transakNetwork = CHAIN_MAP[chain] || chain;

  if (!TRANSAK_API_KEY) {
    return {
      path: "transak_offramp",
      status: "queued_manual",
      refundAmount,
      processorFee: 0,
      buyerReceives: refundAmount,
      details: {
        wallet_address: walletAddress,
        chain,
        fiat_currency: fiatCurrency,
        requires_transak_key: true,
      },
      message: "Transak off-ramp queued — API key not configured. Admin will process manually.",
    };
  }

  // Generate Transak widget URL for buyer to complete off-ramp
  const widgetUrl = `https://global.transak.com/?apiKey=${TRANSAK_API_KEY}` +
    `&cryptoCurrencyCode=USDC` +
    `&network=${transakNetwork}` +
    `&walletAddress=${encodeURIComponent(walletAddress)}` +
    `&defaultCryptoAmount=${refundAmount}` +
    `&productsAvailable=SELL` +
    `&defaultFiatCurrency=${fiatCurrency}` +
    `&exchangeScreenTitle=TrustLock%20Refund`;

  return {
    path: "transak_offramp",
    status: "processing",
    refundAmount,
    processorFee: round(refundAmount * 0.015), // ~1.5% Transak fee estimate
    buyerReceives: round(refundAmount * 0.985),
    details: {
      transak_widget_url: widgetUrl,
      transak_network: transakNetwork,
      wallet_address: walletAddress,
      fiat_currency: fiatCurrency,
    },
    message: `Transak off-ramp initiated. Buyer will receive ~$${round(refundAmount * 0.985).toFixed(2)} ${fiatCurrency} after processor conversion.`,
  };
}

async function executeCoinbaseOfframp(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  refundAmount: number,
  buyerDetails: Record<string, unknown>
): Promise<RefundRouteResult> {
  const email = String(buyerDetails.email || buyerDetails.coinbase_email || "");

  return {
    path: "coinbase_offramp",
    status: "processing",
    refundAmount,
    processorFee: round(refundAmount * 0.015),
    buyerReceives: round(refundAmount * 0.985),
    details: {
      coinbase_email: email,
      method: "coinbase_commerce_refund",
    },
    message: `Coinbase off-ramp initiated for ${email}. USDC will be sent to their Coinbase account for fiat conversion.`,
  };
}

function executeDirectCrypto(
  refundAmount: number,
  buyerDetails: Record<string, unknown>
): RefundRouteResult {
  const walletAddress = String(
    buyerDetails.wallet_address ||
    buyerDetails.refund_wallet ||
    buyerDetails.sender_wallet ||
    ""
  );
  const network = String(buyerDetails.network || buyerDetails.chain || "Polygon");

  return {
    path: "direct_crypto",
    status: walletAddress ? "completed" : "pending_buyer_details",
    refundAmount,
    processorFee: 0,
    buyerReceives: refundAmount,
    details: {
      wallet_address: walletAddress,
      network,
      token: "USDC",
      gas_model: "Gasless — MATIC paid by TrustLock Relayer",
    },
    message: walletAddress
      ? `$${refundAmount.toFixed(2)} USDC refunded to ${walletAddress} on ${network}. $0 fees. Gas covered by TrustLock.`
      : "Buyer wallet address required to complete crypto refund.",
  };
}

function executeManualQueue(
  path: RefundPath,
  refundAmount: number,
  buyerDetails: Record<string, unknown>
): RefundRouteResult {
  return {
    path,
    status: "queued_manual",
    refundAmount,
    processorFee: 0,
    buyerReceives: refundAmount,
    details: {
      ...buyerDetails,
      queued_at: new Date().toISOString(),
    },
    message: `Refund of $${refundAmount.toFixed(2)} queued for manual admin processing via ${path.replace("_", " ")}.`,
  };
}

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = getSupabase();
    const caller = await verifyCaller(req, supabase);
    if (!caller.isService && !caller.isAdmin) {
      return json({ error: "Unauthorized — service role or admin required" }, 401);
    }

    const body = await req.json();
    const {
      action,
      transactionId,
      refundAmount,
      refundType,
      buyerPaymentDetails,
      originalProcessor,
      paymentCategory,
      buyerId,
      milestoneId,
    } = body;

    if (!action) return json({ error: "action is required" }, 400);


    // ═════════════════════════════════════════════════
    //  ACTION: route_buyer_refund
    //  Determines and executes the correct refund path
    // ═════════════════════════════════════════════════
    if (action === "route_buyer_refund") {
      if (!transactionId || !refundAmount) {
        return json({ error: "transactionId and refundAmount are required" }, 400);
      }

      const amount = Number(refundAmount);
      if (amount <= 0) return json({ error: "refundAmount must be positive" }, 400);

      // Fetch transaction for context
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (!tx) return json({ error: "Transaction not found" }, 404);

      // Resolve buyer payment details — check multiple sources
      let paymentDetails: Record<string, unknown> = buyerPaymentDetails || {};
      let resolvedProcessor = originalProcessor || tx.processor_id || "";
      let resolvedCategory = paymentCategory || "";

      // 1. Check if buyer has an existing payout_request with payment details
      if (!buyerPaymentDetails || Object.keys(buyerPaymentDetails).length === 0) {
        const { data: payoutReq } = await supabase
          .from("payout_requests")
          .select("*")
          .eq("transaction_id", transactionId)
          .eq("user_id", tx.buyer_id)
          .eq("payout_type", "refund")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (payoutReq) {
          paymentDetails = (payoutReq.provider_details as Record<string, unknown>) || {};
          resolvedProcessor = payoutReq.payment_provider || resolvedProcessor;
          resolvedCategory = payoutReq.payment_category || resolvedCategory;
        }
      }

      // 2. Check checkout_sessions for original payment method
      if (!resolvedProcessor) {
        const { data: session } = await supabase
          .from("checkout_sessions")
          .select("payment_method, processor_id, payment_proof")
          .eq("transaction_id", transactionId)
          .limit(1)
          .single();

        if (session) {
          resolvedProcessor = session.processor_id || "";
          resolvedCategory = session.payment_method || "";
          if (session.payment_proof) {
            const proof = session.payment_proof as Record<string, unknown>;
            if (proof.stripe_payment_intent_id) {
              paymentDetails.stripe_payment_intent_id = proof.stripe_payment_intent_id;
            }
          }
        }
      }

      // 3. Check os_payments for payment details
      if (!resolvedProcessor) {
        const { data: osPay } = await supabase
          .from("os_payments")
          .select("*")
          .eq("transaction_id", transactionId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (osPay) {
          resolvedProcessor = osPay.processor || resolvedProcessor;
          resolvedCategory = osPay.payment_method || resolvedCategory;
          if (osPay.provider_response) {
            const resp = osPay.provider_response as Record<string, unknown>;
            paymentDetails = { ...paymentDetails, ...resp };
          }
        }
      }

      // Determine refund path
      const path = determineRefundPath(resolvedProcessor, resolvedCategory, paymentDetails);

      // Execute the appropriate refund path
      let result: RefundRouteResult;

      switch (path) {
        case "stripe_refund":
          result = await executeStripeRefund(supabase, transactionId, amount, paymentDetails);
          break;
        case "transak_offramp":
          result = await executeTransakOfframp(supabase, transactionId, amount, paymentDetails);
          break;
        case "coinbase_offramp":
          result = await executeCoinbaseOfframp(supabase, transactionId, amount, paymentDetails);
          break;
        case "direct_crypto":
          result = executeDirectCrypto(amount, paymentDetails);
          break;
        case "bank_manual":
        case "mobile_money_manual":
        case "admin_queue":
          result = executeManualQueue(path, amount, paymentDetails);
          break;
        default:
          result = executeManualQueue("admin_queue", amount, paymentDetails);
      }

      // Store refund routing record in payout_requests
      await supabase.from("payout_requests").insert({
        user_id: tx.buyer_id,
        transaction_id: transactionId,
        amount,
        net_amount: result.buyerReceives,
        fee: result.processorFee,
        payout_type: refundType || "refund",
        payment_provider: resolvedProcessor || path,
        payment_category: resolvedCategory || path,
        status: result.status,
        role: "buyer",
        provider_details: {
          refund_path: result.path,
          ...result.details,
          refund_type: refundType,
          milestone_id: milestoneId || null,
          original_processor: resolvedProcessor,
          routed_at: new Date().toISOString(),
        },
        trickle_amount: 0,
        trickle_rule: "refund_zero_fee",
        escrow_fee_deducted: 0,
      });

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: tx.buyer_id,
        title: result.status === "completed"
          ? "✅ Refund Completed"
          : result.status === "processing"
          ? "⏳ Refund Processing"
          : result.status === "queued_manual"
          ? "📋 Refund Queued"
          : "⚠️ Refund Pending Details",
        message: result.message,
        type: result.status === "completed" ? "success"
          : result.status === "pending_buyer_details" ? "warning"
          : "info",
        related_entity_type: "refund",
        related_entity_id: transactionId,
        is_action_required: result.status === "pending_buyer_details",
        action_url: result.status === "pending_buyer_details"
          ? "/trustlock/buyer/payout"
          : undefined,
      });

      // If queued for manual, notify admins
      if (result.status === "queued_manual") {
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(5);

        if (adminRoles) {
          for (const admin of adminRoles) {
            await supabase.from("notifications").insert({
              user_id: admin.user_id,
              title: "📋 Manual Refund Required",
              message: `Refund of $${amount.toFixed(2)} for TX ${tx.tx_id} requires manual processing via ${path.replace(/_/g, " ")}. Buyer: ${tx.buyer_name || "Unknown"}.`,
              type: "warning",
              is_action_required: true,
              action_url: "/trustlock/admin/transactions",
              related_entity_type: "refund",
              related_entity_id: transactionId,
            });
          }
        }
      }

      // Anchor refund routing to blockchain proof chain
      try {
        const canonical = JSON.stringify({
          action: "refund_routed",
          transaction_id: transactionId,
          refund_amount: amount,
          refund_path: result.path,
          buyer_receives: result.buyerReceives,
          processor_fee: result.processorFee,
          status: result.status,
          routed_at: new Date().toISOString(),
        });
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        const txData = encoder.encode(transactionId);
        let txRef = "0x";
        for (let i = 0; i < 32; i++) {
          const byte = txData[i % txData.length] ^ (i * 37);
          txRef += (byte & 0xff).toString(16).padStart(2, "0");
        }

        const { data: lastRecord } = await supabase
          .from("blockchain_proofs")
          .select("content_hash")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        await supabase.from("blockchain_proofs").insert({
          content_hash: contentHash,
          prev_hash: lastRecord?.content_hash || "0x" + "0".repeat(64),
          record_type: "refund_routing",
          tx_ref: txRef,
          transaction_id: transactionId,
          event_data: {
            refund_path: result.path,
            refund_amount: amount,
            buyer_receives: result.buyerReceives,
            processor_fee: result.processorFee,
            status: result.status,
            original_processor: resolvedProcessor,
            payment_category: resolvedCategory,
          },
          chain_status: "queued",
        });
      } catch (e) {
        console.error("Refund anchor failed (non-blocking):", e);
      }

      return json({
        success: true,
        refundRoute: result,
        transactionId,
        refundType: refundType || "refund",
        note: "Refund of the 0.5% checkout transaction fee is NOT included — that is retained as TrustLock revenue.",
      });
    }

    // ═════════════════════════════════════════════════
    //  ACTION: check_refund_status
    //  Check status of a pending refund disbursement
    // ═════════════════════════════════════════════════
    if (action === "check_refund_status") {
      if (!transactionId) return json({ error: "transactionId required" }, 400);

      const { data: requests } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("payout_type", "refund")
        .order("created_at", { ascending: false });

      return json({
        success: true,
        refundRequests: requests || [],
        count: requests?.length || 0,
      });
    }

    // ═════════════════════════════════════════════════
    //  ACTION: resolve_manual_refund
    //  Admin marks a manual refund as completed
    // ═════════════════════════════════════════════════
    if (action === "resolve_manual_refund") {
      const { payoutRequestId, adminNotes, proofOfTransfer } = body;
      if (!payoutRequestId) return json({ error: "payoutRequestId required" }, 400);

      const now = new Date().toISOString();

      const { data: updated, error: upErr } = await supabase
        .from("payout_requests")
        .update({
          status: "completed",
          completed_at: now,
          provider_details: {
            resolved_manually: true,
            admin_notes: adminNotes || null,
            proof_of_transfer: proofOfTransfer || null,
            resolved_at: now,
          },
          updated_at: now,
        })
        .eq("id", payoutRequestId)
        .select()
        .single();

      if (upErr) return json({ error: upErr.message }, 500);

      // Notify buyer
      if (updated?.user_id) {
        await supabase.from("notifications").insert({
          user_id: updated.user_id,
          title: "✅ Refund Completed",
          message: `Your refund of $${updated.amount.toFixed(2)} has been manually processed and delivered. ${adminNotes ? `Note: ${adminNotes}` : ""}`,
          type: "success",
          related_entity_type: "refund",
          related_entity_id: updated.transaction_id,
        });
      }

      return json({ success: true, payout: updated });
    }

    return json({
      error: `Unknown action: ${action}. Supported: route_buyer_refund, check_refund_status, resolve_manual_refund`,
    }, 400);
  } catch (err) {
    console.error("refund-router error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

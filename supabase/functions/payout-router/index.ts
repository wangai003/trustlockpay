import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Payout Router — Last-Mile Vendor Payout Disbursement
 *
 * After the smart contract releases funds (minus 1% escrow fee) to the vendor,
 * this function handles the off-ramp/routing to the vendor's preferred payment
 * method. Mirrors refund-router but for vendor payouts.
 *
 * PAYOUT PATHS:
 *   1. Direct Crypto   → USDC sent directly to vendor's wallet on-chain
 *   2. Stripe Connect  → Payout via Stripe Connect to vendor's bank
 *   3. Transak Off-ramp → Converts USDC → fiat via Transak (140+ countries)
 *   4. Bank Transfer    → Queued for manual admin processing
 *   5. Mobile Money     → Queued for manual admin processing
 *
 * FLOW:
 *   Admin approves release/split → wallet-routing-bridge extracts 1% escrow fee →
 *   payout-router picks the correct disbursement path based on vendor's stored
 *   payment details (from their payout_requests entry)
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

// ─── Payout Path Determination ────────────────────────────
type PayoutPath =
  | "stripe_connect"       // Payout via Stripe Connect to vendor bank
  | "transak_offramp"      // USDC → fiat via Transak
  | "direct_crypto"        // USDC sent directly on-chain
  | "bank_manual"          // Queued for admin manual bank wire
  | "mobile_money_manual"  // Queued for admin manual mobile money
  | "admin_queue";         // Fallback: admin manually processes

interface PayoutRouteResult {
  path: PayoutPath;
  status: "completed" | "processing" | "queued_manual" | "pending_vendor_details";
  payoutAmount: number;
  processorFee: number;
  vendorReceives: number;
  details: Record<string, unknown>;
  message: string;
}

function determinePayoutPath(
  paymentProvider: string | null,
  paymentCategory: string | null,
  providerDetails: Record<string, unknown> | null
): PayoutPath {
  const prov = (paymentProvider || "").toLowerCase();
  const cat = (paymentCategory || "").toLowerCase();

  // 1. Direct crypto → send USDC to vendor's wallet
  if (prov === "direct" || cat === "crypto_wallet" || cat === "crypto") {
    return "direct_crypto";
  }

  // 2. Stripe Connect
  if (prov === "stripe" && providerDetails?.stripe_connect_account_id) {
    return "stripe_connect";
  }

  // 3. Transak off-ramp
  if (prov === "transak") {
    return "transak_offramp";
  }

  // 4. Bank transfer with Transak coverage
  if (cat === "bank_account" || cat === "bank_transfer") {
    if (providerDetails?.country) {
      return "transak_offramp"; // Transak covers 140+ countries
    }
    return "bank_manual";
  }

  // 5. Mobile money → manual
  if (cat === "mobile_money") {
    return "mobile_money_manual";
  }

  // 6. Stripe without Connect → Transak off-ramp
  if (prov === "stripe") {
    return "transak_offramp";
  }

  // Fallback
  return "admin_queue";
}

// ─── Path Executors ────────────────────────────────────────

function executeDirectCrypto(
  payoutAmount: number,
  vendorDetails: Record<string, unknown>
): PayoutRouteResult {
  const walletAddress = String(
    vendorDetails.wallet_address || vendorDetails.payout_wallet || ""
  );
  const network = String(vendorDetails.network || vendorDetails.chain || "Polygon");

  return {
    path: "direct_crypto",
    status: walletAddress ? "completed" : "pending_vendor_details",
    payoutAmount,
    processorFee: 0,
    vendorReceives: payoutAmount,
    details: {
      wallet_address: walletAddress,
      network,
      token: "USDC",
      gas_model: "Gasless — MATIC paid by TrustLock Relayer",
    },
    message: walletAddress
      ? `$${payoutAmount.toFixed(2)} USDC sent to ${walletAddress} on ${network}. $0 fees. Gas covered by TrustLock.`
      : "Vendor wallet address required to complete crypto payout.",
  };
}

async function executeStripeConnect(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  payoutAmount: number,
  vendorDetails: Record<string, unknown>
): Promise<PayoutRouteResult> {
  const connectAccountId = String(vendorDetails.stripe_connect_account_id || "");
  const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");

  if (!STRIPE_SECRET || !connectAccountId) {
    return {
      path: "stripe_connect",
      status: "queued_manual",
      payoutAmount,
      processorFee: 0,
      vendorReceives: payoutAmount,
      details: {
        stripe_connect_account_id: connectAccountId,
        requires_stripe_key: !STRIPE_SECRET,
      },
      message: "Stripe Connect payout queued — configuration incomplete. Admin will process manually.",
    };
  }

  try {
    const transferRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.round(payoutAmount * 100)),
        currency: "usd",
        destination: connectAccountId,
        description: `TrustLock payout for TX ${transactionId}`,
      }).toString(),
    });

    const transferData = await transferRes.json();

    if (transferData.error) {
      return {
        path: "stripe_connect",
        status: "queued_manual",
        payoutAmount,
        processorFee: 0,
        vendorReceives: payoutAmount,
        details: { stripe_error: transferData.error.message },
        message: `Stripe transfer failed: ${transferData.error.message}. Queued for admin.`,
      };
    }

    return {
      path: "stripe_connect",
      status: "processing",
      payoutAmount,
      processorFee: 0,
      vendorReceives: payoutAmount,
      details: {
        stripe_transfer_id: transferData.id,
        stripe_status: transferData.status || "pending",
      },
      message: `Stripe payout initiated. Transfer ID: ${transferData.id}. Funds arrive in 1-3 business days.`,
    };
  } catch (err) {
    return {
      path: "stripe_connect",
      status: "queued_manual",
      payoutAmount,
      processorFee: 0,
      vendorReceives: payoutAmount,
      details: { error: err.message },
      message: "Stripe payout failed. Queued for manual admin processing.",
    };
  }
}

async function executeTransakOfframp(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  payoutAmount: number,
  vendorDetails: Record<string, unknown>
): Promise<PayoutRouteResult> {
  const TRANSAK_API_KEY = Deno.env.get("TRANSAK_API_KEY");
  const walletAddress = String(vendorDetails.wallet_address || vendorDetails.payout_wallet || "");
  const chain = String(vendorDetails.chain || vendorDetails.network || "polygon").toLowerCase();
  const fiatCurrency = String(vendorDetails.fiat_currency || vendorDetails.currency || "USD");

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
      payoutAmount,
      processorFee: 0,
      vendorReceives: payoutAmount,
      details: {
        wallet_address: walletAddress,
        chain,
        fiat_currency: fiatCurrency,
        requires_transak_key: true,
      },
      message: "Transak off-ramp queued — API key not configured. Admin will process manually.",
    };
  }

  const widgetUrl = `https://global.transak.com/?apiKey=${TRANSAK_API_KEY}` +
    `&cryptoCurrencyCode=USDC&network=${transakNetwork}` +
    `&walletAddress=${encodeURIComponent(walletAddress)}` +
    `&defaultCryptoAmount=${payoutAmount}` +
    `&productsAvailable=SELL&defaultFiatCurrency=${fiatCurrency}` +
    `&exchangeScreenTitle=TrustLock%20Vendor%20Payout`;

  return {
    path: "transak_offramp",
    status: "processing",
    payoutAmount,
    processorFee: round(payoutAmount * 0.015),
    vendorReceives: round(payoutAmount * 0.985),
    details: {
      transak_widget_url: widgetUrl,
      transak_network: transakNetwork,
      wallet_address: walletAddress,
      fiat_currency: fiatCurrency,
    },
    message: `Transak off-ramp initiated. Vendor will receive ~$${round(payoutAmount * 0.985).toFixed(2)} ${fiatCurrency} after conversion.`,
  };
}

function executeManualQueue(
  path: PayoutPath,
  payoutAmount: number,
  vendorDetails: Record<string, unknown>
): PayoutRouteResult {
  return {
    path,
    status: "queued_manual",
    payoutAmount,
    processorFee: 0,
    vendorReceives: payoutAmount,
    details: {
      ...vendorDetails,
      queued_at: new Date().toISOString(),
    },
    message: `Payout of $${payoutAmount.toFixed(2)} queued for manual admin processing via ${path.replace(/_/g, " ")}.`,
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
      payoutAmount,
      payoutType,
      vendorPaymentDetails,
      paymentProvider,
      paymentCategory,
      vendorId,
      milestoneId,
    } = body;

    if (!action) return json({ error: "action is required" }, 400);

    if (action === "resolve_manual_payout" && !caller.isAdmin && !caller.isService) {
      return json({ error: "Forbidden — admin only" }, 403);
    }


    // ═════════════════════════════════════════════════
    //  ACTION: route_vendor_payout
    //  Determines and executes the correct payout path for vendor
    // ═════════════════════════════════════════════════
    if (action === "route_vendor_payout") {
      if (!transactionId || !payoutAmount) {
        return json({ error: "transactionId and payoutAmount are required" }, 400);
      }

      const amount = Number(payoutAmount);
      if (amount <= 0) return json({ error: "payoutAmount must be positive" }, 400);

      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (!tx) return json({ error: "Transaction not found" }, 404);

      // Resolve vendor payment details from multiple sources
      let paymentDetails: Record<string, unknown> = vendorPaymentDetails || {};
      let resolvedProvider = paymentProvider || "";
      let resolvedCategory = paymentCategory || "";

      // 1. Check payout_requests for vendor's stored payment preferences
      if (!vendorPaymentDetails || Object.keys(vendorPaymentDetails).length === 0) {
        const { data: payoutReq } = await supabase
          .from("payout_requests")
          .select("*")
          .eq("transaction_id", transactionId)
          .eq("user_id", tx.vendor_id)
          .in("payout_type", ["release", "split_vendor"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (payoutReq) {
          paymentDetails = (payoutReq.provider_details as Record<string, unknown>) || {};
          resolvedProvider = payoutReq.payment_provider || resolvedProvider;
          resolvedCategory = payoutReq.payment_category || resolvedCategory;
        }
      }

      // 2. Check vendor profile for default payout method
      if (!resolvedProvider && tx.vendor_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_address, wallet_verified")
          .eq("id", tx.vendor_id)
          .single();

        if (profile?.wallet_address && profile?.wallet_verified) {
          paymentDetails.wallet_address = profile.wallet_address;
          resolvedCategory = "crypto_wallet";
          resolvedProvider = "direct";
        }
      }

      // Determine payout path
      const path = determinePayoutPath(resolvedProvider, resolvedCategory, paymentDetails);

      // Execute the appropriate payout path
      let result: PayoutRouteResult;

      switch (path) {
        case "stripe_connect":
          result = await executeStripeConnect(supabase, transactionId, amount, paymentDetails);
          break;
        case "transak_offramp":
          result = await executeTransakOfframp(supabase, transactionId, amount, paymentDetails);
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

      // Store payout routing record
      await supabase.from("payout_requests").insert({
        user_id: tx.vendor_id,
        transaction_id: transactionId,
        amount,
        net_amount: result.vendorReceives,
        fee: result.processorFee,
        payout_type: payoutType || "release",
        payment_provider: resolvedProvider || path,
        payment_category: resolvedCategory || path,
        status: result.status,
        role: "vendor",
        provider_details: {
          payout_path: result.path,
          ...result.details,
          payout_type: payoutType,
          milestone_id: milestoneId || null,
          original_provider: resolvedProvider,
          routed_at: new Date().toISOString(),
        },
        trickle_amount: 0,
        trickle_rule: "vendor_payout",
        escrow_fee_deducted: 0, // Already deducted upstream
      });

      // Notify vendor
      await supabase.from("notifications").insert({
        user_id: tx.vendor_id,
        title: result.status === "completed"
          ? "✅ Payout Completed"
          : result.status === "processing"
          ? "⏳ Payout Processing"
          : result.status === "queued_manual"
          ? "📋 Payout Queued"
          : "⚠️ Payout Pending Details",
        message: result.message,
        type: result.status === "completed" ? "success"
          : result.status === "pending_vendor_details" ? "warning"
          : "info",
        related_entity_type: "payout",
        related_entity_id: transactionId,
        is_action_required: result.status === "pending_vendor_details",
        action_url: result.status === "pending_vendor_details"
          ? "/trustlock/vendor/payout"
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
              title: "📋 Manual Vendor Payout Required",
              message: `Payout of $${amount.toFixed(2)} for TX ${tx.tx_id} requires manual processing via ${path.replace(/_/g, " ")}. Vendor: ${tx.vendor_name || "Unknown"}.`,
              type: "warning",
              is_action_required: true,
              action_url: "/trustlock/admin/transactions",
              related_entity_type: "payout",
              related_entity_id: transactionId,
            });
          }
        }
      }

      // Anchor payout routing to blockchain proof chain
      try {
        const canonical = JSON.stringify({
          action: "vendor_payout_routed",
          transaction_id: transactionId,
          payout_amount: amount,
          payout_path: result.path,
          vendor_receives: result.vendorReceives,
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
          record_type: "vendor_payout_routing",
          tx_ref: txRef,
          transaction_id: transactionId,
          event_data: {
            payout_path: result.path,
            payout_amount: amount,
            vendor_receives: result.vendorReceives,
            processor_fee: result.processorFee,
            status: result.status,
            original_provider: resolvedProvider,
            payment_category: resolvedCategory,
          },
          chain_status: "queued",
        });
      } catch (e) {
        console.error("Vendor payout anchor failed (non-blocking):", e);
      }

      return json({
        success: true,
        payoutRoute: result,
        transactionId,
        payoutType: payoutType || "release",
      });
    }

    // ═════════════════════════════════════════════════
    //  ACTION: check_vendor_payout_status
    // ═════════════════════════════════════════════════
    if (action === "check_vendor_payout_status") {
      if (!transactionId) return json({ error: "transactionId required" }, 400);

      const { data: requests } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("role", "vendor")
        .order("created_at", { ascending: false });

      return json({
        success: true,
        payoutRequests: requests || [],
        count: requests?.length || 0,
      });
    }

    // ═════════════════════════════════════════════════
    //  ACTION: resolve_manual_payout
    //  Admin marks a manual vendor payout as completed
    // ═════════════════════════════════════════════════
    if (action === "resolve_manual_payout") {
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

      if (updated?.user_id) {
        await supabase.from("notifications").insert({
          user_id: updated.user_id,
          title: "✅ Payout Completed",
          message: `Your payout of $${updated.amount.toFixed(2)} has been manually processed and delivered. ${adminNotes ? `Note: ${adminNotes}` : ""}`,
          type: "success",
          related_entity_type: "payout",
          related_entity_id: updated.transaction_id,
        });
      }

      return json({ success: true, payout: updated });
    }

    return json({
      error: `Unknown action: ${action}. Supported: route_vendor_payout, check_vendor_payout_status, resolve_manual_payout`,
    }, 400);
  } catch (err) {
    console.error("payout-router error:", err);
    return json({ success: false, error: err.message }, 500);
  }
});

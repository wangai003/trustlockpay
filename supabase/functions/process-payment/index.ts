import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Azix Wallet Addresses (from env, fallback to placeholder) ─
const AZIX_WALLETS = {
  transaction: Deno.env.get("AZIX_TRANSACTION_WALLET") || "0x7A3b1234567890abcdef1234567890abcdefF92d",
  escrow: Deno.env.get("AZIX_ESCROW_WALLET") || "0x4E1c1234567890abcdef1234567890abcdefA83b",
};

// ─── Fee Constants (basis points) ────────────────────────
const PLATFORM_FEE_CRYPTO_BPS = 100; // 1.0%
const PLATFORM_FEE_FIAT_BPS = 150;   // 1.5%

// ─── Types ────────────────────────────────────────────────
interface ProcessPaymentRequest {
  action?: string;
  service?: string;
  amount: number;
  fee?: number;
  total?: number;
  method?: string;
  role?: string;
  pay_mode?: "local" | "diaspora";
  refundEmail?: string;
  refundReason?: string;
  splitRecipient?: string;
  splitPercentage?: number;
  processor?: "stripe" | "coinbase" | "transak" | "direct";
  direction?: "onramp" | "offramp";
  currency?: string;
  cryptoCurrency?: string;
  chain?: string;
  walletAddress?: string;
  receiverAddress?: string;
  buyerEmail?: string;
  transactionId?: string;
  sessionId?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  buyer_country?: string;
  vendor_country?: string;
  item_category?: string;
  is_export?: boolean;
  bankTransferDetails?: {
    bankName: string;
    region?: string;
    country?: string;
    accountNumber?: string;
    branchCode?: string;
    bvn?: string;
    iban?: string;
    rib?: string;
    sortCode?: string;
    type: "international" | "local_africa";
  };
  mobileMoneyDetails?: {
    provider: string;
    phoneNumber: string;
    country: string;
  };
}

// ─── Tax Rate Fallbacks ──────────────────────────────────
const FALLBACK_TAX_RATES: Record<string, { rate: number; type: string; bloc?: string; tariff: number }> = {
  US: { rate: 7.0, type: "Sales Tax", bloc: "USMCA", tariff: 3.5 },
  GB: { rate: 20.0, type: "VAT", tariff: 2.5 },
  DE: { rate: 19.0, type: "VAT", bloc: "EU", tariff: 0 },
  FR: { rate: 20.0, type: "VAT", bloc: "EU", tariff: 0 },
  NG: { rate: 7.5, type: "VAT", bloc: "ECOWAS", tariff: 5.0 },
  KE: { rate: 16.0, type: "VAT", bloc: "EAC", tariff: 4.0 },
  ZA: { rate: 15.0, type: "VAT", bloc: "SACU", tariff: 3.0 },
  AE: { rate: 5.0, type: "VAT", bloc: "GCC", tariff: 5.0 },
  GH: { rate: 15.0, type: "VAT", bloc: "ECOWAS", tariff: 5.0 },
};

const ITEM_TARIFF_MULTIPLIERS: Record<string, number> = {
  electronics: 1.2, commodities: 0.8, textiles: 1.5, machinery: 1.0,
  food: 0.5, chemicals: 1.3, automotive: 1.4, general: 1.0,
};

// ─── Helpers ──────────────────────────────────────────────
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Blockchain Anchor Helper ─────────────────────────────
async function anchorProof(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  recordType: string,
  eventData: Record<string, unknown>
) {
  try {
    const canonical = JSON.stringify(eventData, Object.keys(eventData).sort());
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
      .from("blockchain_proofs").select("content_hash").order("created_at", { ascending: false }).limit(1).single();
    const prevHash = lastRecord?.content_hash || "0x" + "0".repeat(64);
    await supabase.from("blockchain_proofs").insert({
      content_hash: contentHash, prev_hash: prevHash, record_type: recordType,
      tx_ref: txRef, transaction_id: transactionId, event_data: eventData, chain_status: "queued",
    });
    console.log(`[anchor] ${recordType} for tx ${transactionId.slice(0, 8)}...`);
  } catch (err) { console.error("[anchor] Failed:", err); }
}

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TL-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function isCryptoMethod(method?: string, processor?: string): boolean {
  if (processor === "coinbase" || processor === "direct") return true;
  if (method && ["crypto", "usdc", "usdt", "polygon"].includes(method.toLowerCase())) return true;
  return false;
}

function calculatePlatformFee(amount: number, method?: string, processor?: string): { fee: number; rate: number; type: string } {
  const crypto = isCryptoMethod(method, processor);
  const bps = crypto ? PLATFORM_FEE_CRYPTO_BPS : PLATFORM_FEE_FIAT_BPS;
  const fee = round(amount * bps / 10000);
  return { fee, rate: bps / 100, type: crypto ? "crypto" : "fiat" };
}

// ─── Tax Calculation Engine ──────────────────────────────
interface TaxBreakdown {
  subtotal: number; tax_amount: number; tax_type: string; tax_rate: number;
  tariff_amount: number; tariff_rate: number; total_with_tax: number;
  is_domestic: boolean; is_same_bloc: boolean; is_export: boolean;
  buyer_country: string; vendor_country: string; item_category: string; notes: string;
}

async function calculateTax(
  supabase: ReturnType<typeof createClient>,
  amount: number, buyerCountry?: string, vendorCountry?: string,
  itemCategory?: string, isExport?: boolean
): Promise<TaxBreakdown> {
  const bCountry = (buyerCountry ?? "").toUpperCase().trim();
  const vCountry = (vendorCountry ?? "").toUpperCase().trim();
  const category = (itemCategory ?? "general").toLowerCase();

  if (!bCountry && !vCountry) {
    return {
      subtotal: amount, tax_amount: 0, tax_type: "None", tax_rate: 0,
      tariff_amount: 0, tariff_rate: 0, total_with_tax: amount,
      is_domestic: false, is_same_bloc: false, is_export: false,
      buyer_country: bCountry, vendor_country: vCountry, item_category: category,
      notes: "No country information provided — tax not applied.",
    };
  }

  const countries = [bCountry, vCountry].filter(Boolean);
  const { data: rates } = await supabase
    .from("tax_rates").select("*").in("country_code", countries).eq("is_active", true);

  const rateMap: Record<string, { rate: number; type: string; bloc: string | null; tariff: number; de_minimis: number }> = {};
  if (rates) {
    for (const r of rates) {
      rateMap[r.country_code] = {
        rate: Number(r.rate_percentage), type: r.tax_type,
        bloc: r.trade_bloc, tariff: Number(r.tariff_rate_percentage ?? 0),
        de_minimis: Number(r.de_minimis_usd ?? 0),
      };
    }
  }

  const buyerRate = rateMap[bCountry] ?? FALLBACK_TAX_RATES[bCountry] ?? null;
  const vendorRate = rateMap[vCountry] ?? FALLBACK_TAX_RATES[vCountry] ?? null;
  const isDomestic = bCountry === vCountry && bCountry !== "";
  const buyerBloc = buyerRate?.bloc ?? null;
  const vendorBloc = vendorRate?.bloc ?? null;
  const isSameBloc = !!(buyerBloc && vendorBloc && buyerBloc === vendorBloc && !isDomestic);
  const isExportTx = isExport ?? (!isDomestic && !isSameBloc);

  let taxAmount = 0, taxType = "None", taxRate = 0, tariffAmount = 0, tariffRate = 0, notes = "";
  const deMinimis = buyerRate?.de_minimis ?? 0;
  const belowDeMinimis = deMinimis > 0 && amount < deMinimis;

  if (isDomestic) {
    if (buyerRate) {
      taxRate = buyerRate.rate; taxType = buyerRate.type;
      taxAmount = round(amount * (taxRate / 100));
      notes = `Domestic transaction in ${bCountry}. ${taxType} at ${taxRate}% applied.`;
    } else {
      notes = `Domestic transaction in ${bCountry}. No tax rate on file.`;
    }
  } else if (isSameBloc) {
    if (buyerRate) {
      taxRate = buyerRate.rate; taxType = `${buyerRate.type} (Destination)`;
      taxAmount = round(amount * (taxRate / 100));
      notes = `Intra-bloc (${buyerBloc}) transaction. Destination ${buyerRate.type} at ${taxRate}% applied.`;
    }
  } else if (isExportTx) {
    taxRate = 0; taxType = "VAT (Zero-Rated Export)"; taxAmount = 0;
    if (belowDeMinimis) {
      notes = `International export: VAT zero-rated. Below de minimis ($${deMinimis}) — duties waived.`;
    } else if (buyerRate && buyerRate.tariff > 0) {
      const multiplier = ITEM_TARIFF_MULTIPLIERS[category] ?? 1.0;
      tariffRate = round(buyerRate.tariff * multiplier);
      tariffAmount = round(amount * (tariffRate / 100));
      notes = `International export: VAT zero-rated. Import tariff ${tariffRate}% applied.`;
    } else {
      notes = `International export: VAT zero-rated. No tariff for ${bCountry}.`;
    }
  }

  return {
    subtotal: amount, tax_amount: taxAmount, tax_type: taxType, tax_rate: taxRate,
    tariff_amount: tariffAmount, tariff_rate: tariffRate,
    total_with_tax: round(amount + taxAmount + tariffAmount),
    is_domestic: isDomestic, is_same_bloc: isSameBloc, is_export: isExportTx,
    buyer_country: bCountry, vendor_country: vCountry, item_category: category, notes,
  };
}

// ─── Seed Token Helper (wallet_purpose='pay') ────────────
async function ensurePaySeedToken(
  supabase: ReturnType<typeof createClient>, userId: string
): Promise<{ token: string; id: string } | null> {
  // Check for existing active 'pay' seed token
  const { data: existing } = await supabase
    .from("seed_tokens")
    .select("id, token")
    .eq("user_id", userId)
    .eq("wallet_purpose", "pay")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) return { token: existing.token, id: existing.id };

  // Create new pay seed token
  const token = `pay_${crypto.randomUUID().replace(/-/g, "")}`;
  const { data: created, error } = await supabase
    .from("seed_tokens")
    .insert({
      user_id: userId,
      token,
      wallet_purpose: "pay",
      purpose: "os_pay",
      wallet_public_key: AZIX_WALLETS.transaction,
    })
    .select("id, token")
    .single();

  if (error) {
    console.error("Failed to create pay seed token:", error);
    return null;
  }
  return { token: created.token, id: created.id };
}

// ─── Smart Contract Calldata Builder ─────────────────────
function buildLockFundsCalldata(
  orderId: string, amount: number, platformFee: number,
  processorFee: number, processorAddress: string
) {
  // OS Pay: escrowDeposit = 0 (no escrow component)
  return {
    function: "lockFunds",
    params: {
      orderId,
      amount: Math.round(amount * 1e6),          // USDC 6 decimals
      platformFee: Math.round(platformFee * 1e6),
      escrowDeposit: 0,                           // No escrow for OS Pay
      processorFee: Math.round(processorFee * 1e6),
      processorAddress,
    },
    routing: {
      platformFee_to: AZIX_WALLETS.transaction,
      escrowDeposit_to: null,
      remainder: "locked_in_contract",
    },
    note: "OS Pay: platformFee sent immediately to Transaction Wallet. No escrow deposit.",
  };
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: ProcessPaymentRequest = await req.json();
    const {
      action, service, amount, fee, total, method, role, pay_mode,
      refundEmail, refundReason, splitRecipient, splitPercentage,
      processor, direction, currency, chain,
      walletAddress, receiverAddress, transactionId,
      buyer_country, vendor_country, item_category, is_export,
      bankTransferDetails, mobileMoneyDetails,
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Authenticate caller ──────────────────────────────
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

    // ── Calculate tax if country info provided ───────────
    let taxBreakdown: TaxBreakdown | null = null;
    if (buyer_country || vendor_country) {
      taxBreakdown = await calculateTax(
        supabase, amount, buyer_country, vendor_country, item_category, is_export
      );
    }

    // ── Calculate platform fee ───────────────────────────
    const platformFeeCalc = calculatePlatformFee(amount, method, processor);
    const effectiveFee = fee ?? platformFeeCalc.fee;
    const effectiveTotal = taxBreakdown
      ? round(taxBreakdown.total_with_tax + effectiveFee)
      : (total ?? round(amount + effectiveFee));

    const confirmationCode = generateConfirmationCode();

    // ── Route: Admin Refund ──────────────────────────────
    if (action === "refund") {
      const { data: payment, error } = await supabase
        .from("os_payments")
        .insert({
          user_id: userId,
          role: role || "admin",
          action: "refund",
          service: service || "escrow_refund",
          amount: parseFloat(String(amount)),
          fee: 0, // All fees waived on refund
          total: parseFloat(String(amount)),
          method: method || "platform",
          status: "completed",
          refund_email: refundEmail || null,
          refund_reason: refundReason || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Anchor: Admin OS Pay refund to blockchain
      if (transactionId) {
        await anchorProof(supabase, transactionId, "payout", {
          event: "admin_os_pay_refund",
          payment_id: payment.id,
          amount: parseFloat(String(amount)),
          refund_email: refundEmail || null,
          refund_reason: refundReason || null,
          admin_user_id: userId,
          processed_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({
          success: true, payment, confirmationCode, feeWaived: true,
          note: "Refund processed. All platform/escrow fees waived. Gas only ($0.02–$0.05).",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Route: Admin Split Payout ────────────────────────
    if (action === "split") {
      const { data: payment, error } = await supabase
        .from("os_payments")
        .insert({
          user_id: userId,
          role: role || "admin",
          action: "split",
          service: service || "split_payout",
          amount: parseFloat(String(amount)),
          fee: effectiveFee,
          total: effectiveTotal,
          method: method || "platform",
          status: "completed",
          split_recipient: splitRecipient || null,
          split_percentage: splitPercentage ? parseInt(String(splitPercentage)) : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Anchor: Admin OS Pay split to blockchain
      if (transactionId) {
        await anchorProof(supabase, transactionId, "payout", {
          event: "admin_os_pay_split",
          payment_id: payment.id,
          amount: parseFloat(String(amount)),
          split_recipient: splitRecipient || null,
          split_percentage: splitPercentage || null,
          fee: effectiveFee,
          admin_user_id: userId,
          processed_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({
          success: true, payment, confirmationCode,
          note: "Split payout recorded. 1.0% escrow fee deducted from vendor share only.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Route: Processor-based checkout/payout ───────────
    if (processor && direction) {
      let processorResult: Record<string, unknown>;
      const chargeAmount = taxBreakdown ? taxBreakdown.total_with_tax : amount;

      switch (processor) {
        case "stripe": {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (!stripeKey) {
            processorResult = {
              processor: "stripe", direction, status: "not_configured",
              message: "Stripe pending API key setup.",
            };
          } else if (direction === "onramp") {
            const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${stripeKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                amount: String(Math.round(chargeAmount * 100)),
                currency: (currency || "usd").toLowerCase(),
                "metadata[transaction_id]": transactionId || "",
                "metadata[user_id]": userId || "",
                "metadata[checkout_session_id]": body.sessionId || "",
              }),
            });
            const intent = await stripeRes.json();
            if (intent.error) throw new Error(`Stripe: ${intent.error.message}`);
            processorResult = {
              processor: "stripe", direction, status: "processing",
              clientSecret: intent.client_secret,
              paymentIntentId: intent.id,
            };
          } else {
            processorResult = {
              processor: "stripe", direction: "offramp", status: "requires_connect",
              message: "Stripe payouts require a connected account.",
            };
          }
          break;
        }

        case "coinbase": {
          const cbKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
          if (!cbKey) {
            processorResult = {
              processor: "coinbase", direction, status: "not_configured",
              message: "Coinbase pending API key setup.",
            };
          } else if (direction === "onramp") {
            const cbRes = await fetch("https://api.commerce.coinbase.com/charges", {
              method: "POST",
              headers: {
                "X-CC-Api-Key": cbKey, "Content-Type": "application/json",
                "X-CC-Version": "2018-03-22",
              },
              body: JSON.stringify({
                name: `TrustLock Order${transactionId ? ` #${transactionId.slice(0, 8)}` : ""}`,
                description: service || "Escrow Payment",
                pricing_type: "fixed_price",
                local_price: { amount: String(chargeAmount), currency: (currency || "USD").toUpperCase() },
                metadata: { transaction_id: transactionId || "", user_id: userId || "" },
                redirect_url: body.redirectUrl || "",
                cancel_url: body.cancelUrl || "",
              }),
            });
            const charge = await cbRes.json();
            if (charge.error) throw new Error(`Coinbase: ${charge.error.message}`);
            processorResult = {
              processor: "coinbase", direction, status: "processing",
              chargeId: charge.data?.id, hostedUrl: charge.data?.hosted_url,
              expiresAt: charge.data?.expires_at,
            };
          } else {
            processorResult = {
              processor: "coinbase", direction: "offramp", status: "processing",
              message: "Coinbase offramp via regional rails.",
            };
          }
          break;
        }

        case "transak": {
          const transakKey = Deno.env.get("TRANSAK_API_KEY");
          if (!transakKey) {
            processorResult = {
              processor: "transak", direction, status: "not_configured",
              message: "Transak pending API key setup.",
            };
          } else {
            processorResult = {
              processor: "transak", direction, status: "ready",
              widgetConfig: {
                apiKey: transakKey, environment: "PRODUCTION",
                defaultFiatAmount: chargeAmount,
                defaultFiatCurrency: (currency || "USD").toUpperCase(),
                defaultCryptoCurrency: body.cryptoCurrency || "USDC",
                network: "polygon",
                walletAddress: body.receiverAddress || walletAddress || "",
                disableWalletAddressForm: true,
                partnerCustomerId: userId || "",
                partnerOrderId: transactionId || "",
              },
            };
          }
          break;
        }

        case "direct":
          processorResult = {
            processor: "direct", direction, status: "awaiting_onchain",
            chain: chain || "polygon",
            walletAddress: AZIX_WALLETS.transaction,
            supportedTokens: ["USDC", "USDT"],
            verifyEndpoint: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-crypto-payment`,
          };
          break;

        default:
          throw new Error(`Unknown processor: ${processor}`);
      }

      // Ensure pay seed token for authenticated users
      let seedTokenInfo = null;
      if (userId) {
        seedTokenInfo = await ensurePaySeedToken(supabase, userId);
      }

      // Build payment metadata with bank/mobile details
      const paymentMetadata: Record<string, unknown> = {};
      if (bankTransferDetails) paymentMetadata.bankTransferDetails = bankTransferDetails;
      if (mobileMoneyDetails) paymentMetadata.mobileMoneyDetails = mobileMoneyDetails;
      if (buyer_country) paymentMetadata.buyer_country = buyer_country;

      // Record payment
      const { data: payment, error } = await supabase
        .from("os_payments")
        .insert({
          user_id: userId,
          role: role || "buyer",
          action: `${processor}_${direction}`,
          service: service || `checkout_${direction}`,
          amount,
          fee: effectiveFee,
          total: effectiveTotal,
          method: processor,
          status: processorResult.status === "not_configured" ? "pending" : "processing",
          metadata: Object.keys(paymentMetadata).length > 0 ? paymentMetadata : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Store tax breakdown
      if (transactionId && taxBreakdown) {
        await supabase
          .from("transactions")
          .update({ tax_breakdown: taxBreakdown, updated_at: new Date().toISOString() })
          .eq("id", transactionId);
      }

      // Build smart contract calldata (OS Pay: no escrow deposit)
      const contractCalldata = buildLockFundsCalldata(
        transactionId || payment.id,
        amount,
        platformFeeCalc.fee,
        0, // processorFee handled off-chain
        "0x0000000000000000000000000000000000000000"
      );

      return new Response(
        JSON.stringify({
          success: true,
          payment,
          confirmationCode,
          processorResult,
          transactionId: transactionId || null,
          taxBreakdown: taxBreakdown ?? undefined,
          seedToken: seedTokenInfo ? { linked: true, wallet: "transaction" } : undefined,
          contractCalldata,
          feeBreakdown: {
            platformFee: platformFeeCalc.fee,
            platformRate: `${platformFeeCalc.rate}%`,
            feeType: platformFeeCalc.type,
            escrowDeposit: 0,
            destination: AZIX_WALLETS.transaction,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Route: OS Payment (plans, reports, AI, services) ─
    const paymentAction = action || "payment";
    const payMode = pay_mode || "local";

    // Ensure pay seed token
    let seedTokenInfo = null;
    if (userId) {
      seedTokenInfo = await ensurePaySeedToken(supabase, userId);
    }

    const { data: payment, error } = await supabase
      .from("os_payments")
      .insert({
        user_id: userId,
        role,
        action: paymentAction,
        service,
        amount: parseFloat(String(amount)),
        fee: parseFloat(String(effectiveFee)),
        total: parseFloat(String(effectiveTotal)),
        method,
        status: "completed",
        refund_email: refundEmail || null,
        refund_reason: refundReason || null,
        split_recipient: splitRecipient || null,
        split_percentage: splitPercentage ? parseInt(String(splitPercentage)) : null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        payment,
        confirmationCode,
        payMode,
        taxBreakdown: taxBreakdown ?? undefined,
        seedToken: seedTokenInfo ? { linked: true, wallet: "transaction" } : undefined,
        feeBreakdown: {
          platformFee: platformFeeCalc.fee,
          platformRate: `${platformFeeCalc.rate}%`,
          feeType: platformFeeCalc.type,
          escrowDeposit: 0,
          destination: AZIX_WALLETS.transaction,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("process-payment error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

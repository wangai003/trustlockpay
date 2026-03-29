import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ────────────────────────────────────────────────
interface ProcessPaymentRequest {
  action?: string;
  service?: string;
  amount: number;
  fee?: number;
  total?: number;
  method?: string;
  role?: string;
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
  // Tax fields
  buyer_country?: string;
  vendor_country?: string;
  item_category?: string;
  is_export?: boolean;
}

// ─── Tax Rate Fallbacks (used when DB lookup fails) ───────
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

// ─── Item category tariff multipliers ─────────────────────
const ITEM_TARIFF_MULTIPLIERS: Record<string, number> = {
  electronics: 1.2,
  commodities: 0.8,
  textiles: 1.5,
  machinery: 1.0,
  food: 0.5,
  chemicals: 1.3,
  automotive: 1.4,
  general: 1.0,
};

// ─── Helpers ──────────────────────────────────────────────
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Tax Calculation Engine ───────────────────────────────
interface TaxBreakdown {
  subtotal: number;
  tax_amount: number;
  tax_type: string;
  tax_rate: number;
  tariff_amount: number;
  tariff_rate: number;
  total_with_tax: number;
  is_domestic: boolean;
  is_same_bloc: boolean;
  is_export: boolean;
  buyer_country: string;
  vendor_country: string;
  item_category: string;
  notes: string;
}

async function calculateTax(
  supabase: ReturnType<typeof createClient>,
  amount: number,
  buyerCountry?: string,
  vendorCountry?: string,
  itemCategory?: string,
  isExport?: boolean
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
    .from("tax_rates")
    .select("*")
    .in("country_code", countries)
    .eq("is_active", true);

  const rateMap: Record<string, { rate: number; type: string; bloc: string | null; tariff: number }> = {};
  if (rates) {
    for (const r of rates) {
      rateMap[r.country_code] = {
        rate: Number(r.rate_percentage), type: r.tax_type,
        bloc: r.trade_bloc, tariff: Number(r.tariff_rate_percentage ?? 0),
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
      notes = `Intra-bloc (${buyerBloc}) transaction. Destination ${buyerRate.type} at ${taxRate}% applied to buyer country ${bCountry}.`;
    }
  } else if (isExportTx) {
    taxRate = 0; taxType = "VAT (Zero-Rated Export)"; taxAmount = 0;
    if (buyerRate && buyerRate.tariff > 0) {
      const multiplier = ITEM_TARIFF_MULTIPLIERS[category] ?? 1.0;
      tariffRate = round(buyerRate.tariff * multiplier);
      tariffAmount = round(amount * (tariffRate / 100));
      notes = `International export: VAT zero-rated. Import tariff of ${tariffRate}% applied (base ${buyerRate.tariff}% × ${category} multiplier ${multiplier}).`;
    } else {
      notes = `International export: VAT zero-rated. No tariff applicable for destination ${bCountry}.`;
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

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: ProcessPaymentRequest = await req.json();
    const {
      action, service, amount, fee, total, method, role,
      refundEmail, refundReason, splitRecipient, splitPercentage,
      processor, direction, currency, chain,
      walletAddress, receiverAddress, transactionId,
      buyer_country, vendor_country, item_category, is_export,
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

    const effectiveTotal = taxBreakdown
      ? round(taxBreakdown.total_with_tax + (fee ?? 0))
      : (total ?? amount);

    // ── Route: Processor-based checkout/payout ───────────
    if (processor && direction) {
      let processorResult: Record<string, unknown>;
      const chargeAmount = taxBreakdown ? taxBreakdown.total_with_tax : amount;

      switch (processor) {
        case "stripe": {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (!stripeKey) {
            processorResult = {
              processor: "stripe", direction,
              status: "not_configured",
              message: "Stripe integration pending API key setup. Configure STRIPE_SECRET_KEY to activate.",
            };
          } else if (direction === "onramp") {
            // Create Stripe Payment Intent
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
              processor: "stripe", direction,
              status: "processing",
              clientSecret: intent.client_secret,
              paymentIntentId: intent.id,
              message: "Stripe Payment Intent created. Complete payment on client.",
            };
          } else {
            // Off-ramp: Stripe payout (requires Connect account)
            processorResult = {
              processor: "stripe", direction: "offramp",
              status: "requires_connect",
              message: "Stripe payouts require a connected account. Set up via vendor onboarding.",
            };
          }
          break;
        }

        case "coinbase": {
          const cbKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
          if (!cbKey) {
            processorResult = {
              processor: "coinbase", direction,
              status: "not_configured",
              message: "Coinbase integration pending API key setup. Configure COINBASE_COMMERCE_API_KEY to activate.",
            };
          } else if (direction === "onramp") {
            // Create Coinbase Commerce Charge
            const cbRes = await fetch("https://api.commerce.coinbase.com/charges", {
              method: "POST",
              headers: {
                "X-CC-Api-Key": cbKey,
                "Content-Type": "application/json",
                "X-CC-Version": "2018-03-22",
              },
              body: JSON.stringify({
                name: `TrustLock Order${transactionId ? ` #${transactionId.slice(0, 8)}` : ""}`,
                description: service || "Escrow Payment",
                pricing_type: "fixed_price",
                local_price: {
                  amount: String(chargeAmount),
                  currency: (currency || "USD").toUpperCase(),
                },
                metadata: {
                  transaction_id: transactionId || "",
                  user_id: userId || "",
                  checkout_session_id: body.sessionId || "",
                },
                redirect_url: body.redirectUrl || "",
                cancel_url: body.cancelUrl || "",
              }),
            });
            const charge = await cbRes.json();
            if (charge.error) throw new Error(`Coinbase: ${charge.error.message}`);
            processorResult = {
              processor: "coinbase", direction,
              status: "processing",
              chargeId: charge.data?.id,
              hostedUrl: charge.data?.hosted_url,
              expiresAt: charge.data?.expires_at,
              message: "Coinbase Commerce charge created. Redirect buyer to hosted URL.",
            };
          } else {
            processorResult = {
              processor: "coinbase", direction: "offramp",
              status: "processing",
              message: "Coinbase offramp — funds will be converted via regional rails.",
            };
          }
          break;
        }

        case "transak": {
          const transakKey = Deno.env.get("TRANSAK_API_KEY");
          if (!transakKey) {
            processorResult = {
              processor: "transak", direction,
              status: "not_configured",
              message: "Transak integration pending API key setup. Configure TRANSAK_API_KEY to activate.",
            };
          } else {
            // Transak uses a client-side widget — we return the config
            processorResult = {
              processor: "transak", direction,
              status: "ready",
              widgetConfig: {
                apiKey: transakKey,
                environment: "PRODUCTION",
                defaultFiatAmount: chargeAmount,
                defaultFiatCurrency: (currency || "USD").toUpperCase(),
                defaultCryptoCurrency: body.cryptoCurrency || "USDC",
                network: "polygon",
                walletAddress: body.receiverAddress || walletAddress || "",
                disableWalletAddressForm: true,
                partnerCustomerId: userId || "",
                partnerOrderId: transactionId || "",
              },
              message: "Transak widget config ready. Initialize on client with this config.",
            };
          }
          break;
        }

        case "direct":
          processorResult = {
            processor: "direct", direction,
            status: "awaiting_onchain",
            message: "Direct on-chain transfer — verify via verify-crypto-payment function",
            chain: chain || "polygon",
            walletAddress: walletAddress || "0x7A3b1234567890abcdef1234567890abcdefF92d",
            supportedTokens: ["USDC", "USDT"],
            verifyEndpoint: `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-crypto-payment`,
          };
          break;

        default:
          throw new Error(`Unknown processor: ${processor}. Supported: stripe, coinbase, transak, direct.`);
      }

      // Record the payment attempt
      const { data: payment, error } = await supabase
        .from("os_payments")
        .insert({
          user_id: userId,
          role: role || "buyer",
          action: `${processor}_${direction}`,
          service: service || `checkout_${direction}`,
          amount,
          fee: fee || 0,
          total: effectiveTotal,
          method: processor,
          status: processorResult.status === "not_configured" ? "pending" : "processing",
        })
        .select()
        .single();

      if (error) throw error;

      // Store tax breakdown on the transaction if we have a transactionId
      if (transactionId && taxBreakdown) {
        await supabase
          .from("transactions")
          .update({ tax_breakdown: taxBreakdown, updated_at: new Date().toISOString() })
          .eq("id", transactionId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment,
          processorResult,
          transactionId: transactionId || null,
          taxBreakdown: taxBreakdown ?? undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Route: Legacy OS payment (plans, reports, AI) ────
    const paymentAction = action || "payment";

    const { data: payment, error } = await supabase
      .from("os_payments")
      .insert({
        user_id: userId,
        role,
        action: paymentAction,
        service,
        amount: parseFloat(String(amount)),
        fee: parseFloat(String(fee || "0")),
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
        taxBreakdown: taxBreakdown ?? undefined,
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

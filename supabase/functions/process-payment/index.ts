import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Processor API base URLs ──────────────────────────────
const THIRDWEB_API = "https://pay.thirdweb.com";

// ─── Types ────────────────────────────────────────────────
interface ProcessPaymentRequest {
  // Legacy OS payment fields
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
  // Checkout/payout processor fields
  processor?: "stripe" | "coinbase" | "yellow_card" | "transak" | "thirdweb" | "direct";
  direction?: "onramp" | "offramp";
  currency?: string;           // fiat currency code (USD, NGN, KES, etc.)
  cryptoCurrency?: string;     // crypto asset (USDC, USDT, etc.)
  chain?: string;              // blockchain network (polygon, base, ethereum)
  walletAddress?: string;      // destination wallet for on-ramp
  buyerEmail?: string;         // buyer email for processor KYC
  transactionId?: string;      // TrustLock transaction ID for linking
}

// ─── Thirdweb Pay: create a Buy-with-Fiat intent ──────────
async function thirdwebOnRamp(params: {
  amount: number;
  currency: string;
  cryptoCurrency: string;
  chain: string;
  walletAddress: string;
  buyerEmail?: string;
}): Promise<Record<string, unknown>> {
  const THIRDWEB_API_KEY = Deno.env.get("THIRDWEB_API_KEY");
  if (!THIRDWEB_API_KEY) {
    throw new Error("THIRDWEB_API_KEY is not configured");
  }

  // Step 1: Get a quote
  const quoteUrl = new URL(`${THIRDWEB_API}/buy-with-fiat/quote`);
  quoteUrl.searchParams.set("fromCurrencySymbol", params.currency);
  quoteUrl.searchParams.set("fromAmount", params.amount.toString());
  quoteUrl.searchParams.set("toAddress", params.walletAddress);
  quoteUrl.searchParams.set("toChainId", chainToId(params.chain));
  quoteUrl.searchParams.set("toTokenAddress", getUsdcAddress(params.chain));
  quoteUrl.searchParams.set("maxSlippageBPS", "100"); // 1% max slippage

  const quoteRes = await fetch(quoteUrl.toString(), {
    headers: {
      "x-client-id": THIRDWEB_API_KEY,
    },
  });
  const quoteBody = await quoteRes.text();
  if (!quoteRes.ok) {
    throw new Error(`Thirdweb quote failed [${quoteRes.status}]: ${quoteBody}`);
  }

  const quoteData = JSON.parse(quoteBody);

  // Step 2: Create the on-ramp session using the intent ID from the quote
  const intentId = quoteData?.result?.intentId;
  if (!intentId) {
    // Quote response contains the onRampLink directly in some API versions
    return {
      processor: "thirdweb",
      direction: "onramp",
      status: "quote_ready",
      quote: quoteData?.result,
    };
  }

  return {
    processor: "thirdweb",
    direction: "onramp",
    status: "intent_created",
    intentId,
    quote: quoteData?.result,
  };
}

// ─── Thirdweb Pay: create a Sell (off-ramp) intent ────────
async function thirdwebOffRamp(params: {
  amount: number;
  currency: string;
  cryptoCurrency: string;
  chain: string;
  walletAddress: string;
  buyerEmail?: string;
}): Promise<Record<string, unknown>> {
  const THIRDWEB_API_KEY = Deno.env.get("THIRDWEB_API_KEY");
  if (!THIRDWEB_API_KEY) {
    throw new Error("THIRDWEB_API_KEY is not configured");
  }

  // Get a sell quote (crypto → fiat)
  const quoteUrl = new URL(`${THIRDWEB_API}/buy-with-crypto/quote`);
  quoteUrl.searchParams.set("fromAddress", params.walletAddress);
  quoteUrl.searchParams.set("fromChainId", chainToId(params.chain));
  quoteUrl.searchParams.set("fromTokenAddress", getUsdcAddress(params.chain));
  quoteUrl.searchParams.set("fromAmount", params.amount.toString());
  quoteUrl.searchParams.set("toCurrencySymbol", params.currency);

  const quoteRes = await fetch(quoteUrl.toString(), {
    headers: {
      "x-client-id": THIRDWEB_API_KEY,
    },
  });
  const quoteBody = await quoteRes.text();
  if (!quoteRes.ok) {
    throw new Error(`Thirdweb off-ramp quote failed [${quoteRes.status}]: ${quoteBody}`);
  }

  const quoteData = JSON.parse(quoteBody);

  return {
    processor: "thirdweb",
    direction: "offramp",
    status: "quote_ready",
    quote: quoteData?.result,
  };
}

// ─── Helpers ──────────────────────────────────────────────
function chainToId(chain: string): string {
  const map: Record<string, string> = {
    polygon: "137",
    ethereum: "1",
    base: "8453",
    arbitrum: "42161",
    optimism: "10",
  };
  return map[chain?.toLowerCase()] || "137"; // default Polygon
}

function getUsdcAddress(chain: string): string {
  const map: Record<string, string> = {
    polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  };
  return map[chain?.toLowerCase()] || map.polygon;
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
      action,
      service,
      amount,
      fee,
      total,
      method,
      role,
      refundEmail,
      refundReason,
      splitRecipient,
      splitPercentage,
      processor,
      direction,
      currency,
      cryptoCurrency,
      chain,
      walletAddress,
      buyerEmail,
      transactionId,
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

    // ── Route: Processor-based checkout/payout ───────────
    if (processor && direction) {
      let processorResult: Record<string, unknown>;

      switch (processor) {
        case "thirdweb": {
          if (direction === "onramp") {
            processorResult = await thirdwebOnRamp({
              amount: amount,
              currency: currency || "USD",
              cryptoCurrency: cryptoCurrency || "USDC",
              chain: chain || "polygon",
              walletAddress: walletAddress || "",
              buyerEmail,
            });
          } else {
            processorResult = await thirdwebOffRamp({
              amount: amount,
              currency: currency || "USD",
              cryptoCurrency: cryptoCurrency || "USDC",
              chain: chain || "polygon",
              walletAddress: walletAddress || "",
              buyerEmail,
            });
          }
          break;
        }

        case "stripe": {
          // TODO: Wire Stripe Payment Intents when STRIPE_SECRET_KEY is configured
          processorResult = {
            processor: "stripe",
            direction,
            status: "not_configured",
            message: "Stripe integration pending API key setup",
          };
          break;
        }

        case "coinbase": {
          // TODO: Wire Coinbase Commerce when COINBASE_API_KEY is configured
          processorResult = {
            processor: "coinbase",
            direction,
            status: "not_configured",
            message: "Coinbase integration pending API key setup",
          };
          break;
        }

        case "yellow_card": {
          // TODO: Wire Yellow Card when YELLOW_CARD_API_KEY is configured
          processorResult = {
            processor: "yellow_card",
            direction,
            status: "not_configured",
            message: "Yellow Card integration pending API key setup",
          };
          break;
        }

        case "transak": {
          // TODO: Wire Transak when TRANSAK_API_KEY is configured
          processorResult = {
            processor: "transak",
            direction,
            status: "not_configured",
            message: "Transak integration pending API key setup",
          };
          break;
        }

        case "direct": {
          processorResult = {
            processor: "direct",
            direction,
            status: "awaiting_onchain",
            message: "Direct on-chain transfer — no processor involved",
            chain: chain || "polygon",
            walletAddress,
          };
          break;
        }

        default:
          throw new Error(`Unknown processor: ${processor}`);
      }

      // Record the processor interaction
      const { data: payment, error } = await supabase
        .from("os_payments")
        .insert({
          user_id: userId,
          role: role || "buyer",
          action: `${processor}_${direction}`,
          service: service || `checkout_${direction}`,
          amount: amount,
          fee: fee || 0,
          total: total || amount,
          method: processor,
          status: processorResult.status === "not_configured" ? "pending" : "processing",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          payment,
          processorResult,
          transactionId: transactionId || null,
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
        total: parseFloat(String(total || amount)),
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
      JSON.stringify({ success: true, payment }),
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

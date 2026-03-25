import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Thirdweb Payments API (v1) ───────────────────────────
const THIRDWEB_API = "https://api.thirdweb.com/v1";

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
  currency?: string;
  cryptoCurrency?: string;
  chain?: string;
  walletAddress?: string;
  receiverAddress?: string;
  buyerEmail?: string;
  transactionId?: string;
}

// ─── Helpers ──────────────────────────────────────────────
function chainToId(chain: string): number {
  const map: Record<string, number> = {
    polygon: 137,
    ethereum: 1,
    base: 8453,
    arbitrum: 42161,
    optimism: 10,
  };
  return map[chain?.toLowerCase()] || 137;
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

function getThirdwebKey(): string {
  const key = Deno.env.get("THIRDWEB_API_KEY");
  if (!key) throw new Error("THIRDWEB_API_KEY is not configured");
  return key;
}

// ─── Thirdweb: Create a payment intent (on-ramp) ─────────
// Uses the unified Payments API: POST /v1/payments
// Buyer pays fiat → receives USDC in escrow wallet
async function thirdwebOnRamp(params: {
  amount: number;
  currency: string;
  chain: string;
  receiverAddress: string;
}): Promise<Record<string, unknown>> {
  const secretKey = getThirdwebKey();
  const chainId = chainToId(params.chain);
  const tokenAddress = getUsdcAddress(params.chain);

  const res = await fetch(`${THIRDWEB_API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": secretKey,
    },
    body: JSON.stringify({
      name: "TrustLock Escrow Payment",
      description: "Fiat on-ramp to USDC escrow via TrustLock Pay",
      recipient: params.receiverAddress,
      token: {
        tokenAddress,
        chainId,
      },
      amount: params.amount.toString(),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Thirdweb on-ramp failed [${res.status}]: ${body}`);
  }

  const data = JSON.parse(body);
  return {
    processor: "thirdweb",
    direction: "onramp",
    status: "payment_created",
    paymentId: data?.id,
    paymentLink: data?.paymentLink || data?.checkoutLink,
    data: data,
  };
}

// ─── Thirdweb: Swap/bridge for off-ramp ──────────────────
// Uses POST /v1/payments/swap to convert crypto → bridged token
// Off-ramp to fiat requires Thirdweb dashboard webhook setup
async function thirdwebOffRamp(params: {
  amount: number;
  currency: string;
  chain: string;
  walletAddress: string;
}): Promise<Record<string, unknown>> {
  const secretKey = getThirdwebKey();
  const chainId = chainToId(params.chain);
  const tokenAddress = getUsdcAddress(params.chain);

  // For off-ramp, we create a swap from USDC to the target
  // The actual fiat disbursement is handled by Thirdweb's off-ramp partner
  const res = await fetch(`${THIRDWEB_API}/payments/swap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-secret-key": secretKey,
    },
    body: JSON.stringify({
      from: params.walletAddress,
      exact: "input",
      fromToken: {
        chainId,
        tokenAddress,
      },
      toToken: {
        chainId,
        tokenAddress, // Same token for now; off-ramp partner handles fiat conversion
      },
      amount: params.amount.toString(),
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Thirdweb off-ramp failed [${res.status}]: ${body}`);
  }

  const data = JSON.parse(body);
  return {
    processor: "thirdweb",
    direction: "offramp",
    status: "swap_created",
    swapId: data?.id,
    steps: data?.steps,
    data: data,
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
              amount,
              currency: currency || "USD",
              chain: chain || "polygon",
              receiverAddress: receiverAddress || walletAddress || "",
            });
          } else {
            processorResult = await thirdwebOffRamp({
              amount,
              currency: currency || "USD",
              chain: chain || "polygon",
              walletAddress: walletAddress || "",
            });
          }
          break;
        }

        case "stripe":
          processorResult = {
            processor: "stripe", direction,
            status: "not_configured",
            message: "Stripe integration pending API key setup",
          };
          break;

        case "coinbase":
          processorResult = {
            processor: "coinbase", direction,
            status: "not_configured",
            message: "Coinbase integration pending API key setup",
          };
          break;

        case "yellow_card":
          processorResult = {
            processor: "yellow_card", direction,
            status: "not_configured",
            message: "Yellow Card integration pending API key setup",
          };
          break;

        case "transak":
          processorResult = {
            processor: "transak", direction,
            status: "not_configured",
            message: "Transak integration pending API key setup",
          };
          break;

        case "direct":
          processorResult = {
            processor: "direct", direction,
            status: "awaiting_onchain",
            message: "Direct on-chain transfer — no processor involved",
            chain: chain || "polygon",
            walletAddress,
          };
          break;

        default:
          throw new Error(`Unknown processor: ${processor}`);
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
          total: total || amount,
          method: processor,
          status: processorResult.status === "not_configured" ? "pending" : "processing",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, payment, processorResult, transactionId: transactionId || null }),
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

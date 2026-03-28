import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ────────────────────────────────────────────────
type PaymentMethod = "card" | "bank_transfer" | "mobile_money" | "crypto";

interface ProcessorInfo {
  processorId: string;
  processorName: string;
  feeRate: number;
  supportsFiat: boolean;
  supportsCrypto: boolean;
  onRamp: boolean;
  offRamp: boolean;
  supportedMethods: PaymentMethod[];
}

// ─── Processor Registry (3 active + direct) ──────────────
const PROCESSORS: Record<string, ProcessorInfo> = {
  stripe: {
    processorId: "stripe",
    processorName: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    onRamp: true,
    offRamp: false,
    supportedMethods: ["card", "bank_transfer"],
  },
  coinbase: {
    processorId: "coinbase",
    processorName: "Coinbase",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
    supportedMethods: ["card", "bank_transfer", "mobile_money", "crypto"],
  },
  transak: {
    processorId: "transak",
    processorName: "Transak",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
    supportedMethods: ["card", "bank_transfer", "mobile_money", "crypto"],
  },
  direct: {
    processorId: "direct",
    processorName: "Direct (On-chain)",
    feeRate: 0,
    supportsFiat: false,
    supportsCrypto: true,
    onRamp: false,
    offRamp: false,
    supportedMethods: ["crypto"],
  },
};

// ─── Region Coverage ──────────────────────────────────────
const PROCESSOR_REGIONS: Record<string, string[]> = {
  stripe: ["US", "EU", "UK", "CA", "AU", "JP", "SG", "HK", "NZ", "global"],
  coinbase: [
    "US", "EU", "UK",
    "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
    "Uganda", "Tanzania", "Rwanda",
  ],
  transak: [
    "US", "EU", "UK", "IN", "BR", "MX",
    "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt",
    "global",
  ],
  direct: ["global"],
};

// Country name → code mapping for payout field lookups
const COUNTRY_CODE_MAP: Record<string, string> = {
  "Nigeria": "NG", "Kenya": "KE", "Ghana": "GH", "South Africa": "ZA",
  "United States": "US", "United Kingdom": "GB", "Germany": "DE",
  "France": "FR", "Italy": "IT", "Spain": "ES", "Netherlands": "NL",
  "United Arab Emirates": "AE", "Egypt": "EG", "Uganda": "UG",
  "Tanzania": "TZ", "Rwanda": "RW", "Cameroon": "CM",
  "US": "US", "UK": "GB", "EU": "EU", "UAE": "AE",
  "NG": "NG", "KE": "KE", "GH": "GH", "ZA": "ZA",
  "GB": "GB", "DE": "DE", "FR": "FR", "AE": "AE",
};

// TrustLock platform fee rates by transaction type
const TRUSTLOCK_RATES: Record<string, number> = {
  checkout_fiat: 1.5,
  checkout_crypto: 1.0,
  release_to_vendor: 0,
  refund_crypto: 0,
  refund_fiat: 0,
  split_payout: 0,
  os_payment: 1.5,
};

// ─── Helpers ──────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Cost-Optimized Processor Selection ───────────────────
interface ProcessorCandidate {
  processor: ProcessorInfo;
  combinedRate: number;
  eligible: boolean;
}

function getEligibleProcessors(
  country: string,
  paymentMethod: PaymentMethod,
  transactionType: string,
): ProcessorCandidate[] {
  const trustlockRate = TRUSTLOCK_RATES[transactionType] ?? 1.5;
  const candidates: ProcessorCandidate[] = [];

  for (const [id, proc] of Object.entries(PROCESSORS)) {
    // Skip direct for non-crypto
    if (id === "direct" && paymentMethod !== "crypto") continue;
    // Skip non-crypto processors for crypto method
    if (paymentMethod === "crypto" && !proc.supportsCrypto) continue;
    // Check payment method support
    if (!proc.supportedMethods.includes(paymentMethod)) continue;
    // Check region
    const regions = PROCESSOR_REGIONS[id] ?? [];
    const regionMatch = regions.includes(country) || regions.includes("global");
    if (!regionMatch) continue;

    candidates.push({
      processor: proc,
      combinedRate: trustlockRate + proc.feeRate,
      eligible: true,
    });
  }

  // Sort by combined rate ascending (cheapest first)
  candidates.sort((a, b) => a.combinedRate - b.combinedRate);
  return candidates;
}

function selectProcessor(
  country: string,
  isCrypto: boolean,
  processorHint?: string,
  paymentMethod?: PaymentMethod,
  transactionType?: string,
): ProcessorInfo & { allEligible?: ProcessorCandidate[] } {
  if (processorHint && PROCESSORS[processorHint]) {
    return PROCESSORS[processorHint];
  }
  if (isCrypto) return PROCESSORS.direct;

  const method = paymentMethod ?? "card";
  const txType = transactionType ?? "checkout_fiat";
  const eligible = getEligibleProcessors(country, method, txType);

  if (eligible.length > 0) {
    return {
      ...eligible[0].processor,
      allEligible: eligible,
    };
  }

  // Ultimate fallback
  return PROCESSORS.stripe;
}

// ─── Get Payout Fields ────────────────────────────────────
async function getPayoutFields(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { country_code, country, payout_method } = body;

  let code = country_code
    ? String(country_code).toUpperCase()
    : COUNTRY_CODE_MAP[String(country ?? "")] ?? String(country ?? "").toUpperCase();

  if (!code) return errorResponse("country_code or country is required", 400);

  let query = supabase
    .from("payout_field_configs")
    .select("*")
    .eq("is_active", true);

  if (payout_method) {
    query = query.eq("country_code", code).eq("payout_method", String(payout_method));
  } else {
    query = query.or(`country_code.eq.${code},country_code.eq.GLOBAL`);
  }

  const { data: configs, error } = await query.order("payout_method");

  if (error) return errorResponse(error.message, 500);

  if ((!configs || configs.length === 0) && !payout_method) {
    const { data: euConfigs } = await supabase
      .from("payout_field_configs")
      .select("*")
      .or("country_code.eq.EU,country_code.eq.GLOBAL")
      .eq("is_active", true);

    if (euConfigs && euConfigs.length > 0) {
      return jsonResponse({
        success: true,
        country_code: code,
        configs: euConfigs,
        count: euConfigs.length,
        fallback: "EU",
      });
    }
  }

  const grouped: Record<string, unknown[]> = {};
  for (const cfg of configs ?? []) {
    const method = cfg.payout_method;
    if (!grouped[method]) grouped[method] = [];
    grouped[method].push(cfg);
  }

  return jsonResponse({
    success: true,
    country_code: code,
    configs: configs ?? [],
    grouped,
    count: configs?.length ?? 0,
    available_methods: Object.keys(grouped),
  });
}

// ─── Main Handler ─────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "get_payout_fields") {
      return await getPayoutFields(body);
    }

    // Cost-optimized processor selection
    const { country, isCrypto, processorHint, paymentMethod, transactionType } = body;
    const result = selectProcessor(
      country ?? "",
      isCrypto ?? false,
      processorHint,
      paymentMethod,
      transactionType,
    );

    return jsonResponse(result);
  } catch {
    return errorResponse("Invalid request body", 400);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessorInfo {
  processorId: string;
  processorName: string;
  feeRate: number;
  supportsFiat: boolean;
  supportsCrypto: boolean;
  onRamp: boolean;
  offRamp: boolean;
}

const PROCESSORS: Record<string, ProcessorInfo> = {
  stripe: {
    processorId: "stripe",
    processorName: "Stripe",
    feeRate: 2.9,
    supportsFiat: true,
    supportsCrypto: false,
    onRamp: true,
    offRamp: false,
  },
  coinbase: {
    processorId: "coinbase",
    processorName: "Coinbase",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
  },
  yellow_card: {
    processorId: "yellow_card",
    processorName: "Yellow Card",
    feeRate: 2.0,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
  },
  transak: {
    processorId: "transak",
    processorName: "Transak",
    feeRate: 1.5,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
  },
  thirdweb: {
    processorId: "thirdweb",
    processorName: "Thirdweb",
    feeRate: 1.0,
    supportsFiat: true,
    supportsCrypto: true,
    onRamp: true,
    offRamp: true,
  },
  direct: {
    processorId: "direct",
    processorName: "Direct (On-chain)",
    feeRate: 0,
    supportsFiat: false,
    supportsCrypto: true,
    onRamp: false,
    offRamp: false,
  },
};

const AFRICAN_COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "Cameroon", "Egypt",
  "Senegal", "Mali", "Cote d'Ivoire", "Burkina Faso", "Benin", "Togo",
  "DR Congo", "Uganda", "Tanzania", "Rwanda", "Mozambique", "Malawi",
  "Niger", "Chad", "Guinea", "Madagascar", "Botswana", "Gambia", "Zambia",
];

const COINBASE_REGIONS = ["US", "EU", "UK", "Nigeria", "Kenya", "Ghana", "South Africa"];

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

// ─── Select Processor (original logic) ────────────────────
function selectProcessor(country: string, isCrypto: boolean, processorHint?: string): ProcessorInfo {
  if (processorHint && PROCESSORS[processorHint]) {
    return PROCESSORS[processorHint];
  }
  if (isCrypto) return PROCESSORS.direct;
  if (AFRICAN_COUNTRIES.includes(country)) return PROCESSORS.yellow_card;
  if (COINBASE_REGIONS.includes(country)) return PROCESSORS.coinbase;
  return PROCESSORS.stripe;
}

// ─── Get Payout Fields ────────────────────────────────────
async function getPayoutFields(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { country_code, country, payout_method } = body;

  // Resolve country code
  let code = country_code
    ? String(country_code).toUpperCase()
    : COUNTRY_CODE_MAP[String(country ?? "")] ?? String(country ?? "").toUpperCase();

  if (!code) return errorResponse("country_code or country is required", 400);

  // Build query
  let query = supabase
    .from("payout_field_configs")
    .select("*")
    .eq("is_active", true);

  if (payout_method) {
    query = query.eq("country_code", code).eq("payout_method", String(payout_method));
  } else {
    // Return all methods for this country + universal crypto
    query = query.or(`country_code.eq.${code},country_code.eq.GLOBAL`);
  }

  const { data: configs, error } = await query.order("payout_method");

  if (error) return errorResponse(error.message, 500);

  // If no country-specific configs found, check if EU applies
  if ((!configs || configs.length === 0) && !payout_method) {
    // Check for EU fallback (any European country without specific config)
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

  // Group by payout method
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

    // New action: get_payout_fields
    if (action === "get_payout_fields") {
      return await getPayoutFields(body);
    }

    // Original processor selection (default action)
    const { country, isCrypto, processorHint } = body;
    const processor = selectProcessor(country ?? "", isCrypto ?? false, processorHint);

    return jsonResponse(processor);
  } catch {
    return errorResponse("Invalid request body", 400);
  }
});

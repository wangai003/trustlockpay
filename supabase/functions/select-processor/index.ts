import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Types ────────────────────────────────────────────────
type PaymentMethod = "card" | "bank_transfer" | "mobile_money" | "crypto";
type KycTier = "none" | "basic" | "intermediate" | "full";

interface ProcessorLimits {
  minPerTx: number;
  maxPerTx: Record<KycTier, number>;
  dailyLimit: Record<KycTier, number>;
  monthlyLimit: Record<KycTier, number>;
  maxDailyTxCount: number;
}

interface ProcessorInfo {
  processorId: string;
  processorName: string;
  feeRate: number;
  supportsFiat: boolean;
  supportsCrypto: boolean;
  onRamp: boolean;
  offRamp: boolean;
  supportedMethods: PaymentMethod[];
  limits: ProcessorLimits;
  regions: string[];
}

// ─── ISO Region Resolver ──────────────────────────────────
const EU_MEMBERS = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU",
  "IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
];

function regionMatchFn(regions: string[], country: string): boolean {
  if (regions.includes("global")) return true;
  for (const r of regions) {
    if (r === "EU") {
      if (EU_MEMBERS.includes(country)) return true;
    } else if (r === country) {
      return true;
    }
  }
  return false;
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
    limits: {
      minPerTx: 0.50,
      maxPerTx:    { none: 500, basic: 10_000, intermediate: 250_000, full: 999_999 },
      dailyLimit:  { none: 2_000, basic: 50_000, intermediate: 500_000, full: 2_000_000 },
      monthlyLimit:{ none: 10_000, basic: 250_000, intermediate: 2_000_000, full: 10_000_000 },
      maxDailyTxCount: 200,
    },
    regions: [
      "US", "CA", "AU", "NZ", "JP", "SG", "HK", "GB", "MY", "TH",
      "IN", "BR", "MX", "AE", "CN",
      "EU",
    ],
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
    limits: {
      minPerTx: 1.00,
      maxPerTx:    { none: 300, basic: 7_500, intermediate: 50_000, full: 250_000 },
      dailyLimit:  { none: 500, basic: 25_000, intermediate: 100_000, full: 500_000 },
      monthlyLimit:{ none: 5_000, basic: 100_000, intermediate: 500_000, full: 2_500_000 },
      maxDailyTxCount: 100,
    },
    regions: [
      "US", "GB",
      "EU",
      "NG", "KE", "GH", "ZA", "CM", "EG", "UG", "TZ", "RW",
      "BR", "MX", "AR", "CO", "CL",
      "SG", "AU", "JP", "IN",
    ],
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
    limits: {
      minPerTx: 1.00,
      maxPerTx:    { none: 100, basic: 500, intermediate: 15_000, full: 50_000 },
      dailyLimit:  { none: 100, basic: 1_500, intermediate: 25_000, full: 100_000 },
      monthlyLimit:{ none: 1_000, basic: 10_000, intermediate: 100_000, full: 500_000 },
      maxDailyTxCount: 50,
    },
    regions: [
      "US", "GB", "IN", "BR", "MX",
      "EU",
      "NG", "KE", "GH", "ZA", "EG", "SN", "CI", "TZ", "UG", "RW",
      "CM", "ET", "MA", "TN", "DZ",
      "AE", "SA", "QA", "KW", "BH", "OM",
      "SG", "MY", "TH", "ID", "PH", "VN", "KR", "JP", "AU", "NZ",
      "AR", "CO", "CL", "PE",
      "TR", "IL", "CN",
      "global",
    ],
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
    limits: {
      minPerTx: 0.01,
      maxPerTx:    { none: 50_000, basic: 250_000, intermediate: 1_000_000, full: 10_000_000 },
      dailyLimit:  { none: 100_000, basic: 500_000, intermediate: 5_000_000, full: 50_000_000 },
      monthlyLimit:{ none: 500_000, basic: 2_500_000, intermediate: 25_000_000, full: 100_000_000 },
      maxDailyTxCount: 500,
    },
    regions: ["global"],
  },
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
    if (id === "direct" && paymentMethod !== "crypto") continue;
    if (paymentMethod === "crypto" && !proc.supportsCrypto) continue;
    if (!proc.supportedMethods.includes(paymentMethod)) continue;
    if (!regionMatchFn(proc.regions, country)) continue;

    candidates.push({
      processor: proc,
      combinedRate: trustlockRate + proc.feeRate,
      eligible: true,
    });
  }

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

// ─── Limit Check (server-side authoritative) ─────────────
async function checkLimits(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { user_id, amount, processor_id, kyc_tier } = body;

  if (!user_id || !amount || !processor_id) {
    return errorResponse("user_id, amount, and processor_id are required");
  }

  const parsedAmount = parseFloat(String(amount));
  const procId = String(processor_id);
  const tier = (String(kyc_tier || "basic")) as KycTier;
  const proc = PROCESSORS[procId];

  if (!proc) return errorResponse(`Unknown processor: ${procId}`);

  const limits = proc.limits;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [dailyResult, monthlyResult] = await Promise.all([
    supabase
      .from("os_payments")
      .select("amount")
      .eq("user_id", String(user_id))
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("os_payments")
      .select("amount")
      .eq("user_id", String(user_id))
      .gte("created_at", monthStart.toISOString()),
  ]);

  const dailyVolume = (dailyResult.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const dailyCount = (dailyResult.data || []).length;
  const monthlyVolume = (monthlyResult.data || []).reduce((s, r) => s + (r.amount || 0), 0);

  const errors: string[] = [];

  if (parsedAmount < limits.minPerTx) {
    errors.push(`Minimum transaction: $${limits.minPerTx.toFixed(2)}`);
  }
  if (parsedAmount > limits.maxPerTx[tier]) {
    errors.push(`Max per transaction ($${tier} tier): $${limits.maxPerTx[tier].toLocaleString()}`);
  }
  if (dailyVolume + parsedAmount > limits.dailyLimit[tier]) {
    errors.push(`Daily limit ($${limits.dailyLimit[tier].toLocaleString()}) would be exceeded (used: $${dailyVolume.toLocaleString()})`);
  }
  if (monthlyVolume + parsedAmount > limits.monthlyLimit[tier]) {
    errors.push(`Monthly limit ($${limits.monthlyLimit[tier].toLocaleString()}) would be exceeded (used: $${monthlyVolume.toLocaleString()})`);
  }
  if (dailyCount >= limits.maxDailyTxCount) {
    errors.push(`Daily transaction count limit (${limits.maxDailyTxCount}) reached`);
  }

  return jsonResponse({
    success: true,
    allowed: errors.length === 0,
    errors,
    usage: { dailyVolume, monthlyVolume, dailyCount },
    limits: {
      minPerTx: limits.minPerTx,
      maxPerTx: limits.maxPerTx[tier],
      dailyLimit: limits.dailyLimit[tier],
      monthlyLimit: limits.monthlyLimit[tier],
      maxDailyTxCount: limits.maxDailyTxCount,
    },
    tier,
    processor: proc.processorName,
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

    if (action === "check_limits") {
      return await checkLimits(body);
    }

    const { country, isCrypto, processorHint, paymentMethod, transactionType, kyc_tier } = body;
    const result = selectProcessor(
      country ?? "",
      isCrypto ?? false,
      processorHint,
      paymentMethod,
      transactionType,
    );

    const tier = (String(kyc_tier || "basic")) as KycTier;
    const procLimits = (result as ProcessorInfo).limits;

    return jsonResponse({
      ...result,
      limits: procLimits ? {
        minPerTx: procLimits.minPerTx,
        maxPerTx: procLimits.maxPerTx[tier],
        dailyLimit: procLimits.dailyLimit[tier],
        monthlyLimit: procLimits.monthlyLimit[tier],
        maxDailyTxCount: procLimits.maxDailyTxCount,
      } : undefined,
      tier,
    });
  } catch {
    return errorResponse("Invalid request body", 400);
  }
});

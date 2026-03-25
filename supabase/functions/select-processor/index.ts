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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { country, isCrypto, processorHint } = await req.json();

    let selected: string;

    if (processorHint && PROCESSORS[processorHint]) {
      selected = processorHint;
    } else if (isCrypto) {
      selected = "direct";
    } else if (AFRICAN_COUNTRIES.includes(country)) {
      selected = "yellow_card";
    } else if (COINBASE_REGIONS.includes(country)) {
      selected = "coinbase";
    } else {
      selected = "stripe";
    }

    return new Response(JSON.stringify(PROCESSORS[selected]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

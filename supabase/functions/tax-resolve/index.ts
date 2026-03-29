import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Trade Bloc Definitions ──────────────────────────────
const TRADE_BLOCS: Record<string, { name: string; members: string[]; tariffReduction: number }> = {
  ECOWAS: {
    name: "Economic Community of West African States",
    members: ["NG", "GH", "SN", "CI", "BF", "ML", "NE", "BJ", "TG", "SL", "LR", "GW", "GM", "CV"],
    tariffReduction: 1.0, // 100% reduction for ECOWAS CET
  },
  EAC: {
    name: "East African Community",
    members: ["KE", "TZ", "UG", "RW", "BI", "SS", "CD"],
    tariffReduction: 1.0,
  },
  SACU: {
    name: "Southern African Customs Union",
    members: ["ZA", "BW", "LS", "SZ", "NA"],
    tariffReduction: 1.0,
  },
  SADC: {
    name: "Southern African Development Community",
    members: ["ZA", "BW", "LS", "SZ", "NA", "MZ", "ZW", "MW", "ZM", "TZ", "MG", "MU", "AO", "CD"],
    tariffReduction: 0.85,
  },
  AfCFTA: {
    name: "African Continental Free Trade Area",
    members: [], // All African countries — handled by continent check
    tariffReduction: 0.9,
  },
  EU: {
    name: "European Union",
    members: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE", "FI", "DK", "SE", "PL", "HU", "CZ", "RO", "BG", "HR", "SK", "SI", "LT", "LV", "EE", "LU", "MT", "CY", "GR"],
    tariffReduction: 1.0,
  },
  USMCA: {
    name: "United States-Mexico-Canada Agreement",
    members: ["US", "CA", "MX"],
    tariffReduction: 1.0,
  },
  GCC: {
    name: "Gulf Cooperation Council",
    members: ["AE", "SA", "QA", "KW", "BH", "OM"],
    tariffReduction: 1.0,
  },
  MERCOSUR: {
    name: "Southern Common Market",
    members: ["BR", "AR", "UY", "PY"],
    tariffReduction: 0.9,
  },
};

// ─── Item Category Tariff Multipliers ────────────────────
const ITEM_TARIFF_MULTIPLIERS: Record<string, number> = {
  electronics: 1.2,
  commodities: 0.8,
  textiles: 1.5,
  machinery: 1.0,
  food: 0.5,
  food_agriculture: 0.5,
  chemicals: 1.3,
  automotive: 1.4,
  pharmaceuticals: 0.6,
  energy_oil_gas: 1.3,
  general: 1.0,
};

// ─── African Countries (for AfCFTA detection) ────────────
const AFRICAN_COUNTRIES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CG", "CD",
  "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE",
  "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG",
  "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD", "TZ", "TG", "TN", "UG",
  "ZM", "ZW",
]);

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Resolve shared trade bloc ───────────────────────────
function findSharedBloc(buyerCountry: string, vendorCountry: string): { bloc: string; reduction: number } | null {
  // Check AfCFTA first (broadest)
  const bothAfrican = AFRICAN_COUNTRIES.has(buyerCountry) && AFRICAN_COUNTRIES.has(vendorCountry);

  // Check specific blocs first (they have higher reductions)
  for (const [blocId, bloc] of Object.entries(TRADE_BLOCS)) {
    if (blocId === "AfCFTA") continue;
    if (bloc.members.includes(buyerCountry) && bloc.members.includes(vendorCountry)) {
      return { bloc: blocId, reduction: bloc.tariffReduction };
    }
  }

  // Fall back to AfCFTA if both African
  if (bothAfrican) {
    return { bloc: "AfCFTA", reduction: TRADE_BLOCS.AfCFTA.tariffReduction };
  }

  return null;
}

// ─── Main Tax Resolution ─────────────────────────────────
interface TaxResolveRequest {
  buyer_country: string;
  vendor_country: string;
  amount: number;
  industry?: string;
  item_category?: string;
}

interface ResolvedTaxItem {
  id: string;
  label: string;
  type: "percentage" | "fixed";
  value: number;
  amount: number;
  source: "auto";
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: TaxResolveRequest = await req.json();
    const { buyer_country, vendor_country, amount, industry, item_category } = body;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Amount must be positive" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bCountry = (buyer_country ?? "").toUpperCase().trim();
    const vCountry = (vendor_country ?? "").toUpperCase().trim();
    const category = (item_category ?? industry ?? "general").toLowerCase();

    if (!bCountry && !vCountry) {
      return new Response(JSON.stringify({
        items: [],
        summary: { total_tax: 0, is_domestic: false, is_cross_border: false, bloc: null, de_minimis_applied: false },
        notes: "No country information provided — no taxes auto-applied.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch tax rates for both countries
    const countries = [bCountry, vCountry].filter(Boolean);
    const { data: rates } = await supabase
      .from("tax_rates")
      .select("*")
      .in("country_code", countries)
      .eq("is_active", true);

    const rateMap: Record<string, any> = {};
    if (rates) {
      for (const r of rates) rateMap[r.country_code] = r;
    }

    const buyerRate = rateMap[bCountry] ?? null;
    const vendorRate = rateMap[vCountry] ?? null;
    const isDomestic = bCountry === vCountry && bCountry !== "";
    const isCrossBorder = !isDomestic && bCountry !== "" && vCountry !== "";

    const items: ResolvedTaxItem[] = [];
    let deMinimisApplied = false;
    let blocName: string | null = null;

    if (isDomestic) {
      // ── Domestic: Apply local VAT/GST only ─────────────
      if (buyerRate) {
        const rate = Number(buyerRate.rate_percentage);
        items.push({
          id: crypto.randomUUID(),
          label: `${buyerRate.tax_type} (${buyerRate.country_name})`,
          type: "percentage",
          value: rate,
          amount: round(amount * rate / 100),
          source: "auto",
          notes: `Domestic ${buyerRate.tax_type} at ${rate}%`,
        });
      }
    } else if (isCrossBorder) {
      // ── Cross-Border: Check trade blocs, tariffs, de minimis ──

      // 1. Destination VAT/GST (buyer country)
      if (buyerRate) {
        const rate = Number(buyerRate.rate_percentage);
        items.push({
          id: crypto.randomUUID(),
          label: `${buyerRate.tax_type} (${buyerRate.country_name} — Destination)`,
          type: "percentage",
          value: rate,
          amount: round(amount * rate / 100),
          source: "auto",
          notes: `Destination country ${buyerRate.tax_type}`,
        });
      }

      // 2. Import tariff (with de minimis check)
      const deMinimis = Number(buyerRate?.de_minimis_usd ?? 0);
      if (deMinimis > 0 && amount < deMinimis) {
        deMinimisApplied = true;
        // No tariff below de minimis threshold
      } else if (buyerRate) {
        let baseTariff = Number(buyerRate.tariff_rate_percentage ?? 0);

        // Apply industry-specific override
        const overrides = buyerRate.industry_overrides ?? {};
        const industryOverride = overrides[category];
        let tariffMultiplier = ITEM_TARIFF_MULTIPLIERS[category] ?? 1.0;

        if (industryOverride?.tariff_multiplier != null) {
          tariffMultiplier = Number(industryOverride.tariff_multiplier);
        }

        // Check trade bloc — reduce tariff if same bloc
        const sharedBloc = findSharedBloc(bCountry, vCountry);
        if (sharedBloc) {
          blocName = sharedBloc.bloc;
          baseTariff = round(baseTariff * (1 - sharedBloc.reduction));
        }

        const effectiveTariff = round(baseTariff * tariffMultiplier);

        if (effectiveTariff > 0) {
          const tariffLabel = sharedBloc
            ? `Import Duty (${sharedBloc.bloc} reduced)`
            : "Import Duty";

          items.push({
            id: crypto.randomUUID(),
            label: tariffLabel,
            type: "percentage",
            value: effectiveTariff,
            amount: round(amount * effectiveTariff / 100),
            source: "auto",
            notes: sharedBloc
              ? `Base ${buyerRate.tariff_rate_percentage}% × ${category} multiplier ${tariffMultiplier}, reduced by ${sharedBloc.bloc} (${sharedBloc.reduction * 100}%)`
              : `Base ${buyerRate.tariff_rate_percentage}% × ${category} multiplier ${tariffMultiplier}`,
          });
        }
      }

      // 3. Export duty from vendor country (rare, but some countries have it)
      // Most countries zero-rate exports, so we skip unless explicitly configured
    }

    const totalTax = items.reduce((s, i) => s + i.amount, 0);

    return new Response(JSON.stringify({
      items,
      summary: {
        total_tax: round(totalTax),
        is_domestic: isDomestic,
        is_cross_border: isCrossBorder,
        bloc: blocName,
        de_minimis_applied: deMinimisApplied,
        de_minimis_threshold: Number(buyerRate?.de_minimis_usd ?? 0),
        buyer_country: bCountry,
        vendor_country: vCountry,
        item_category: category,
      },
      notes: deMinimisApplied
        ? `Transaction below de minimis threshold ($${buyerRate?.de_minimis_usd}) — import duties waived.`
        : blocName
          ? `Trade bloc ${blocName} detected — preferential tariff rates applied.`
          : isDomestic
            ? `Domestic transaction — local ${buyerRate?.tax_type ?? "tax"} applied.`
            : "Standard cross-border rates applied.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

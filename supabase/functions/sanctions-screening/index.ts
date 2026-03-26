import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Sanctioned Countries ──────────────────────────────────
const SANCTIONED_COUNTRIES = [
  "North Korea",
  "Iran",
  "Syria",
  "Cuba",
  "Crimea",
  "Russia",
];

// ─── Sample Sanctioned Entities (MVP reference list) ───────
const SANCTIONED_ENTITIES = [
  { name: "Korea Mining Development Trading Corporation", aliases: ["KOMID"], source: "OFAC" },
  { name: "Islamic Revolutionary Guard Corps", aliases: ["IRGC"], source: "OFAC" },
  { name: "Bank Sepah", aliases: [], source: "EU" },
  { name: "Syrian Scientific Studies and Research Center", aliases: ["SSRC", "CERS"], source: "EU" },
  { name: "Rosoboronexport", aliases: [], source: "UN" },
  { name: "Wagner Group", aliases: ["PMC Wagner"], source: "EU" },
  { name: "Mahan Air", aliases: [], source: "OFAC" },
  { name: "Cubametales", aliases: [], source: "OFAC" },
  { name: "Central Bank of the DPRK", aliases: [], source: "UN" },
  { name: "National Iranian Oil Company", aliases: ["NIOC"], source: "OFAC" },
  { name: "Hezbollah", aliases: ["Hizballah"], source: "OFAC" },
  { name: "Al-Quds Force", aliases: [], source: "OFAC" },
  { name: "Russian Direct Investment Fund", aliases: ["RDIF"], source: "EU" },
  { name: "Sberbank", aliases: [], source: "EU" },
  { name: "VTB Bank", aliases: [], source: "EU" },
];

// ─── Fuzzy Matching ────────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.75;

function screenName(fullName: string): Array<{ entity: string; alias: string | null; similarity: number; source: string }> {
  const norm = normalize(fullName);
  const matches: Array<{ entity: string; alias: string | null; similarity: number; source: string }> = [];

  for (const entity of SANCTIONED_ENTITIES) {
    const nameScore = similarity(norm, normalize(entity.name));
    if (nameScore >= FUZZY_THRESHOLD) {
      matches.push({ entity: entity.name, alias: null, similarity: Math.round(nameScore * 100), source: entity.source });
      continue;
    }
    // Check aliases
    for (const alias of entity.aliases) {
      const aliasScore = similarity(norm, normalize(alias));
      if (aliasScore >= FUZZY_THRESHOLD) {
        matches.push({ entity: entity.name, alias, similarity: Math.round(aliasScore * 100), source: entity.source });
        break;
      }
    }
    // Check if input contains entity name or vice versa
    if (norm.includes(normalize(entity.name)) || normalize(entity.name).includes(norm)) {
      if (!matches.find(m => m.entity === entity.name)) {
        matches.push({ entity: entity.name, alias: null, similarity: 85, source: entity.source });
      }
    }
  }

  return matches;
}

// ─── Screening Logic ──────────────────────────────────────
function performScreening(fullName: string, country: string) {
  const countryBlocked = SANCTIONED_COUNTRIES.some(
    sc => normalize(sc) === normalize(country)
  );
  const entityMatches = screenName(fullName);

  let result: "clear" | "flagged" | "blocked";
  let riskScore = 0;

  if (countryBlocked) {
    result = "blocked";
    riskScore = 100;
  } else if (entityMatches.length > 0) {
    const maxSim = Math.max(...entityMatches.map(m => m.similarity));
    if (maxSim >= 90) {
      result = "blocked";
      riskScore = Math.min(100, maxSim + 5);
    } else {
      result = "flagged";
      riskScore = maxSim;
    }
  } else {
    result = "clear";
    riskScore = 0;
  }

  const matchedEntries = countryBlocked
    ? [{ type: "country", value: country, source: "ALL", note: "Sanctioned country" }, ...entityMatches]
    : entityMatches;

  return { result, riskScore, matchedEntries };
}

// ─── Triage Helper ─────────────────────────────────────────
async function triageNotify(
  notificationType: string,
  userId: string,
  message: string,
  transactionId?: string,
  severity?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notification-triage`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: "triage",
        notification_type: notificationType,
        user_id: userId,
        message,
        transaction_id: transactionId,
        severity,
        metadata,
      }),
    });
  } catch (e) {
    console.error("Triage notification error:", e);
  }
}

// ─── Main ──────────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id, full_name, country, user_role, transaction_id } = await req.json();

    if (!user_id || !full_name || !country) {
      return new Response(
        JSON.stringify({ success: false, error: "user_id, full_name, and country are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();

    // Perform screening
    const { result, riskScore, matchedEntries } = performScreening(
      String(full_name),
      String(country)
    );

    const screeningSource = matchedEntries.length > 0
      ? [...new Set(matchedEntries.map((e: Record<string, unknown>) => e.source))].join(", ")
      : "ALL";

    // Log to sanctions_screening_logs
    const { error: logErr } = await supabase.from("sanctions_screening_logs").insert({
      user_id: String(user_id),
      full_name: String(full_name),
      country: String(country),
      user_role: user_role ? String(user_role) : null,
      screening_source: screeningSource,
      result,
      matched_entries: matchedEntries,
      risk_score: riskScore,
      transaction_id: transaction_id ? String(transaction_id) : null,
      screened_at: new Date().toISOString(),
    });

    if (logErr) console.error("Failed to log screening:", logErr.message);

    // If blocked → notify admin + prevent transaction
    if (result === "blocked") {
      // Create compliance flag
      const flagId = `SCR-${Date.now()}`;
      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: "sanctions_block",
        description: `Sanctions screening BLOCKED: ${full_name} from ${country}. ${matchedEntries.length} match(es) found.`,
        severity: "critical",
        status: "open",
        related_vendor_id: user_role === "vendor" ? String(user_id) : null,
        related_buyer_id: user_role === "buyer" ? String(user_id) : null,
      });

      // Notify via triage
      await triageNotify(
        "sanctions_block",
        String(user_id),
        `${full_name} (${country}) was BLOCKED by sanctions screening. Flag: ${flagId}`,
        transaction_id ? String(transaction_id) : undefined,
        "critical",
        { full_name, country, flagId, matchCount: matchedEntries.length }
      );

      // If transaction_id provided, mark it
      if (transaction_id) {
        await supabase
          .from("transactions")
          .update({ status: "blocked", updated_at: new Date().toISOString() })
          .eq("id", String(transaction_id));
      }
    }

    // If flagged → create compliance flag + notify admin, but allow transaction
    if (result === "flagged") {
      const flagId = `SCR-${Date.now()}`;
      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: "sanctions_flag",
        description: `Sanctions screening FLAGGED: ${full_name} from ${country}. ${matchedEntries.length} potential match(es). Risk score: ${riskScore}. Requires manual review.`,
        severity: "high",
        status: "open",
        related_vendor_id: user_role === "vendor" ? String(user_id) : null,
        related_buyer_id: user_role === "buyer" ? String(user_id) : null,
      });

      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: "⚠️ Sanctions Flag — Review Required",
          message: `${full_name} (${country}) was FLAGGED during sanctions screening. Risk: ${riskScore}%. Flag: ${flagId}`,
          type: "warning",
          related_entity_type: "compliance",
          related_entity_id: flagId,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        risk_score: riskScore,
        matched_entries: matchedEntries,
        screening_source: screeningSource,
        transaction_allowed: result !== "blocked",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sanctions-screening error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

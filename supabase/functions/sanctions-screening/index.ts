import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Provider Interface ───────────────────────────────────
// Production: swap to ComplyAdvantage, Refinitiv, or Dow Jones
// by implementing this interface and setting SANCTIONS_PROVIDER env var.

interface ScreeningResult {
  result: "clear" | "flagged" | "blocked";
  riskScore: number;
  matchedEntries: Array<{ entity?: string; type?: string; alias?: string | null; similarity?: number; source: string; value?: string; note?: string }>;
}

// ─── Provider: Local (MVP / Fallback) ─────────────────────
const SANCTIONED_COUNTRIES = [
  "North Korea", "Iran", "Syria", "Cuba", "Crimea", "Russia",
];

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

function screenNameLocal(fullName: string): Array<{ entity: string; alias: string | null; similarity: number; source: string }> {
  const norm = normalize(fullName);
  const matches: Array<{ entity: string; alias: string | null; similarity: number; source: string }> = [];
  for (const entity of SANCTIONED_ENTITIES) {
    const nameScore = similarity(norm, normalize(entity.name));
    if (nameScore >= FUZZY_THRESHOLD) {
      matches.push({ entity: entity.name, alias: null, similarity: Math.round(nameScore * 100), source: entity.source });
      continue;
    }
    for (const alias of entity.aliases) {
      const aliasScore = similarity(norm, normalize(alias));
      if (aliasScore >= FUZZY_THRESHOLD) {
        matches.push({ entity: entity.name, alias, similarity: Math.round(aliasScore * 100), source: entity.source });
        break;
      }
    }
    if (norm.includes(normalize(entity.name)) || normalize(entity.name).includes(norm)) {
      if (!matches.find(m => m.entity === entity.name)) {
        matches.push({ entity: entity.name, alias: null, similarity: 85, source: entity.source });
      }
    }
  }
  return matches;
}

function localScreening(fullName: string, country: string): ScreeningResult {
  const countryBlocked = SANCTIONED_COUNTRIES.some(sc => normalize(sc) === normalize(country));
  const entityMatches = screenNameLocal(fullName);

  let result: "clear" | "flagged" | "blocked";
  let riskScore = 0;

  if (countryBlocked) {
    result = "blocked";
    riskScore = 100;
  } else if (entityMatches.length > 0) {
    const maxSim = Math.max(...entityMatches.map(m => m.similarity));
    if (maxSim >= 90) { result = "blocked"; riskScore = Math.min(100, maxSim + 5); }
    else { result = "flagged"; riskScore = maxSim; }
  } else {
    result = "clear";
    riskScore = 0;
  }

  const matchedEntries = countryBlocked
    ? [{ type: "country", value: country, source: "ALL", note: "Sanctioned country" }, ...entityMatches]
    : entityMatches;

  return { result, riskScore, matchedEntries };
}

// ─── Provider: ComplyAdvantage (Stub — requires API key) ──
async function complyAdvantageScreening(fullName: string, country: string): Promise<ScreeningResult> {
  const apiKey = Deno.env.get("COMPLYADVANTAGE_API_KEY");
  if (!apiKey) {
    console.warn("COMPLYADVANTAGE_API_KEY not set — falling back to local screening");
    return localScreening(fullName, country);
  }

  try {
    const res = await fetch("https://api.complyadvantage.com/searches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${apiKey}`,
      },
      body: JSON.stringify({
        search_term: fullName,
        fuzziness: 0.6,
        filters: {
          country_codes: [country],
          types: ["sanction", "warning", "fitness-probity"],
        },
        limit: 10,
      }),
    });

    if (!res.ok) {
      console.error("ComplyAdvantage API error:", res.status, await res.text());
      return localScreening(fullName, country);
    }

    const data = await res.json();
    const hits = data?.content?.data?.total_hits || 0;
    const entries = (data?.content?.data?.hits || []).map((hit: Record<string, unknown>) => ({
      entity: (hit as { doc?: { name?: string } }).doc?.name || "Unknown",
      alias: null,
      similarity: Math.round(((hit as { match_status?: string }).match_status === "true_positive" ? 95 : 80)),
      source: "ComplyAdvantage",
    }));

    if (hits === 0) return { result: "clear", riskScore: 0, matchedEntries: [] };

    const maxSim = entries.length > 0 ? Math.max(...entries.map((e: { similarity: number }) => e.similarity)) : 0;
    return {
      result: maxSim >= 90 ? "blocked" : "flagged",
      riskScore: maxSim,
      matchedEntries: entries,
    };
  } catch (err) {
    console.error("ComplyAdvantage screening failed, falling back to local:", err);
    return localScreening(fullName, country);
  }
}

// ─── Provider Router ──────────────────────────────────────
async function performScreening(fullName: string, country: string): Promise<ScreeningResult> {
  const provider = (Deno.env.get("SANCTIONS_PROVIDER") || "local").toLowerCase();
  switch (provider) {
    case "complyadvantage":
      return complyAdvantageScreening(fullName, country);
    // Future providers: refinitiv, dowjones, etc.
    default:
      return localScreening(fullName, country);
  }
}

// ─── Triage Helper ─────────────────────────────────────────
async function triageNotify(
  notificationType: string, userId: string, message: string,
  transactionId?: string, severity?: string, metadata?: Record<string, unknown>
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notification-triage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ action: "triage", notification_type: notificationType, user_id: userId, message, transaction_id: transactionId, severity, metadata }),
    });
  } catch (e) { console.error("Triage notification error:", e); }
}

// ─── Main ──────────────────────────────────────────────────
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

function getSupabaseAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { user_id, full_name, country, user_role, transaction_id } = await req.json();
    if (!user_id || !full_name || !country) {
      return new Response(JSON.stringify({ success: false, error: "user_id, full_name, and country are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = getSupabaseAdmin();
    const provider = (Deno.env.get("SANCTIONS_PROVIDER") || "local").toLowerCase();

    // Perform screening via configured provider
    const { result, riskScore, matchedEntries } = await performScreening(String(full_name), String(country));

    const screeningSource = matchedEntries.length > 0
      ? [...new Set(matchedEntries.map((e) => e.source))].join(", ")
      : provider === "local" ? "LOCAL" : provider.toUpperCase();

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

    // If blocked → create compliance flag + notify + block transaction
    if (result === "blocked") {
      const flagId = `SCR-${Date.now()}`;
      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: "sanctions_block",
        description: `Sanctions screening BLOCKED: ${full_name} from ${country}. ${matchedEntries.length} match(es) found. Provider: ${screeningSource}`,
        severity: "critical",
        status: "open",
        related_vendor_id: user_role === "vendor" ? String(user_id) : null,
        related_buyer_id: user_role === "buyer" ? String(user_id) : null,
      });

      await triageNotify("sanctions_block", String(user_id), `${full_name} (${country}) was BLOCKED by sanctions screening. Flag: ${flagId}`, transaction_id ? String(transaction_id) : undefined, "critical", { full_name, country, flagId, matchCount: matchedEntries.length, provider: screeningSource });

      if (transaction_id) {
        await supabase.from("transactions").update({ status: "blocked", updated_at: new Date().toISOString() }).eq("id", String(transaction_id));
      }
    }

    // If flagged → compliance flag + notify, allow transaction
    if (result === "flagged") {
      const flagId = `SCR-${Date.now()}`;
      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: "sanctions_flag",
        description: `Sanctions screening FLAGGED: ${full_name} from ${country}. ${matchedEntries.length} potential match(es). Risk: ${riskScore}. Provider: ${screeningSource}`,
        severity: "high",
        status: "open",
        related_vendor_id: user_role === "vendor" ? String(user_id) : null,
        related_buyer_id: user_role === "buyer" ? String(user_id) : null,
      });

      await triageNotify("sanctions_flag", String(user_id), `${full_name} (${country}) was FLAGGED during sanctions screening. Risk: ${riskScore}%. Provider: ${screeningSource}. Flag: ${flagId}`, transaction_id ? String(transaction_id) : undefined, "high", { full_name, country, flagId, riskScore, provider: screeningSource });
    }

    // Anchor: AML screening result to blockchain
    if (transaction_id) {
      await anchorProof(supabase, String(transaction_id), "aml_screening", {
        event: "sanctions_screening",
        user_id: String(user_id),
        full_name: String(full_name),
        country: String(country),
        result,
        risk_score: riskScore,
        matched_count: matchedEntries.length,
        screening_source: screeningSource,
        screening_provider: provider,
        screened_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      result,
      risk_score: riskScore,
      matched_entries: matchedEntries,
      screening_source: screeningSource,
      screening_provider: provider,
      transaction_allowed: result !== "blocked",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("sanctions-screening error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
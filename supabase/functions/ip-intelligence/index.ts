import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * ip-intelligence
 *
 * Detects VPN/Proxy/Tor usage and cross-checks IP geolocation against
 * declared country and GPS coordinates.
 *
 * Actions:
 *   - check: Analyze caller IP for VPN, proxy, country mismatch
 */

// Sanctioned or high-risk country ISO codes (OFAC primary)
const SANCTIONED_COUNTRIES = new Set([
  "CU", "IR", "KP", "SY", "RU", // Primary OFAC
  "BY", "MM", "VE", "NI", "ZW", // Secondary / partial
  "CF", "CD", "SO", "SS", "YE", "LY", "LB", // Conflict zones
]);

// Datacenter / hosting ASN keywords that indicate non-residential IPs
const DATACENTER_KEYWORDS = [
  "hosting", "cloud", "server", "datacenter", "data center",
  "digitalocean", "amazon", "google", "microsoft", "azure",
  "linode", "vultr", "ovh", "hetzner", "contabo",
];

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function extractClientIP(req: Request): string {
  // Edge function headers — try multiple sources
  const cfIP = req.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.split(",")[0].trim();

  const xForwarded = req.headers.get("x-forwarded-for");
  if (xForwarded) return xForwarded.split(",")[0].trim();

  const xReal = req.headers.get("x-real-ip");
  if (xReal) return xReal.trim();

  return "unknown";
}

interface IPIntelResult {
  ip: string;
  ip_country: string;
  ip_country_name: string;
  ip_city: string;
  ip_region: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  is_sanctioned_ip_country: boolean;
  isp: string;
  org: string;
  risk_signals: string[];
  country_mismatch: boolean;
  gps_mismatch: boolean;
  triple_match: boolean;
  risk_score: number;
}

async function queryIPIntelligence(ip: string): Promise<Partial<IPIntelResult>> {
  if (ip === "unknown" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {
      ip,
      ip_country: "PRIVATE",
      ip_country_name: "Private Network",
      is_vpn: false,
      is_proxy: false,
      is_tor: false,
      is_datacenter: false,
      risk_signals: ["private_ip"],
    };
  }

  try {
    // Primary: ip-api.com (free, includes VPN/proxy/hosting detection)
    const resp = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,isp,org,as,proxy,hosting,query`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!resp.ok) throw new Error(`ip-api returned ${resp.status}`);
    const data = await resp.json();

    if (data.status !== "success") {
      throw new Error(data.message || "IP lookup failed");
    }

    const orgLower = (data.org || "").toLowerCase() + " " + (data.as || "").toLowerCase();
    const isDatacenter = data.hosting === true ||
      DATACENTER_KEYWORDS.some(kw => orgLower.includes(kw));

    return {
      ip: data.query || ip,
      ip_country: data.countryCode || "XX",
      ip_country_name: data.country || "Unknown",
      ip_city: data.city || "",
      ip_region: data.regionName || "",
      is_vpn: false, // ip-api free doesn't distinguish VPN from proxy
      is_proxy: data.proxy === true,
      is_tor: false, // checked separately below
      is_datacenter: isDatacenter,
      isp: data.isp || "",
      org: data.org || "",
      risk_signals: [],
    };
  } catch (err) {
    console.error("IP intelligence lookup failed:", err);
    return {
      ip,
      ip_country: "XX",
      ip_country_name: "Lookup Failed",
      is_vpn: false,
      is_proxy: false,
      is_tor: false,
      is_datacenter: false,
      risk_signals: ["lookup_failed"],
    };
  }
}

// Haversine distance in km between two lat/lng pairs
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "check") {
      return new Response(
        JSON.stringify({ error: "Unknown action. Use 'check'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      user_id,
      client_ip,         // Real IP captured from browser via ipify
      declared_country,  // ISO 2-letter code buyer declared
      gps_country,       // ISO 2-letter code from GPS reverse-geocoding
      gps_lat,
      gps_lng,
      transaction_id,
      amount,
    } = body;

    // Prefer browser-captured IP; fall back to request headers
    const resolvedIP = (client_ip && client_ip !== "unknown") ? client_ip : extractClientIP(req);
    const intel = await queryIPIntelligence(resolvedIP);

    const riskSignals: string[] = [...(intel.risk_signals || [])];
    let riskScore = 0;

    // 1. VPN / Proxy / Datacenter detection
    if (intel.is_proxy) {
      riskSignals.push("proxy_detected");
      riskScore += 30;
    }
    if (intel.is_datacenter) {
      riskSignals.push("datacenter_ip");
      riskScore += 20;
    }
    if (intel.is_tor) {
      riskSignals.push("tor_exit_node");
      riskScore += 50;
    }

    // 2. IP country vs declared country mismatch
    const ipCountry = intel.ip_country || "XX";
    const countryMismatch = declared_country &&
      ipCountry !== "XX" &&
      ipCountry !== "PRIVATE" &&
      declared_country.toUpperCase() !== ipCountry.toUpperCase();

    if (countryMismatch) {
      riskSignals.push(`country_mismatch:declared=${declared_country},ip=${ipCountry}`);
      riskScore += 25;
    }

    // 3. IP country vs GPS country mismatch
    const gpsMismatch = gps_country &&
      ipCountry !== "XX" &&
      ipCountry !== "PRIVATE" &&
      gps_country.toUpperCase() !== ipCountry.toUpperCase();

    if (gpsMismatch) {
      riskSignals.push(`gps_ip_mismatch:gps=${gps_country},ip=${ipCountry}`);
      riskScore += 30;
    }

    // 4. Declared vs GPS mismatch (user lying about their country)
    const declaredGpsMismatch = declared_country && gps_country &&
      declared_country.toUpperCase() !== gps_country.toUpperCase();

    if (declaredGpsMismatch) {
      riskSignals.push(`declared_gps_mismatch:declared=${declared_country},gps=${gps_country}`);
      riskScore += 35;
    }

    // 5. Sanctioned IP country
    const isSanctionedIP = SANCTIONED_COUNTRIES.has(ipCountry.toUpperCase());
    if (isSanctionedIP) {
      riskSignals.push(`sanctioned_ip_country:${ipCountry}`);
      riskScore += 50;
    }

    // 6. Triple match check
    const tripleMatch = !countryMismatch && !gpsMismatch && !declaredGpsMismatch;

    // Cap score at 100
    riskScore = Math.min(riskScore, 100);

    // Determine action
    const blocked = riskScore >= 80;
    const flagged = riskScore >= 30;

    const result: IPIntelResult = {
      ip: clientIP,
      ip_country: ipCountry,
      ip_country_name: intel.ip_country_name || "Unknown",
      ip_city: intel.ip_city || "",
      ip_region: intel.ip_region || "",
      is_vpn: intel.is_proxy || false, // proxy includes VPN in free tier
      is_proxy: intel.is_proxy || false,
      is_tor: intel.is_tor || false,
      is_datacenter: intel.is_datacenter || false,
      is_sanctioned_ip_country: isSanctionedIP,
      isp: intel.isp || "",
      org: intel.org || "",
      risk_signals: riskSignals,
      country_mismatch: countryMismatch || false,
      gps_mismatch: gpsMismatch || false,
      triple_match: tripleMatch,
      risk_score: riskScore,
    };

    // Log compliance flag if flagged
    if (flagged && user_id) {
      const supabase = getSupabaseAdmin();
      const flagId = `IP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const flagType = blocked ? "vpn_blocked" : isSanctionedIP ? "sanctioned_ip_origin" : "ip_anomaly";
      const severity = blocked ? "critical" : riskScore >= 50 ? "high" : "medium";

      await supabase.from("compliance_flags").insert({
        flag_id: flagId,
        type: flagType,
        description: `IP Intelligence Alert: ${riskSignals.join("; ")}. IP: ${clientIP} (${intel.ip_country_name}). Declared: ${declared_country || "N/A"}, GPS: ${gps_country || "N/A"}. Risk score: ${riskScore}/100.`,
        severity,
        status: "open",
        related_buyer_id: user_id,
      });

      // Notify admin via triage
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
            notification_type: flagType,
            user_id,
            message: `IP anomaly detected: ${riskSignals.join(", ")}. Score: ${riskScore}/100. IP country: ${ipCountry}, Declared: ${declared_country || "N/A"}.`,
            transaction_id: transaction_id || undefined,
            severity,
            metadata: { flagId, ...result },
          }),
        });
      } catch (e) {
        console.error("IP intel triage notify error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        action: blocked ? "block" : flagged ? "flag" : "allow",
        allow_transaction: !blocked,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ip-intelligence error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

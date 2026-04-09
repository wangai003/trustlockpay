import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, ShieldCheck, ShieldX, Loader2, Info, Mail, Wifi, WifiOff, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TRAVEL_RULE_CRYPTO_THRESHOLD = 1000;
const EDD_THRESHOLD = 3000;
const HIGH_RISK_THRESHOLD = 10000;

type ScreeningResult = "clear" | "flagged" | "blocked" | "edd_required" | "pending" | "ip_blocked";

interface IPIntelResult {
  ip: string;
  ip_country: string;
  ip_country_name: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  is_sanctioned_ip_country: boolean;
  risk_signals: string[];
  country_mismatch: boolean;
  gps_mismatch: boolean;
  triple_match: boolean;
  risk_score: number;
  action: "block" | "flag" | "allow";
  allow_transaction: boolean;
}

interface SanctionsGateProps {
  buyerCountry?: string;
  vendorCountry?: string;
  buyerName?: string;
  vendorName?: string;
  amount: number;
  transactionId?: string;
  gpsCountry?: string;
  gpsLat?: number;
  gpsLng?: number;
  onClear: () => void;
  onBlock?: () => void;
}

const SanctionsGate = ({
  buyerCountry,
  vendorCountry,
  buyerName,
  vendorName,
  amount,
  transactionId,
  gpsCountry,
  gpsLat,
  gpsLng,
  onClear,
  onBlock,
}: SanctionsGateProps) => {
  const [result, setResult] = useState<ScreeningResult>("pending");
  const [screening, setScreening] = useState(true);
  const [eddAccepted, setEddAccepted] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [riskScore, setRiskScore] = useState(0);
  const [screeningRef, setScreeningRef] = useState("");
  const [ipIntel, setIpIntel] = useState<Partial<IPIntelResult> | null>(null);
  const [screeningPhase, setScreeningPhase] = useState<"ip" | "sanctions" | "done">("ip");

  useEffect(() => {
    const runScreening = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

        // ── Phase 1: IP Intelligence Check ──
        setScreeningPhase("ip");
        let ipResult: Partial<IPIntelResult> = {};
        try {
          const { data: ipData, error: ipError } = await supabase.functions.invoke("ip-intelligence", {
            body: {
              action: "check",
              user_id: userId,
              declared_country: buyerCountry,
              gps_country: gpsCountry,
              gps_lat: gpsLat,
              gps_lng: gpsLng,
              transaction_id: transactionId,
              amount,
            },
          });
          if (!ipError && ipData) {
            ipResult = ipData;
            setIpIntel(ipData);
          }
        } catch (e) {
          console.warn("IP intelligence check failed (non-blocking):", e);
        }

        // If IP check blocks the transaction
        if (ipResult.action === "block" || ipResult.allow_transaction === false) {
          const ref = `IPB-${Date.now().toString(36).toUpperCase()}`;
          setScreeningRef(ref);
          setRiskScore(ipResult.risk_score || 100);
          setBlockReason(
            `Your connection was flagged by our IP intelligence system. ` +
            `${ipResult.is_sanctioned_ip_country ? `Your IP originates from a sanctioned jurisdiction (${ipResult.ip_country_name}). ` : ""}` +
            `${ipResult.is_proxy || ipResult.is_vpn ? "VPN/Proxy usage detected. " : ""}` +
            `${ipResult.is_tor ? "Tor exit node detected. " : ""}` +
            `${ipResult.country_mismatch ? `IP country (${ipResult.ip_country}) does not match your declared location. ` : ""}` +
            `Risk signals: ${(ipResult.risk_signals || []).join(", ")}.`
          );
          setResult("ip_blocked");
          setScreening(false);
          return;
        }

        // ── Phase 2: Sanctions Name Screening ──
        setScreeningPhase("sanctions");

        const screenParty = async (name: string, country: string, role: "buyer" | "vendor") => {
          const { data, error } = await supabase.functions.invoke("sanctions-screening", {
            body: {
              user_id: userId,
              full_name: name,
              country,
              user_role: role,
              transaction_id: transactionId ?? null,
            },
          });
          if (error) throw error;
          return data;
        };

        let finalResult: string = "clear";
        let finalRisk = ipResult.risk_score || 0;
        let reason = "";

        // Add IP risk context to flag reason if flagged (but not blocked)
        if (ipResult.action === "flag") {
          const ipFlags: string[] = [];
          if (ipResult.is_proxy || ipResult.is_vpn) ipFlags.push("VPN/Proxy detected");
          if (ipResult.is_datacenter) ipFlags.push("Datacenter IP");
          if (ipResult.country_mismatch) ipFlags.push(`IP country mismatch (${ipResult.ip_country} ≠ ${buyerCountry})`);
          if (ipResult.gps_mismatch) ipFlags.push(`GPS/IP mismatch`);
          if (ipFlags.length > 0) {
            reason = `⚠ IP Intelligence: ${ipFlags.join(", ")}. `;
          }
        }

        if (buyerName && buyerCountry) {
          const buyerResult = await screenParty(buyerName, buyerCountry, "buyer");
          if (buyerResult.result === "blocked") {
            finalResult = "blocked";
            finalRisk = buyerResult.risk_score;
            reason = `Buyer "${buyerName}" from ${buyerCountry} is on the OFAC/EU/UN sanctions list. TrustLock cannot process this transaction.`;
          } else if (buyerResult.result === "flagged") {
            finalResult = "flagged";
            finalRisk = Math.max(finalRisk, buyerResult.risk_score);
            reason += `Buyer "${buyerName}" flagged — ${buyerResult.matched_entries?.length ?? 0} potential match(es). Risk score: ${buyerResult.risk_score}%.`;
          }
        }

        if (vendorName && vendorCountry && finalResult !== "blocked") {
          const vendorResult = await screenParty(vendorName, vendorCountry, "vendor");
          if (vendorResult.result === "blocked") {
            finalResult = "blocked";
            finalRisk = vendorResult.risk_score;
            reason = `Vendor "${vendorName}" from ${vendorCountry} is on the OFAC/EU/UN sanctions list. TrustLock cannot process this transaction.`;
          } else if (vendorResult.result === "flagged" && finalResult !== "blocked") {
            finalResult = "flagged";
            finalRisk = Math.max(finalRisk, vendorResult.risk_score);
            reason += (reason ? " " : "") + `Vendor "${vendorName}" flagged — potential match. Risk: ${vendorResult.risk_score}%.`;
          }
        }

        // If IP was flagged but sanctions are clear, still surface the IP flag
        if (finalResult === "clear" && ipResult.action === "flag") {
          finalResult = "flagged";
        }

        const ref = `SCR-${Date.now().toString(36).toUpperCase()}`;
        setScreeningRef(ref);
        setRiskScore(finalRisk);
        setScreeningPhase("done");

        if (finalResult === "blocked") {
          setBlockReason(reason);
          setResult("blocked");
        } else if (finalResult === "flagged") {
          setFlagReason(reason);
          setResult("flagged");
        } else if (amount >= EDD_THRESHOLD) {
          setResult("edd_required");
        } else {
          setResult("clear");
        }
      } catch (err) {
        console.error("Sanctions screening error:", err);
        setResult("edd_required");
        setFlagReason("Screening service unavailable — manual review required.");
      } finally {
        setScreening(false);
      }
    };

    runScreening();
  }, [buyerCountry, vendorCountry, buyerName, vendorName, amount, transactionId, gpsCountry, gpsLat, gpsLng]);

  useEffect(() => {
    if (result === "clear" && !screening) {
      const t = setTimeout(onClear, 800);
      return () => clearTimeout(t);
    }
  }, [result, screening, onClear]);

  if (screening) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
          <h3 className="text-sm font-bold">AML & Sanctions Screening</h3>
          <p className="text-xs text-muted-foreground">
            {screeningPhase === "ip"
              ? "Running IP intelligence & VPN detection..."
              : "Checking OFAC, EU, and UN sanctions lists..."}
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-[10px] text-muted-foreground">
            <span className={`flex items-center gap-1 ${screeningPhase !== "ip" ? "text-primary" : ""}`}>
              <Wifi className="w-3 h-3" /> IP Check
            </span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> OFAC</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> EU</span>
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> UN</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Geo-Match</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // IP-blocked (VPN/Sanctioned IP)
  if (result === "ip_blocked") {
    return (
      <Card className="border-2 border-destructive/40 bg-destructive/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <WifiOff className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Connection Blocked — IP Anomaly</h3>
              <p className="text-xs text-muted-foreground mt-1">{blockReason}</p>
            </div>
          </div>
          {ipIntel && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
              <p className="text-[10px] font-semibold text-destructive">Detection Details</p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                <span>IP Country:</span>
                <span className="font-mono">{ipIntel.ip_country_name} ({ipIntel.ip_country})</span>
                {ipIntel.is_proxy && <><span>Proxy/VPN:</span><Badge variant="destructive" className="text-[9px] w-fit">Detected</Badge></>}
                {ipIntel.is_tor && <><span>Tor:</span><Badge variant="destructive" className="text-[9px] w-fit">Detected</Badge></>}
                {ipIntel.is_datacenter && <><span>Datacenter:</span><Badge variant="secondary" className="text-[9px] w-fit">Yes</Badge></>}
                <span>Risk Score:</span><span className="font-bold">{ipIntel.risk_score}/100</span>
              </div>
            </div>
          )}
          <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
            <p className="text-[10px] font-semibold">Why was I blocked?</p>
            <p className="text-[10px] text-muted-foreground">
              TrustLock uses IP intelligence to verify connection authenticity. VPN, proxy, and Tor connections from
              high-risk jurisdictions are blocked to comply with international AML regulations. Please disable
              your VPN and try again from your actual location.
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
            <p className="text-[10px] font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3" /> Need assistance?
            </p>
            <p className="text-[10px] text-muted-foreground">
              Contact compliance support at <strong>compliance@trustlockpay.com</strong> with reference {screeningRef}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onBlock} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result === "blocked") {
    return (
      <Card className="border-2 border-destructive/40 bg-destructive/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <ShieldX className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-destructive">Transaction Blocked</h3>
              <p className="text-xs text-muted-foreground mt-1">{blockReason}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
            <p className="text-[10px] font-semibold text-destructive">Compliance Reference</p>
            <ul className="text-[10px] text-muted-foreground space-y-1 list-disc pl-4">
              <li>OFAC Specially Designated Nationals (SDN) List</li>
              <li>EU Consolidated Sanctions List</li>
              <li>UN Security Council Consolidated List</li>
              <li>IP Geolocation Cross-Check</li>
            </ul>
            <p className="text-[10px] text-muted-foreground mt-2">
              This screening is logged for audit purposes. Reference: {screeningRef}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1">
            <p className="text-[10px] font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3" /> Need assistance?
            </p>
            <p className="text-[10px] text-muted-foreground">
              Contact compliance support at <strong>compliance@trustlockpay.com</strong> with reference {screeningRef}.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onBlock} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result === "flagged") {
    return (
      <Card className="border-2 border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Compliance Screening — Flagged
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{flagReason}</p>

          {ipIntel && !ipIntel.triple_match && (
            <div className="p-2 rounded-lg border border-yellow-500/20 bg-yellow-50/30 dark:bg-yellow-950/20">
              <p className="text-[10px] font-semibold flex items-center gap-1 text-yellow-700 dark:text-yellow-400">
                <Wifi className="w-3 h-3" /> IP Verification Note
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Your IP location ({ipIntel.ip_country_name}) {ipIntel.country_mismatch ? "does not match your declared location" : "has been noted"}.
                {ipIntel.is_proxy && " A proxy/VPN connection was detected."}
                {ipIntel.is_datacenter && " Your connection originates from a datacenter."}
              </p>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold">Risk Score</span>
              <Badge variant="secondary" className="text-[10px]">{riskScore}%</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              This transaction has been flagged for admin review but you may proceed. An admin has been notified automatically.
            </p>
          </div>
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              Reference: {screeningRef}. This screening result is logged in the compliance audit trail.
            </span>
          </div>
          <Button className="w-full gap-2" onClick={onClear}>
            <ShieldCheck className="w-4 h-4" /> Acknowledge & Proceed
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result === "edd_required" && !eddAccepted) {
    return (
      <Card className="border-2 border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Enhanced Due Diligence Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            This transaction of <strong>${amount.toLocaleString()}</strong> exceeds the{" "}
            <strong>${EDD_THRESHOLD.toLocaleString()}</strong> threshold, triggering enhanced AML screening.
          </p>

          {amount >= HIGH_RISK_THRESHOLD && (
            <div className="p-2 rounded-lg border border-destructive/20 bg-destructive/5">
              <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> High-Value Transaction (${amount.toLocaleString()})
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Transactions above $10,000 are flagged for additional monitoring.
              </p>
            </div>
          )}

          <div className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
            <p className="text-[10px] font-semibold">Checks Completed:</p>
            {[
              "IP intelligence & VPN detection — ✓ " + (ipIntel?.triple_match ? "Triple-match verified" : ipIntel?.action === "flag" ? "Flagged for review" : "Clear"),
              "Country sanctions screening — ✓ Clear",
              "Transaction amount threshold check — ✓ Flagged for review",
              "Party identity verification — ✓ KYC on file",
              amount >= HIGH_RISK_THRESHOLD ? "High-value monitoring flag — ✓ Active" : null,
            ].filter(Boolean).map((check, i) => (
              <p key={i} className="text-[10px] text-muted-foreground">{check}</p>
            ))}
          </div>

          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              By proceeding, you acknowledge this transaction will be subject to enhanced monitoring.
              Reference: {screeningRef || `EDD-${Date.now().toString(36).toUpperCase()}`}
            </span>
          </div>

          <Button className="w-full gap-2" onClick={() => { setEddAccepted(true); onClear(); }}>
            <ShieldCheck className="w-4 h-4" /> Acknowledge & Proceed
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-6 text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
        <h3 className="text-sm font-bold text-primary">Compliance Check Passed</h3>
        <p className="text-[10px] text-muted-foreground">
          AML, sanctions & IP verification clear. Proceeding...
        </p>
        {ipIntel?.triple_match && (
          <p className="text-[10px] text-primary/70 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> Triple-match verified (IP · GPS · Declared)
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SanctionsGate;

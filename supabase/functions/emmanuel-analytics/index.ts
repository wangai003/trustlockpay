import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// 1. Risk Score — compute risk profile for a user
async function riskScore(userId: string, role: string) {
  const sb = getSupabase();
  const isVendor = role === "vendor";
  const col = isVendor ? "vendor_id" : "buyer_id";

  // Disputes involving this user
  const { data: disputes } = await sb.from("disputes").select("id, status, ai_confidence, ai_recommendation, created_at").or(`buyer_id.eq.${userId},vendor_id.eq.${userId}`);
  // Transactions
  const { data: txs } = await sb.from("transactions").select("id, status, amount, created_at").eq(col, userId).order("created_at", { ascending: false }).limit(100);
  // Compliance flags
  const { data: flags } = await sb.from("compliance_flags").select("id, type, severity, status").or(`related_buyer_id.eq.${userId},related_vendor_id.eq.${userId}`);
  // Sanctions hits
  const { data: sanctions } = await sb.from("sanctions_screening_logs").select("id, result, risk_score").eq("user_id", userId);

  const totalTx = txs?.length || 0;
  const totalDisputes = disputes?.length || 0;
  const disputeRate = totalTx > 0 ? (totalDisputes / totalTx * 100).toFixed(1) : "0";
  const criticalFlags = flags?.filter(f => f.severity === "critical").length || 0;
  const highFlags = flags?.filter(f => f.severity === "high").length || 0;
  const sanctionHits = sanctions?.filter(s => s.result !== "clear").length || 0;
  const disputesLost = disputes?.filter(d => {
    if (isVendor) return d.ai_recommendation === "REFUND";
    return d.ai_recommendation === "APPROVE";
  }).length || 0;

  // Simple weighted score (0-100, higher = riskier)
  let score = 0;
  score += Math.min(parseFloat(disputeRate) * 3, 30);
  score += criticalFlags * 15;
  score += highFlags * 8;
  score += sanctionHits * 20;
  score += disputesLost * 5;
  score = Math.min(Math.round(score), 100);

  return {
    user_id: userId,
    role,
    risk_score: score,
    risk_level: score >= 70 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low",
    total_transactions: totalTx,
    total_disputes: totalDisputes,
    dispute_rate: `${disputeRate}%`,
    disputes_lost: disputesLost,
    critical_compliance_flags: criticalFlags,
    high_compliance_flags: highFlags,
    sanction_hits: sanctionHits,
  };
}

// 2. Vendor Health — trust score
async function vendorHealth(vendorId: string) {
  const sb = getSupabase();
  const { data: txs } = await sb.from("transactions").select("id, status, amount, created_at, released_date").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(200);
  const { data: disputes } = await sb.from("disputes").select("id, status, ai_recommendation, ai_confidence").eq("vendor_id", vendorId);
  const { data: profile } = await sb.from("profiles").select("full_name, email, created_at").eq("id", vendorId).single();
  const { data: kycDocs } = await sb.from("kyc_documents").select("id, status").eq("vendor_id", vendorId);
  const { data: payouts } = await sb.from("payouts").select("id, status, amount").eq("vendor_id", vendorId);

  const completedTx = txs?.filter(t => t.status === "released").length || 0;
  const totalTx = txs?.length || 0;
  const fulfillmentRate = totalTx > 0 ? (completedTx / totalTx * 100).toFixed(1) : "0";
  const totalDisputes = disputes?.length || 0;
  const disputesWon = disputes?.filter(d => d.ai_recommendation === "APPROVE").length || 0;
  const approvedKyc = kycDocs?.filter(d => d.status === "approved").length || 0;
  const totalVolume = txs?.reduce((s, t) => s + (t.amount || 0), 0) || 0;

  // Trust score (0-100, higher = more trustworthy)
  let trust = 50;
  trust += Math.min(completedTx * 2, 20);
  trust += parseFloat(fulfillmentRate) > 90 ? 15 : parseFloat(fulfillmentRate) > 70 ? 8 : 0;
  trust -= totalDisputes * 5;
  trust += disputesWon * 3;
  trust += Math.min(approvedKyc * 3, 10);
  trust = Math.max(0, Math.min(Math.round(trust), 100));

  return {
    vendor_id: vendorId,
    vendor_name: profile?.full_name || "Unknown",
    trust_score: trust,
    trust_level: trust >= 80 ? "excellent" : trust >= 60 ? "good" : trust >= 40 ? "fair" : "poor",
    total_transactions: totalTx,
    completed_transactions: completedTx,
    fulfillment_rate: `${fulfillmentRate}%`,
    total_disputes: totalDisputes,
    disputes_won: disputesWon,
    approved_kyc_documents: approvedKyc,
    total_volume: totalVolume,
    member_since: profile?.created_at,
  };
}

// 3. Fraud Patterns — detect clustering
async function fraudPatterns() {
  const sb = getSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: disputes } = await sb.from("disputes").select("id, buyer_id, buyer_name, vendor_id, vendor_name, reason, status, created_at").gte("created_at", thirtyDaysAgo);

  if (!disputes || disputes.length === 0) return { patterns: [], summary: "No disputes in the last 30 days." };

  // Group disputes by vendor
  const byVendor: Record<string, any[]> = {};
  const byBuyer: Record<string, any[]> = {};
  for (const d of disputes) {
    if (d.vendor_id) (byVendor[d.vendor_id] = byVendor[d.vendor_id] || []).push(d);
    if (d.buyer_id) (byBuyer[d.buyer_id] = byBuyer[d.buyer_id] || []).push(d);
  }

  const patterns: any[] = [];

  // Vendors with 3+ disputes
  for (const [vid, dList] of Object.entries(byVendor)) {
    if (dList.length >= 3) {
      const uniqueBuyers = new Set(dList.map(d => d.buyer_id)).size;
      patterns.push({
        type: "vendor_cluster",
        severity: dList.length >= 5 ? "critical" : "high",
        vendor_id: vid,
        vendor_name: dList[0].vendor_name,
        dispute_count: dList.length,
        unique_buyers: uniqueBuyers,
        reasons: [...new Set(dList.map(d => d.reason).filter(Boolean))],
        description: `Vendor "${dList[0].vendor_name}" has ${dList.length} disputes from ${uniqueBuyers} unique buyers in the last 30 days.`,
      });
    }
  }

  // Buyers with 3+ disputes across different vendors
  for (const [bid, dList] of Object.entries(byBuyer)) {
    if (dList.length >= 3) {
      const uniqueVendors = new Set(dList.map(d => d.vendor_id)).size;
      if (uniqueVendors >= 2) {
        patterns.push({
          type: "buyer_cluster",
          severity: dList.length >= 5 ? "critical" : "high",
          buyer_id: bid,
          buyer_name: dList[0].buyer_name,
          dispute_count: dList.length,
          unique_vendors: uniqueVendors,
          reasons: [...new Set(dList.map(d => d.reason).filter(Boolean))],
          description: `Buyer "${dList[0].buyer_name}" filed ${dList.length} disputes across ${uniqueVendors} different vendors.`,
        });
      }
    }
  }

  // Similar reason clustering
  const reasonCounts: Record<string, number> = {};
  for (const d of disputes) {
    if (d.reason) reasonCounts[d.reason] = (reasonCounts[d.reason] || 0) + 1;
  }

  return {
    total_disputes_30d: disputes.length,
    patterns,
    reason_distribution: reasonCounts,
  };
}

// 4. Escalation Prediction — score open disputes
async function escalationPredict() {
  const sb = getSupabase();
  const { data: openDisputes } = await sb.from("disputes").select("*").in("status", ["open", "in_review", "pending"]).order("created_at", { ascending: true });

  if (!openDisputes || openDisputes.length === 0) return { predictions: [], summary: "No open disputes." };

  const predictions = [];
  for (const d of openDisputes) {
    let escalationScore = 0;
    const reasons: string[] = [];

    // High amount = higher escalation risk
    if ((d.amount || 0) >= 10000) { escalationScore += 30; reasons.push("High-value transaction (≥$10,000 — triggers arbitration)"); }
    else if ((d.amount || 0) >= 5000) { escalationScore += 15; reasons.push("Significant transaction value (≥$5,000)"); }

    // Low AI confidence
    if (d.ai_confidence && d.ai_confidence < 70) { escalationScore += 20; reasons.push(`Low AI confidence (${d.ai_confidence}%)`); }

    // Age of dispute
    const ageHours = (Date.now() - new Date(d.created_at).getTime()) / 3600000;
    if (ageHours > 120) { escalationScore += 25; reasons.push(`Dispute aging (${Math.round(ageHours / 24)} days old)`); }
    else if (ageHours > 48) { escalationScore += 10; reasons.push("Dispute open > 48 hours"); }

    // Priority
    if (d.priority === "critical") { escalationScore += 20; reasons.push("Marked as critical priority"); }
    else if (d.priority === "high") { escalationScore += 10; reasons.push("Marked as high priority"); }

    escalationScore = Math.min(escalationScore, 100);

    predictions.push({
      dispute_id: d.dispute_id,
      transaction_id: d.tx_id,
      buyer: d.buyer_name,
      vendor: d.vendor_name,
      amount: d.amount,
      reason: d.reason,
      escalation_score: escalationScore,
      escalation_risk: escalationScore >= 60 ? "high" : escalationScore >= 30 ? "medium" : "low",
      risk_factors: reasons,
    });
  }

  predictions.sort((a, b) => b.escalation_score - a.escalation_score);
  return { predictions, high_risk_count: predictions.filter(p => p.escalation_risk === "high").length };
}

// 5. Audit Summary — aggregated compliance data for a period
async function auditSummary(startDate: string, endDate: string) {
  const sb = getSupabase();
  const { data: txs } = await sb.from("transactions").select("id, status, amount, fee").gte("created_at", startDate).lte("created_at", endDate);
  const { data: disputes } = await sb.from("disputes").select("id, status, resolution, amount").gte("created_at", startDate).lte("created_at", endDate);
  const { data: flags } = await sb.from("compliance_flags").select("id, type, severity, status").gte("created_at", startDate).lte("created_at", endDate);
  const { data: sanctions } = await sb.from("sanctions_screening_logs").select("id, result, risk_score").gte("created_at", startDate).lte("created_at", endDate);
  const { data: payouts } = await sb.from("payouts").select("id, status, amount").gte("created_at", startDate).lte("created_at", endDate);

  const totalTxVolume = txs?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
  const totalFees = txs?.reduce((s, t) => s + (t.fee || 0), 0) || 0;
  const totalPayouts = payouts?.reduce((s, p) => s + (p.amount || 0), 0) || 0;

  return {
    period: { start: startDate, end: endDate },
    transactions: {
      total: txs?.length || 0,
      volume: totalTxVolume,
      fees_collected: totalFees,
      by_status: groupBy(txs || [], "status"),
    },
    disputes: {
      total: disputes?.length || 0,
      total_value: disputes?.reduce((s, d) => s + (d.amount || 0), 0) || 0,
      by_status: groupBy(disputes || [], "status"),
      by_resolution: groupBy(disputes || [], "resolution"),
    },
    compliance: {
      total_flags: flags?.length || 0,
      by_severity: groupBy(flags || [], "severity"),
      by_type: groupBy(flags || [], "type"),
      unresolved: flags?.filter(f => f.status === "open" || f.status === "pending").length || 0,
    },
    sanctions_screening: {
      total_scans: sanctions?.length || 0,
      clear: sanctions?.filter(s => s.result === "clear").length || 0,
      flagged: sanctions?.filter(s => s.result !== "clear").length || 0,
    },
    payouts: {
      total: payouts?.length || 0,
      volume: totalPayouts,
      by_status: groupBy(payouts || [], "status"),
    },
  };
}

// 6. KYC Nudge — find vendors needing upgrade
async function kycNudge() {
  const sb = getSupabase();
  // Get all vendors
  const { data: vendors } = await sb.from("user_roles").select("user_id").eq("role", "vendor");
  if (!vendors || vendors.length === 0) return { nudges: [] };

  const nudges = [];
  for (const v of vendors.slice(0, 50)) {
    const { data: kycDocs } = await sb.from("kyc_documents").select("id, status").eq("vendor_id", v.user_id);
    const approvedDocs = kycDocs?.filter(d => d.status === "approved").length || 0;

    // Determine effective tier
    let tier = "none";
    if (approvedDocs >= 3) tier = "full";
    else if (approvedDocs >= 2) tier = "intermediate";
    else if (approvedDocs >= 1) tier = "basic";

    if (tier === "full") continue;

    // Check transaction volume
    const { data: txs } = await sb.from("transactions").select("id, amount").eq("vendor_id", v.user_id);
    const volume = txs?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
    const txCount = txs?.length || 0;

    // Only nudge if they have meaningful activity
    const tierLimit = tier === "none" ? 0 : tier === "basic" ? 500 : tier === "intermediate" ? 5000 : Infinity;
    const approachingLimit = volume > tierLimit * 0.6;

    if (txCount >= 3 || approachingLimit) {
      const { data: profile } = await sb.from("profiles").select("full_name, email").eq("id", v.user_id).single();
      nudges.push({
        vendor_id: v.user_id,
        vendor_name: profile?.full_name || "Unknown",
        email: profile?.email,
        current_tier: tier,
        recommended_tier: tier === "none" ? "basic" : tier === "basic" ? "intermediate" : "full",
        total_transactions: txCount,
        total_volume: volume,
        approaching_limit: approachingLimit,
        reason: approachingLimit
          ? `Volume ($${volume.toFixed(0)}) approaching ${tier} tier limit ($${tierLimit})`
          : `${txCount} transactions completed — time to upgrade KYC`,
      });
    }
  }

  nudges.sort((a, b) => b.total_volume - a.total_volume);
  return { nudges, total_needing_upgrade: nudges.length };
}

function groupBy(arr: any[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of arr) {
    const val = item[key] || "unknown";
    result[val] = (result[val] || 0) + 1;
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, ...params } = await req.json();

    let result;
    switch (action) {
      case "risk_score":
        if (!params.user_id || !params.role) throw new Error("user_id and role required");
        result = await riskScore(params.user_id, params.role);
        break;
      case "vendor_health":
        if (!params.vendor_id) throw new Error("vendor_id required");
        result = await vendorHealth(params.vendor_id);
        break;
      case "fraud_patterns":
        result = await fraudPatterns();
        break;
      case "escalation_predict":
        result = await escalationPredict();
        break;
      case "audit_summary":
        if (!params.start_date || !params.end_date) throw new Error("start_date and end_date required");
        result = await auditSummary(params.start_date, params.end_date);
        break;
      case "kyc_nudge":
        result = await kycNudge();
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("emmanuel-analytics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

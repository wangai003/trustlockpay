// Autonomous Fixer Dispatch — Triage Engine
// Handles BOTH preset shortcuts AND free-form tickets autonomously:
//   1. Classify the issue (preset_key OR Gemini-classified free-form message)
//   2. Run live system probes against the tx_id
//   3. Decide scope (isolated vs systemic)
//   4. Execute safe data-layer fixes when possible
//   5. Resolve via resolve_autonomous_fixer_ticket with full triage_results trail
//
// Outcomes:
//   - "auto_fixed"          -> data-layer fix applied, no Lovable handoff
//   - "no_action_needed"    -> system probes show correct behavior
//   - "requires_code_change"-> diagnosed as code defect; queued for owner relay
//   - "requires_executive"  -> needs human Executive Admin review
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DispatchBody { ticket_id: string }

interface Probe {
  name: string;
  ok: boolean;
  detail: string;
  data?: unknown;
}

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ---------- AI classification for free-form messages ----------
async function classifyFreeForm(message: string): Promise<{
  category: string;
  subsystem: string;
  confidence: number;
  reasoning: string;
}> {
  const fallback = {
    category: "unknown",
    subsystem: "unknown",
    confidence: 0,
    reasoning: "AI classifier unavailable; defaulted to unknown.",
  };
  if (!LOVABLE_API_KEY) return fallback;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You classify TrustLock customer/vendor complaints into one structured JSON object. Respond with JSON ONLY, no prose, matching:
{"category":"stuck_escrow|failed_payout|kyc_stuck|anchoring_failure|notification_missing|stale_transaction|dispute_issue|fee_dispute|document_issue|wrong_amount|duplicate_charge|access_issue|other","subsystem":"escrow|payout|kyc|anchoring|notifications|disputes|fees|documents|auth|other","confidence":0-100,"reasoning":"one short sentence"}`,
          },
          { role: "user", content: message.slice(0, 2000) },
        ],
      }),
    });
    if (!resp.ok) return fallback;
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content ?? "";
    const json = txt.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return fallback;
    const parsed = JSON.parse(json);
    return {
      category: String(parsed.category ?? "unknown"),
      subsystem: String(parsed.subsystem ?? "unknown"),
      confidence: Number(parsed.confidence ?? 0),
      reasoning: String(parsed.reasoning ?? ""),
    };
  } catch (e) {
    return { ...fallback, reasoning: `Classifier error: ${(e as Error).message}` };
  }
}

// ---------- System probes ----------
async function runProbes(
  supabase: ReturnType<typeof createClient>,
  tx: any,
  category: string,
): Promise<Probe[]> {
  const probes: Probe[] = [];
  if (!tx) {
    probes.push({ name: "transaction_lookup", ok: false, detail: "Transaction not found for tx_id." });
    return probes;
  }

  // Universal probes
  probes.push({
    name: "transaction_lookup",
    ok: true,
    detail: `Tx ${tx.tx_id} status=${tx.status} amount=${tx.amount}`,
    data: { id: tx.id, status: tx.status, created_at: tx.created_at },
  });

  const ageHours = (Date.now() - new Date(tx.created_at).getTime()) / 3.6e6;
  probes.push({
    name: "age",
    ok: true,
    detail: `Transaction age: ${ageHours.toFixed(1)}h`,
    data: { age_hours: ageHours },
  });

  // Status history
  const { data: history } = await supabase
    .from("transaction_status_history")
    .select("from_status, to_status, changed_at")
    .eq("transaction_id", tx.id)
    .order("changed_at", { ascending: false })
    .limit(10);
  probes.push({
    name: "status_history",
    ok: true,
    detail: `${(history ?? []).length} status changes`,
    data: history ?? [],
  });

  // Category-specific
  if (["stuck_escrow", "stale_transaction", "wrong_amount", "duplicate_charge", "other"].includes(category)) {
    const stale = ageHours > 24 && tx.status === "locked";
    probes.push({
      name: "escrow_state",
      ok: !stale,
      detail: stale ? "Escrow locked >24h — may be awaiting release/auto-release." : "Escrow state nominal.",
    });
  }

  if (["anchoring_failure", "other"].includes(category)) {
    const { data: proofs } = await supabase
      .from("blockchain_proofs")
      .select("id, status, retry_count, created_at")
      .eq("transaction_id", tx.id)
      .order("created_at", { ascending: false })
      .limit(10);
    const failed = (proofs ?? []).filter((p: any) => p.status === "failed");
    probes.push({
      name: "blockchain_proofs",
      ok: failed.length === 0,
      detail: `${(proofs ?? []).length} proofs, ${failed.length} failed`,
      data: { failed_ids: failed.map((p: any) => p.id) },
    });
  }

  if (["failed_payout", "other"].includes(category)) {
    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("id, status, created_at, amount")
      .eq("transaction_id", tx.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const stuck = (payouts ?? []).find((p: any) =>
      ["failed", "pending"].includes(p.status) &&
      (Date.now() - new Date(p.created_at).getTime()) / 3.6e6 > 48
    );
    probes.push({
      name: "payouts",
      ok: !stuck,
      detail: stuck ? `Payout ${stuck.id} stalled in ${stuck.status} >48h` : "No stalled payouts",
      data: payouts ?? [],
    });
  }

  if (["kyc_stuck", "other"].includes(category)) {
    const { data: kyc } = await supabase
      .from("kyc_queue")
      .select("id, status, submitted_at, vendor_id")
      .or(`vendor_id.eq.${tx.vendor_id},vendor_id.eq.${tx.buyer_id}`)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (kyc) {
      const days = (Date.now() - new Date((kyc as any).submitted_at).getTime()) / 8.64e7;
      probes.push({
        name: "kyc",
        ok: (kyc as any).status !== "pending" || days <= 3,
        detail: `KYC ${(kyc as any).status}, ${days.toFixed(1)}d old`,
      });
    } else {
      probes.push({ name: "kyc", ok: true, detail: "No KYC pending for parties" });
    }
  }

  if (["notification_missing", "other"].includes(category)) {
    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, created_at")
      .eq("related_entity_id", tx.id)
      .order("created_at", { ascending: false })
      .limit(3);
    probes.push({
      name: "notifications",
      ok: (notifs ?? []).length > 0,
      detail: `${(notifs ?? []).length} notifications on file for this tx`,
    });
  }

  if (["dispute_issue", "other"].includes(category)) {
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id, status, created_at")
      .eq("tx_id", tx.tx_id)
      .limit(5);
    probes.push({
      name: "disputes",
      ok: true,
      detail: `${(disputes ?? []).length} dispute records`,
      data: disputes ?? [],
    });
  }

  // Bug reports & health signals (corroboration)
  const { data: bugs } = await supabase
    .from("bug_reports")
    .select("id, severity, created_at")
    .or(`related_entity_id.eq.${tx.id},description.ilike.%${tx.tx_id}%`)
    .order("created_at", { ascending: false })
    .limit(5);
  probes.push({
    name: "bug_reports",
    ok: (bugs ?? []).length === 0,
    detail: `${(bugs ?? []).length} related bug reports`,
  });

  return probes;
}

// ---------- Scope detection: isolated vs systemic ----------
async function detectScope(
  supabase: ReturnType<typeof createClient>,
  category: string,
  windowHours = 24,
): Promise<{ scope: "isolated" | "systemic"; affected_count: number; detail: string }> {
  const since = new Date(Date.now() - windowHours * 3.6e6).toISOString();

  let count = 0;
  let detail = "";

  if (category === "anchoring_failure") {
    const { count: c } = await supabase
      .from("blockchain_proofs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since);
    count = c ?? 0;
    detail = `${count} failed anchoring proofs in last ${windowHours}h`;
  } else if (category === "failed_payout") {
    const { count: c } = await supabase
      .from("payout_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since);
    count = c ?? 0;
    detail = `${count} failed payouts in last ${windowHours}h`;
  } else if (category === "notification_missing") {
    const { count: c } = await supabase
      .from("bug_reports")
      .select("id", { count: "exact", head: true })
      .ilike("description", "%notification%")
      .gte("created_at", since);
    count = c ?? 0;
    detail = `${count} notification-related bug reports in last ${windowHours}h`;
  } else {
    // Generic: count bug reports in the subsystem
    const { count: c } = await supabase
      .from("bug_reports")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    count = c ?? 0;
    detail = `${count} total bug reports in last ${windowHours}h`;
  }

  const scope = count >= 5 ? "systemic" : "isolated";
  return { scope, affected_count: count, detail };
}

// ---------- Auto-fix actions ----------
async function applyFixes(
  supabase: ReturnType<typeof createClient>,
  tx: any,
  category: string,
  probes: Probe[],
  scope: "isolated" | "systemic",
): Promise<{ actions: any[]; outcome: string; diagnosis: string }> {
  const actions: any[] = [];

  // ANCHORING — requeue failed proofs
  if (category === "anchoring_failure") {
    if (scope === "systemic") {
      const { data: failed } = await supabase
        .from("blockchain_proofs")
        .select("id")
        .eq("status", "failed")
        .limit(500);
      const ids = (failed ?? []).map((p: any) => p.id);
      if (ids.length > 0) {
        await supabase
          .from("blockchain_proofs")
          .update({ status: "pending", retry_count: 0 })
          .in("id", ids);
        actions.push({ action: "requeue_anchoring_systemic", count: ids.length });
        return {
          actions, outcome: "auto_fixed",
          diagnosis: `Systemic anchoring failure detected. Re-queued ${ids.length} failed proof(s).`,
        };
      }
    } else if (tx) {
      const { data: failed } = await supabase
        .from("blockchain_proofs")
        .select("id")
        .eq("transaction_id", tx.id)
        .eq("status", "failed");
      const ids = (failed ?? []).map((p: any) => p.id);
      if (ids.length > 0) {
        await supabase
          .from("blockchain_proofs")
          .update({ status: "pending", retry_count: 0 })
          .in("id", ids);
        actions.push({ action: "requeue_anchoring_isolated", count: ids.length });
        return {
          actions, outcome: "auto_fixed",
          diagnosis: `Isolated anchoring failure on tx ${tx.tx_id}. Re-queued ${ids.length} proof(s).`,
        };
      }
    }
    return { actions, outcome: "no_action_needed", diagnosis: "No failed anchoring proofs to re-queue." };
  }

  // NOTIFICATIONS — resend
  if (category === "notification_missing" && tx) {
    await supabase.from("notifications").insert({
      user_id: tx.buyer_id,
      title: "Order Status Update",
      message: `Refreshed status for order ${tx.tx_id}: ${tx.status}`,
      type: "info",
      related_entity_type: "transaction",
      related_entity_id: tx.id,
    });
    actions.push({ action: "notification_resent", user_id: tx.buyer_id });
    return { actions, outcome: "auto_fixed", diagnosis: "Buyer notification re-sent." };
  }

  // STALE — touch updated_at to re-trigger downstream listeners
  if (category === "stale_transaction" && tx) {
    await supabase.from("transactions").update({ updated_at: new Date().toISOString() }).eq("id", tx.id);
    actions.push({ action: "touched_updated_at" });
    return { actions, outcome: "auto_fixed", diagnosis: "Refreshed transaction record; downstream listeners will re-sync." };
  }

  // STUCK ESCROW — diagnostic only (release decisions need human)
  if (category === "stuck_escrow" && tx) {
    const ageHours = (Date.now() - new Date(tx.created_at).getTime()) / 3.6e6;
    if (tx.status === "locked" && ageHours > 24) {
      return {
        actions, outcome: "no_action_needed",
        diagnosis: `Escrow has been locked ${ageHours.toFixed(1)}h. State is valid; awaiting buyer confirmation or auto-release window. No fix required.`,
      };
    }
    if (["stuck", "failed"].includes(tx.status)) {
      return {
        actions, outcome: "requires_code_change",
        diagnosis: `Tx in '${tx.status}' state — state machine defect suspected. Needs code-level patch.`,
      };
    }
    return { actions, outcome: "no_action_needed", diagnosis: `Tx in '${tx.status}' state — not stuck.` };
  }

  // FAILED PAYOUT — escalate
  if (category === "failed_payout") {
    const probe = probes.find((p) => p.name === "payouts");
    if (probe && !probe.ok) {
      return {
        actions, outcome: "requires_executive",
        diagnosis: `${probe.detail}. Requires Executive review (financial action).`,
      };
    }
    return { actions, outcome: "no_action_needed", diagnosis: "No stalled payouts detected." };
  }

  // KYC — escalate stale to compliance
  if (category === "kyc_stuck") {
    const probe = probes.find((p) => p.name === "kyc");
    if (probe && !probe.ok) {
      return { actions, outcome: "requires_executive", diagnosis: `${probe.detail}. Compliance manual review needed.` };
    }
    return { actions, outcome: "no_action_needed", diagnosis: "KYC within SLA." };
  }

  // FEE DISPUTE / WRONG AMOUNT — likely code or config defect
  if (["fee_dispute", "wrong_amount", "duplicate_charge"].includes(category)) {
    if (scope === "systemic") {
      return {
        actions, outcome: "requires_code_change",
        diagnosis: `Systemic ${category.replace("_", " ")} detected (${(probes.find((p) => p.name === "bug_reports")?.data ?? "multiple") }). Likely calculation/logic defect — needs code patch.`,
      };
    }
    return {
      actions, outcome: "requires_executive",
      diagnosis: `Isolated ${category.replace("_", " ")} — needs Executive financial review.`,
    };
  }

  // DOCUMENT / DISPUTE / ACCESS / UNKNOWN — surface for human
  return {
    actions, outcome: "requires_code_change",
    diagnosis: `Backend could not safely auto-resolve a '${category}' issue. Diagnostics attached; recommend code/UX review.`,
  };
}

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ticket_id } = (await req.json()) as DispatchBody;
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ticket, error: tErr } = await supabase
      .from("autonomous_fixer_tickets")
      .select("*, transaction:transactions(*)")
      .eq("id", ticket_id)
      .maybeSingle();

    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: "ticket_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = (ticket as any).transaction;
    const startedAt = Date.now();

    // 1. Classification
    let category: string;
    let classification: any;
    if (ticket.ticket_type === "preset" && ticket.preset_key) {
      category = ticket.preset_key;
      classification = {
        source: "preset",
        category,
        subsystem: category.split("_")[0],
        confidence: 100,
        reasoning: "Preset shortcut selected by technical staff.",
      };
    } else {
      const ai = await classifyFreeForm(ticket.message ?? "");
      category = ai.category;
      classification = { source: "ai", ...ai };
    }

    // 2. Probes
    const probes = await runProbes(supabase, tx, category);

    // 3. Scope
    const scope = await detectScope(supabase, category);

    // 4. Fixes
    const { actions, outcome, diagnosis } = await applyFixes(supabase, tx, category, probes, scope);

    // 5. Persist triage trail
    const triageResults = {
      classification,
      probes,
      scope,
      actions,
      outcome,
      diagnosis,
      duration_ms: Date.now() - startedAt,
      ran_at: new Date().toISOString(),
    };

    await supabase
      .from("autonomous_fixer_tickets")
      .update({
        triage_results: triageResults,
        scope: scope.scope,
        affected_count: actions.reduce((acc, a) => acc + (a.count ?? 1), 0),
      })
      .eq("id", ticket_id);

    const agentResponse =
      outcome === "auto_fixed"
        ? `Autonomous backend resolved: ${diagnosis}`
        : outcome === "no_action_needed"
        ? `Diagnosis: ${diagnosis} No action required.`
        : outcome === "requires_executive"
        ? `Escalated to Executive review: ${diagnosis}`
        : `Code-level patch required: ${diagnosis} Queued for owner relay.`;

    const { error: resErr } = await supabase.rpc("resolve_autonomous_fixer_ticket", {
      _ticket_id: ticket_id,
      _outcome: outcome,
      _diagnosis: diagnosis,
      _agent_response: agentResponse,
      _actions: actions,
    });

    if (resErr) {
      return new Response(JSON.stringify({ error: resErr.message, triage: triageResults }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, outcome, diagnosis, scope, classification, probes, actions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

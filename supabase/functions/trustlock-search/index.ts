import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const knowledgeBase: Record<string, string> = {
  "escrow": "TrustLock escrow works by locking buyer funds in a smart contract until delivery is confirmed. The buyer pays → funds are held → vendor ships → buyer confirms → funds release. If no confirmation within 14 days, auto-release triggers. For milestone-based transactions, funds release per completed milestone stage.",
  "auto-release": "The 14-day auto-release mandate automatically releases escrowed funds to the vendor if the buyer does not confirm delivery or file a dispute within 14 calendar days of the shipped status. This protects vendors from indefinite fund holds.",
  "milestone": "Dynamic milestones break large transactions into stages (e.g., Order Placed → Materials Sourced → Inspection → Delivery). Each milestone can require documents, observer sign-offs, and partial payment releases. Industries like mining, construction, and agriculture have pre-configured milestone templates.",
  "dispute": "Disputes can be filed by buyers within the escrow period. TrustLock AI (Emmanuel) analyzes evidence and recommends resolution. For transactions ≥$10,000, arbitration escalation is available with a certified third-party arbitrator. Both parties must accept the ruling or it auto-executes after 7 days.",
  "kyc": "KYC (Know Your Customer) verification is required for vendors. Documents include government ID, proof of address, and business registration. Verification tiers: Basic (up to $5K/mo), Enhanced (up to $50K/mo), and Premium (unlimited). Processing takes 1-3 business days.",
  "fee": "TrustLock charges a 2.5% platform fee on each transaction. Payment processor fees are additional (Stripe ~2.9%, crypto ~1%). Arbitration incurs a 1-3% fee. Widget installation is $5/site. There are no monthly subscription fees on the Basic plan.",
  "payout": "Payouts support bank transfer, mobile money (M-Pesa, MTN), and crypto (USDC on Polygon). Processing times: bank 2-5 days, mobile money instant-24hrs, crypto 5-30 minutes. Local and diaspora modes available with country-specific field requirements.",
  "widget": "The TrustLock checkout widget embeds on any e-commerce site via a JavaScript snippet. It handles escrow payment collection, milestone display, and buyer protection badges. Installation requires adding a <script> tag and configuring your vendor API key.",
  "standalone": "Standalone Payment Links let vendors create shareable escrow-protected payment links without a website. Perfect for P2P transactions, freelancers, and social commerce. Links include item details, amount, and escrow terms.",
  "audit": "Audit access provides read-only sessions for regulators and compliance officers. Admins create time-limited sessions with specific table access permissions. All auditor activity is logged with IP, timestamp, and pages viewed.",
  "smart-contract": "TrustLock uses a Polygon-based USDC smart contract for on-chain escrow. It supports both atomic (single-release) and milestone-based transactions. The contract handles fund locking, conditional release, dispute holds, and auto-release timers.",
  "tax": "Tax calculation is dynamic based on buyer/vendor locations. Domestic transactions apply local VAT/sales tax. Cross-border within trade blocs applies destination VAT. International exports are zero-rated with applicable tariffs. Supported: US (7%), UK (20%), EU (17-27%), Nigeria (7.5%), UAE (5%), Kenya (16%), South Africa (15%).",
  "cancellation": "Mid-order cancellation follows milestone-based refund logic. Completed milestones are non-refundable. Pending milestones get full refund. In-progress milestones are subject to negotiation or arbitration. A 2% cancellation processing fee applies.",
  "acknowledgement": "Acknowledgement forms are digital agreements signed by both buyer and vendor at key milestones. They record terms, IP addresses, timestamps, and generate PDF records. Required for high-value transactions and regulated industries.",
  "holdback": "The escrow holdback clause retains 10% of payment post-delivery for a defined inspection period (typically 7-30 days). This protects buyers against latent defects while ensuring vendors receive 90% promptly.",
  "observer": "Observers are third-party inspectors, banks, or customs officials invited to verify specific milestones. They receive secure access links, can view relevant documents, and provide digital sign-offs that trigger the next stage.",
  "retention": "Document retention policy requires all transaction documents, contracts, and evidence to be archived for 7 years per compliance regulations. After 7 years, documents are securely destroyed. Admin can archive documents to long-term storage at any time.",
  "arbitration": "Arbitration escalation is available for disputes on transactions ≥$10,000. A certified third-party arbitrator reviews evidence from both parties. Rulings can include buyer refund, vendor release with split percentages, or dismissal. Arbitration fee is 1-3% of transaction value.",
  "os-pay": "TrustLock OS Pay is the internal payment service for platform fees, refunds, and split payments. It supports direct payment, refund processing, and percentage-based splits between multiple parties.",
  "os-payout": "TrustLock OS Payout handles fund withdrawals via local bank, mobile money, or crypto. It includes country-specific field requirements, fee calculation, and confirmation tracking. Supports both local and diaspora payout modes.",
  "industry": "TrustLock supports industry-specific workflows for: Construction, Mining, Agriculture, Real Estate, Tourism & Hospitality, Retail & E-commerce, Oil & Gas, Healthcare, Automotive, and Technology. Each has pre-configured milestones, compliance requirements, and observer roles.",
  "sanctions": "Sanctions screening checks all transaction parties against OFAC, EU, and UN consolidated lists using fuzzy matching. Results can be clear, flagged (admin review), or blocked (transaction denied). All screenings are logged for compliance audit.",
};

function findKnowledgeAnswer(query: string): string | null {
  const q = query.toLowerCase();
  const scores: { key: string; score: number }[] = [];

  for (const [key, value] of Object.entries(knowledgeBase)) {
    let score = 0;
    const keywords = key.split("-");
    for (const kw of keywords) {
      if (q.includes(kw)) score += 10;
    }
    const qWords = q.split(/\s+/).filter(w => w.length > 2);
    for (const w of qWords) {
      if (value.toLowerCase().includes(w)) score += 1;
    }
    if (score > 0) scores.push({ key, score });
  }

  scores.sort((a, b) => b.score - a.score);
  if (scores.length === 0) return null;

  const topAnswers = scores.slice(0, 2).map(s => knowledgeBase[s.key]);
  return topAnswers.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, role } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ success: false, error: "Query too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const q = String(query);

    // 1. Knowledge base lookup
    const knowledgeAnswer = findKnowledgeAnswer(q);

    // 2. Transactions
    const { data: txs } = await supabase
      .from("transactions")
      .select("id, tx_id, item, amount, status, buyer_name, vendor_name, order_number, created_at, industry, type, fee, tracking, shipped_date, delivered_date")
      .or(`tx_id.ilike.%${q}%,item.ilike.%${q}%,buyer_name.ilike.%${q}%,vendor_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 3. Disputes
    const { data: disputes } = await supabase
      .from("disputes")
      .select("id, dispute_id, reason, status, buyer_name, vendor_name, amount, tx_id, created_at, priority, ai_recommendation, description, arbitration_ruling")
      .or(`dispute_id.ilike.%${q}%,reason.ilike.%${q}%,buyer_name.ilike.%${q}%,vendor_name.ilike.%${q}%,tx_id.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 4. Orders (carbon copies)
    const { data: orders } = await supabase
      .from("order_carbon_copies")
      .select("id, order_number, item, amount, status, buyer_name, vendor_name, created_at, confirmation_code, fee")
      .or(`order_number.ilike.%${q}%,item.ilike.%${q}%,buyer_name.ilike.%${q}%,vendor_name.ilike.%${q}%,confirmation_code.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 5. Payout requests
    const { data: payouts } = await supabase
      .from("payout_requests")
      .select("id, order_number, confirmation_code, amount, fee, net_amount, status, role, payout_type, payment_provider, mode, created_at, completed_at")
      .or(`order_number.ilike.%${q}%,confirmation_code.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 6. Acknowledgement forms
    const { data: ackForms } = await supabase
      .from("acknowledgement_forms")
      .select("id, transaction_id, title, form_type, signed_by_buyer, signed_by_vendor, created_at, pdf_url")
      .or(`title.ilike.%${q}%,transaction_id.ilike.%${q}%,form_type.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 7. Archived reports
    const { data: reports } = await supabase
      .from("archived_reports")
      .select("id, name, file_type, file_size, file_url, owner_role, created_at")
      .or(`name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 8. Sanctions screening logs (admin only)
    let screeningLogs: unknown[] = [];
    if (role === "admin") {
      const { data: logs } = await supabase
        .from("sanctions_screening_logs")
        .select("id, full_name, country, result, risk_score, screening_source, user_role, created_at, transaction_id")
        .or(`full_name.ilike.%${q}%,country.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(5);
      screeningLogs = logs || [];
    }

    // 9. Protection documents
    const { data: protectionDocs } = await supabase
      .from("protection_documents")
      .select("id, document_type, title, transaction_id, user_id, role, industry, retention_years, created_at, is_archived, signed_by_buyer, signed_by_vendor")
      .or(`title.ilike.%${q}%,document_type.ilike.%${q}%,transaction_id::text.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    // 10. AI-powered answer if knowledge base didn't match well
    let aiAnswer: string | null = null;
    if (!knowledgeAnswer && q.length >= 4) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `You are TrustLock's internal search assistant. Answer questions about escrow payments, milestones, disputes, KYC, payouts, smart contracts, and platform features. Keep answers concise (2-3 sentences max). If the query is just a name or ID lookup, say "Searching database for matches..." instead. Do not make up transaction data.`,
                },
                { role: "user", content: q },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            aiAnswer = aiData.choices?.[0]?.message?.content || null;
          }
        }
      } catch {
        // Silent — AI answer is optional
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        knowledge_answer: knowledgeAnswer,
        ai_answer: aiAnswer,
        transactions: txs || [],
        disputes: disputes || [],
        orders: orders || [],
        payouts: payouts || [],
        acknowledgement_forms: ackForms || [],
        archived_reports: reports || [],
        screening_logs: screeningLogs,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Search error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

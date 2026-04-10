import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Amani, TrustLock's AI assistant for vendors. You help with dashboard metrics, widget setup, KYC submission, fee structures, payout timelines, and integration troubleshooting. You are professional and knowledgeable about African e-commerce. You wear a traditional Kenyan kanzu with modern accessories. You are Zawadi's twin brother. Never fabricate data. Format with markdown.

## Document & Image Analysis
- When a user uploads a document or image, analyze it thoroughly.
- For invoices/receipts: extract amounts, dates, vendor names, line items.
- For shipping documents: identify carrier, tracking numbers, origin/destination.
- For KYC documents: confirm document type (ID, license, certificate) and verify completeness.
- For milestone evidence: assess whether the evidence supports task completion.
- For dispute-related images: describe what you see objectively and note anything relevant.
- Always state clearly what you observe — never fabricate details not visible in the document.

## Document Authenticity Verification (CRITICAL CAPABILITY)
You have access to TrustLock's Global Document Verification Library covering 54 African countries + 30 major global trade partners. When a vendor uploads ANY official document (business registration, tax certificate, government ID, quality certification, trade license, certificate of origin, etc.), you MUST perform a structured authenticity assessment.

### Verification Protocol — Follow ALL Steps:
1. **Identify Document Type & Country**: Determine the document category and issuing country from visible text, language, emblems, and formatting.
2. **Check Security Features**: Compare against known security features for that document type and country:
   - Correct coat of arms / national emblem (e.g., Kenya's shield & spears, Nigeria's eagle, South Africa's coat of arms)
   - Official stamps, seals, or holograms from the correct issuing authority
   - Correct registration/ID number format (e.g., Kenya KRA PIN: A0XXXXXXXXA, Nigeria CAC RC: RC-XXXXXXX, SA CIPC: YYYY/XXXXXX/XX)
   - QR codes, barcodes, or digital verification elements
   - Watermarks and official paper quality indicators
   - Correct language(s) for the country (bilingual where required: Cameroon FR/EN, Egypt AR/EN, etc.)
   - Authorized signatory name matching the correct official for the period
3. **Scan for Forgery Indicators**:
   - Font inconsistencies between header and body
   - Pixelation around logos, stamps, or signatures (digital manipulation)
   - Date format mismatches with country standard
   - Registration number format violations
   - Missing mandatory fields that genuine documents always contain
   - Authority name/branding that doesn't match the claimed period (agencies get renamed/restructured)
   - Unusually perfect quality for older documents
   - QR codes linking to non-official domains
4. **Cross-Document Consistency**: If multiple documents are available, verify:
   - Company name identical across all documents
   - Registration numbers match between certificate and tax documents
   - Dates logically consistent (tax cert can't predate incorporation)
   - Director/officer names match
5. **Issue Verification Verdict**: Rate as one of:
   - ✅ **APPEARS AUTHENTIC** — All security features present, formats correct, no red flags
   - ⚠️ **NEEDS FURTHER VERIFICATION** — Some features present but cannot fully confirm (suggest online portal verification)
   - 🚩 **RED FLAGS DETECTED** — Specific forgery indicators found (list them explicitly)
   - ❌ **LIKELY FRAUDULENT** — Multiple critical forgery indicators present

### Online Verification Portals (Direct vendors here when possible):
- Kenya BRS: https://brs.go.ke | KRA iTax: https://itax.kra.go.ke
- Nigeria CAC: https://search.cac.gov.ng | FIRS: https://taxpromax.firs.gov.ng
- South Africa CIPC: https://eservices.cipc.co.za | SARS: https://www.sarsefiling.co.za
- Ghana RGD: https://rgd.gov.gh | GRA: https://gra.gov.gh
- Rwanda RDB: https://org.rdb.rw
- Tanzania BRELA: https://ors.brela.go.tz
- Uganda URSB: https://ursb.go.ug
- Zambia PACRA: https://www.pacra.org.zm
- Botswana CIPA: https://www.cipa.co.bw
- Morocco OMPIC: https://www.directinfo.ma
- For international: UK Companies House, US state SoS portals, China GSXT, India MCA, Singapore BizFile+, etc.

### Industry-Specific Document Knowledge:
- **Pharma**: GMP certificates, WHO Prequalification, CPP (Certificate of Pharmaceutical Product), cold chain compliance
- **Mining**: Assay certificates (must be ISO 17025 accredited lab), Kimberley Process certificates, EITI reports
- **Oil & Gas**: API certifications, CQ certificates, NNPC allocation letters
- **Agriculture**: Phytosanitary certificates (IPPC format), HACCP, organic certifications
- **Textiles**: AGOA certificates of origin, OEKO-TEX
- **Construction**: FIDIC certificates, performance bonds
- **Shipping**: Bill of Lading (container numbers must follow ISO 6346), Air Waybills (11-digit AWB with airline prefix)

IMPORTANT: You are an advisory tool — flag risks and provide verification guidance, but you cannot make binding authenticity rulings. When red flags are detected, recommend the vendor contact admin support or verify via the official portal.

## Behavior Rules
- Handle things expeditiously. No excessive sentiment — just professional guidance with personality.
- Apologies are occasional, genuine, and backed by reasoning — never hollow.
- NEVER hallucinate or fabricate metrics, transaction data, or fee amounts.
- NEVER give false promises or speculate on outcomes beyond established policies.
- Stick to TrustLock protocols and policies ONLY.
- Greet vendors formally (Mr./Ms.) and verify satisfaction before closing interactions.
- Format responses with markdown for readability.
- You are an advisory tool. You do not have authority to move funds or make binding decisions.

## Automatic Translation & Language Support
- If a vendor uploads a document in a non-English language, AUTOMATICALLY translate and summarize the key content in English so they can communicate findings with admin support.
- When providing the translation, clearly label the original language detected and present the English translation in a structured format.
- If a vendor writes to you in a non-English language, respond in THEIR language while also providing an English summary for record-keeping.
- For documents with mixed languages, translate all non-English sections and note which parts were in which language.

## Mobile App (PWA)
TrustLock is now available as an installable mobile app (Progressive Web App). Vendors can install it directly from their phone's browser — no app store needed.
- **Install page**: Direct vendors to trustlockpay.lovable.app/install for step-by-step instructions.
- **Android/Chrome**: Users will see an "Install TrustLock" button — one tap to add to home screen.
- **iPhone/Safari**: Tap the Share icon → "Add to Home Screen".
- Once installed, TrustLock opens like a native app with full-screen experience.
- This is especially important for vendors in mobile-first African markets who may not have desktop access.
- If a vendor mentions they only have a phone or asks about a mobile app, proactively recommend the install page.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { messages, attachments } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Track usage if authenticated
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await adminClient.from("ai_usage").insert({
            user_id: user.id,
            tokens_used: 0,
            query_count: 1,
            role: "vendor",
            assistant_name: "amani",
          });
        }
      } catch (trackErr) {
        console.error("Usage tracking error (non-fatal):", trackErr);
      }
    }

    // --- Context Injection: Pull vendor's transactions, documents, and signals ---
    let dataContext = "";
    let signalContext = "";
    if (authHeader) {
      try {
        const adminClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const supabaseUser = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseUser.auth.getUser();
        if (user) {
          // 1. Pull vendor profile
          const { data: profile } = await adminClient.from("profiles").select("full_name,email,location,corridor,onboarding_industry,preferred_currency,status").eq("id", user.id).single();

          // 2. Pull active transactions (last 10)
          const { data: txns } = await adminClient.from("transactions").select("id,tx_id,status,amount,currency,item,buyer_name,industry,milestone_count,created_at,fee").eq("vendor_id", user.id).order("created_at", { ascending: false }).limit(10);

          // 3. Pull KYC status
          const { data: kyc } = await adminClient.from("kyc_documents").select("name,status,created_at").eq("vendor_id", user.id).order("created_at", { ascending: false }).limit(5);

          // 4. Pull recent disputes
          const { data: disputes } = await adminClient.from("disputes").select("dispute_id,status,reason,amount,buyer_name,created_at").eq("vendor_id", user.id).order("created_at", { ascending: false }).limit(5);

          // 5. Pull pending milestones
          const { data: milestones } = await adminClient.from("transaction_milestones").select("id,title,status,amount,due_date,transaction_id").in("transaction_id", (txns || []).map(t => t.id)).in("status", ["pending", "in_progress"]).limit(10);

          // 6. Pull protection documents
          const { data: docs } = await adminClient.from("protection_documents").select("title,document_type,industry,created_at,signed_by_vendor,signed_by_buyer").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);

          // 7. Pull payout requests
          const { data: payouts } = await adminClient.from("payout_requests").select("amount,status,payment_provider,created_at,order_number").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);

          // 8. Pull document scan results
          const { data: scans } = await adminClient.from("document_scan_results").select("document_type,verdict,confidence_score,findings,country_detected,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);

          // Build context
          dataContext = "\n\n## 📊 VENDOR LIVE DATA (auto-injected — do NOT share raw data, use it to inform your answers)\n";
          if (profile) dataContext += `### Profile\nName: ${profile.full_name || 'Not set'} | Industry: ${profile.onboarding_industry || 'Not set'} | Location: ${profile.location || 'Not set'} | Currency: ${profile.preferred_currency} | Status: ${profile.status}\n`;
          if (txns && txns.length > 0) {
            dataContext += `### Active Transactions (${txns.length})\n`;
            for (const t of txns) dataContext += `- ${t.tx_id}: ${t.item || 'N/A'} | $${t.amount} ${t.currency || 'USD'} | Status: ${t.status} | Buyer: ${t.buyer_name || 'N/A'} | ${t.industry || ''}\n`;
          }
          if (milestones && milestones.length > 0) {
            dataContext += `### Pending Milestones (${milestones.length})\n`;
            for (const m of milestones) dataContext += `- "${m.title}" | $${m.amount || 0} | Status: ${m.status} | Due: ${m.due_date || 'No date'}\n`;
          }
          if (kyc && kyc.length > 0) {
            dataContext += `### KYC Documents\n`;
            for (const k of kyc) dataContext += `- ${k.name}: ${k.status}\n`;
          }
          if (disputes && disputes.length > 0) {
            dataContext += `### Disputes (${disputes.length})\n`;
            for (const d of disputes) dataContext += `- ${d.dispute_id}: ${d.reason || 'N/A'} | $${d.amount || 0} | Status: ${d.status} | Buyer: ${d.buyer_name || 'N/A'}\n`;
          }
          if (docs && docs.length > 0) {
            dataContext += `### Protection Documents (${docs.length})\n`;
            for (const d of docs) dataContext += `- ${d.title} (${d.document_type}) | Vendor signed: ${d.signed_by_vendor ? 'Yes' : 'No'} | Buyer signed: ${d.signed_by_buyer ? 'Yes' : 'No'}\n`;
          }
          if (payouts && payouts.length > 0) {
            dataContext += `### Recent Payouts\n`;
            for (const p of payouts) dataContext += `- $${p.amount} via ${p.payment_provider || 'N/A'} | Status: ${p.status} | Order: ${p.order_number || 'N/A'}\n`;
          }
          if (scans && scans.length > 0) {
            dataContext += `### Document Scan Results\n`;
            for (const s of scans) dataContext += `- ${s.document_type || 'Document'}: ${s.verdict} (${s.confidence_score || '?'}% confidence) | Country: ${s.country_detected || 'Unknown'}\n`;
          }

          // Signals
          const { data: signals } = await adminClient
            .from("ai_signals")
            .select("*")
            .eq("is_resolved", false)
            .or(`user_id.eq.${user.id},target_role.eq.vendor,target_role.eq.all`)
            .order("created_at", { ascending: false })
            .limit(10);

          if (signals && signals.length > 0) {
            signalContext = "\n\n## ⚡ ACTIVE SIGNALS FROM OTHER ASSISTANTS\n";
            for (const s of signals) {
              signalContext += `- [${s.severity.toUpperCase()}] (from ${s.source_assistant}) ${s.signal_type}: ${s.summary}\n`;
            }
          }
        }
      } catch (ctxErr) {
        console.error("Context injection error (non-fatal):", ctxErr);
      }
    }

    // Build multimodal messages — convert attachments to inline image_url parts
    const processedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
        const parts: any[] = [];
        if (msg.content) parts.push({ type: "text", text: msg.content });
        for (const att of msg.attachments) {
          if (att.type === "image" && att.data) {
            parts.push({
              type: "image_url",
              image_url: { url: att.data },
            });
          } else if (att.type === "document" && att.extractedText) {
            parts.push({
              type: "text",
              text: `\n\n--- Uploaded Document: ${att.name || "document"} ---\n${att.extractedText}\n--- End Document ---`,
            });
          }
        }
        return { role: "user", content: parts };
      }
      return msg;
    });

    // Also handle top-level attachments for the last message
    let finalMessages = processedMessages;
    if (attachments && attachments.length > 0) {
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.role === "user") {
        const parts: any[] = [];
        if (typeof lastMsg.content === "string") {
          parts.push({ type: "text", text: lastMsg.content });
        } else if (Array.isArray(lastMsg.content)) {
          parts.push(...lastMsg.content);
        }
        for (const att of attachments) {
          if (att.type === "image" && att.data) {
            parts.push({ type: "image_url", image_url: { url: att.data } });
          } else if (att.type === "document" && att.extractedText) {
            parts.push({ type: "text", text: `\n\n--- Uploaded Document: ${att.name || "document"} ---\n${att.extractedText}\n--- End Document ---` });
          }
        }
        finalMessages = [...finalMessages.slice(0, -1), { role: "user", content: parts }];
      }
    }

    // Use gemini-2.5-pro for multimodal (image+text), flash for text-only
    const hasImages = JSON.stringify(finalMessages).includes("image_url");
    const model = hasImages ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + dataContext + signalContext + `\n\n## Signal Writing Protocol\nWhen a vendor reports a significant issue (damage reports, delivery problems, buyer unresponsiveness, fraud suspicion), include a signal block at the END of your response in this exact format:\n<signal type="vendor_reported_issue" severity="warning" summary="Brief description"></signal>\nSeverity levels: info, warning, critical. Only emit signals for actionable issues — NOT for general questions.` },
          ...finalMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream response but also capture it to extract signals
    const originalBody = response.body;
    if (!originalBody) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // We'll tee the stream — one for the client, one for signal extraction
    const [clientStream, captureStream] = originalBody.tee();

    // Extract signals in the background (non-blocking)
    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE to extract content
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch { /* ignore */ }
          }
        }

        // Check for signal tags in the response
        const signalRegex = /<signal\s+type="([^"]+)"\s+severity="([^"]+)"\s+summary="([^"]+)">/g;
        let match;
        while ((match = signalRegex.exec(fullText)) !== null) {
          const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          // Get user for context
          if (authHeader) {
            const supabaseUser = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_ANON_KEY")!,
              { global: { headers: { Authorization: authHeader } } }
            );
            const { data: { user } } = await supabaseUser.auth.getUser();
            await adminClient.from("ai_signals").insert({
              signal_type: match[1],
              source_assistant: "amani",
              target_role: "admin",
              user_id: user?.id,
              severity: match[2],
              summary: match[3],
            });
          }
        }
      } catch (extractErr) {
        console.error("Signal extraction error (non-fatal):", extractErr);
      }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("amani-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Zawadi, TrustLock's AI assistant for buyers. You help with escrow protection, order tracking, dispute filing, bill payments, and fee/refund policies. You are warm, reassuring, and patient. You wear a colorful Maasai-inspired wrap with elegant jewelry. You are Amani's twin sister. Never fabricate data. Reassure buyers funds are protected. Recommend disputes when needed. Format with markdown.

## Document & Image Analysis
- When a user uploads a document or image, analyze it thoroughly.
- For receipts/invoices: extract key details (merchant, amount, date, items).
- For delivery photos: describe condition of goods, packaging, any visible damage.
- For shipping documents: identify tracking numbers, carrier, delivery status.
- For dispute evidence: objectively describe what the image shows and how it relates to the buyer's claim.
- For contracts/agreements: summarize key terms, obligations, and any clauses relevant to the buyer.
- Always state clearly what you observe — never fabricate details not visible in the document.

## Behavior Rules
- Handle things expeditiously. Be warm and reassuring but always professional.
- Apologies are occasional, genuine, and backed by reasoning — never hollow.
- NEVER hallucinate or fabricate order details, transaction data, or refund amounts.
- NEVER give false promises or speculate on outcomes beyond established policies.
- Stick to TrustLock protocols and policies ONLY.
- Greet buyers formally (Mr./Ms.) and verify satisfaction before closing interactions.
- Proactively reassure buyers that their funds are held safely in escrow until delivery is confirmed.
- When a buyer describes a problem that warrants action, recommend filing a dispute with clear steps.
- Format responses with markdown for readability.
- You are an advisory tool. You do not have authority to move funds or make binding decisions.

## Automatic Translation & Language Support
- If a user uploads a document in a non-English language, AUTOMATICALLY translate and summarize the key content in English so they can communicate findings with admin support.
- When providing the translation, clearly label the original language detected and present the English translation in a structured format.
- If a user writes to you in a non-English language, respond in THEIR language while also providing an English summary for record-keeping.
- For documents with mixed languages, translate all non-English sections and note which parts were in which language.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { messages, attachments } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            role: "buyer",
            assistant_name: "zawadi",
          });
        }
      } catch (trackErr) {
        console.error("Usage tracking error (non-fatal):", trackErr);
      }
    }

    // --- AI Signal Coordination: Read active signals for this buyer ---
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
          const { data: signals } = await adminClient
            .from("ai_signals")
            .select("*")
            .eq("is_resolved", false)
            .or(`user_id.eq.${user.id},target_role.eq.buyer,target_role.eq.all`)
            .order("created_at", { ascending: false })
            .limit(10);

          if (signals && signals.length > 0) {
            signalContext = "\n\n## ⚡ ACTIVE SIGNALS FROM OTHER ASSISTANTS\nThese are live intelligence signals from your sibling AIs. Use them to proactively inform the buyer.\n";
            for (const s of signals) {
              signalContext += `- [${s.severity.toUpperCase()}] (from ${s.source_assistant}) ${s.signal_type}: ${s.summary}\n`;
            }
          }
        }
      } catch (sigErr) {
        console.error("Signal read error (non-fatal):", sigErr);
      }
    }

    // Build multimodal messages
    const processedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.attachments && msg.attachments.length > 0) {
        const parts: any[] = [];
        if (msg.content) parts.push({ type: "text", text: msg.content });
        for (const att of msg.attachments) {
          if (att.type === "image" && att.data) {
            parts.push({ type: "image_url", image_url: { url: att.data } });
          } else if (att.type === "document" && att.extractedText) {
            parts.push({ type: "text", text: `\n\n--- Uploaded Document: ${att.name || "document"} ---\n${att.extractedText}\n--- End Document ---` });
          }
        }
        return { role: "user", content: parts };
      }
      return msg;
    });

    let finalMessages = processedMessages;
    if (attachments && attachments.length > 0) {
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.role === "user") {
        const parts: any[] = [];
        if (typeof lastMsg.content === "string") parts.push({ type: "text", text: lastMsg.content });
        else if (Array.isArray(lastMsg.content)) parts.push(...lastMsg.content);
        for (const att of attachments) {
          if (att.type === "image" && att.data) parts.push({ type: "image_url", image_url: { url: att.data } });
          else if (att.type === "document" && att.extractedText) parts.push({ type: "text", text: `\n\n--- Uploaded Document: ${att.name || "document"} ---\n${att.extractedText}\n--- End Document ---` });
        }
        finalMessages = [...finalMessages.slice(0, -1), { role: "user", content: parts }];
      }
    }

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
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...finalMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("zawadi-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

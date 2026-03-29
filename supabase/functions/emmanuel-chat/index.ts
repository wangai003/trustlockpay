import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Emmanuel, the lead AI dispute resolution analyst for TrustLock Payment Gateway — a patented escrow system for African vendor-diaspora transactions.

## Identity & Appearance
- You wear a casual round-neck Kenya national colors T-shirt (black, red, green). You have a Maasai warrior-inspired look with modern rectangular glasses.
- You are professional but approachable — more casual than your twin colleagues Amani and Zawadi.
- You are Kenyan. You take pride in your heritage but you are strictly business when analyzing cases.

## Your Role
- Analyze dispute cases when an admin provides client information (transaction ID, buyer name, vendor name, etc.)
- Provide detailed evidence analysis, risk assessment, and recommendations
- Recommendations must be one of: APPROVE (release funds to vendor), REFUND (return to buyer), or PARTIAL REFUND (specify %)
- You NEVER auto-resolve cases. You only recommend. The admin always makes the final decision.
- Always provide a confidence percentage (0-100%) with your recommendation
- Be thorough but concise. Cite specific evidence.
- If information is insufficient, ask for more details.
- You can discuss cases in depth — admins may challenge your reasoning.
- Remember ALL previous messages to maintain case context.

## Document & Image Analysis
- When an admin uploads dispute evidence (photos, receipts, shipping docs, contracts), analyze them in detail.
- For product photos: describe condition, compare to expected quality, note damage or discrepancies.
- For shipping documents: extract tracking info, delivery confirmation, carrier details.
- For receipts/invoices: verify amounts match the disputed transaction, check dates and vendors.
- For contracts/agreements: identify relevant clauses that apply to the dispute.
- For screenshots (chat logs, emails): summarize key communications between parties.
- Cross-reference uploaded evidence against the case details provided by the admin.
- Flag inconsistencies between evidence and claims made by either party.
- Always state what you observe — never fabricate details not visible in the document.

## Behavior Rules
- Handle things expeditiously. No excessive sentiment — just professional analysis with personality.
- Apologies are occasional, genuine, and backed by reasoning — never hollow.
- NEVER hallucinate or fabricate case details, evidence, or transaction data.
- NEVER give false promises or speculate on outcomes beyond your analysis.
- Stick to TrustLock protocols and policies ONLY.
- Cross-reference patterns from prior cases to improve analysis quality.
- Flag anomalies, repeat offenders, and suspicious patterns proactively.
- Format responses with markdown for readability.
- You are an advisory tool. You do not have authority to move funds or make binding decisions.
- Continuously improve reasoning by learning from case outcomes and admin feedback within the conversation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, attachments } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    console.error("emmanuel-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("emmanuel-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

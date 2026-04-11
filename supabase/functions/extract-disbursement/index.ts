import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify lender role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "lender")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Lender role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { document_url, file_name } = await req.json();

    if (!document_url) {
      return new Response(JSON.stringify({ error: "document_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Use AI to extract disbursement info from document description
    const systemPrompt = `You are a financial document analyzer. Extract disbursement/payment information from the document description or filename provided. Return a JSON object with these fields:
- amount: numeric amount (number, no currency symbols)
- currency: 3-letter currency code (e.g., USD, NGN, KES)
- date: disbursement date in YYYY-MM-DD format if found
- recipient: recipient/vendor name if found
- reference: reference/transaction number if found
- confidence: your confidence level 0-100

If you cannot extract a field, set it to null. Always return valid JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this financial document. File name: "${file_name || 'unknown'}". Document URL: ${document_url}. Extract any disbursement, payment, or transfer information.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_disbursement",
            description: "Extract disbursement details from a financial document",
            parameters: {
              type: "object",
              properties: {
                amount: { type: "number", description: "Disbursement amount" },
                currency: { type: "string", description: "3-letter currency code" },
                date: { type: "string", description: "Date in YYYY-MM-DD format" },
                recipient: { type: "string", description: "Recipient/vendor name" },
                reference: { type: "string", description: "Reference/transaction number" },
                confidence: { type: "number", description: "Extraction confidence 0-100" },
              },
              required: ["confidence"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_disbursement" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    let extracted = { amount: null, currency: null, date: null, recipient: null, reference: null, confidence: 0 };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse AI extraction");
      }
    }

    // Create pending disbursement record for review
    const { data: record, error: insertError } = await supabase
      .from("lender_disbursement_records")
      .insert({
        lender_id: user.id,
        amount_usd: extracted.amount || 0,
        local_currency_code: extracted.currency || null,
        disbursement_date: extracted.date || null,
        reference_number: extracted.reference || null,
        document_url: document_url,
        extraction_confidence: extracted.confidence || 0,
        source: "document_extract",
        status: "pending_review",
        notes: extracted.recipient ? `Extracted recipient: ${extracted.recipient}` : "AI-extracted — pending review",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save extraction" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      extracted,
      record_id: record.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-disbursement error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

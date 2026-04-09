import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vaultDocId, targetCategory, targetIndustry } = await req.json();
    if (!vaultDocId) throw new Error("vaultDocId is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch vault document
    const { data: doc, error: docErr } = await supabase
      .from("vendor_document_vault")
      .select("*")
      .eq("id", vaultDocId)
      .single();
    if (docErr || !doc) throw new Error("Document not found in vault");

    const issues: string[] = [];
    let status: "valid" | "expired" | "flagged" | "rejected" = "valid";
    let flaggedReason: string | null = null;

    // ── Rule 1: Expiry date check ──
    if (doc.expiry_date) {
      const expiry = new Date(doc.expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) {
        issues.push(`Document expired on ${doc.expiry_date}. Expired documents cannot be reused for new orders.`);
        status = "expired";
        flaggedReason = "expired";
      } else if (daysUntilExpiry <= 30) {
        issues.push(`Document expires in ${daysUntilExpiry} day(s). Consider uploading a renewed version.`);
      }
    }

    // ── Rule 2: Category mismatch check ──
    if (targetCategory && doc.category !== targetCategory && doc.category !== "general") {
      issues.push(
        `Document category "${doc.category}" does not match the required type "${targetCategory}". ` +
        `Using the wrong document type could delay your order.`
      );
      if (status === "valid") {
        status = "flagged";
        flaggedReason = "wrong_type";
      }
    }

    // ── Rule 3: Industry-specific document gates ──
    const INDUSTRY_REQUIRED_CATEGORIES: Record<string, string[]> = {
      "mining": ["certificate", "permit", "inspection", "compliance"],
      "real-estate": ["license", "certificate", "tax"],
      "agriculture": ["certificate", "inspection", "permit"],
      "energy": ["permit", "inspection", "compliance", "certificate"],
      "construction": ["license", "permit", "insurance", "inspection"],
      "pharmaceuticals": ["license", "certificate", "compliance", "inspection"],
      "logistics-freight": ["permit", "insurance", "certificate"],
    };

    if (targetIndustry && INDUSTRY_REQUIRED_CATEGORIES[targetIndustry]) {
      const required = INDUSTRY_REQUIRED_CATEGORIES[targetIndustry];
      if (doc.category !== "general" && !required.includes(doc.category)) {
        issues.push(
          `For ${targetIndustry} orders, accepted document types are: ${required.join(", ")}. ` +
          `"${doc.category}" may not satisfy industry compliance requirements.`
        );
      }
    }

    // ── Rule 4: AI-powered document content scan ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAnalysis: string | null = null;

    if (LOVABLE_API_KEY && doc.file_url && status !== "expired") {
      try {
        const scanPrompt = `You are a compliance document validator for TrustLock, a B2B escrow platform.

Analyze this document metadata and determine if it can be safely REUSED for a new escrow order.

Document details:
- Name: ${doc.vault_name}
- Category: ${doc.category}
- File type: ${doc.file_type || "unknown"}
- File size: ${doc.file_size || "unknown"}
- Originally uploaded: ${doc.created_at}
- Times previously used: ${doc.use_count || 0}
${doc.expiry_date ? `- Expiry date: ${doc.expiry_date}` : "- No expiry date set"}
${targetIndustry ? `- Target industry: ${targetIndustry}` : ""}
${targetCategory ? `- Required category: ${targetCategory}` : ""}

Check for these risks:
1. EXPIRY: Could this type of document (${doc.category}) typically expire? If yes and no expiry_date is set, flag it.
2. WRONG TYPE: Does the document name suggest it's different from its categorized type?
3. STALENESS: If the document was uploaded more than 12 months ago and is a time-sensitive type (insurance, inspection, permit), flag it.
4. NAMING RED FLAGS: Does the name contain words like "draft", "sample", "test", "template", "old", "expired" that suggest it's not a real document?
5. REUSE LIMITS: Some documents (like inspection reports) are per-shipment and shouldn't be reused across different orders.

Respond in this exact JSON format:
{
  "can_reuse": true/false,
  "risk_level": "none" | "low" | "medium" | "high",
  "issues": ["issue 1", "issue 2"],
  "recommendation": "one sentence recommendation",
  "likely_expired": true/false,
  "suggested_expiry_months": number or null
}`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a compliance document validator. Always respond with valid JSON only." },
              { role: "user", content: scanPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "validate_document",
                  description: "Return validation results for a vault document",
                  parameters: {
                    type: "object",
                    properties: {
                      can_reuse: { type: "boolean" },
                      risk_level: { type: "string", enum: ["none", "low", "medium", "high"] },
                      issues: { type: "array", items: { type: "string" } },
                      recommendation: { type: "string" },
                      likely_expired: { type: "boolean" },
                      suggested_expiry_months: { type: "number", nullable: true },
                    },
                    required: ["can_reuse", "risk_level", "issues", "recommendation", "likely_expired"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "validate_document" } },
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            aiAnalysis = parsed.recommendation;

            if (parsed.issues?.length) {
              issues.push(...parsed.issues);
            }

            if (!parsed.can_reuse && status === "valid") {
              status = "flagged";
              flaggedReason = "non_compliant";
            }

            if (parsed.risk_level === "high" && status !== "expired") {
              status = "flagged";
              flaggedReason = flaggedReason || "non_compliant";
            }

            if (parsed.likely_expired && !doc.expiry_date) {
              issues.push("AI analysis suggests this document type typically has an expiry date, but none is set. Please add an expiry date.");
            }
          }
        }
      } catch (aiErr) {
        console.error("AI scan error (non-fatal):", aiErr);
        // Non-fatal: continue with rule-based checks only
      }
    }

    // ── Rule 5: Staleness check (fallback if AI didn't catch it) ──
    const uploadAge = Math.ceil(
      (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const timeSensitiveCategories = ["insurance", "inspection", "permit", "compliance"];
    if (uploadAge > 365 && timeSensitiveCategories.includes(doc.category) && !doc.expiry_date) {
      const staleMsg = `This ${doc.category} document was uploaded ${Math.floor(uploadAge / 30)} months ago with no expiry date. Time-sensitive documents should be renewed periodically.`;
      if (!issues.some((i) => i.includes("months ago"))) {
        issues.push(staleMsg);
      }
      if (status === "valid") {
        status = "flagged";
        flaggedReason = "expired";
      }
    }

    // ── Persist validation result ──
    const validationNotes = issues.length > 0
      ? issues.join(" | ")
      : aiAnalysis || "Document passed all validation checks.";

    await supabase
      .from("vendor_document_vault")
      .update({
        validation_status: status,
        validation_notes: validationNotes,
        last_validated_at: new Date().toISOString(),
        flagged_reason: flaggedReason,
      })
      .eq("id", vaultDocId);

    // Determine if reuse is blocked
    const blocked = status === "expired" || status === "rejected";

    return new Response(
      JSON.stringify({
        success: true,
        canReuse: !blocked,
        status,
        flaggedReason,
        issues,
        recommendation: aiAnalysis,
        validationNotes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-vault-document error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

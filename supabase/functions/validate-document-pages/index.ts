import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Approximate PDF page count by counting /Type /Page entries */
function estimatePdfPageCount(pdfBytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(pdfBytes);
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

const CATEGORY_MIN_PAGES: Record<string, number> = {
  assay_report: 3,
  inspection: 2,
  survey_report: 3,
  insurance: 2,
  contract: 2,
  transfer_of_ownership: 2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, documentCategory, storageBucket, storagePath } = await req.json();

    if (!documentCategory) {
      return new Response(
        JSON.stringify({ valid: true, skipped: true, reason: "No category specified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const minPages = CATEGORY_MIN_PAGES[documentCategory];
    if (!minPages) {
      return new Response(
        JSON.stringify({ valid: true, skipped: true, reason: "No page-count rule for this category" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the PDF either from public URL or from storage
    let pdfBytes: Uint8Array;

    if (storageBucket && storagePath) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .download(storagePath);
      if (error || !data) {
        throw new Error(`Failed to download from storage: ${error?.message || "no data"}`);
      }
      pdfBytes = new Uint8Array(await data.arrayBuffer());
    } else if (fileUrl) {
      const resp = await fetch(fileUrl);
      if (!resp.ok) throw new Error(`Failed to fetch PDF: ${resp.status}`);
      pdfBytes = new Uint8Array(await resp.arrayBuffer());
    } else {
      throw new Error("Either fileUrl or storageBucket+storagePath required");
    }

    const pageCount = estimatePdfPageCount(pdfBytes);

    const issues: string[] = [];
    let flagged = false;

    if (pageCount < minPages) {
      flagged = true;
      issues.push(
        `This ${documentCategory.replace(/_/g, " ")} has only ${pageCount} page(s), but typically requires at least ${minPages}. ` +
        `Please ensure this is a complete document and not a partial upload.`
      );
    }

    // Also flag suspiciously large page counts (possible scan spam)
    if (pageCount > 100) {
      issues.push(
        `This document has ${pageCount} pages which is unusually large. Please verify it contains only relevant content.`
      );
    }

    // AI content analysis for suspicious documents
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiRecommendation: string | null = null;

    if (LOVABLE_API_KEY && flagged) {
      try {
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
                content: "You are a document compliance checker. Respond in one concise sentence.",
              },
              {
                role: "user",
                content: `A "${documentCategory.replace(/_/g, " ")}" PDF was uploaded with ${pageCount} page(s). The minimum expected is ${minPages}. Is this likely a valid complete document or a partial/incomplete upload? Respond with a brief recommendation.`,
              },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiRecommendation = aiData.choices?.[0]?.message?.content || null;
        }
      } catch {
        // Non-fatal
      }
    }

    return new Response(
      JSON.stringify({
        valid: !flagged,
        pageCount,
        minExpected: minPages,
        issues,
        aiRecommendation,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-document-pages error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

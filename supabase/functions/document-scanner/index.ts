import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCAN_PROMPT = `You are TrustLock's automated document verification system. Analyze the provided document image and return a structured JSON assessment.

## Verification Protocol
1. Identify document type and issuing country from visible text, emblems, language, formatting.
2. Check security features against known standards:
   - Kenya: BRS coat of arms, KRA PIN format A0XXXXXXXXA, KEBS Diamond Mark
   - Nigeria: CAC RC-XXXXXXX format, holographic sticker (post-2020), FIRS TIN 10 digits
   - South Africa: CIPC YYYY/XXXXXX/XX format, digital TCS PINs (post-2019)
   - Ghana: RGD registration, GRA TIN (C=company, P=individual)
   - Rwanda: Fully digital via RDB since 2018
   - International: Container ISO 6346, AWB 11-digit format, SWIFT 8/11 chars
3. Scan for forgery indicators: font inconsistencies, pixelation around stamps, format violations, date mismatches, missing mandatory fields, QR codes to non-official domains.
4. Issue verdict.

## Response Format (STRICT JSON)
{
  "document_type": "string (e.g., business_registration, tax_certificate, trade_license)",
  "country_detected": "string (e.g., Kenya, Nigeria)",
  "industry_detected": "string or null",
  "verdict": "authentic|needs_verification|red_flags|likely_fraudulent",
  "confidence_score": number (0-100),
  "findings": ["string array of observations"],
  "forgery_indicators": ["string array of red flags found, empty if none"],
  "verification_portal_url": "string URL for online verification or null",
  "summary": "One-sentence summary"
}

Return ONLY valid JSON. No markdown, no explanation.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { action, document_id, bucket, file_path, user_id, transaction_id } = await req.json();

    if (action === "scan_single") {
      // Scan a specific document by generating a signed URL and sending to vision AI
      if (!bucket || !file_path) throw new Error("bucket and file_path required");

      // Generate signed URL for the document
      const { data: signedData, error: signError } = await adminClient.storage
        .from(bucket)
        .createSignedUrl(file_path, 300); // 5 min expiry

      if (signError || !signedData?.signedUrl) {
        throw new Error(`Failed to generate signed URL: ${signError?.message || 'unknown'}`);
      }

      // Send to vision AI for analysis
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SCAN_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: `Analyze this document. Source: ${bucket}/${file_path}` },
                { type: "image_url", image_url: { url: signedData.signedUrl } },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI scan error:", aiResponse.status, errText);
        throw new Error(`AI analysis failed: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();
      const content = aiResult.choices?.[0]?.message?.content || "";

      // Parse the JSON response
      let scanResult;
      try {
        // Strip markdown code fences if present
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        scanResult = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI scan result:", content);
        scanResult = {
          document_type: "unknown",
          country_detected: null,
          industry_detected: null,
          verdict: "needs_verification",
          confidence_score: 0,
          findings: ["AI returned unparseable response"],
          forgery_indicators: [],
          verification_portal_url: null,
          summary: "Document could not be automatically analyzed",
        };
      }

      // Store result
      const { data: stored, error: storeErr } = await adminClient.from("document_scan_results").insert({
        document_source: bucket,
        document_ref: file_path,
        document_type: scanResult.document_type,
        country_detected: scanResult.country_detected,
        industry_detected: scanResult.industry_detected,
        verdict: scanResult.verdict,
        confidence_score: scanResult.confidence_score,
        findings: scanResult.findings,
        forgery_indicators: scanResult.forgery_indicators,
        verification_portal_url: scanResult.verification_portal_url,
        scanned_by: "document-scanner",
        user_id: user_id || null,
        transaction_id: transaction_id || null,
        file_url: signedData.signedUrl,
      }).select().single();

      if (storeErr) console.error("Failed to store scan result:", storeErr);

      // Emit AI signal if red flags or likely fraudulent
      if (scanResult.verdict === "red_flags" || scanResult.verdict === "likely_fraudulent") {
        await adminClient.from("ai_signals").insert({
          signal_type: `document_${scanResult.verdict}`,
          source_assistant: "document-scanner",
          target_role: "admin",
          user_id: user_id || null,
          transaction_id: transaction_id || null,
          severity: scanResult.verdict === "likely_fraudulent" ? "critical" : "warning",
          summary: `${scanResult.document_type || 'Document'} from ${scanResult.country_detected || 'unknown country'}: ${scanResult.summary || scanResult.verdict}`,
          context: { scan_id: stored?.id, forgery_indicators: scanResult.forgery_indicators },
        });
      }

      return new Response(JSON.stringify({ success: true, result: scanResult, scan_id: stored?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scan_batch") {
      // Scan all unscanned KYC documents
      const { data: kycDocs } = await adminClient
        .from("kyc_documents")
        .select("id,vendor_id,name,file_url,status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!kycDocs || kycDocs.length === 0) {
        return new Response(JSON.stringify({ success: true, scanned: 0, message: "No pending documents" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const doc of kycDocs) {
        // Check if already scanned
        const { data: existing } = await adminClient
          .from("document_scan_results")
          .select("id")
          .eq("document_source", "kyc-documents")
          .eq("document_ref", doc.file_url || doc.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Extract path from file_url
        if (!doc.file_url) continue;
        const pathMatch = doc.file_url.match(/kyc-documents\/(.+)/);
        if (!pathMatch) continue;
        const filePath = pathMatch[1];

        try {
          // Scan via recursive call
          const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/document-scanner`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              action: "scan_single",
              bucket: "kyc-documents",
              file_path: filePath,
              user_id: doc.vendor_id,
              document_id: doc.id,
            }),
          });
          const scanData = await scanResp.json();
          results.push({ doc_id: doc.id, name: doc.name, ...scanData });
        } catch (scanErr) {
          console.error(`Failed to scan ${doc.name}:`, scanErr);
          results.push({ doc_id: doc.id, name: doc.name, error: String(scanErr) });
        }
      }

      return new Response(JSON.stringify({ success: true, scanned: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scan_transaction_docs") {
      // Scan all documents related to a specific transaction
      if (!transaction_id) throw new Error("transaction_id required");

      const buckets = ["milestone-documents", "dispute-evidence", "acknowledgement-forms", "invoices"];
      const results = [];

      for (const bucket of buckets) {
        try {
          // List files in the transaction folder
          const { data: files } = await adminClient.storage
            .from(bucket)
            .list(transaction_id, { limit: 20 });

          if (!files || files.length === 0) continue;

          for (const file of files) {
            if (!file.name || file.name.startsWith(".")) continue;

            // Check if already scanned
            const filePath = `${transaction_id}/${file.name}`;
            const { data: existing } = await adminClient
              .from("document_scan_results")
              .select("id")
              .eq("document_source", bucket)
              .eq("document_ref", filePath)
              .limit(1);

            if (existing && existing.length > 0) continue;

            // Only scan image/pdf files
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (!["jpg", "jpeg", "png", "pdf", "webp"].includes(ext || "")) continue;

            try {
              const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/document-scanner`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                },
                body: JSON.stringify({
                  action: "scan_single",
                  bucket,
                  file_path: filePath,
                  transaction_id,
                }),
              });
              const scanData = await scanResp.json();
              results.push({ bucket, file: file.name, ...scanData });
            } catch (e) {
              console.error(`Scan error for ${bucket}/${filePath}:`, e);
            }
          }
        } catch (listErr) {
          console.error(`Failed to list ${bucket}/${transaction_id}:`, listErr);
        }
      }

      return new Response(JSON.stringify({ success: true, scanned: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: scan_single, scan_batch, scan_transaction_docs" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("document-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

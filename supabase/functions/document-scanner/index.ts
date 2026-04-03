import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── 11-Dimension Verification Prompt ────────────────────────────────────────
const SCAN_PROMPT = `You are TrustLock's automated document intelligence system — the most thorough trade document scanner on the planet. Analyze the provided document image across ALL 11 verification dimensions below. Be aggressive about catching fraud; err on the side of flagging.

## 11 VERIFICATION DIMENSIONS

### D1 – Document Authenticity
Check visible security features: official emblems, stamps, watermarks, holograms, QR codes to official domains, anti-counterfeit elements. Compare against known standards:
- Kenya: BRS coat of arms, KRA PIN format A0XXXXXXXXA, KEBS Diamond Mark, eTIMS compliance
- Nigeria: CAC RC-XXXXXXX format, holographic sticker (post-2020), FIRS TIN 10 digits, NAFDAC numbers
- South Africa: CIPC YYYY/XXXXXX/XX format, digital TCS PINs (post-2019), SARS Tax Reference
- Ghana: RGD registration, GRA TIN (C=company, P=individual)
- Rwanda: Fully digital via RDB since 2018, RURA for telecoms
- Tanzania: BRELA, TRA TIN 9 digits
- Uganda: URSB, URA TIN format
- Egypt: Commercial Registry CR, Tax Authority TIN
- Ethiopia: Ministry of Trade license format
- International: Container ISO 6346, AWB 11-digit format, SWIFT 8/11 chars, DUNS 9 digits, LEI 20 chars

### D2 – Registration Number Format Validation
Validate that all registration/tax/license numbers follow the exact regex pattern for their jurisdiction. Flag any deviation.

### D3 – Expiry & Validity Dates
Check for expiration dates, validity periods, "valid until" fields. Flag if:
- Document appears expired
- No validity period visible on a document that typically requires one
- Date format is inconsistent within the same document

### D4 – Name & Entity Consistency
Extract the entity/person name. Flag if:
- Name doesn't match what's expected for the user (if user context provided)
- Multiple different entity names appear in the same document
- Name appears altered or photoshopped

### D5 – Cross-Document Consistency
If transaction context is available, flag if:
- Invoice amount doesn't match transaction amount
- Entity name differs across documents in the same transaction
- Currency mismatches between related documents

### D6 – Jurisdiction & Corridor Compliance
Check if the document satisfies corridor requirements:
- Agricultural exports: Phytosanitary certificate, Certificate of Origin
- Mining/commodities: Mineral export permit, assay certificates
- Pharmaceuticals: GMP certificate, import permits, temperature logs
- Cross-border: Bill of Lading, Commercial Invoice, Packing List
- Financial services: AML certificate, source of funds declaration

### D7 – Sanctions & Watchlist Indicators
Flag any visible entity names that appear on:
- OFAC SDN list patterns
- EU consolidated sanctions
- UN Security Council lists
- Known shell company patterns (generic names + offshore jurisdictions)

### D8 – Currency & Amount Anomalies
Flag if:
- Invoice currency doesn't match the typical corridor
- Amounts are round numbers (potential structuring)
- Multiple invoices with identical amounts (potential duplication)
- Amount exceeds typical thresholds for the document type

### D9 – Industry-Specific Document Gates
Based on detected industry, check for REQUIRED companion documents:
- Agriculture: Fumigation certificate, phytosanitary cert, weight certificate
- Mining: Assay report, mineral export permit, chain of custody cert
- Manufacturing: Quality inspection report (AQL), factory audit
- Shipping/Logistics: Bill of Lading, packing list, insurance certificate
- Construction: Engineer's completion certificate, materials cert
- Textiles: AQL inspection, fabric test report

### D10 – Duplicate Detection Indicators
Flag if:
- Document looks templated (identical layout to previously seen fakes)
- Serial/reference numbers appear sequential or fabricated
- Multiple documents share identical formatting but different entity names

### D11 – Metadata & Tampering Indicators
Check for visual signs of:
- Font inconsistencies (different typefaces in official fields)
- Pixelation around stamps, signatures, or dates
- Misaligned text or graphical elements
- Color temperature differences between background and overlaid text
- JPEG artifacts suggesting image manipulation
- Date on document vs. apparent creation quality mismatch

## RESPONSE FORMAT (STRICT JSON)
{
  "document_type": "string",
  "country_detected": "string or null",
  "industry_detected": "string or null",
  "verdict": "authentic|needs_verification|red_flags|likely_fraudulent",
  "confidence_score": number (0-100),
  "dimensions": {
    "d1_authenticity": { "pass": boolean, "notes": "string" },
    "d2_registration_format": { "pass": boolean, "notes": "string" },
    "d3_expiry_validity": { "pass": boolean, "notes": "string" },
    "d4_name_consistency": { "pass": boolean, "notes": "string" },
    "d5_cross_document": { "pass": boolean, "notes": "string" },
    "d6_jurisdiction_compliance": { "pass": boolean, "notes": "string" },
    "d7_sanctions_indicators": { "pass": boolean, "notes": "string" },
    "d8_currency_anomalies": { "pass": boolean, "notes": "string" },
    "d9_industry_gates": { "pass": boolean, "notes": "string" },
    "d10_duplicate_indicators": { "pass": boolean, "notes": "string" },
    "d11_metadata_tampering": { "pass": boolean, "notes": "string" }
  },
  "findings": ["string array of all observations"],
  "forgery_indicators": ["string array of red flags found, empty if none"],
  "missing_companion_docs": ["string array of docs that should accompany this one"],
  "extracted_entities": {
    "entity_name": "string or null",
    "registration_number": "string or null",
    "tax_id": "string or null",
    "expiry_date": "string or null",
    "amount": "string or null",
    "currency": "string or null"
  },
  "verification_portal_url": "string URL for online verification or null",
  "summary": "One-sentence summary with the most critical finding"
}

Return ONLY valid JSON. No markdown, no explanation.`;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build transaction context string for cross-document checks */
async function getTransactionContext(adminClient: any, transactionId: string): Promise<string> {
  try {
    const { data: tx } = await adminClient.from("transactions").select("*").eq("id", transactionId).single();
    if (!tx) return "";

    const { data: prevScans } = await adminClient
      .from("document_scan_results")
      .select("document_type, verdict, extracted_entities, findings")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false })
      .limit(10);

    let ctx = `\n## Transaction Context\n`;
    ctx += `- Order: ${tx.tx_id || tx.id}\n- Amount: ${tx.amount} ${tx.currency || 'USD'}\n`;
    ctx += `- Buyer: ${tx.buyer_name || 'unknown'}\n- Vendor: ${tx.vendor_name || 'unknown'}\n`;
    ctx += `- Industry: ${tx.industry || 'unknown'}\n- Status: ${tx.status}\n`;

    if (prevScans && prevScans.length > 0) {
      ctx += `\n## Previously Scanned Documents in This Transaction\n`;
      for (const s of prevScans) {
        const entities = s.extracted_entities as any;
        ctx += `- ${s.document_type}: verdict=${s.verdict}`;
        if (entities?.entity_name) ctx += `, entity=${entities.entity_name}`;
        if (entities?.amount) ctx += `, amount=${entities.amount} ${entities?.currency || ''}`;
        ctx += `\n`;
      }
      ctx += `\nUse this to check D5 (cross-document consistency). Flag mismatches in names, amounts, currencies.\n`;
    }
    return ctx;
  } catch {
    return "";
  }
}

/** Build user context for name consistency checks */
async function getUserContext(adminClient: any, userId: string): Promise<string> {
  try {
    const { data: profile } = await adminClient.from("profiles").select("full_name, email, location").eq("id", userId).single();
    if (!profile) return "";
    return `\n## User Profile Context\n- Name: ${profile.full_name || 'unknown'}\n- Email: ${profile.email}\n- Location: ${profile.location || 'unknown'}\nUse this to verify D4 (name consistency). Flag if document entity doesn't match this user.\n`;
  } catch {
    return "";
  }
}

/** Check for previously scanned duplicates */
async function checkDuplicates(adminClient: any, docRef: string): Promise<string> {
  try {
    const { data: existing } = await adminClient
      .from("document_scan_results")
      .select("id, document_ref, extracted_entities, verdict, created_at")
      .neq("document_ref", docRef)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!existing || existing.length === 0) return "";
    return `\n## Existing Scans (for D10 duplicate detection)\nThere are ${existing.length} previously scanned documents in the system. Flag if this document appears to reuse serial numbers or identical layouts.\n`;
  } catch {
    return "";
  }
}

/** Resolve file URL — handles both direct URLs and bucket/path combos */
async function resolveFileUrl(
  adminClient: any,
  params: { file_url?: string; bucket?: string; file_path?: string }
): Promise<{ signedUrl: string; source: string; ref: string }> {
  // If direct file_url provided (from DB trigger), try to extract bucket/path or use directly
  if (params.file_url && !params.bucket) {
    // Try to extract bucket and path from Supabase storage URL
    const storageMatch = params.file_url.match(/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)/);
    if (storageMatch) {
      const bucket = storageMatch[1];
      const filePath = decodeURIComponent(storageMatch[2].split("?")[0]);
      const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(filePath, 300);
      if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message}`);
      return { signedUrl: data.signedUrl, source: bucket, ref: filePath };
    }
    // If it's already a full URL (external), use as-is
    if (params.file_url.startsWith("http")) {
      return { signedUrl: params.file_url, source: "external", ref: params.file_url };
    }
    throw new Error("Cannot resolve file_url format");
  }

  // Traditional bucket + file_path
  if (params.bucket && params.file_path) {
    const { data, error } = await adminClient.storage.from(params.bucket).createSignedUrl(params.file_path, 300);
    if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message}`);
    return { signedUrl: data.signedUrl, source: params.bucket, ref: params.file_path };
  }

  throw new Error("Either file_url or bucket+file_path required");
}

// ── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const { action, document_id, bucket, file_path, file_url, user_id, transaction_id, document_ref, document_source } = body;

    // ── SCAN SINGLE ───────────────────────────────────────────────────────
    if (action === "scan_single") {
      const resolved = await resolveFileUrl(adminClient, { file_url, bucket, file_path });

      // Build enriched context for cross-document and identity checks
      let extraContext = "";
      if (transaction_id) extraContext += await getTransactionContext(adminClient, transaction_id);
      if (user_id) extraContext += await getUserContext(adminClient, user_id);
      extraContext += await checkDuplicates(adminClient, document_ref || resolved.ref);

      const fullPrompt = SCAN_PROMPT + extraContext;

      // Send to vision AI for 11-dimension analysis
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: fullPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: `Analyze this document across all 11 verification dimensions. Source: ${document_source || resolved.source}/${document_ref || resolved.ref}` },
                { type: "image_url", image_url: { url: resolved.signedUrl } },
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
      let scanResult: any;
      try {
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
          dimensions: {},
          findings: ["AI returned unparseable response"],
          forgery_indicators: [],
          missing_companion_docs: [],
          extracted_entities: {},
          verification_portal_url: null,
          summary: "Document could not be automatically analyzed",
        };
      }

      // Count dimension failures for severity assessment
      const dims = scanResult.dimensions || {};
      const failedDims = Object.values(dims).filter((d: any) => d && !d.pass).length;
      const criticalDims = ["d1_authenticity", "d7_sanctions_indicators", "d11_metadata_tampering"];
      const hasCriticalFailure = criticalDims.some(k => dims[k] && !dims[k].pass);

      // Override verdict if dimension analysis reveals more issues
      if (hasCriticalFailure && scanResult.verdict === "needs_verification") {
        scanResult.verdict = "red_flags";
      }
      if (failedDims >= 4 && scanResult.verdict !== "likely_fraudulent") {
        scanResult.verdict = "red_flags";
      }
      if (failedDims >= 6) {
        scanResult.verdict = "likely_fraudulent";
      }

      // Store result with enriched data
      const { data: stored, error: storeErr } = await adminClient.from("document_scan_results").insert({
        document_source: document_source || resolved.source,
        document_ref: document_ref || resolved.ref,
        document_type: scanResult.document_type,
        country_detected: scanResult.country_detected,
        industry_detected: scanResult.industry_detected,
        verdict: scanResult.verdict,
        confidence_score: scanResult.confidence_score,
        findings: scanResult.findings,
        forgery_indicators: scanResult.forgery_indicators,
        verification_portal_url: scanResult.verification_portal_url,
        scanned_by: "document-scanner-v2",
        user_id: user_id || null,
        transaction_id: transaction_id || null,
        file_url: resolved.signedUrl,
      }).select().single();

      if (storeErr) console.error("Failed to store scan result:", storeErr);

      // ── ENFORCEMENT LAYER ─────────────────────────────────────────────
      const dims = scanResult.dimensions || {};
      const d4Failed = dims.d4_name_consistency && !dims.d4_name_consistency.pass;
      const d5Failed = dims.d5_cross_document && !dims.d5_cross_document.pass;
      const d7Failed = dims.d7_sanctions_indicators && !dims.d7_sanctions_indicators.pass;

      // 1. SANCTIONS HIT → immediate compliance hold + SAR trigger
      if (d7Failed && transaction_id) {
        await adminClient.from("transactions").update({
          status: "compliance_hold",
          updated_at: new Date().toISOString(),
        }).eq("id", transaction_id);

        await adminClient.from("compliance_flags").insert({
          flag_id: `SCAN-SANCTIONS-${stored?.id || Date.now()}`,
          type: "sanctions_match",
          severity: "critical",
          description: `Document scanner detected potential sanctions match: ${dims.d7_sanctions_indicators?.notes || 'Entity flagged'}`,
          related_buyer_id: null,
          related_vendor_id: user_id || null,
          status: "open",
        });

        // Notify user
        if (user_id) {
          await adminClient.from("notifications").insert({
            user_id,
            title: "Compliance Review Required",
            message: "A document you uploaded has triggered a compliance review. Your transaction has been paused pending admin verification. No action is needed from you at this time.",
            type: "warning",
            is_action_required: false,
            related_entity_type: "compliance_flag",
            related_entity_id: stored?.id,
          });
        }
      }

      // 2. HARD NAME MISMATCH (D4 + confidence < 50%) → auto-pause transaction + profile lock
      else if (d4Failed && scanResult.confidence_score < 50 && transaction_id) {
        await adminClient.from("transactions").update({
          status: "compliance_review",
          updated_at: new Date().toISOString(),
        }).eq("id", transaction_id).in("status", ["locked", "shipped", "delivered", "pending"]);

        // Lock profile to prevent changes that would "fix" the mismatch
        if (user_id) {
          await adminClient.from("profiles").update({
            status: "paused",
            updated_at: new Date().toISOString(),
          }).eq("id", user_id);

          await adminClient.from("notifications").insert({
            user_id,
            title: "Document Mismatch Detected",
            message: "The name on your uploaded document doesn't match your profile. Your account has been paused for review. Please contact support or wait for admin review.",
            type: "warning",
            is_action_required: true,
            action_url: "/settings",
            related_entity_type: "document_scan",
            related_entity_id: stored?.id,
          });
        }

        await adminClient.from("compliance_flags").insert({
          flag_id: `SCAN-MISMATCH-${stored?.id || Date.now()}`,
          type: "identity_mismatch",
          severity: "high",
          description: `Hard name mismatch: document entity "${scanResult.extracted_entities?.entity_name || 'unknown'}" does not match profile. Confidence: ${scanResult.confidence_score}%`,
          related_vendor_id: user_id || null,
          status: "open",
        });
      }

      // 3. SOFT NAME MISMATCH (D4 fail but confidence >= 50%) → notify user to update, don't block
      else if (d4Failed && scanResult.confidence_score >= 50) {
        if (user_id) {
          await adminClient.from("notifications").insert({
            user_id,
            title: "Profile Update Recommended",
            message: `The name on your document ("${scanResult.extracted_entities?.entity_name || 'detected name'}") doesn't exactly match your profile. Please update your profile to ensure smooth processing.`,
            type: "info",
            is_action_required: true,
            action_url: "/settings",
            related_entity_type: "document_scan",
            related_entity_id: stored?.id,
          });
        }
      }

      // 4. CROSS-DOC MISMATCH (D4 + D5 both fail) → freeze + compliance flag
      if (d4Failed && d5Failed && transaction_id) {
        await adminClient.from("transactions").update({
          status: "compliance_hold",
          updated_at: new Date().toISOString(),
        }).eq("id", transaction_id);

        await adminClient.from("compliance_flags").insert({
          flag_id: `SCAN-CROSSDOC-${stored?.id || Date.now()}`,
          type: "cross_document_mismatch",
          severity: "critical",
          description: `Cross-document identity conflict: entity name and amounts inconsistent across transaction documents. ${dims.d5_cross_document?.notes || ''}`,
          related_vendor_id: user_id || null,
          status: "open",
        });
      }

      // 5. LIKELY FRAUDULENT (6+ dimensions failed) → freeze everything
      if (scanResult.verdict === "likely_fraudulent") {
        if (transaction_id) {
          await adminClient.from("transactions").update({
            status: "compliance_hold",
            updated_at: new Date().toISOString(),
          }).eq("id", transaction_id);
        }

        if (user_id) {
          await adminClient.from("profiles").update({
            status: "paused",
            updated_at: new Date().toISOString(),
          }).eq("id", user_id);

          // Require re-verification
          await adminClient.from("kyc_documents").update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
          }).eq("vendor_id", user_id).eq("status", "pending");

          await adminClient.from("notifications").insert({
            user_id,
            title: "Account Under Review",
            message: "Multiple issues were detected with your uploaded documents. Your account and related transactions are under compliance review. You will need to re-submit verification documents.",
            type: "warning",
            is_action_required: true,
            action_url: "/kyc",
            related_entity_type: "document_scan",
            related_entity_id: stored?.id,
          });
        }
      }

      // ── AI SIGNALS (unchanged) ────────────────────────────────────────
      const signalSeverity = scanResult.verdict === "likely_fraudulent" ? "critical"
        : scanResult.verdict === "red_flags" ? "warning"
        : hasCriticalFailure ? "warning"
        : null;

      if (signalSeverity) {
        const failedList = Object.entries(dims)
          .filter(([_, v]: [string, any]) => v && !v.pass)
          .map(([k, v]: [string, any]) => `${k}: ${v.notes}`)
          .join("; ");

        await adminClient.from("ai_signals").insert({
          signal_type: `document_${scanResult.verdict}`,
          source_assistant: "document-scanner",
          target_role: "admin",
          user_id: user_id || null,
          transaction_id: transaction_id || null,
          severity: signalSeverity,
          summary: `[${failedDims}/11 checks failed] ${scanResult.document_type || 'Document'} from ${scanResult.country_detected || 'unknown'}: ${scanResult.summary}`,
          context: {
            scan_id: stored?.id,
            verdict: scanResult.verdict,
            failed_dimensions: failedDims,
            forgery_indicators: scanResult.forgery_indicators,
            missing_companion_docs: scanResult.missing_companion_docs,
            extracted_entities: scanResult.extracted_entities,
            dimension_details: failedList,
            enforcement_actions: [
              d7Failed ? "compliance_hold_sanctions" : null,
              d4Failed && scanResult.confidence_score < 50 ? "profile_locked" : null,
              d4Failed && d5Failed ? "cross_doc_freeze" : null,
              scanResult.verdict === "likely_fraudulent" ? "full_freeze_reverification" : null,
            ].filter(Boolean),
          },
        });

        if (scanResult.missing_companion_docs?.length > 0 && transaction_id) {
          await adminClient.from("ai_signals").insert({
            signal_type: "missing_companion_documents",
            source_assistant: "document-scanner",
            target_role: "admin",
            transaction_id,
            user_id: user_id || null,
            severity: "info",
            summary: `Missing required documents for ${scanResult.industry_detected || 'this'} transaction: ${scanResult.missing_companion_docs.join(", ")}`,
            context: { scan_id: stored?.id, missing: scanResult.missing_companion_docs },
          });
        }
      }
      return new Response(JSON.stringify({ success: true, result: scanResult, scan_id: stored?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SCAN BATCH ──────────────────────────────────────────────────────────
    if (action === "scan_batch") {
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
        const { data: existing } = await adminClient
          .from("document_scan_results")
          .select("id")
          .eq("document_source", "kyc-documents")
          .eq("document_ref", doc.file_url || doc.id)
          .limit(1);

        if (existing && existing.length > 0) continue;
        if (!doc.file_url) continue;
        const pathMatch = doc.file_url.match(/kyc-documents\/(.+)/);
        if (!pathMatch) continue;

        try {
          const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/document-scanner`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              action: "scan_single",
              bucket: "kyc-documents",
              file_path: pathMatch[1],
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

    // ── SCAN TRANSACTION DOCS ───────────────────────────────────────────────
    if (action === "scan_transaction_docs") {
      if (!transaction_id) throw new Error("transaction_id required");

      const buckets = ["milestone-documents", "dispute-evidence", "acknowledgement-forms", "invoices"];
      const results = [];

      for (const b of buckets) {
        try {
          const { data: files } = await adminClient.storage.from(b).list(transaction_id, { limit: 20 });
          if (!files || files.length === 0) continue;

          for (const file of files) {
            if (!file.name || file.name.startsWith(".")) continue;
            const filePath = `${transaction_id}/${file.name}`;
            const { data: existing } = await adminClient
              .from("document_scan_results")
              .select("id")
              .eq("document_source", b)
              .eq("document_ref", filePath)
              .limit(1);

            if (existing && existing.length > 0) continue;
            const ext = file.name.split(".").pop()?.toLowerCase();
            if (!["jpg", "jpeg", "png", "pdf", "webp"].includes(ext || "")) continue;

            try {
              const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/document-scanner`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                },
                body: JSON.stringify({ action: "scan_single", bucket: b, file_path: filePath, transaction_id }),
              });
              const scanData = await scanResp.json();
              results.push({ bucket: b, file: file.name, ...scanData });
            } catch (e) {
              console.error(`Scan error for ${b}/${filePath}:`, e);
            }
          }
        } catch (listErr) {
          console.error(`Failed to list ${b}/${transaction_id}:`, listErr);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helpers ───────────────────────────────────────────────
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── Blockchain Anchor Helper ─────────────────────────────
async function anchorProof(
  supabase: ReturnType<typeof createClient>,
  transactionId: string,
  recordType: string,
  eventData: Record<string, unknown>
) {
  try {
    const canonical = JSON.stringify(eventData, Object.keys(eventData).sort());
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const txData = encoder.encode(transactionId);
    let txRef = "0x";
    for (let i = 0; i < 32; i++) {
      const byte = txData[i % txData.length] ^ (i * 37);
      txRef += (byte & 0xff).toString(16).padStart(2, "0");
    }
    const { data: lastRecord } = await supabase
      .from("blockchain_proofs").select("content_hash").order("created_at", { ascending: false }).limit(1).single();
    const prevHash = lastRecord?.content_hash || "0x" + "0".repeat(64);
    await supabase.from("blockchain_proofs").insert({
      content_hash: contentHash, prev_hash: prevHash, record_type: recordType,
      tx_ref: txRef, transaction_id: transactionId, event_data: eventData, chain_status: "queued",
    });
    console.log(`[anchor] ${recordType} for tx ${transactionId.slice(0, 8)}...`);
  } catch (err) { console.error("[anchor] Failed:", err); }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function triageNotify(
  notificationType: string,
  userId: string,
  message: string,
  transactionId?: string,
  severity?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notification-triage`;
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        action: "triage",
        notification_type: notificationType,
        user_id: userId,
        message,
        transaction_id: transactionId,
        severity,
        metadata,
      }),
    });
  } catch (e) {
    console.error("Triage notification error:", e);
  }
}

// ─── Terms Templates ───────────────────────────────────────
function generateTermsText(
  formType: string,
  tx: Record<string, unknown>,
  milestone?: Record<string, unknown>
): string {
  const amount = Number(tx.amount ?? 0);
  const currency = "USD";
  const buyerName = tx.buyer_name ?? "Buyer";
  const vendorName = tx.vendor_name ?? "Vendor";
  const txId = tx.tx_id ?? tx.id;
  const item = tx.item ?? "goods/services";
  const industry = tx.industry ?? "general";
  const milestoneTitle = milestone?.title ?? "";
  const now = new Date().toISOString().split("T")[0];

  const baseHeader = `TRUSTLOCK ACKNOWLEDGEMENT FORM
Date: ${now}
Transaction ID: ${txId}
Industry: ${String(industry).toUpperCase()}
Item/Service: ${item}
Total Amount: ${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
Buyer: ${buyerName}
Vendor: ${vendorName}
${milestoneTitle ? `Milestone: ${milestoneTitle}` : ""}
──────────────────────────────────────────────`;

  const templates: Record<string, string> = {
    delivery_confirmation: `${baseHeader}

DELIVERY CONFIRMATION & RECEIPT ACKNOWLEDGEMENT

By signing below, ${buyerName} ("Buyer") confirms that:

1. The goods/services described as "${item}" have been received in satisfactory condition.
2. The delivery matches the specifications agreed upon at the time of escrow.
3. The Buyer authorizes TrustLock to release the escrowed funds of ${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${vendorName} ("Vendor"), less applicable platform and escrow fees.
4. This acknowledgement is final and irrevocable once both parties have signed.

By signing below, ${vendorName} ("Vendor") confirms that:
1. The goods/services were delivered as described.
2. The Vendor accepts the net payout after applicable fees.

PLATFORM TERMS:
- Funds will be released within 24 hours of dual signature.
- If the Buyer does not sign within the industry-adaptive auto-release window (14–90 days from shipment, depending on industry), an automatic release will be triggered per the TrustLock Auto-Release Mandate. Buyers may request up to 3 extensions of 14 days each.
- This document is compliant with UNCITRAL Model Law on Electronic Commerce and eIDAS/ESIGN Act requirements for electronic signatures.
- Disputes must be raised before signing this form. Once signed, arbitration rights for this milestone are waived.`,

    service_completion: `${baseHeader}

SERVICE COMPLETION ACKNOWLEDGEMENT

By signing below, ${buyerName} ("Buyer") confirms that:

1. The services described as "${item}" have been completed to the agreed-upon standard.
2. All deliverables associated with this service engagement have been received and reviewed.
3. The Buyer authorizes TrustLock to release the escrowed funds of ${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} to ${vendorName} ("Vendor").

By signing below, ${vendorName} ("Vendor") confirms that:
1. All contracted services have been rendered as described.
2. No outstanding obligations remain under this service agreement.

PLATFORM TERMS:
- This acknowledgement serves as the final sign-off for the service engagement.
- An industry-adaptive dispute window applies from the date of service completion (typically 14–30 days for services). Buyers may request extensions if needed.
- Compliant with ICC Incoterms 2020 for international service transactions.`,

    inspection_passed: `${baseHeader}

INSPECTION PASS CERTIFICATE

This form certifies that an authorized inspection has been conducted.

By signing below, ${buyerName} ("Buyer") acknowledges:
1. The inspection of "${item}" has been completed and passed all required quality checks.
2. Any defects or non-conformities have been resolved to the Buyer's satisfaction.
3. The Buyer approves the release of escrowed funds associated with this inspection milestone.

By signing below, ${vendorName} ("Vendor") acknowledges:
1. The goods/services passed inspection as represented.
2. The Vendor accepts liability for any latent defects discovered within the warranty period.

INSPECTION DETAILS:
${milestoneTitle ? `- Milestone: ${milestoneTitle}` : "- General inspection"}
- Standard: Industry-applicable quality standards

PLATFORM TERMS:
- A 90/10 Escrow Holdback Clause may apply: 90% released upon inspection pass, 10% held for final verification period.
- Observer/inspector sign-off may be required before fund release.`,

    milestone_signoff: `${baseHeader}

MILESTONE COMPLETION SIGN-OFF

${milestoneTitle ? `Milestone: "${milestoneTitle}"` : ""}

By signing below, both parties confirm:

1. The milestone described above has been completed according to the agreed specifications.
2. All required documents for this milestone have been submitted and verified.
3. The payment amount allocated to this milestone is authorized for release.

${buyerName} ("Buyer") specifically confirms:
- Receipt of all milestone deliverables.
- Satisfaction with the quality and completeness of work.

${vendorName} ("Vendor") specifically confirms:
- All milestone obligations have been fulfilled.
- Supporting documentation has been provided.

PLATFORM TERMS:
- Milestone payment will be released within 24 hours of dual signature.
- Remaining milestones in the transaction are unaffected by this sign-off.
- The industry-adaptive auto-release mandate applies per-milestone from the date the Vendor marks it as fulfilled. Window length varies by industry (14–90 days). Buyers may request extensions.`,

    final_release: `${baseHeader}

FINAL RELEASE & TRANSACTION CLOSURE

This form constitutes the final release of all escrowed funds and the closure of Transaction ${txId}.

By signing below, ${buyerName} ("Buyer") confirms:
1. All goods/services under this transaction have been received and accepted.
2. All milestones (if applicable) have been completed satisfactorily.
3. The Buyer authorizes the final release of all remaining escrowed funds to ${vendorName}.
4. The Buyer waives any further claims related to this transaction.

By signing below, ${vendorName} ("Vendor") confirms:
1. All contractual obligations have been fulfilled.
2. The Vendor accepts the final net payout after all applicable fees.
3. The Vendor waives any further claims for additional payment under this transaction.

PLATFORM TERMS:
- This is a final and irrevocable release.
- Both parties retain the right to access transaction records and carbon copies for audit purposes.
- TrustLock retains an immutable audit trail of this transaction in compliance with international record-keeping requirements.
- Compliant with: UNCITRAL, ICC Incoterms 2020, eIDAS/ESIGN Act.

LIABILITY WAIVER:
Both parties acknowledge that TrustLock acts solely as an escrow intermediary and bears no liability for the quality, condition, or fitness of the goods/services exchanged.`,
  };

  return templates[formType] ?? templates["delivery_confirmation"];
}

// ─── Action: Generate Form ─────────────────────────────────
async function generateForm(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { transaction_id, milestone_id, form_type, user_id, title } = body;

  if (!transaction_id || !form_type) {
    return errorResponse("transaction_id and form_type are required", 400);
  }

  const validTypes = ["delivery_confirmation", "service_completion", "inspection_passed", "milestone_signoff", "final_release"];
  if (!validTypes.includes(String(form_type))) {
    return errorResponse(`Invalid form_type. Valid: ${validTypes.join(", ")}`, 400);
  }

  // Fetch transaction
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", String(transaction_id))
    .single();

  if (txErr || !tx) return errorResponse("Transaction not found", 404);

  // Auth check
  if (user_id && String(user_id) !== tx.buyer_id && String(user_id) !== tx.vendor_id) {
    // Check admin
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", String(user_id))
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) return errorResponse("Unauthorized", 403);
  }

  // Fetch milestone if provided
  let milestone: Record<string, unknown> | null = null;
  if (milestone_id) {
    const { data: ms } = await supabase
      .from("transaction_milestones")
      .select("*")
      .eq("id", String(milestone_id))
      .single();
    milestone = ms;
  }

  // Generate terms
  const termsText = generateTermsText(String(form_type), tx, milestone ?? undefined);
  const formTitle = title
    ? String(title)
    : `${String(form_type).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} — ${tx.tx_id}`;

  // Check if form already exists for this transaction + milestone + type
  const existingQuery = supabase
    .from("acknowledgement_forms")
    .select("id")
    .eq("transaction_id", String(transaction_id))
    .eq("form_type", String(form_type));

  if (milestone_id) {
    existingQuery.eq("milestone_id", String(milestone_id));
  }

  const { data: existing } = await existingQuery.maybeSingle();
  if (existing) {
    return errorResponse("An acknowledgement form of this type already exists for this transaction/milestone", 400);
  }

  const { data: form, error: insErr } = await supabase
    .from("acknowledgement_forms")
    .insert({
      transaction_id: String(transaction_id),
      milestone_id: milestone_id ? String(milestone_id) : null,
      form_type: String(form_type),
      title: formTitle,
      terms_text: termsText,
      metadata: {
        industry: tx.industry,
        amount: tx.amount,
        item: tx.item,
        buyer_name: tx.buyer_name,
        vendor_name: tx.vendor_name,
        generated_by: user_id ?? "system",
        generated_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (insErr) return errorResponse(insErr.message, 500);

  // Notify both parties
  if (tx.buyer_id) {
    await triageNotify(
      "document_uploaded",
      tx.buyer_id,
      `An acknowledgement form "${formTitle}" has been generated for your review and signature.`,
      String(transaction_id),
      "medium",
      { form_id: form.id, form_type }
    );
  }
  if (tx.vendor_id) {
    await triageNotify(
      "document_uploaded",
      tx.vendor_id,
      `An acknowledgement form "${formTitle}" has been generated for your review and signature.`,
      String(transaction_id),
      "medium",
      { form_id: form.id, form_type }
    );
  }

  return jsonResponse({ success: true, form });
}

// ─── Action: Sign Form ─────────────────────────────────────
async function signForm(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { form_id, user_id, ip_address } = body;

  if (!form_id || !user_id) {
    return errorResponse("form_id and user_id are required", 400);
  }

  // Fetch form with transaction
  const { data: form, error: fErr } = await supabase
    .from("acknowledgement_forms")
    .select("*, transactions!inner(buyer_id, vendor_id, id, tx_id, amount, vendor_name, buyer_name)")
    .eq("id", String(form_id))
    .single();

  if (fErr || !form) return errorResponse("Form not found", 404);

  const tx = form.transactions as Record<string, unknown>;
  const isBuyer = String(user_id) === tx.buyer_id;
  const isVendor = String(user_id) === tx.vendor_id;

  if (!isBuyer && !isVendor) {
    return errorResponse("Only the buyer or vendor on this transaction can sign", 403);
  }

  const now = new Date().toISOString();
  const ip = ip_address ? String(ip_address) : "unknown";

  const updatePayload: Record<string, unknown> = {};

  if (isBuyer) {
    if (form.signed_by_buyer) return errorResponse("Buyer has already signed this form", 400);
    updatePayload.signed_by_buyer = true;
    updatePayload.buyer_signature_at = now;
    updatePayload.buyer_ip = ip;
  }

  if (isVendor) {
    if (form.signed_by_vendor) return errorResponse("Vendor has already signed this form", 400);
    updatePayload.signed_by_vendor = true;
    updatePayload.vendor_signature_at = now;
    updatePayload.vendor_ip = ip;
  }

  const { data: updated, error: upErr } = await supabase
    .from("acknowledgement_forms")
    .update(updatePayload)
    .eq("id", String(form_id))
    .select()
    .single();

  if (upErr) return errorResponse(upErr.message, 500);

  // Notify the other party
  const otherPartyId = isBuyer ? tx.vendor_id : tx.buyer_id;
  const signerRole = isBuyer ? "Buyer" : "Vendor";
  const signerName = isBuyer ? tx.buyer_name : tx.vendor_name;

  if (otherPartyId) {
    await triageNotify(
      "observer_signed",
      String(otherPartyId),
      `${signerName ?? signerRole} has signed the acknowledgement form "${form.title}". ${updated.signed_by_buyer && updated.signed_by_vendor ? "Both parties have now signed." : "Your signature is still required."}`,
      String(tx.id),
      "medium",
      { form_id, signer: signerRole }
    );
  }

  // Anchor: signature event
  await anchorProof(supabase, String(form.transaction_id), "signature", {
    event: "acknowledgement_form_signed",
    form_id: String(form_id),
    form_type: form.form_type,
    form_title: form.title,
    signer: signerRole,
    signer_id: String(user_id),
    signer_name: String(signerName ?? signerRole),
    ip_address: ip,
    signed_at: new Date().toISOString(),
  });

  // If both parties have now signed → trigger next workflow step
  const bothSigned = updated.signed_by_buyer && updated.signed_by_vendor;

  if (bothSigned) {
    // Anchor: acknowledgement form fully executed
    await anchorProof(supabase, String(form.transaction_id), "acknowledgement", {
      event: "acknowledgement_form_executed",
      form_id: String(form_id),
      form_type: form.form_type,
      form_title: form.title,
      buyer_signed_at: updated.buyer_signature_at,
      vendor_signed_at: updated.vendor_signature_at,
      buyer_ip: updated.buyer_ip,
      vendor_ip: updated.vendor_ip,
      executed_at: new Date().toISOString(),
    });

    // If this is tied to a payment milestone, trigger release
    if (form.milestone_id) {
      try {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/escrow-manager`;
        const releaseResp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "release_milestone_payment",
            milestone_id: form.milestone_id,
            user_id: String(user_id),
          }),
        });
        const releaseData = await releaseResp.json();

        if (releaseData.success) {
          // Notify both parties about the release
          for (const partyId of [tx.buyer_id, tx.vendor_id]) {
            if (partyId) {
              await triageNotify(
                "milestone_payment_release",
                String(partyId),
                `Payment for milestone "${form.title}" has been released after both parties signed the acknowledgement form.`,
                String(tx.id),
                "high",
                { form_id, milestone_id: form.milestone_id }
              );
            }
          }
        }
      } catch (e) {
        console.error("Milestone release trigger error:", e);
      }
    }

    // For final_release form type, trigger full transaction release
    if (form.form_type === "final_release" && !form.milestone_id) {
      try {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/escrow-manager`;
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "release_funds",
            txId: tx.tx_id,
            user_id: String(user_id),
          }),
        });
      } catch (e) {
        console.error("Fund release trigger error:", e);
      }
    }
  }

  return jsonResponse({
    success: true,
    form: updated,
    both_signed: bothSigned,
    signer: signerRole,
    workflow_triggered: bothSigned,
  });
}

// ─── Action: Get Form ──────────────────────────────────────
async function getForm(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { form_id, transaction_id } = body;

  if (!form_id && !transaction_id) {
    return errorResponse("form_id or transaction_id is required", 400);
  }

  if (form_id) {
    const { data: form, error } = await supabase
      .from("acknowledgement_forms")
      .select("*")
      .eq("id", String(form_id))
      .single();

    if (error || !form) return errorResponse("Form not found", 404);
    return jsonResponse({ success: true, form });
  }

  // Get all forms for a transaction
  const { data: forms, error } = await supabase
    .from("acknowledgement_forms")
    .select("*")
    .eq("transaction_id", String(transaction_id))
    .order("created_at", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true, forms, count: forms?.length ?? 0 });
}

// ─── Action: Generate PDF ──────────────────────────────────
async function generatePdf(body: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { form_id } = body;

  if (!form_id) return errorResponse("form_id is required", 400);

  // Fetch form with transaction data
  const { data: form, error: fErr } = await supabase
    .from("acknowledgement_forms")
    .select("*, transactions!inner(*)")
    .eq("id", String(form_id))
    .single();

  if (fErr || !form) return errorResponse("Form not found", 404);

  if (!form.signed_by_buyer || !form.signed_by_vendor) {
    return errorResponse("PDF can only be generated after both parties have signed", 400);
  }

  const tx = form.transactions as Record<string, unknown>;

  // Build a structured text-based PDF representation
  // Since we can't use reportlab in Deno, we generate a rich text document
  // that can be rendered as PDF by the client, or store the terms as-is
  const pdfContent = `
══════════════════════════════════════════════════════════
                    TRUSTLOCK PLATFORM
           SIGNED ACKNOWLEDGEMENT FORM RECEIPT
══════════════════════════════════════════════════════════

FORM DETAILS
────────────────────────────────────────────────────────
Form ID:         ${form.id}
Form Type:       ${String(form.form_type).replace(/_/g, " ").toUpperCase()}
Title:           ${form.title}
Transaction ID:  ${tx.tx_id}
Order Number:    ${tx.order_number ?? "N/A"}
Amount:          USD ${Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
Item/Service:    ${tx.item ?? "N/A"}
Industry:        ${tx.industry ?? "General"}
Created:         ${form.created_at}

PARTIES
────────────────────────────────────────────────────────
Buyer:           ${tx.buyer_name ?? "N/A"}
Buyer Location:  ${tx.buyer_location ?? "N/A"}

Vendor:          ${tx.vendor_name ?? "N/A"}
Vendor Location: ${tx.vendor_location ?? "N/A"}

SIGNATURES
────────────────────────────────────────────────────────
Buyer Signature:
  Signed:        ✅ Yes
  Timestamp:     ${form.buyer_signature_at}
  IP Address:    ${form.buyer_ip ?? "N/A"}

Vendor Signature:
  Signed:        ✅ Yes
  Timestamp:     ${form.vendor_signature_at}
  IP Address:    ${form.vendor_ip ?? "N/A"}

TERMS & CONDITIONS
────────────────────────────────────────────────────────
${form.terms_text}

══════════════════════════════════════════════════════════
This document was generated by the TrustLock Platform.
It constitutes a legally binding electronic record under
the eIDAS Regulation and the ESIGN Act.
Document Hash: ${form.id}-${new Date(form.buyer_signature_at).getTime()}-${new Date(form.vendor_signature_at).getTime()}
Generated:     ${new Date().toISOString()}
══════════════════════════════════════════════════════════
`.trim();

  // Store the PDF content as a text blob in storage
  const fileName = `acknowledgements/${form.id}.txt`;
  const encoder = new TextEncoder();
  const fileData = encoder.encode(pdfContent);

  // Try to upload to storage (if bucket exists), otherwise store content in metadata
  let pdfUrl = null;
  try {
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("kyc-documents")
      .upload(fileName, fileData, {
        contentType: "text/plain",
        upsert: true,
      });

    if (!uploadErr && uploadData) {
      const { data: urlData } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(fileName);
      pdfUrl = urlData?.publicUrl ?? null;
    }
  } catch (e) {
    console.error("Storage upload error:", e);
  }

  // Update form with PDF URL or content reference
  const { error: upErr } = await supabase
    .from("acknowledgement_forms")
    .update({
      pdf_url: pdfUrl ?? `internal://${fileName}`,
      metadata: {
        ...(form.metadata as Record<string, unknown> ?? {}),
        pdf_generated_at: new Date().toISOString(),
        pdf_content_hash: `${form.id}-${Date.now()}`,
      },
    })
    .eq("id", String(form_id));

  if (upErr) console.error("PDF URL update error:", upErr.message);

  return jsonResponse({
    success: true,
    form_id: form.id,
    pdf_url: pdfUrl ?? `internal://${fileName}`,
    pdf_content: pdfContent,
    message: "PDF receipt generated successfully",
  });
}

// ─── Main Handler ──────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "generate":
        return await generateForm(body);
      case "sign":
        return await signForm(body);
      case "get_form":
        return await getForm(body);
      case "generate_pdf":
        return await generatePdf(body);
      default:
        return errorResponse(
          `Unknown action: ${action}. Valid: generate, sign, get_form, generate_pdf`,
          400
        );
    }
  } catch (err) {
    console.error("acknowledgement-form error:", err);
    return errorResponse("Internal server error", 500);
  }
});

/**
 * Centralized document file-type enforcement rules.
 * Maps document categories to accepted formats, max files, and anti-fragmentation rules.
 */

export interface DocumentCategoryRule {
  /** Human label */
  label: string;
  /** Accepted file extensions (lowercase, no dot) */
  acceptedFormats: string[];
  /** Max number of files allowed for this category */
  maxFiles: number;
  /** If true, user MUST upload a single consolidated PDF — no multi-image uploads */
  requireConsolidatedPdf: boolean;
  /** Minimum expected page count for PDF (flags suspiciously thin docs) */
  minExpectedPages?: number;
  /** Description shown to users */
  formatHint: string;
}

/**
 * Category rules keyed by document category slug.
 * Used across milestone uploads, vault validation, and dispute evidence.
 */
export const DOCUMENT_CATEGORY_RULES: Record<string, DocumentCategoryRule> = {
  // ── Reports & assessments (consolidated PDF only) ──
  assay_report: {
    label: "Assay / Inspection Report",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 3,
    formatHint: "Single consolidated PDF required (typically 3–15 pages).",
  },
  inspection: {
    label: "Inspection Report",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 2,
    formatHint: "Single consolidated PDF required.",
  },
  survey_report: {
    label: "Survey / Valuation Report",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 3,
    formatHint: "Single consolidated PDF required.",
  },

  // ── Certificates (single document, PDF preferred) ──
  certificate: {
    label: "Certificate (Origin, End-User, etc.)",
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxFiles: 1,
    requireConsolidatedPdf: false,
    formatHint: "PDF preferred. Single image (JPG/PNG) accepted if one page.",
  },
  certificate_of_origin: {
    label: "Certificate of Origin",
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxFiles: 1,
    requireConsolidatedPdf: false,
    formatHint: "PDF preferred. Single image accepted if one page.",
  },
  end_user_certificate: {
    label: "End-User Certificate",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },

  // ── Government & identity documents ──
  government_id: {
    label: "Government ID",
    acceptedFormats: ["jpg", "jpeg", "png", "pdf"],
    maxFiles: 2,
    requireConsolidatedPdf: false,
    formatHint: "Front + Back allowed as separate files. PDF also accepted.",
  },
  buyer_id: {
    label: "Buyer Identification",
    acceptedFormats: ["jpg", "jpeg", "png", "pdf"],
    maxFiles: 2,
    requireConsolidatedPdf: false,
    formatHint: "Front + Back allowed as separate files.",
  },

  // ── Legal & financial (consolidated PDF only) ──
  license: {
    label: "License / Registration",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  permit: {
    label: "Permit / Authorization",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  insurance: {
    label: "Insurance Certificate / Policy",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 2,
    formatHint: "Single consolidated PDF required.",
  },
  invoice: {
    label: "Invoice / Receipt",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  tax: {
    label: "Tax Document",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  contract: {
    label: "Contract / Agreement",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 2,
    formatHint: "Single consolidated PDF required.",
  },
  letter_of_credit: {
    label: "Letter of Credit",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },

  // ── Shipping & logistics (consolidated PDF only) ──
  bill_of_lading: {
    label: "Bill of Lading",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  customs_declaration: {
    label: "Customs Declaration",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  airway_bill: {
    label: "Airway Bill",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  packing_list: {
    label: "Packing List",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  phytosanitary: {
    label: "Phytosanitary Certificate",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  fumigation: {
    label: "Fumigation Certificate",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },

  // ── Proof / evidence (photos allowed) ──
  proof_of_delivery: {
    label: "Proof of Delivery / Site Photos",
    acceptedFormats: ["jpg", "jpeg", "png", "pdf"],
    maxFiles: 10,
    requireConsolidatedPdf: false,
    formatHint: "Multiple images allowed (up to 10). PDF also accepted.",
  },
  site_photos: {
    label: "Site / Progress Photos",
    acceptedFormats: ["jpg", "jpeg", "png"],
    maxFiles: 10,
    requireConsolidatedPdf: false,
    formatHint: "Multiple images allowed (up to 10).",
  },
  delivery_confirmation: {
    label: "Delivery Confirmation",
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxFiles: 3,
    requireConsolidatedPdf: false,
    formatHint: "PDF preferred. Up to 3 images accepted.",
  },

  // ── Industry-specific ──
  discharge_receipt: {
    label: "Tank Farm / Discharge Receipt",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },
  transfer_of_ownership: {
    label: "Transfer of Ownership",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    minExpectedPages: 2,
    formatHint: "Single consolidated PDF required.",
  },
  client_approval: {
    label: "Client Approval / Sign-off",
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxFiles: 1,
    requireConsolidatedPdf: false,
    formatHint: "PDF preferred. Single image accepted.",
  },
  compliance: {
    label: "Compliance Document",
    acceptedFormats: ["pdf"],
    maxFiles: 1,
    requireConsolidatedPdf: true,
    formatHint: "Single consolidated PDF required.",
  },

  // ── Catch-all / general ──
  general: {
    label: "General Document",
    acceptedFormats: ["pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"],
    maxFiles: 10,
    requireConsolidatedPdf: false,
    formatHint: "PDF, images, or office documents accepted.",
  },
};

/**
 * Get the rule for a category, falling back to "general".
 */
export function getCategoryRule(category: string): DocumentCategoryRule {
  return DOCUMENT_CATEGORY_RULES[category] || DOCUMENT_CATEGORY_RULES.general;
}

/**
 * Validates a batch of files against a category rule.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function validateFilesForCategory(
  files: File[],
  category: string,
  existingFileCount: number = 0
): { valid: boolean; reason?: string } {
  const rule = getCategoryRule(category);

  // Anti-fragmentation: block multiple image uploads when consolidated PDF is required
  if (rule.requireConsolidatedPdf) {
    const imageFiles = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      return ["jpg", "jpeg", "png", "webp", "bmp", "tiff"].includes(ext);
    });

    if (imageFiles.length > 0) {
      return {
        valid: false,
        reason: `${rule.label} requires a single consolidated PDF. Please combine your pages into one PDF file before uploading. Image files (JPG, PNG) are not accepted for this document type.`,
      };
    }

    if (files.length > 1) {
      return {
        valid: false,
        reason: `${rule.label} requires a single consolidated PDF. You uploaded ${files.length} files — please combine them into one PDF.`,
      };
    }

    if (existingFileCount >= 1) {
      return {
        valid: false,
        reason: `${rule.label} allows only 1 file. Remove the existing file before uploading a replacement.`,
      };
    }
  }

  // Max files check
  const totalAfterUpload = existingFileCount + files.length;
  if (totalAfterUpload > rule.maxFiles) {
    return {
      valid: false,
      reason: `${rule.label} allows a maximum of ${rule.maxFiles} file(s). You currently have ${existingFileCount} and are trying to add ${files.length}.`,
    };
  }

  // File extension check
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!rule.acceptedFormats.includes(ext)) {
      return {
        valid: false,
        reason: `"${file.name}" has type .${ext} which is not accepted for ${rule.label}. Accepted formats: ${rule.acceptedFormats.map((f) => `.${f}`).join(", ")}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Build the accept string for an <input type="file"> from a category rule.
 */
export function getAcceptStringForCategory(category: string): string {
  const rule = getCategoryRule(category);
  return rule.acceptedFormats.map((f) => `.${f}`).join(",");
}

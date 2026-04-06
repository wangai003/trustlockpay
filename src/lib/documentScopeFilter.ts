import type { TradeScope } from "@/components/shared/TradeScopeSelector";

/**
 * Documents that are only required for specific trade scopes.
 * Documents NOT listed here are assumed required at ALL scopes.
 * Key = document name (case-insensitive match), value = scopes where it's required.
 */
const SCOPE_GATED_DOCUMENTS: Record<string, TradeScope[]> = {
  // International-only docs
  "bill of lading": ["international"],
  "air waybill": ["international"],
  "customs declaration": ["international", "regional"],
  "export license": ["international", "regional"],
  "export permit": ["international", "regional"],
  "import declaration": ["international"],
  "import permit": ["international"],
  "certificate of origin": ["international", "regional"],
  "ccpit certificate": ["international"],
  "phytosanitary cert": ["international", "regional"],
  "fumigation certificate": ["international", "regional"],
  "aml declaration": ["international", "regional"],
  "end-user certificate": ["international"],
  "kimberley process": ["international"],
  "gmp certificate": ["international", "regional"],
  "nafdac approval": ["international", "regional"],
  "fda approval": ["international", "regional"],

  // Regional + International docs
  "customs clearance": ["international", "regional"],
  "transit waybill": ["regional", "international"],
  "trade contract": ["regional", "international", "hybrid"],

  // Hybrid-specific (domestic + imported inputs)
  "supplier import receipt": ["hybrid", "international"],

  // Always required (not listed = required everywhere):
  // Inspection Report, Delivery Receipt, Quality Certificate, Insurance Cert,
  // Construction Contract, Title Deed, etc.
};

/**
 * Determine if a document is required, optional, or hidden based on trade scope.
 * Returns:
 * - "required" — must upload at this scope
 * - "optional" — shown but not blocking
 * - "hidden" — not shown at all (irrelevant for this scope)
 */
export function getDocumentScopeStatus(
  docName: string,
  tradeScope: TradeScope,
  originalMode: "required" | "optional" | "none"
): "required" | "optional" | "hidden" {
  if (originalMode === "none") return "hidden";

  const key = docName.toLowerCase().trim();

  // Check if this document has scope restrictions
  const scopeRestriction = Object.entries(SCOPE_GATED_DOCUMENTS).find(
    ([gatedDoc]) => key.includes(gatedDoc) || gatedDoc.includes(key)
  );

  if (!scopeRestriction) {
    // Not scope-gated — keep original mode
    return originalMode;
  }

  const [, allowedScopes] = scopeRestriction;

  if (allowedScopes.includes(tradeScope)) {
    // This scope requires this doc — keep original mode
    return originalMode;
  }

  // This scope doesn't need this doc
  if (originalMode === "required") {
    // Downgrade from required → optional (still uploadable, just not blocking)
    return "optional";
  }

  // Was already optional, now hide it
  return "hidden";
}

/**
 * Filter and re-classify document lists based on trade scope.
 */
export function filterDocumentsByScope(
  requiredDocs: string[],
  optionalDocs: string[],
  tradeScope: TradeScope
): { required: string[]; optional: string[]; scopeDowngraded: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  const scopeDowngraded: string[] = [];

  for (const doc of requiredDocs) {
    const status = getDocumentScopeStatus(doc, tradeScope, "required");
    if (status === "required") required.push(doc);
    else if (status === "optional") {
      optional.push(doc);
      scopeDowngraded.push(doc);
    }
    // "hidden" = dropped entirely
  }

  for (const doc of optionalDocs) {
    const status = getDocumentScopeStatus(doc, tradeScope, "optional");
    if (status === "optional") optional.push(doc);
    // "hidden" = dropped
  }

  return { required, optional, scopeDowngraded };
}

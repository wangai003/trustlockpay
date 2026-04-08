/**
 * Incoterms 2020 Responsibility Matrix
 * Maps trade terms to buyer/vendor responsibility for each fee category.
 * "vendor" = seller bears cost, "buyer" = buyer bears cost, "shared" = negotiable
 */

export type Incoterm = "EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CIF" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP";

export interface IncotermInfo {
  code: Incoterm;
  name: string;
  description: string;
  /** Which modes of transport this term applies to */
  modes: ("sea" | "any")[];
}

export const INCOTERMS: IncotermInfo[] = [
  { code: "EXW", name: "Ex Works", description: "Buyer bears all costs from seller's premises", modes: ["any"] },
  { code: "FCA", name: "Free Carrier", description: "Vendor delivers to carrier; buyer handles main carriage", modes: ["any"] },
  { code: "FAS", name: "Free Alongside Ship", description: "Vendor delivers alongside vessel at port", modes: ["sea"] },
  { code: "FOB", name: "Free On Board", description: "Vendor loads onto vessel; risk transfers at ship's rail", modes: ["sea"] },
  { code: "CFR", name: "Cost and Freight", description: "Vendor pays freight to destination port; buyer bears insurance", modes: ["sea"] },
  { code: "CIF", name: "Cost, Insurance & Freight", description: "Vendor pays freight + insurance to destination port", modes: ["sea"] },
  { code: "CPT", name: "Carriage Paid To", description: "Vendor pays carriage to destination; buyer bears insurance", modes: ["any"] },
  { code: "CIP", name: "Carriage & Insurance Paid", description: "Vendor pays carriage + insurance to destination", modes: ["any"] },
  { code: "DAP", name: "Delivered at Place", description: "Vendor delivers to named place, unloaded by buyer", modes: ["any"] },
  { code: "DPU", name: "Delivered at Place Unloaded", description: "Vendor delivers and unloads at destination", modes: ["any"] },
  { code: "DDP", name: "Delivered Duty Paid", description: "Vendor bears all costs including import duties", modes: ["any"] },
];

export type FeeCategory =
  | "inland_transport_origin"
  | "export_clearance"
  | "freight"
  | "cargo_insurance"
  | "import_clearance"
  | "import_duty"
  | "inland_transport_dest"
  | "unloading";

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  inland_transport_origin: "Inland Transport (Origin)",
  export_clearance: "Export Clearance",
  freight: "Main Carriage / Freight",
  cargo_insurance: "Cargo Insurance",
  import_clearance: "Import Clearance",
  import_duty: "Import Duty / Customs",
  inland_transport_dest: "Inland Transport (Destination)",
  unloading: "Unloading at Destination",
};

type Responsibility = "vendor" | "buyer" | "shared";

/**
 * Responsibility matrix: INCOTERM → FEE CATEGORY → who pays
 */
const MATRIX: Record<Incoterm, Record<FeeCategory, Responsibility>> = {
  EXW: {
    inland_transport_origin: "buyer",
    export_clearance: "buyer",
    freight: "buyer",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  FCA: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "buyer",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  FAS: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "buyer",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  FOB: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "buyer",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  CFR: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  CIF: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "vendor",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  CPT: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "buyer",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  CIP: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "vendor",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "buyer",
    unloading: "buyer",
  },
  DAP: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "vendor",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "vendor",
    unloading: "buyer",
  },
  DPU: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "vendor",
    import_clearance: "buyer",
    import_duty: "buyer",
    inland_transport_dest: "vendor",
    unloading: "vendor",
  },
  DDP: {
    inland_transport_origin: "vendor",
    export_clearance: "vendor",
    freight: "vendor",
    cargo_insurance: "vendor",
    import_clearance: "vendor",
    import_duty: "vendor",
    inland_transport_dest: "vendor",
    unloading: "vendor",
  },
};

export function getResponsibility(incoterm: Incoterm, category: FeeCategory): Responsibility {
  return MATRIX[incoterm]?.[category] ?? "shared";
}

export function getResponsibilities(incoterm: Incoterm): Record<FeeCategory, Responsibility> {
  return MATRIX[incoterm] ?? MATRIX.FOB;
}

/**
 * Map a free-text fee label to the closest fee category for Incoterms matching.
 */
export function inferFeeCategory(feeLabel: string): FeeCategory | null {
  const lower = feeLabel.toLowerCase();

  if (/customs\s*duty|import\s*duty|tariff/i.test(lower)) return "import_duty";
  if (/export\s*clear|export\s*permit|phytosanitary/i.test(lower)) return "export_clearance";
  if (/import\s*clear|import\s*permit/i.test(lower)) return "import_clearance";
  if (/freight|haulage|shipping|carriage|roro|container/i.test(lower)) return "freight";
  if (/insurance|cargo\s*cover/i.test(lower)) return "cargo_insurance";
  if (/inland.*origin|transport.*port|warehouse.*origin/i.test(lower)) return "inland_transport_origin";
  if (/inland.*dest|last\s*mile|delivery/i.test(lower)) return "inland_transport_dest";
  if (/unload|discharge|demurrage|landing/i.test(lower)) return "unloading";

  return null;
}

export function getIncotermLabel(code: string): string {
  const info = INCOTERMS.find(i => i.code === code);
  return info ? `${info.code} — ${info.name}` : code;
}

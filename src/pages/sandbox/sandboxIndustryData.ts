/**
 * Industry-specific sandbox data: invoices, milestones, documents, vendor profiles
 */

export interface SandboxIndustryConfig {
  key: string;
  label: string;
  icon: string;
  vendorName: string;
  vendorTagline: string;
  color: string;
  items: SandboxLineItem[];
  milestones: SandboxMilestoneDef[];
  documents: SandboxDocDef[];
  invoiceNote: string;
}

export interface SandboxLineItem {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface SandboxMilestoneDef {
  title: string;
  percentage: number;
  documentGate?: string;
}

export interface SandboxDocDef {
  name: string;
  required: boolean;
  owner: "vendor" | "buyer" | "either";
}

export const SANDBOX_INDUSTRIES: SandboxIndustryConfig[] = [
  {
    key: "ecommerce",
    label: "E-Commerce / Retail",
    icon: "🛒",
    vendorName: "Kente Craft Online",
    vendorTagline: "Premium handmade African goods shipped worldwide",
    color: "from-orange-500 to-amber-500",
    items: [
      { name: "Custom Kente Cloth — 3 Yards", qty: 1, unit: "pcs", unitPrice: 450 },
      { name: "Handmade Bead Necklace Set", qty: 2, unit: "sets", unitPrice: 60 },
    ],
    milestones: [
      { title: "Payment Confirmed", percentage: 0 },
      { title: "Order Prepared & Packed", percentage: 35 },
      { title: "Shipped (Tracking Provided)", percentage: 30, documentGate: "Shipping Receipt" },
      { title: "Delivered & Confirmed", percentage: 35 },
    ],
    documents: [
      { name: "Commercial Invoice", required: true, owner: "vendor" },
      { name: "Shipping Receipt / Tracking", required: true, owner: "vendor" },
      { name: "Delivery Confirmation", required: true, owner: "buyer" },
    ],
    invoiceNote: "Standard e-commerce order. VAT included where applicable.",
  },
  {
    key: "real_estate",
    label: "Real Estate",
    icon: "🏗️",
    vendorName: "Accra Prime Developments",
    vendorTagline: "Premium residential and commercial properties in West Africa",
    color: "from-blue-600 to-indigo-600",
    items: [
      { name: "3-Bedroom Villa — Phase 2, Plot 14", qty: 1, unit: "unit", unitPrice: 85000 },
      { name: "Legal & Title Transfer Fees", qty: 1, unit: "flat", unitPrice: 3500 },
    ],
    milestones: [
      { title: "Deposit Secured in Escrow", percentage: 0 },
      { title: "Title Search & Due Diligence", percentage: 20, documentGate: "Title Search Report" },
      { title: "Construction / Inspection Phase", percentage: 35, documentGate: "Structural Inspection Certificate" },
      { title: "Final Inspection & Handover", percentage: 30, documentGate: "Completion Certificate" },
      { title: "Title Transfer & Keys", percentage: 15, documentGate: "Transfer of Ownership Doc" },
    ],
    documents: [
      { name: "Title Search Report", required: true, owner: "vendor" },
      { name: "Structural Inspection Certificate", required: true, owner: "vendor" },
      { name: "Land Survey / Site Plan", required: true, owner: "vendor" },
      { name: "Completion Certificate", required: true, owner: "vendor" },
      { name: "Transfer of Ownership Document", required: true, owner: "either" },
      { name: "Buyer ID Verification", required: true, owner: "buyer" },
    ],
    invoiceNote: "Real estate transaction. All amounts in USD equivalent. Local taxes apply.",
  },
  {
    key: "mining",
    label: "Mining & Minerals",
    icon: "⛏️",
    vendorName: "SahelGold Mining Corp",
    vendorTagline: "Licensed gold and mineral extraction — certified supply chain",
    color: "from-yellow-600 to-yellow-800",
    items: [
      { name: "Gold Ore Concentrate — 99.5% Purity", qty: 50, unit: "KG", unitPrice: 580 },
      { name: "Assay Certificate & Lab Analysis", qty: 1, unit: "report", unitPrice: 250 },
      { name: "Logistics & Secure Transport", qty: 1, unit: "flat", unitPrice: 1200 },
    ],
    milestones: [
      { title: "Purchase Order Confirmed", percentage: 0 },
      { title: "Assay & Quality Certification", percentage: 20, documentGate: "Assay Certificate" },
      { title: "Environmental Clearance Obtained", percentage: 15, documentGate: "Environmental Permit" },
      { title: "Extraction & Processing", percentage: 25 },
      { title: "Secure Shipment Dispatched", percentage: 25, documentGate: "Bill of Lading" },
      { title: "Delivery & Final Verification", percentage: 15 },
    ],
    documents: [
      { name: "Mining License", required: true, owner: "vendor" },
      { name: "Assay Certificate", required: true, owner: "vendor" },
      { name: "Environmental Impact Permit", required: true, owner: "vendor" },
      { name: "Bill of Lading", required: true, owner: "vendor" },
      { name: "Customs Declaration", required: true, owner: "either" },
      { name: "End-User Certificate", required: true, owner: "buyer" },
    ],
    invoiceNote: "Mining commodity. Subject to export royalties and environmental levies.",
  },
  {
    key: "energy",
    label: "Energy / Oil & Gas",
    icon: "⚡",
    vendorName: "PetroWest Energy Ltd",
    vendorTagline: "Licensed crude oil and refined petroleum supplier — NNPC compliant",
    color: "from-emerald-600 to-teal-700",
    items: [
      { name: "AGO (Automotive Gas Oil) — Diesel", qty: 33000, unit: "litres", unitPrice: 0.95 },
      { name: "NNPC Allocation Documentation", qty: 1, unit: "flat", unitPrice: 500 },
      { name: "Tank Farm Storage (14 Days)", qty: 1, unit: "flat", unitPrice: 2800 },
    ],
    milestones: [
      { title: "Allocation Verified & PO Signed", percentage: 0, documentGate: "NNPC Allocation Letter" },
      { title: "Quality Inspection (SGS/Intertek)", percentage: 20, documentGate: "SGS Inspection Report" },
      { title: "Product Loaded at Depot", percentage: 30 },
      { title: "In-Transit (GPS Tracked)", percentage: 25, documentGate: "Waybill & GPS Log" },
      { title: "Delivery & Quantity Verification", percentage: 25, documentGate: "Delivery Receipt" },
    ],
    documents: [
      { name: "NNPC Allocation Letter", required: true, owner: "vendor" },
      { name: "SGS / Intertek Inspection Report", required: true, owner: "vendor" },
      { name: "Product Quality Certificate", required: true, owner: "vendor" },
      { name: "Waybill & GPS Tracking Log", required: true, owner: "vendor" },
      { name: "Tank Farm Receipt", required: true, owner: "buyer" },
      { name: "Delivery / Discharge Receipt", required: true, owner: "buyer" },
    ],
    invoiceNote: "Energy commodity trade. All prices ex-depot. Duties and levies excluded.",
  },
  {
    key: "freelance",
    label: "Freelance / Professional Services",
    icon: "💼",
    vendorName: "Kwame Digital Studio",
    vendorTagline: "UI/UX design, branding & web development — remote-first agency",
    color: "from-purple-500 to-violet-600",
    items: [
      { name: "Brand Identity Package (Logo + Guide)", qty: 1, unit: "project", unitPrice: 2500 },
      { name: "Landing Page Design & Dev", qty: 1, unit: "project", unitPrice: 1800 },
      { name: "2 Rounds of Revisions", qty: 1, unit: "flat", unitPrice: 400 },
    ],
    milestones: [
      { title: "Project Brief Approved", percentage: 0 },
      { title: "First Draft / Mockup Delivered", percentage: 35, documentGate: "Mockup Files" },
      { title: "Revisions Completed", percentage: 30 },
      { title: "Final Delivery & Handoff", percentage: 35, documentGate: "Source Files Package" },
    ],
    documents: [
      { name: "Project Brief / Scope of Work", required: true, owner: "either" },
      { name: "Mockup / Draft Files", required: true, owner: "vendor" },
      { name: "Source Files Package", required: true, owner: "vendor" },
      { name: "Client Approval Sign-Off", required: true, owner: "buyer" },
    ],
    invoiceNote: "Professional services engagement. Payment released upon milestone completion.",
  },
  {
    key: "construction",
    label: "Construction",
    icon: "🏗️",
    vendorName: "Atlas Build International",
    vendorTagline: "Commercial & residential construction — turnkey project delivery",
    color: "from-slate-600 to-gray-700",
    items: [
      { name: "Commercial Office Fit-Out — 500 sqm", qty: 1, unit: "project", unitPrice: 120000 },
      { name: "Architectural Plans & Permits", qty: 1, unit: "flat", unitPrice: 8500 },
      { name: "Site Supervision (6 Months)", qty: 6, unit: "months", unitPrice: 3000 },
    ],
    milestones: [
      { title: "Contract Signed & Permits Filed", percentage: 0 },
      { title: "Foundation & Structural Work", percentage: 25, documentGate: "Structural Engineer Report" },
      { title: "MEP Rough-In (Mechanical/Electrical/Plumbing)", percentage: 25 },
      { title: "Finishing & Interior Fit-Out", percentage: 25, documentGate: "Progress Photo Report" },
      { title: "Final Inspection & Handover", percentage: 25, documentGate: "Completion Certificate" },
    ],
    documents: [
      { name: "Building Permit", required: true, owner: "vendor" },
      { name: "Structural Engineer Report", required: true, owner: "vendor" },
      { name: "Progress Photo Report", required: true, owner: "vendor" },
      { name: "Completion Certificate", required: true, owner: "vendor" },
      { name: "Site Inspection Sign-Off", required: true, owner: "buyer" },
    ],
    invoiceNote: "Construction project. Payment milestones tied to verified site progress.",
  },
  {
    key: "agriculture",
    label: "Agriculture & Export",
    icon: "🌾",
    vendorName: "GreenSahel Agro Exports",
    vendorTagline: "Certified organic produce — farm to international port",
    color: "from-green-600 to-lime-600",
    items: [
      { name: "Organic Cashew Nuts — Grade A", qty: 5000, unit: "KG", unitPrice: 4.80 },
      { name: "Phytosanitary Certificate & Fumigation", qty: 1, unit: "flat", unitPrice: 350 },
      { name: "Export Logistics (CIF Rotterdam)", qty: 1, unit: "flat", unitPrice: 2200 },
    ],
    milestones: [
      { title: "Purchase Order Confirmed", percentage: 0 },
      { title: "Quality Inspection & Grading", percentage: 20, documentGate: "Quality Certificate" },
      { title: "Phytosanitary & Export Clearance", percentage: 15, documentGate: "Phytosanitary Certificate" },
      { title: "Loaded & Shipped (Bill of Lading)", percentage: 35, documentGate: "Bill of Lading" },
      { title: "Arrived & Buyer Inspection", percentage: 30 },
    ],
    documents: [
      { name: "Quality / Grading Certificate", required: true, owner: "vendor" },
      { name: "Phytosanitary Certificate", required: true, owner: "vendor" },
      { name: "Bill of Lading", required: true, owner: "vendor" },
      { name: "Certificate of Origin", required: true, owner: "vendor" },
      { name: "Customs Import Declaration", required: true, owner: "buyer" },
    ],
    invoiceNote: "Agricultural export. CIF pricing includes freight & insurance to destination port.",
  },
  {
    key: "logistics",
    label: "Logistics & Cross-Border Trade",
    icon: "🚛",
    vendorName: "TransAfrica Freight Co",
    vendorTagline: "Door-to-door cross-border logistics — customs brokerage included",
    color: "from-sky-600 to-blue-700",
    items: [
      { name: "40ft Container — Lagos to Accra", qty: 1, unit: "container", unitPrice: 4500 },
      { name: "Customs Brokerage & Clearance", qty: 2, unit: "borders", unitPrice: 600 },
      { name: "Cargo Insurance (Full Value)", qty: 1, unit: "flat", unitPrice: 380 },
    ],
    milestones: [
      { title: "Booking Confirmed & Pickup Scheduled", percentage: 0 },
      { title: "Cargo Collected & Loaded", percentage: 25, documentGate: "Packing List" },
      { title: "Customs Cleared (Origin)", percentage: 20, documentGate: "Export Customs Declaration" },
      { title: "In Transit (GPS Tracked)", percentage: 30, documentGate: "Waybill & GPS Log" },
      { title: "Delivered & Signed", percentage: 25, documentGate: "Proof of Delivery" },
    ],
    documents: [
      { name: "Packing List", required: true, owner: "vendor" },
      { name: "Export Customs Declaration", required: true, owner: "vendor" },
      { name: "Waybill & GPS Tracking Log", required: true, owner: "vendor" },
      { name: "Cargo Insurance Certificate", required: true, owner: "vendor" },
      { name: "Proof of Delivery", required: true, owner: "buyer" },
    ],
    invoiceNote: "Cross-border logistics. Includes customs brokerage at both origin and destination.",
  },
  {
    key: "manufacturing",
    label: "Manufacturing & Equipment",
    icon: "🏭",
    vendorName: "Precision Works Ltd",
    vendorTagline: "Custom industrial equipment — ISO 9001 certified manufacturing",
    color: "from-zinc-600 to-neutral-700",
    items: [
      { name: "Custom CNC Milling Machine — Model X200", qty: 1, unit: "unit", unitPrice: 45000 },
      { name: "Installation & Commissioning", qty: 1, unit: "flat", unitPrice: 5500 },
      { name: "12-Month Warranty & Support", qty: 1, unit: "flat", unitPrice: 2000 },
    ],
    milestones: [
      { title: "Order Placed & Specs Confirmed", percentage: 0 },
      { title: "Manufacturing & Assembly", percentage: 30, documentGate: "Factory Test Report" },
      { title: "Quality Assurance & Certification", percentage: 20, documentGate: "ISO Compliance Certificate" },
      { title: "Shipment & Delivery", percentage: 25, documentGate: "Bill of Lading" },
      { title: "Installation & Commissioning", percentage: 25, documentGate: "Commissioning Report" },
    ],
    documents: [
      { name: "Factory Test Report", required: true, owner: "vendor" },
      { name: "ISO Compliance Certificate", required: true, owner: "vendor" },
      { name: "Bill of Lading / Delivery Note", required: true, owner: "vendor" },
      { name: "Commissioning Report", required: true, owner: "vendor" },
      { name: "Acceptance Sign-Off", required: true, owner: "buyer" },
    ],
    invoiceNote: "Manufacturing order. Includes installation, commissioning, and 12-month warranty.",
  },
  {
    key: "automotive",
    label: "Automotive & Vehicle Import",
    icon: "🚗",
    vendorName: "DriveLink Auto Imports",
    vendorTagline: "Certified pre-owned & new vehicle imports — full documentation chain",
    color: "from-red-600 to-rose-700",
    items: [
      { name: "2024 Toyota Land Cruiser Prado — VX Grade", qty: 1, unit: "unit", unitPrice: 62000 },
      { name: "Marine Shipping (RoRo — Japan to Lagos)", qty: 1, unit: "flat", unitPrice: 3200 },
      { name: "Import Duty & Clearing Agent", qty: 1, unit: "flat", unitPrice: 8500 },
    ],
    milestones: [
      { title: "Vehicle Sourced & Inspected", percentage: 0, documentGate: "Pre-Shipment Inspection" },
      { title: "Purchase & Export Documentation", percentage: 20, documentGate: "Bill of Sale" },
      { title: "Shipped (Marine Bill of Lading)", percentage: 30, documentGate: "Bill of Lading" },
      { title: "Arrived at Port — Customs Clearance", percentage: 30, documentGate: "Customs Import Declaration" },
      { title: "Delivered to Buyer", percentage: 20, documentGate: "Delivery Receipt" },
    ],
    documents: [
      { name: "Pre-Shipment Inspection Report", required: true, owner: "vendor" },
      { name: "Bill of Sale", required: true, owner: "vendor" },
      { name: "Marine Bill of Lading", required: true, owner: "vendor" },
      { name: "Customs Import Declaration", required: true, owner: "either" },
      { name: "Vehicle Registration (Buyer)", required: true, owner: "buyer" },
    ],
    invoiceNote: "Vehicle import. CIF pricing. Import duties and clearing fees included.",
  },
];

// ─── Shared localStorage order management ──────────────────────────────────

const SANDBOX_ORDERS_KEY = "tl_sandbox_live_orders";

export interface SandboxLiveOrder {
  id: string;
  orderNumber: string;
  confirmationCode: string;
  industryKey: string;
  industryLabel: string;
  vendorName: string;
  buyerName: string;
  buyerEmail: string;
  items: SandboxLineItem[];
  subtotal: number;
  fee: number;
  total: number;
  paymentMethod: string;
  milestones: { title: string; percentage: number; status: "completed" | "in_progress" | "pending"; documentGate?: string }[];
  documents: SandboxDocDef[];
  status: "escrow_locked" | "in_progress" | "completed" | "disputed";
  createdAt: string;
  claimedByBuyer: boolean;
}

let orderCounter: number | null = null;

function getNextOrderNumber(): string {
  if (orderCounter === null) {
    const orders = getSandboxLiveOrders();
    const nums = orders.map(o => parseInt(o.orderNumber.replace("SBX-", ""), 10)).filter(n => !isNaN(n));
    orderCounter = nums.length > 0 ? Math.max(...nums) : 5000;
  }
  orderCounter++;
  return `SBX-${orderCounter}`;
}

function generateCode(): string {
  return `TL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export function getSandboxLiveOrders(): SandboxLiveOrder[] {
  try {
    return JSON.parse(localStorage.getItem(SANDBOX_ORDERS_KEY) || "[]");
  } catch { return []; }
}

function saveOrders(orders: SandboxLiveOrder[]) {
  localStorage.setItem(SANDBOX_ORDERS_KEY, JSON.stringify(orders));
}

export function createSandboxOrder(
  industry: SandboxIndustryConfig,
  buyerName: string,
  buyerEmail: string,
  paymentMethod: string,
): SandboxLiveOrder {
  const subtotal = industry.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const fee = Math.round(subtotal * 0.015 * 100) / 100;
  const order: SandboxLiveOrder = {
    id: crypto.randomUUID(),
    orderNumber: getNextOrderNumber(),
    confirmationCode: generateCode(),
    industryKey: industry.key,
    industryLabel: industry.label,
    vendorName: industry.vendorName,
    buyerName,
    buyerEmail,
    items: industry.items,
    subtotal,
    fee,
    total: subtotal + fee,
    paymentMethod,
    milestones: industry.milestones.map((m, i) => ({
      ...m,
      status: i === 0 ? "completed" as const : i === 1 ? "in_progress" as const : "pending" as const,
    })),
    documents: industry.documents,
    status: "escrow_locked",
    createdAt: new Date().toISOString(),
    claimedByBuyer: false,
  };
  const orders = getSandboxLiveOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

export function advanceSandboxMilestone(orderId: string): SandboxLiveOrder | null {
  const orders = getSandboxLiveOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  const nextIdx = order.milestones.findIndex(m => m.status === "pending");
  if (nextIdx === -1) return order;

  // Complete any in_progress
  order.milestones.forEach(m => { if (m.status === "in_progress") m.status = "completed"; });
  order.milestones[nextIdx].status = "in_progress";

  // Check if all done
  const allDone = order.milestones.every(m => m.status === "completed" || m.status === "in_progress");
  if (allDone && order.milestones.every(m => m.status === "completed")) {
    order.status = "completed";
  } else {
    order.status = "in_progress";
  }

  saveOrders(orders);
  return order;
}

export function completeSandboxMilestone(orderId: string, milestoneIdx: number): SandboxLiveOrder | null {
  const orders = getSandboxLiveOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  order.milestones[milestoneIdx].status = "completed";

  // Set next pending to in_progress
  const nextPending = order.milestones.findIndex(m => m.status === "pending");
  if (nextPending !== -1) {
    order.milestones[nextPending].status = "in_progress";
    order.status = "in_progress";
  }

  if (order.milestones.every(m => m.status === "completed")) {
    order.status = "completed";
  }

  saveOrders(orders);
  return order;
}

export function claimSandboxOrder(orderNumber: string): SandboxLiveOrder | null {
  const orders = getSandboxLiveOrders();
  const order = orders.find(o => o.orderNumber === orderNumber);
  if (!order) return null;
  order.claimedByBuyer = true;
  saveOrders(orders);
  return order;
}

export function getSandboxExpiry(): Date {
  return new Date("2026-12-31T23:59:59Z");
}

/* ── Sandbox ↔ MockMilestone bridge for MilestoneWorkOrderPanel ── */

import type { MockMilestone } from "@/hooks/useTestnetData";

export function sandboxOrderToMockMilestones(order: SandboxLiveOrder): MockMilestone[] {
  return order.milestones.map((m, i) => ({
    id: `${order.id}-ms-${i}`,
    transaction_id: order.id,
    title: m.title,
    description: m.documentGate ? `Document required: ${m.documentGate}` : m.title,
    status: m.status === "completed" ? "completed" : m.status === "in_progress" ? "in_progress" : "pending",
    is_payment_milestone: m.percentage > 0,
    payment_percentage: m.percentage,
    payment_amount: Math.round(order.subtotal * (m.percentage / 100) * 100) / 100,
    payment_released: m.status === "completed" && m.percentage > 0,
    uploaded_documents: [],
    observer_id: null,
    observer_name: null,
    observer_email: null,
    observer_access_token: null,
    gps_latitude: null,
    gps_longitude: null,
    gps_accuracy: null,
    gps_captured_at: null,
    order_index: i,
  }));
}

export function updateSandboxMilestoneStatus(orderId: string, milestoneId: string, status: MockMilestone["status"]) {
  const orders = getSandboxLiveOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  const idx = parseInt(milestoneId.split("-ms-")[1], 10);
  if (isNaN(idx) || !order.milestones[idx]) return;

  if (status === "completed") {
    order.milestones[idx].status = "completed";
    const nextPending = order.milestones.findIndex(m => m.status === "pending");
    if (nextPending !== -1) {
      order.milestones[nextPending].status = "in_progress";
      order.status = "in_progress";
    }
    if (order.milestones.every(m => m.status === "completed")) {
      order.status = "completed";
    }
  } else if (status === "in_progress") {
    order.milestones[idx].status = "in_progress";
    order.status = "in_progress";
  }

  saveOrders(orders);
}

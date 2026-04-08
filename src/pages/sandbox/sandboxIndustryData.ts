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
      { title: "Payment Confirmed", percentage: 20 },
      { title: "Order Prepared & Packed", percentage: 30 },
      { title: "Shipped (Tracking Provided)", percentage: 20, documentGate: "Shipping Receipt" },
      { title: "Delivered & Confirmed", percentage: 30 },
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
      { title: "Deposit Secured in Escrow", percentage: 15 },
      { title: "Title Search & Due Diligence", percentage: 15, documentGate: "Title Search Report" },
      { title: "Construction / Inspection Phase", percentage: 30, documentGate: "Structural Inspection Certificate" },
      { title: "Final Inspection & Handover", percentage: 25, documentGate: "Completion Certificate" },
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
      { title: "Purchase Order Confirmed", percentage: 10 },
      { title: "Assay & Quality Certification", percentage: 15, documentGate: "Assay Certificate" },
      { title: "Environmental Clearance Obtained", percentage: 15, documentGate: "Environmental Permit" },
      { title: "Extraction & Processing", percentage: 25 },
      { title: "Secure Shipment Dispatched", percentage: 20, documentGate: "Bill of Lading" },
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
      { title: "Allocation Verified & PO Signed", percentage: 10, documentGate: "NNPC Allocation Letter" },
      { title: "Quality Inspection (SGS/Intertek)", percentage: 15, documentGate: "SGS Inspection Report" },
      { title: "Product Loaded at Depot", percentage: 25 },
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
      { title: "Project Brief Approved", percentage: 15 },
      { title: "First Draft / Mockup Delivered", percentage: 30, documentGate: "Mockup Files" },
      { title: "Revisions Completed", percentage: 25 },
      { title: "Final Delivery & Handoff", percentage: 30, documentGate: "Source Files Package" },
    ],
    documents: [
      { name: "Project Brief / Scope of Work", required: true, owner: "either" },
      { name: "Mockup / Draft Files", required: true, owner: "vendor" },
      { name: "Source Files Package", required: true, owner: "vendor" },
      { name: "Client Approval Sign-Off", required: true, owner: "buyer" },
    ],
    invoiceNote: "Professional services engagement. Payment released upon milestone completion.",
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

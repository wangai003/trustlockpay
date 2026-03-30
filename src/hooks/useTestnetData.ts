// Testnet mock data + simulated state machine for interactive testing
import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface MockTransaction {
  id: string;
  tx_id: string;
  buyer_name: string;
  vendor_name: string;
  amount: number;
  fee: number;
  status: "locked" | "shipped" | "delivered" | "released" | "disputed";
  item: string;
  industry: string;
  tracking: string | null;
  order_number: number;
  created_at: string;
  buyer_location: string;
  vendor_location: string;
  type: "product" | "service";
}

export interface MockMilestone {
  id: string;
  transaction_id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "released";
  is_payment_milestone: boolean;
  payment_percentage: number;
  payment_amount: number;
  payment_released: boolean;
  uploaded_documents: { name: string; url: string; uploadedAt: string }[];
  observer_id: string | null;
  observer_name: string | null;
  observer_email: string | null;
  observer_access_token: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy: number | null;
  gps_captured_at: string | null;
  order_index: number;
}

export interface MockDispute {
  id: string;
  dispute_id: string;
  tx_id: string;
  vendor_name: string;
  amount: number;
  reason: string;
  status: "pending" | "under_review" | "resolved_buyer" | "resolved_vendor";
  created_at: string;
  ai_recommendation: string;
}

// ─── Industry-specific milestone templates ───
const INDUSTRY_MILESTONES: Record<string, { title: string; desc: string; payment: boolean }[]> = {
  ecommerce: [
    { title: "Order Confirmed", desc: "Buyer payment received, order locked in escrow", payment: false },
    { title: "Shipped & Tracking Added", desc: "Package dispatched with tracking number", payment: false },
    { title: "Delivery Confirmed", desc: "Buyer confirms receipt of goods", payment: true },
  ],
  construction: [
    { title: "Foundation & Groundwork", desc: "Site preparation, excavation, foundation pouring", payment: true },
    { title: "Structural Frame & Roofing", desc: "Walls, columns, beams, and roof installation", payment: true },
    { title: "MEP Rough-In", desc: "Mechanical, electrical, plumbing rough installation", payment: true },
    { title: "Interior Finishes", desc: "Flooring, painting, fixtures, cabinetry", payment: true },
    { title: "Final Inspection & Handover", desc: "Certificate of occupancy, punch list completion", payment: true },
  ],
  real_estate: [
    { title: "Offer Acceptance & Title Search", desc: "Title verification, lien checks, legal review", payment: false },
    { title: "Inspection & Appraisal", desc: "Property inspection, structural survey, valuation", payment: true },
    { title: "Legal Due Diligence", desc: "Contract review, deed preparation, regulatory clearance", payment: true },
    { title: "Closing & Escrow Release", desc: "Final signing, title transfer, keys handover", payment: true },
  ],
  mining: [
    { title: "Exploration & Geological Survey", desc: "Core drilling, geological mapping, resource estimation", payment: true },
    { title: "Assay & Grade Certification", desc: "Lab analysis, grade verification, assay certificate issuance", payment: true },
    { title: "Extraction & Processing", desc: "Ore extraction, crushing, processing at mill", payment: true },
    { title: "Loading & Weigh-Bridge", desc: "Tonnage verification, loading onto transport", payment: false },
    { title: "Export Documentation & Shipping", desc: "Export permit, bill of lading, customs clearance", payment: true },
  ],
  agriculture: [
    { title: "Pre-Harvest Inspection", desc: "Farm visit, crop quality assessment, grading", payment: false },
    { title: "Harvest & Phytosanitary Certification", desc: "Harvest, fumigation, phytosanitary certificate", payment: true },
    { title: "Packaging & Cold Chain", desc: "Sorting, grading, packaging, cold storage", payment: true },
    { title: "Export & Shipping", desc: "Container loading, bill of lading, customs clearance", payment: true },
  ],
  freelance: [
    { title: "Discovery & Scope Agreement", desc: "Requirements gathering, deliverables defined", payment: false },
    { title: "Draft / Prototype Delivery", desc: "First version submitted for review", payment: true },
    { title: "Revisions & Final Delivery", desc: "Feedback incorporated, final files delivered", payment: true },
  ],
  logistics: [
    { title: "Cargo Pickup & Documentation", desc: "Goods collected, waybill generated, insurance confirmed", payment: false },
    { title: "Customs Clearance (Origin)", desc: "Export declaration, duties paid, cargo released", payment: true },
    { title: "In-Transit GPS Checkpoint", desc: "GPS-verified location checkpoint mid-route", payment: false },
    { title: "Customs Clearance (Destination)", desc: "Import declaration, duties & tariffs settled", payment: true },
    { title: "Final Delivery & POD", desc: "Proof of delivery signed, cargo handed over", payment: true },
  ],
  tourism: [
    { title: "Booking Confirmed", desc: "Reservation locked, deposit received", payment: true },
    { title: "Service Delivered", desc: "Guest checked in, experience completed", payment: true },
  ],
  education: [
    { title: "Enrollment & Course Access", desc: "Student registered, materials provided", payment: true },
    { title: "Mid-Course Assessment", desc: "Progress evaluation, module completion", payment: false },
    { title: "Course Completion & Certification", desc: "Final exam passed, certificate issued", payment: true },
  ],
  project_management: [
    { title: "Planning & Requirements", desc: "Project scope, timeline, resource allocation", payment: true },
    { title: "Development Sprint 1", desc: "Core deliverables, first iteration", payment: true },
    { title: "Testing & QA", desc: "Quality assurance, bug fixes, user acceptance testing", payment: true },
    { title: "Launch & Handover", desc: "Deployment, documentation, knowledge transfer", payment: true },
  ],
  automotive: [
    { title: "Vehicle Selection & Inspection", desc: "Pre-purchase inspection report, VIN verification", payment: false },
    { title: "Purchase Agreement & SON Compliance", desc: "Sales contract, SON certificate, import duty assessment", payment: true },
    { title: "Shipping & Customs Clearance", desc: "Roll-on/roll-off or container shipping, port clearance", payment: true },
    { title: "Delivery & Registration", desc: "Vehicle delivered, registration papers transferred", payment: true },
  ],
  energy: [
    { title: "Site Survey & Engineering", desc: "Feasibility study, engineering design, NNPC/API compliance", payment: true },
    { title: "Equipment Procurement", desc: "Pumps, pipes, valves procured and inspected", payment: true },
    { title: "Installation & Commissioning", desc: "Field installation, pressure testing, commissioning", payment: true },
    { title: "Operational Handover", desc: "Training, documentation, warranty activation", payment: true },
  ],
  pharmaceuticals: [
    { title: "NAFDAC Pre-Clearance", desc: "Product registration, batch testing, import permit", payment: false },
    { title: "Manufacturing & QC", desc: "Production batch, quality control lab testing", payment: true },
    { title: "WHO/GMP Certification", desc: "Good manufacturing practice audit, certification", payment: true },
    { title: "Cold Chain Delivery", desc: "Temperature-controlled shipping, chain of custody verified", payment: true },
  ],
  telecommunications: [
    { title: "Network Design & Planning", desc: "Coverage analysis, tower placement, spectrum allocation", payment: true },
    { title: "Equipment Supply", desc: "Base stations, antennas, fiber optic cables procured", payment: true },
    { title: "Installation & Testing", desc: "Tower erection, cabling, signal testing, ITU compliance", payment: true },
    { title: "Go-Live & Acceptance", desc: "Network activated, KPI verification, acceptance sign-off", payment: true },
  ],
  manufacturing: [
    { title: "Design & Prototyping", desc: "CAD design, ISO material selection, prototype fabrication", payment: true },
    { title: "Production Run", desc: "Full production batch, in-line quality checks", payment: true },
    { title: "QC & Packaging", desc: "Final inspection, ISO certification, export packaging", payment: true },
    { title: "Shipping & Delivery", desc: "Freight, customs, delivery to buyer warehouse", payment: true },
  ],
  renewable_energy: [
    { title: "Site Assessment & EIA", desc: "Environmental impact assessment, solar irradiation study", payment: true },
    { title: "Equipment Procurement", desc: "Solar panels, inverters, batteries, IEC certified", payment: true },
    { title: "Installation & Grid Connection", desc: "Panel mounting, wiring, grid interconnection", payment: true },
    { title: "Commissioning & Monitoring", desc: "System testing, performance monitoring setup", payment: true },
  ],
  textiles: [
    { title: "Design & Sampling", desc: "Pattern design, fabric sourcing, sample production", payment: true },
    { title: "Bulk Production", desc: "Weaving/knitting, dyeing, finishing, AGOA compliance", payment: true },
    { title: "Quality Inspection", desc: "AQL inspection, color matching, packaging", payment: true },
    { title: "Shipping & Delivery", desc: "Container loading, export docs, delivery", payment: true },
  ],
  marine_fisheries: [
    { title: "Catch & Landing", desc: "Fishing operation, catch logged, landed at port", payment: false },
    { title: "HACCP Inspection", desc: "Hazard analysis, temperature checks, quality grading", payment: true },
    { title: "Processing & Packaging", desc: "Filleting, freezing, vacuum packing, export labeling", payment: true },
    { title: "Cold Chain Export", desc: "Reefer container, phytosanitary cert, customs clearance", payment: true },
  ],
  water_sanitation: [
    { title: "Community Assessment", desc: "Water source mapping, demand analysis, WHO guidelines", payment: true },
    { title: "Borehole Drilling / Pipeline", desc: "Drilling, casing, pump installation or pipe laying", payment: true },
    { title: "Water Quality Testing", desc: "Chemical & bacteriological testing, WHO compliance", payment: true },
    { title: "Handover & Training", desc: "Community training, maintenance plan, warranty", payment: true },
  ],
  media_entertainment: [
    { title: "Pre-Production", desc: "Scripting, casting, location scouting, budgeting", payment: true },
    { title: "Production / Filming", desc: "Principal photography, recording, WIPO licensing", payment: true },
    { title: "Post-Production", desc: "Editing, VFX, sound mixing, color grading", payment: true },
    { title: "Distribution & Royalty Setup", desc: "Platform upload, royalty agreements, premiere", payment: true },
  ],
  aviation: [
    { title: "Regulatory & EASA Compliance", desc: "Airworthiness review, EASA/FAA certification docs", payment: false },
    { title: "Parts Procurement", desc: "Component sourcing, traceability certs, customs", payment: true },
    { title: "MRO Installation", desc: "Maintenance, repair, overhaul work completed", payment: true },
    { title: "Test Flight & Acceptance", desc: "Ground run, test flight, acceptance certificate", payment: true },
  ],
  insurance: [
    { title: "Risk Assessment", desc: "Actuarial analysis, underwriting review, IAIS compliance", payment: true },
    { title: "Policy Drafting", desc: "Terms & conditions, coverage limits, exclusions", payment: true },
    { title: "Premium Collection & Binding", desc: "Premium paid, policy bound, certificate issued", payment: true },
  ],
  legal_services: [
    { title: "Engagement & Conflict Check", desc: "Retainer agreement, IBA conflict verification", payment: true },
    { title: "Legal Research & Drafting", desc: "Case research, document drafting, regulatory analysis", payment: true },
    { title: "Review & Filing", desc: "Client review, court/regulatory filing, final deliverables", payment: true },
  ],
  food_beverage: [
    { title: "Recipe & Sourcing", desc: "Ingredient sourcing, recipe finalization, ISO 22000 prep", payment: true },
    { title: "Production & QC", desc: "Batch production, HACCP monitoring, lab testing", payment: true },
    { title: "Packaging & Labeling", desc: "FDA/NAFDAC labeling compliance, shelf-life testing", payment: true },
    { title: "Distribution", desc: "Cold chain logistics, retailer delivery, POD", payment: true },
  ],
  waste_management: [
    { title: "Waste Audit & Basel Compliance", desc: "Waste characterization, Basel Convention classification", payment: true },
    { title: "Collection & Segregation", desc: "Waste pickup, sorting by category, weighing", payment: true },
    { title: "Processing / Recycling", desc: "Treatment, recycling, or safe disposal", payment: true },
    { title: "Compliance Reporting", desc: "Environmental certificate, disposal manifest, audit trail", payment: true },
  ],
};

// ─── 25 Industry mock transactions ───
const INITIAL_TRANSACTIONS: MockTransaction[] = [
  { id: "demo-tx-1", tx_id: "TL-2026-0001", buyer_name: "Amara Osei", vendor_name: "Kente Craft Ltd", amount: 2500, fee: 37.5, status: "locked", item: "Premium Kente Cloth (5 yards)", industry: "textiles", tracking: null, order_number: 1, created_at: new Date().toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Accra, Ghana", type: "product" },
  { id: "demo-tx-2", tx_id: "TL-2026-0002", buyer_name: "Jean-Pierre Mbeki", vendor_name: "BuildRight Contractors", amount: 185000, fee: 2775, status: "locked", item: "3-Bedroom Residential Build (Phase 1)", industry: "construction", tracking: null, order_number: 2, created_at: new Date(Date.now() - 86400000).toISOString(), buyer_location: "Douala, Cameroon", vendor_location: "Abuja, Nigeria", type: "service" },
  { id: "demo-tx-3", tx_id: "TL-2026-0003", buyer_name: "Sarah Njeri", vendor_name: "SafariGold Properties", amount: 95000, fee: 1425, status: "locked", item: "2-Acre Commercial Plot (Westlands)", industry: "real_estate", tracking: null, order_number: 3, created_at: new Date(Date.now() - 172800000).toISOString(), buyer_location: "Nairobi, Kenya", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-4", tx_id: "TL-2026-0004", buyer_name: "Fatima Diallo", vendor_name: "Sahel Mining Corp", amount: 420000, fee: 6300, status: "shipped", item: "Gold Ore (50 MT, 18g/t Grade)", industry: "mining", tracking: "ZA-MINE-88712", order_number: 4, created_at: new Date(Date.now() - 259200000).toISOString(), buyer_location: "Dakar, Senegal", vendor_location: "Johannesburg, SA", type: "product" },
  { id: "demo-tx-5", tx_id: "TL-2026-0005", buyer_name: "Kwame Asante", vendor_name: "GreenHarvest Farms", amount: 32000, fee: 480, status: "locked", item: "Cocoa Beans (10 MT, Grade 1)", industry: "agriculture", tracking: null, order_number: 5, created_at: new Date(Date.now() - 345600000).toISOString(), buyer_location: "Kumasi, Ghana", vendor_location: "Takoradi, Ghana", type: "product" },
  { id: "demo-tx-6", tx_id: "TL-2026-0006", buyer_name: "Oluwaseun Ade", vendor_name: "PixelForge Studio", amount: 4800, fee: 72, status: "locked", item: "Brand Identity & Website Design", industry: "freelance", tracking: null, order_number: 6, created_at: new Date(Date.now() - 432000000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Cape Town, SA", type: "service" },
  { id: "demo-tx-7", tx_id: "TL-2026-0007", buyer_name: "Amina Yusuf", vendor_name: "TransAfrica Logistics", amount: 28500, fee: 427.5, status: "shipped", item: "Container Freight (Mombasa → Lagos)", industry: "logistics", tracking: "EA-FRT-33129", order_number: 7, created_at: new Date(Date.now() - 518400000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Mombasa, Kenya", type: "service" },
  { id: "demo-tx-8", tx_id: "TL-2026-0008", buyer_name: "David Ochieng", vendor_name: "Safari Bliss Tours", amount: 6200, fee: 93, status: "delivered", item: "7-Night Maasai Mara Safari Package", industry: "tourism", tracking: null, order_number: 8, created_at: new Date(Date.now() - 604800000).toISOString(), buyer_location: "London, UK", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-9", tx_id: "TL-2026-0009", buyer_name: "Grace Mwangi", vendor_name: "TechSkills Academy", amount: 2400, fee: 36, status: "locked", item: "Full-Stack Developer Bootcamp (12 weeks)", industry: "education", tracking: null, order_number: 9, created_at: new Date(Date.now() - 691200000).toISOString(), buyer_location: "Kigali, Rwanda", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-10", tx_id: "TL-2026-0010", buyer_name: "Emmanuel Okoro", vendor_name: "AgileWorks PM", amount: 45000, fee: 675, status: "locked", item: "ERP Implementation (Phase 1-3)", industry: "project_management", tracking: null, order_number: 10, created_at: new Date(Date.now() - 777600000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Accra, Ghana", type: "service" },
  { id: "demo-tx-11", tx_id: "TL-2026-0011", buyer_name: "Hassan Abdullahi", vendor_name: "AutoImport NG", amount: 38000, fee: 570, status: "shipped", item: "Toyota Land Cruiser 2024 (Japan Import)", industry: "automotive", tracking: "JP-RORO-44821", order_number: 11, created_at: new Date(Date.now() - 864000000).toISOString(), buyer_location: "Abuja, Nigeria", vendor_location: "Yokohama, Japan", type: "product" },
  { id: "demo-tx-12", tx_id: "TL-2026-0012", buyer_name: "Chidi Nwosu", vendor_name: "PetroServ Nigeria", amount: 890000, fee: 13350, status: "locked", item: "Wellhead Equipment & Installation", industry: "energy", tracking: null, order_number: 12, created_at: new Date(Date.now() - 950400000).toISOString(), buyer_location: "Port Harcourt, Nigeria", vendor_location: "Houston, USA", type: "product" },
  { id: "demo-tx-13", tx_id: "TL-2026-0013", buyer_name: "Dr. Aisha Bello", vendor_name: "AfriPharma Ltd", amount: 125000, fee: 1875, status: "locked", item: "Anti-Malarial Tablets (500,000 units)", industry: "pharmaceuticals", tracking: null, order_number: 13, created_at: new Date(Date.now() - 1036800000).toISOString(), buyer_location: "Kampala, Uganda", vendor_location: "Lagos, Nigeria", type: "product" },
  { id: "demo-tx-14", tx_id: "TL-2026-0014", buyer_name: "TeleCom Rwanda", vendor_name: "TowerBuild Africa", amount: 320000, fee: 4800, status: "locked", item: "5 Base Station Towers (Rural Coverage)", industry: "telecommunications", tracking: null, order_number: 14, created_at: new Date(Date.now() - 1123200000).toISOString(), buyer_location: "Kigali, Rwanda", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-15", tx_id: "TL-2026-0015", buyer_name: "MechParts Intl", vendor_name: "SteelWorks Accra", amount: 67000, fee: 1005, status: "locked", item: "CNC Machine Parts (ISO 9001 Certified)", industry: "manufacturing", tracking: null, order_number: 15, created_at: new Date(Date.now() - 1209600000).toISOString(), buyer_location: "Tema, Ghana", vendor_location: "Accra, Ghana", type: "product" },
  { id: "demo-tx-16", tx_id: "TL-2026-0016", buyer_name: "SolarGrid Kenya", vendor_name: "PV Solutions Ltd", amount: 215000, fee: 3225, status: "locked", item: "500kW Solar Farm (Turkana County)", industry: "renewable_energy", tracking: null, order_number: 16, created_at: new Date(Date.now() - 1296000000).toISOString(), buyer_location: "Nairobi, Kenya", vendor_location: "Shenzhen, China", type: "product" },
  { id: "demo-tx-17", tx_id: "TL-2026-0017", buyer_name: "FashionMart EU", vendor_name: "Kente Craft Ltd", amount: 18500, fee: 277.5, status: "locked", item: "African Print Collection (2000 pcs)", industry: "textiles", tracking: null, order_number: 17, created_at: new Date(Date.now() - 1382400000).toISOString(), buyer_location: "Amsterdam, NL", vendor_location: "Accra, Ghana", type: "product" },
  { id: "demo-tx-18", tx_id: "TL-2026-0018", buyer_name: "OceanCatch Ltd", vendor_name: "Cape Fisheries", amount: 52000, fee: 780, status: "locked", item: "Frozen Hake Fillets (20 MT)", industry: "marine_fisheries", tracking: null, order_number: 18, created_at: new Date(Date.now() - 1468800000).toISOString(), buyer_location: "Lisbon, Portugal", vendor_location: "Cape Town, SA", type: "product" },
  { id: "demo-tx-19", tx_id: "TL-2026-0019", buyer_name: "WaterAid Tanzania", vendor_name: "DrillCo East Africa", amount: 78000, fee: 1170, status: "locked", item: "Community Borehole Project (3 sites)", industry: "water_sanitation", tracking: null, order_number: 19, created_at: new Date(Date.now() - 1555200000).toISOString(), buyer_location: "Dar es Salaam, TZ", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-20", tx_id: "TL-2026-0020", buyer_name: "Netflix Africa", vendor_name: "Nollywood Studios", amount: 350000, fee: 5250, status: "locked", item: "Feature Film Production (Blood & Gold)", industry: "media_entertainment", tracking: null, order_number: 20, created_at: new Date(Date.now() - 1641600000).toISOString(), buyer_location: "Los Angeles, USA", vendor_location: "Lagos, Nigeria", type: "service" },
  { id: "demo-tx-21", tx_id: "TL-2026-0021", buyer_name: "EthiopianAir MRO", vendor_name: "AeroParts Global", amount: 480000, fee: 7200, status: "locked", item: "CFM56 Engine Overhaul Kit", industry: "aviation", tracking: null, order_number: 21, created_at: new Date(Date.now() - 1728000000).toISOString(), buyer_location: "Addis Ababa, Ethiopia", vendor_location: "Toulouse, France", type: "product" },
  { id: "demo-tx-22", tx_id: "TL-2026-0022", buyer_name: "InsureCo Nigeria", vendor_name: "ReinsureAfrica", amount: 1200000, fee: 18000, status: "locked", item: "Catastrophe Reinsurance Treaty (2026)", industry: "insurance", tracking: null, order_number: 22, created_at: new Date(Date.now() - 1814400000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Nairobi, Kenya", type: "service" },
  { id: "demo-tx-23", tx_id: "TL-2026-0023", buyer_name: "MineCorp Zambia", vendor_name: "Chambers & Co LLP", amount: 85000, fee: 1275, status: "locked", item: "Mining License Legal Review & Filing", industry: "legal_services", tracking: null, order_number: 23, created_at: new Date(Date.now() - 1900800000).toISOString(), buyer_location: "Lusaka, Zambia", vendor_location: "Johannesburg, SA", type: "service" },
  { id: "demo-tx-24", tx_id: "TL-2026-0024", buyer_name: "SuperMart Ghana", vendor_name: "TropiFoods Ltd", amount: 41000, fee: 615, status: "locked", item: "Processed Fruit Juice (10,000 cartons)", industry: "food_beverage", tracking: null, order_number: 24, created_at: new Date(Date.now() - 1987200000).toISOString(), buyer_location: "Accra, Ghana", vendor_location: "Thika, Kenya", type: "product" },
  { id: "demo-tx-25", tx_id: "TL-2026-0025", buyer_name: "CleanCity Lagos", vendor_name: "EcoRecycle Africa", amount: 92000, fee: 1380, status: "locked", item: "Industrial Waste Collection & Recycling (Q1)", industry: "waste_management", tracking: null, order_number: 25, created_at: new Date(Date.now() - 2073600000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Lagos, Nigeria", type: "service" },
  // Keep some with other statuses for variety
  { id: "demo-tx-26", tx_id: "TL-2026-0026", buyer_name: "QuickShop NG", vendor_name: "DropShip Africa", amount: 890, fee: 13.35, status: "shipped", item: "Wireless Earbuds (50 units)", industry: "ecommerce", tracking: "NG-DHL-77432", order_number: 26, created_at: new Date(Date.now() - 259200000).toISOString(), buyer_location: "Lagos, Nigeria", vendor_location: "Shenzhen, China", type: "product" },
  { id: "demo-tx-27", tx_id: "TL-2026-0027", buyer_name: "AutoFleet Kenya", vendor_name: "AutoImport NG", amount: 142000, fee: 2130, status: "delivered", item: "5x Toyota Hilux Fleet (Dubai Import)", industry: "automotive", tracking: "AE-RORO-11987", order_number: 27, created_at: new Date(Date.now() - 2592000000).toISOString(), buyer_location: "Nairobi, Kenya", vendor_location: "Dubai, UAE", type: "product" },
  { id: "demo-tx-28", tx_id: "TL-2026-0028", buyer_name: "AgriTrade EU", vendor_name: "GreenHarvest Farms", amount: 58000, fee: 870, status: "disputed", item: "Avocados (20 MT, Class 1)", industry: "agriculture", tracking: "KE-MSK-99213", order_number: 28, created_at: new Date(Date.now() - 3456000000).toISOString(), buyer_location: "Rotterdam, NL", vendor_location: "Naivasha, Kenya", type: "product" },
];

// Generate milestones from templates
function generateMilestones(transactions: MockTransaction[]): MockMilestone[] {
  const milestones: MockMilestone[] = [];
  for (const tx of transactions) {
    const template = INDUSTRY_MILESTONES[tx.industry];
    if (!template) continue;
    const total = tx.amount;
    const paymentMilestones = template.filter(m => m.payment);
    const perMilestone = paymentMilestones.length > 0 ? total / paymentMilestones.length : 0;

    template.forEach((ms, idx) => {
      milestones.push({
        id: `mock-ms-${tx.id}-${idx}`,
        transaction_id: tx.id,
        title: ms.title,
        description: ms.desc,
        status: "pending",
        is_payment_milestone: ms.payment,
        payment_percentage: ms.payment ? Math.round(100 / paymentMilestones.length) : 0,
        payment_amount: ms.payment ? Math.round(perMilestone * 100) / 100 : 0,
        payment_released: false,
        uploaded_documents: [],
        observer_id: null,
        observer_name: null,
        observer_email: null,
        observer_access_token: null,
        gps_latitude: null,
        gps_longitude: null,
        gps_accuracy: null,
        gps_captured_at: null,
        order_index: idx,
      });
    });
  }
  return milestones;
}

const INITIAL_MILESTONES = generateMilestones(INITIAL_TRANSACTIONS);

const INITIAL_DISPUTES: MockDispute[] = [
  {
    id: "demo-dsp-1", dispute_id: "DSP-2026-0028", tx_id: "TL-2026-0028",
    vendor_name: "GreenHarvest Farms", amount: 58000, reason: "Quality issue — 40% of avocados arrived overripe",
    status: "under_review", created_at: new Date(Date.now() - 1209600000).toISOString(),
    ai_recommendation: "Emmanuel AI recommends partial refund (60%) — cold chain temperature logs show deviation at Mombasa port.",
  },
];

const STORAGE_KEY = "tl_testnet_mock_state";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveState(txs: MockTransaction[], disputes: MockDispute[], milestones: MockMilestone[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: txs, disputes, milestones }));
}

export function useTestnetData() {
  const saved = loadState();
  const [transactions, setTransactions] = useState<MockTransaction[]>(saved?.transactions || INITIAL_TRANSACTIONS);
  const [disputes, setDisputes] = useState<MockDispute[]>(saved?.disputes || INITIAL_DISPUTES);
  const [milestones, setMilestones] = useState<MockMilestone[]>(saved?.milestones || INITIAL_MILESTONES);

  const persist = useCallback((txs: MockTransaction[], dsps: MockDispute[], mss?: MockMilestone[]) => {
    const ms = mss ?? milestones;
    setTransactions(txs);
    setDisputes(dsps);
    setMilestones(ms);
    saveState(txs, dsps, ms);
  }, [milestones]);

  const persistMilestones = useCallback((mss: MockMilestone[]) => {
    setMilestones(mss);
    saveState(transactions, disputes, mss);
  }, [transactions, disputes]);

  // ─── Transaction actions ───
  const addTracking = useCallback((txId: string, tracking: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, tracking, status: "shipped" as const } : tx
    );
    persist(updated, disputes);
    toast.success(`📦 Tracking added: ${tracking} — Order marked as Shipped`);
  }, [transactions, disputes, persist]);

  const markDelivered = useCallback((txId: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, status: "delivered" as const } : tx
    );
    persist(updated, disputes);
    toast.success("🚚 Order marked as Delivered — awaiting buyer confirmation");
  }, [transactions, disputes, persist]);

  const confirmDelivery = useCallback((txId: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, status: "delivered" as const } : tx
    );
    persist(updated, disputes);
    toast.success("✅ Delivery confirmed — you may now release funds to vendor");
  }, [transactions, disputes, persist]);

  const releaseFunds = useCallback((txId: string) => {
    const updated = transactions.map(tx =>
      tx.tx_id === txId ? { ...tx, status: "released" as const } : tx
    );
    persist(updated, disputes);
    toast.success("✅ Funds released to vendor!");
  }, [transactions, disputes, persist]);

  const openDispute = useCallback((txId: string, reason: string) => {
    const tx = transactions.find(t => t.tx_id === txId);
    const updatedTx = transactions.map(t =>
      t.tx_id === txId ? { ...t, status: "disputed" as const } : t
    );
    const newDispute: MockDispute = {
      id: `demo-dsp-${Date.now()}`,
      dispute_id: `DSP-${txId.replace("TL-", "")}`,
      tx_id: txId,
      vendor_name: tx?.vendor_name || "Unknown",
      amount: tx?.amount || 0,
      reason,
      status: "pending",
      created_at: new Date().toISOString(),
      ai_recommendation: "Emmanuel AI is analyzing evidence submitted...",
    };
    persist(updatedTx, [...disputes, newDispute]);
    toast.success("⚠️ Dispute filed — Emmanuel AI will begin review shortly");
  }, [transactions, disputes, persist]);

  const rejectOrders = useCallback((txIds: string[]) => {
    const updated = transactions.filter(tx => !txIds.includes(tx.tx_id));
    persist(updated, disputes);
    toast.success(`${txIds.length} order(s) rejected. Buyers notified.`);
  }, [transactions, disputes, persist]);

  // ─── Milestone actions ───
  const getMilestones = useCallback((transactionId: string) => {
    return milestones.filter(ms => ms.transaction_id === transactionId);
  }, [milestones]);

  const updateMilestoneStatus = useCallback((milestoneId: string, status: MockMilestone["status"]) => {
    const updated = milestones.map(ms =>
      ms.id === milestoneId ? { ...ms, status } : ms
    );
    persistMilestones(updated);
    const labels: Record<string, string> = { in_progress: "In Progress", completed: "Fulfilled", released: "Released" };
    toast.success(`✅ Milestone marked as ${labels[status] || status}`);
  }, [milestones, persistMilestones]);

  const updateMilestoneNote = useCallback((milestoneId: string, note: string) => {
    const updated = milestones.map(ms =>
      ms.id === milestoneId ? { ...ms, description: note } : ms
    );
    persistMilestones(updated);
    toast.success("📝 Milestone note saved");
  }, [milestones, persistMilestones]);

  const addMilestoneDocument = useCallback((milestoneId: string, doc: { name: string; url: string }) => {
    const updated = milestones.map(ms =>
      ms.id === milestoneId
        ? { ...ms, uploaded_documents: [...ms.uploaded_documents, { ...doc, uploadedAt: new Date().toISOString() }] }
        : ms
    );
    persistMilestones(updated);
    toast.success(`📎 Document "${doc.name}" attached to milestone`);
  }, [milestones, persistMilestones]);

  const inviteObserver = useCallback((milestoneId: string, name: string, email: string) => {
    const token = `testnet-obs-${Date.now().toString(36)}`;
    const updated = milestones.map(ms =>
      ms.id === milestoneId
        ? { ...ms, observer_id: `obs-${Date.now()}`, observer_name: name, observer_email: email, observer_access_token: token }
        : ms
    );
    persistMilestones(updated);
    const link = `${window.location.origin}/trustlock/audit/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success(`🔗 Observer invite sent to ${name} — link copied!`);
    });
    return token;
  }, [milestones, persistMilestones]);

  const releaseMilestonePayment = useCallback((milestoneId: string) => {
    const updated = milestones.map(ms =>
      ms.id === milestoneId ? { ...ms, status: "released" as const, payment_released: true } : ms
    );
    persistMilestones(updated);
    const ms = milestones.find(m => m.id === milestoneId);
    toast.success(`💰 Milestone payment of $${ms?.payment_amount?.toLocaleString() || "0"} released to vendor`);
  }, [milestones, persistMilestones]);

  const addGpsToMilestone = useCallback((milestoneId: string, lat: number, lng: number, accuracy: number) => {
    const updated = milestones.map(ms =>
      ms.id === milestoneId
        ? { ...ms, gps_latitude: lat, gps_longitude: lng, gps_accuracy: accuracy, gps_captured_at: new Date().toISOString() }
        : ms
    );
    persistMilestones(updated);
    toast.success(`📍 GPS captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }, [milestones, persistMilestones]);

  const resetTestnetData = useCallback(() => {
    const freshMilestones = generateMilestones(INITIAL_TRANSACTIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setDisputes(INITIAL_DISPUTES);
    setMilestones(freshMilestones);
    saveState(INITIAL_TRANSACTIONS, INITIAL_DISPUTES, freshMilestones);
    toast.success("🔄 Testnet data reset to defaults (all 25 industries)");
  }, []);

  return {
    transactions,
    disputes,
    milestones,
    // Transaction actions
    addTracking,
    markDelivered,
    confirmDelivery,
    releaseFunds,
    openDispute,
    rejectOrders,
    // Milestone actions
    getMilestones,
    updateMilestoneStatus,
    updateMilestoneNote,
    addMilestoneDocument,
    inviteObserver,
    releaseMilestonePayment,
    addGpsToMilestone,
    // Reset
    resetTestnetData,
  };
}

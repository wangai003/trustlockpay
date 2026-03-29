import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Globe, FileCheck, DollarSign, Truck, Shield, Scale, Upload,
  Settings2, ChevronDown, ChevronUp, Building2, Landmark, Zap,
} from "lucide-react";
import { ALL_INDUSTRIES } from "@/lib/industryList";

/* ───────── Industry Subcategories ───────── */
const INDUSTRY_SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  ecommerce: [
    { value: "fashion", label: "Fashion & Apparel" },
    { value: "electronics", label: "Electronics & Gadgets" },
    { value: "general_goods", label: "General Consumer Goods" },
    { value: "handmade", label: "Handmade & Artisanal" },
    { value: "digital_products", label: "Digital Products" },
  ],
  construction: [
    { value: "residential", label: "Residential Construction" },
    { value: "commercial", label: "Commercial Construction" },
    { value: "infrastructure", label: "Infrastructure / Civil" },
    { value: "renovation", label: "Renovation & Remodeling" },
  ],
  real_estate: [
    { value: "property_sales", label: "Property Sales" },
    { value: "rentals", label: "Rentals & Leasing" },
    { value: "land", label: "Land / Plot Sales" },
    { value: "property_management", label: "Property Management" },
  ],
  mining: [
    { value: "precious_metals", label: "Gold / Precious Metals" },
    { value: "gemstones", label: "Gemstones & Diamonds" },
    { value: "industrial_minerals", label: "Industrial Minerals" },
    { value: "oil_gas_extraction", label: "Oil & Gas Extraction" },
  ],
  agriculture: [
    { value: "cash_crops", label: "Cash Crops (Cocoa, Coffee, etc.)" },
    { value: "livestock", label: "Livestock & Poultry" },
    { value: "fisheries_agri", label: "Fisheries" },
    { value: "processed_agri", label: "Processed Agri-Products" },
  ],
  freelance: [
    { value: "software_dev", label: "Software Development" },
    { value: "creative_design", label: "Creative / Design" },
    { value: "consulting", label: "Business Consulting" },
    { value: "writing", label: "Writing & Content" },
  ],
  logistics: [
    { value: "freight", label: "Freight & Cargo" },
    { value: "last_mile", label: "Last-Mile Delivery" },
    { value: "warehousing", label: "Warehousing & Fulfillment" },
    { value: "customs_brokerage", label: "Customs Brokerage" },
  ],
  tourism: [
    { value: "hotels", label: "Hotels & Lodging" },
    { value: "tour_operators", label: "Tour Operators" },
    { value: "events_tickets", label: "Events & Ticketing" },
    { value: "car_rental", label: "Car Rental" },
  ],
  education: [
    { value: "k12", label: "K-12 Schools" },
    { value: "university", label: "Higher Education" },
    { value: "vocational", label: "Vocational / Trade Schools" },
    { value: "online_courses", label: "Online Courses & EdTech" },
  ],
  energy: [
    { value: "oil_gas", label: "Oil & Gas Trading" },
    { value: "power_generation", label: "Power Generation" },
    { value: "fuel_distribution", label: "Fuel Distribution" },
    { value: "utilities", label: "Utilities Management" },
  ],
  renewable_energy: [
    { value: "solar", label: "Solar Systems" },
    { value: "wind", label: "Wind Energy" },
    { value: "ev_charging", label: "EV & Battery" },
    { value: "biogas", label: "Biogas & Biomass" },
  ],
  pharmaceuticals: [
    { value: "drug_supply", label: "Drug Supply & Distribution" },
    { value: "medical_equipment", label: "Medical Equipment" },
    { value: "clinical_services", label: "Clinical Services" },
    { value: "lab_supplies", label: "Lab & Research Supplies" },
  ],
  manufacturing: [
    { value: "heavy_machinery", label: "Heavy Machinery" },
    { value: "consumer_manufacturing", label: "Consumer Products" },
    { value: "industrial_parts", label: "Industrial Parts & Components" },
    { value: "packaging", label: "Packaging Materials" },
  ],
  automotive: [
    { value: "vehicle_import", label: "Vehicle Import / Sales" },
    { value: "auto_parts", label: "Auto Parts & Accessories" },
    { value: "fleet_management", label: "Fleet Management" },
    { value: "repair_services", label: "Repair & Maintenance" },
  ],
  textiles: [
    { value: "raw_materials", label: "Raw Materials (Cotton, Silk)" },
    { value: "garment_manufacturing", label: "Garment Manufacturing" },
    { value: "fashion_export", label: "Fashion Export" },
  ],
  food_beverage: [
    { value: "food_processing", label: "Food Processing" },
    { value: "beverages", label: "Beverages & Spirits" },
    { value: "restaurant_supply", label: "Restaurant Supply" },
    { value: "export_commodities", label: "Export Commodities" },
  ],
  telecommunications: [
    { value: "network_infra", label: "Network Infrastructure" },
    { value: "isp", label: "ISP / Internet Services" },
    { value: "mobile_services", label: "Mobile Services" },
    { value: "hardware", label: "Telecom Hardware" },
  ],
  aviation: [
    { value: "charter", label: "Charter / Private Aviation" },
    { value: "parts_supply", label: "Parts & MRO Supply" },
    { value: "ground_handling", label: "Ground Handling" },
  ],
  insurance: [
    { value: "marine_cargo", label: "Marine & Cargo Insurance" },
    { value: "property_insurance", label: "Property Insurance" },
    { value: "trade_credit", label: "Trade Credit Insurance" },
  ],
  legal_services: [
    { value: "corporate_law", label: "Corporate Law" },
    { value: "trade_law", label: "International Trade Law" },
    { value: "ip_law", label: "IP / Patent Law" },
    { value: "arbitration", label: "Arbitration & Mediation" },
  ],
  marine_fisheries: [
    { value: "fishing_export", label: "Fishing & Export" },
    { value: "aquaculture", label: "Aquaculture" },
    { value: "marine_equipment", label: "Marine Equipment" },
  ],
  water_sanitation: [
    { value: "borehole", label: "Borehole & Wells" },
    { value: "treatment_plants", label: "Treatment Plants" },
    { value: "sanitation_equipment", label: "Sanitation Equipment" },
  ],
  media_entertainment: [
    { value: "film_production", label: "Film / TV Production" },
    { value: "music", label: "Music & Recording" },
    { value: "advertising", label: "Advertising & Marketing" },
    { value: "gaming", label: "Gaming" },
  ],
  waste_management: [
    { value: "collection", label: "Waste Collection" },
    { value: "recycling", label: "Recycling" },
    { value: "hazardous", label: "Hazardous Waste" },
  ],
  project_management: [
    { value: "it_projects", label: "IT Projects" },
    { value: "engineering", label: "Engineering Projects" },
    { value: "event_planning", label: "Event Planning" },
  ],
};

/* ───────── Industry-Specific Pre-Config Fields ───────── */
interface IndustryPreConfig {
  pricingFields: { key: string; label: string; type: "text" | "number" | "select"; options?: string[] }[];
  documentRequirements: { key: string; label: string; required: boolean }[];
  tariffRegions: string[];
  contractType: string;
  complianceNotes: string;
  currencyQuoting: boolean;
  incotermsRelevant: boolean;
}

const INDUSTRY_PRECONFIGS: Record<string, IndustryPreConfig> = {
  mining: {
    pricingFields: [
      { key: "base_price_per_unit", label: "Base Price Per Unit (USD)", type: "number" },
      { key: "pricing_unit", label: "Pricing Unit", type: "select", options: ["Per MT", "Per KG", "Per Oz", "Per Carat", "Per Lot"] },
      { key: "grade_premium", label: "Grade Premium (%)", type: "number" },
      { key: "royalty_rate", label: "Government Royalty Rate (%)", type: "number" },
      { key: "origin_country", label: "Mineral Origin Country", type: "text" },
    ],
    documentRequirements: [
      { key: "assay_certificate", label: "Assay Certificate", required: true },
      { key: "export_license", label: "Export License", required: true },
      { key: "origin_certificate", label: "Certificate of Origin", required: true },
      { key: "environmental_clearance", label: "Environmental Impact Assessment", required: true },
      { key: "mining_permit", label: "Mining Permit / Concession", required: true },
      { key: "kimberley_cert", label: "Kimberley Process Certificate (Diamonds)", required: false },
    ],
    tariffRegions: ["AfCFTA Zone", "ECOWAS", "SADC", "EAC", "EU", "USA", "China", "India", "Middle East"],
    contractType: "Commodity Purchase Agreement (CPA)",
    complianceNotes: "Requires Kimberley Process for diamonds; EITI compliance for extractives; export permits vary by country.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  agriculture: {
    pricingFields: [
      { key: "base_price_per_unit", label: "Base Price Per Unit (USD)", type: "number" },
      { key: "pricing_unit", label: "Pricing Unit", type: "select", options: ["Per MT", "Per KG", "Per Bag", "Per Bushel", "Per Tonne"] },
      { key: "harvest_season", label: "Harvest Season", type: "select", options: ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)", "Year-round"] },
      { key: "moisture_tolerance", label: "Moisture Tolerance (%)", type: "number" },
      { key: "origin_country", label: "Supplier Origin Country", type: "text" },
    ],
    documentRequirements: [
      { key: "phytosanitary_cert", label: "Phytosanitary Certificate", required: true },
      { key: "quality_grade_cert", label: "Quality Grade Certificate", required: true },
      { key: "export_permit", label: "Export Permit", required: true },
      { key: "fumigation_cert", label: "Fumigation Certificate", required: true },
      { key: "organic_cert", label: "Organic Certification", required: false },
      { key: "fair_trade_cert", label: "Fair Trade Certificate", required: false },
    ],
    tariffRegions: ["AfCFTA Zone", "ECOWAS", "EU (AGOA/EBA)", "USA", "Middle East", "Asia-Pacific"],
    contractType: "Agricultural Commodity Sales Contract",
    complianceNotes: "SPS compliance mandatory; AfCFTA preferential rates apply for intra-Africa; EU has strict MRL limits.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  energy: {
    pricingFields: [
      { key: "base_price", label: "Base Price Per Barrel/MWh (USD)", type: "number" },
      { key: "pricing_unit", label: "Pricing Unit", type: "select", options: ["Per Barrel", "Per MWh", "Per Litre", "Per MMBTU", "Per Cubic Meter"] },
      { key: "grade_specification", label: "Grade / Specification (e.g. Brent, WTI)", type: "text" },
      { key: "delivery_point", label: "Delivery Point", type: "text" },
    ],
    documentRequirements: [
      { key: "energy_license", label: "Energy Trading License", required: true },
      { key: "environmental_impact", label: "Environmental Impact Assessment", required: true },
      { key: "quantity_survey", label: "Quantity Survey Report", required: true },
      { key: "safety_cert", label: "HSE / Safety Certificate", required: true },
    ],
    tariffRegions: ["OPEC", "EU", "USA", "AfCFTA Zone", "Asia-Pacific", "Middle East"],
    contractType: "Energy Supply Agreement",
    complianceNotes: "Subject to OPEC pricing for crude; environmental regulations per jurisdiction; sanctions screening critical.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  logistics: {
    pricingFields: [
      { key: "freight_rate", label: "Freight Rate", type: "number" },
      { key: "rate_basis", label: "Rate Basis", type: "select", options: ["Per Container (20ft)", "Per Container (40ft)", "Per CBM", "Per KG", "Per Pallet", "Flat Rate"] },
      { key: "fuel_surcharge", label: "Fuel Surcharge (%)", type: "number" },
      { key: "origin_port", label: "Origin Port / Hub", type: "text" },
      { key: "destination_port", label: "Destination Port / Hub", type: "text" },
    ],
    documentRequirements: [
      { key: "bill_of_lading", label: "Bill of Lading", required: true },
      { key: "commercial_invoice", label: "Commercial Invoice", required: true },
      { key: "packing_list", label: "Packing List", required: true },
      { key: "insurance_cert", label: "Cargo Insurance Certificate", required: true },
      { key: "customs_declaration", label: "Customs Declaration", required: true },
    ],
    tariffRegions: ["Intra-Africa", "Africa-EU", "Africa-USA", "Africa-Asia", "Africa-Middle East"],
    contractType: "Freight / Logistics Service Agreement",
    complianceNotes: "Incoterms mandatory; marine insurance required for ocean freight; customs broker clearance per port.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  construction: {
    pricingFields: [
      { key: "project_value", label: "Estimated Project Value (USD)", type: "number" },
      { key: "payment_structure", label: "Payment Structure", type: "select", options: ["Milestone-Based", "Monthly Valuation", "Percentage Completion", "Lump Sum"] },
      { key: "retention_percentage", label: "Retention Percentage (%)", type: "number" },
      { key: "defects_liability_days", label: "Defects Liability Period (Days)", type: "number" },
    ],
    documentRequirements: [
      { key: "building_permit", label: "Building Permit", required: true },
      { key: "environmental_cert", label: "Environmental Certificate", required: true },
      { key: "architectural_plans", label: "Architectural Plans / BOQ", required: true },
      { key: "contractor_license", label: "Contractor License", required: true },
      { key: "performance_bond", label: "Performance Bond / Guarantee", required: false },
      { key: "insurance_policy", label: "Contractor All-Risk Insurance", required: true },
    ],
    tariffRegions: ["Local", "Regional", "International"],
    contractType: "Construction Contract (FIDIC-aligned)",
    complianceNotes: "FIDIC standards recommended; retention clause common (5-10%); interim payment certificates required.",
    currencyQuoting: true,
    incotermsRelevant: false,
  },
  real_estate: {
    pricingFields: [
      { key: "listing_price", label: "Listing Price (USD)", type: "number" },
      { key: "pricing_basis", label: "Pricing Basis", type: "select", options: ["Per Unit", "Per SqM", "Per SqFt", "Per Acre", "Per Hectare"] },
      { key: "deposit_percentage", label: "Deposit / Down Payment (%)", type: "number" },
      { key: "completion_timeline", label: "Expected Completion (months)", type: "number" },
    ],
    documentRequirements: [
      { key: "title_deed", label: "Title Deed / Certificate of Occupancy", required: true },
      { key: "valuation_report", label: "Property Valuation Report", required: true },
      { key: "survey_plan", label: "Survey Plan", required: true },
      { key: "tax_clearance", label: "Tax Clearance Certificate", required: true },
      { key: "building_approval", label: "Building Approval (for new builds)", required: false },
    ],
    tariffRegions: ["Local", "Diaspora", "International Investor"],
    contractType: "Sale & Purchase Agreement (SPA)",
    complianceNotes: "Title verification critical; governor's consent required in some jurisdictions; stamp duty applies.",
    currencyQuoting: true,
    incotermsRelevant: false,
  },
  pharmaceuticals: {
    pricingFields: [
      { key: "base_price", label: "Base Unit Price (USD)", type: "number" },
      { key: "pricing_unit", label: "Pricing Unit", type: "select", options: ["Per Unit", "Per Box", "Per Pallet", "Per Vial", "Per Dose"] },
      { key: "cold_chain", label: "Cold Chain Required", type: "select", options: ["Yes", "No"] },
      { key: "shelf_life_months", label: "Minimum Shelf Life (months)", type: "number" },
    ],
    documentRequirements: [
      { key: "pharma_license", label: "Pharmaceutical Import/Export License", required: true },
      { key: "gmp_certificate", label: "GMP Certificate", required: true },
      { key: "who_prequalification", label: "WHO Prequalification (if applicable)", required: false },
      { key: "batch_analysis", label: "Certificate of Analysis (CoA)", required: true },
      { key: "nafdac_reg", label: "NAFDAC / Local Regulatory Registration", required: true },
    ],
    tariffRegions: ["Africa", "EU", "USA (FDA)", "India", "China", "WHO/UNICEF"],
    contractType: "Pharmaceutical Supply Agreement",
    complianceNotes: "WHO GMP mandatory for international; cold chain documentation required; batch traceability essential.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  manufacturing: {
    pricingFields: [
      { key: "unit_price", label: "Unit Price (USD)", type: "number" },
      { key: "moq", label: "Minimum Order Quantity (MOQ)", type: "number" },
      { key: "lead_time_days", label: "Lead Time (Days)", type: "number" },
      { key: "tooling_cost", label: "Tooling / Setup Cost (if any)", type: "number" },
    ],
    documentRequirements: [
      { key: "quality_cert", label: "Quality Certification (ISO 9001)", required: true },
      { key: "origin_certificate", label: "Certificate of Origin", required: true },
      { key: "test_report", label: "Product Test / Inspection Report", required: true },
      { key: "msds", label: "Material Safety Data Sheet (MSDS)", required: false },
    ],
    tariffRegions: ["AfCFTA Zone", "AGOA (USA)", "EU", "Asia", "Middle East"],
    contractType: "Manufacturing / OEM Supply Agreement",
    complianceNotes: "ISO certification preferred; pre-shipment inspection (PSI) may be mandatory; HS code classification required.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  ecommerce: {
    pricingFields: [
      { key: "retail_price", label: "Retail Price (USD)", type: "number" },
      { key: "shipping_cost", label: "Default Shipping Cost", type: "number" },
      { key: "return_window", label: "Return Window (Days)", type: "number" },
    ],
    documentRequirements: [
      { key: "product_listing", label: "Product Listing / SKU Data", required: true },
      { key: "return_policy", label: "Return & Refund Policy", required: true },
    ],
    tariffRegions: ["Local", "Regional (Africa)", "International"],
    contractType: "Purchase Order",
    complianceNotes: "Consumer protection laws apply; clear return policies required; digital goods exempt from shipping.",
    currencyQuoting: false,
    incotermsRelevant: false,
  },
  freelance: {
    pricingFields: [
      { key: "hourly_rate", label: "Hourly Rate (USD)", type: "number" },
      { key: "project_rate", label: "Fixed Project Rate (USD)", type: "number" },
      { key: "revision_rounds", label: "Included Revision Rounds", type: "number" },
      { key: "delivery_days", label: "Standard Delivery (Days)", type: "number" },
    ],
    documentRequirements: [
      { key: "scope_of_work", label: "Scope of Work (SOW)", required: true },
      { key: "portfolio", label: "Portfolio / Past Work Samples", required: false },
      { key: "nda", label: "Non-Disclosure Agreement (NDA)", required: false },
    ],
    tariffRegions: ["Local", "International"],
    contractType: "Service Agreement / SOW",
    complianceNotes: "IP ownership clauses critical; milestone-based payments recommended; NDA optional but advised.",
    currencyQuoting: false,
    incotermsRelevant: false,
  },
  tourism: {
    pricingFields: [
      { key: "package_price", label: "Package Price (USD)", type: "number" },
      { key: "pricing_basis", label: "Per", type: "select", options: ["Per Person", "Per Room/Night", "Per Group", "Per Ticket"] },
      { key: "deposit_percentage", label: "Deposit Required (%)", type: "number" },
      { key: "cancellation_days", label: "Free Cancellation Window (Days)", type: "number" },
    ],
    documentRequirements: [
      { key: "tourism_license", label: "Tourism Operator License", required: true },
      { key: "insurance", label: "Travel Insurance / Liability Coverage", required: true },
      { key: "itinerary", label: "Detailed Itinerary", required: false },
    ],
    tariffRegions: ["Local", "Regional", "International"],
    contractType: "Booking / Service Agreement",
    complianceNotes: "Cancellation policies must be clearly stated; travel insurance recommended; visa info for international tourists.",
    currencyQuoting: false,
    incotermsRelevant: false,
  },
  textiles: {
    pricingFields: [
      { key: "unit_price", label: "Price Per Yard/Meter (USD)", type: "number" },
      { key: "pricing_unit", label: "Pricing Unit", type: "select", options: ["Per Yard", "Per Meter", "Per KG", "Per Bale", "Per Roll"] },
      { key: "moq", label: "Minimum Order Quantity", type: "number" },
    ],
    documentRequirements: [
      { key: "origin_certificate", label: "Certificate of Origin", required: true },
      { key: "agoa_cert", label: "AGOA Eligibility Certificate", required: false },
      { key: "fabric_test", label: "Fabric Test Report", required: true },
    ],
    tariffRegions: ["AfCFTA Zone", "AGOA (USA)", "EU", "Asia"],
    contractType: "Textile Supply Agreement",
    complianceNotes: "AGOA preferences for eligible countries; fabric composition labeling required for US/EU markets.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  automotive: {
    pricingFields: [
      { key: "vehicle_price", label: "Vehicle / Parts Price (USD)", type: "number" },
      { key: "import_duty_estimate", label: "Estimated Import Duty (%)", type: "number" },
      { key: "shipping_method", label: "Shipping", type: "select", options: ["RoRo", "Container", "Air Freight", "Land Transport"] },
    ],
    documentRequirements: [
      { key: "bill_of_lading", label: "Bill of Lading", required: true },
      { key: "vehicle_title", label: "Vehicle Title / Registration", required: true },
      { key: "roadworthiness", label: "Roadworthiness Certificate", required: true },
      { key: "customs_valuation", label: "Customs Valuation Form", required: true },
    ],
    tariffRegions: ["USA", "EU", "Japan", "UAE", "Intra-Africa"],
    contractType: "Vehicle Purchase Agreement",
    complianceNotes: "Age restrictions on imports vary by country; SON/KEBS conformity assessment may apply.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
  food_beverage: {
    pricingFields: [
      { key: "unit_price", label: "Price Per Unit (USD)", type: "number" },
      { key: "pricing_unit", label: "Unit", type: "select", options: ["Per KG", "Per Litre", "Per Carton", "Per Pallet", "Per Container"] },
      { key: "shelf_life", label: "Minimum Shelf Life (Days)", type: "number" },
    ],
    documentRequirements: [
      { key: "food_safety_cert", label: "Food Safety Certificate (ISO 22000 / HACCP)", required: true },
      { key: "nafdac_cert", label: "NAFDAC / Local Food Authority Registration", required: true },
      { key: "halal_cert", label: "Halal Certification", required: false },
      { key: "nutritional_label", label: "Nutritional Labeling", required: true },
    ],
    tariffRegions: ["AfCFTA Zone", "EU", "USA (FDA)", "Middle East", "Asia-Pacific"],
    contractType: "Food & Beverage Supply Agreement",
    complianceNotes: "HACCP/ISO 22000 compliance critical; Halal certification for Middle East markets; cold chain for perishables.",
    currencyQuoting: true,
    incotermsRelevant: true,
  },
};

/* ───────── Fallback for industries without specific preconfigs ───────── */
const DEFAULT_PRECONFIG: IndustryPreConfig = {
  pricingFields: [
    { key: "base_price", label: "Base Price (USD)", type: "number" },
    { key: "pricing_model", label: "Pricing Model", type: "select", options: ["Fixed", "Per Unit", "Hourly", "Project-Based", "Custom Quote"] },
  ],
  documentRequirements: [
    { key: "business_registration", label: "Business Registration Certificate", required: true },
    { key: "tax_clearance", label: "Tax Clearance Certificate", required: false },
  ],
  tariffRegions: ["Local", "Regional", "International"],
  contractType: "General Service / Purchase Agreement",
  complianceNotes: "Standard business registration and tax compliance required.",
  currencyQuoting: false,
  incotermsRelevant: false,
};

const QUOTING_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "EGP", "XOF", "XAF", "TZS", "UGX", "RWF", "ZMW", "ETB", "MAD"];

/* ───────── Component ───────── */
interface WidgetIndustryConfigProps {
  industry: string;
  onConfigSave: (config: Record<string, unknown>) => void;
}

const WidgetIndustryConfig = ({ industry, onConfigSave }: WidgetIndustryConfigProps) => {
  const [subcategory, setSubcategory] = useState("");
  const [expandPricing, setExpandPricing] = useState(true);
  const [expandDocs, setExpandDocs] = useState(false);
  const [expandTariffs, setExpandTariffs] = useState(false);
  const [pricingValues, setPricingValues] = useState<Record<string, string>>({});
  const [enabledDocs, setEnabledDocs] = useState<Record<string, boolean>>({});
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [quotingCurrencies, setQuotingCurrencies] = useState<string[]>(["USD"]);
  const [incoterms, setIncoterms] = useState("");
  const [customNotes, setCustomNotes] = useState("");
  const [saved, setSaved] = useState(false);

  const preconfig = INDUSTRY_PRECONFIGS[industry] || DEFAULT_PRECONFIG;
  const subcats = INDUSTRY_SUBCATEGORIES[industry] || [];
  const industryLabel = ALL_INDUSTRIES.find(i => i.value === industry)?.label || industry;

  // Initialize docs on industry change
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    preconfig.documentRequirements.forEach(d => { initial[d.key] = d.required; });
    setEnabledDocs(initial);
    setPricingValues({});
    setSelectedRegions([]);
    setSubcategory("");
    setSaved(false);
  }, [industry]);

  const handleSave = () => {
    const config = {
      industry,
      subcategory,
      pricing: pricingValues,
      documents: Object.entries(enabledDocs).filter(([, v]) => v).map(([k]) => k),
      tariffRegions: selectedRegions,
      quotingCurrencies,
      incoterms: preconfig.incotermsRelevant ? incoterms : undefined,
      contractType: preconfig.contractType,
      notes: customNotes,
    };
    onConfigSave(config);
    localStorage.setItem(`tl_widget_config_${industry}`, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!industry) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          Widget Pre-Configuration — {industryLabel}
        </CardTitle>
        <CardDescription className="text-xs">
          Configure industry-specific defaults so your checkout widget auto-generates tailored invoices for your buyers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subcategory */}
        {subcats.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Subcategory
            </Label>
            <Select value={subcategory} onValueChange={setSubcategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select your specific niche..." />
              </SelectTrigger>
              <SelectContent>
                {subcats.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* ─── Pricing Mechanism ─── */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandPricing(!expandPricing)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" /> Pricing Mechanism
            </span>
            {expandPricing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandPricing && (
            <div className="p-3 space-y-3">
              {preconfig.pricingFields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{field.label}</Label>
                  {field.type === "select" ? (
                    <Select value={pricingValues[field.key] || ""} onValueChange={v => setPricingValues(p => ({ ...p, [field.key]: v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(o => (
                          <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type}
                      value={pricingValues[field.key] || ""}
                      onChange={e => setPricingValues(p => ({ ...p, [field.key]: e.target.value }))}
                      className="h-8 text-xs"
                      placeholder={field.type === "number" ? "0.00" : "Enter value..."}
                    />
                  )}
                </div>
              ))}

              {/* Currency Quoting */}
              {preconfig.currencyQuoting && (
                <div className="space-y-1.5 pt-2 border-t border-border">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Quoting Currencies (select all that apply)
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUOTING_CURRENCIES.map(c => (
                      <Badge
                        key={c}
                        variant={quotingCurrencies.includes(c) ? "default" : "outline"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => setQuotingCurrencies(prev =>
                          prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                        )}
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Incoterms */}
              {preconfig.incotermsRelevant && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Default Incoterms
                  </Label>
                  <Select value={incoterms} onValueChange={setIncoterms}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Incoterms..." />
                    </SelectTrigger>
                    <SelectContent>
                      {["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"].map(t => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Document Requirements ─── */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandDocs(!expandDocs)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-primary" /> Document & Compliance Requirements
              <Badge variant="outline" className="text-[9px] ml-1">
                {Object.values(enabledDocs).filter(Boolean).length} active
              </Badge>
            </span>
            {expandDocs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandDocs && (
            <div className="p-3 space-y-2">
              {preconfig.documentRequirements.map(doc => (
                <label key={doc.key} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/20 cursor-pointer">
                  <Checkbox
                    checked={enabledDocs[doc.key] ?? doc.required}
                    onCheckedChange={v => setEnabledDocs(p => ({ ...p, [doc.key]: !!v }))}
                    disabled={doc.required}
                  />
                  <span className="text-xs flex-1">{doc.label}</span>
                  {doc.required && <Badge variant="destructive" className="text-[8px]">Required</Badge>}
                </label>
              ))}
              <div className="p-2 bg-accent/5 rounded-md border border-accent/20 mt-2">
                <p className="text-[9px] text-muted-foreground flex items-start gap-1">
                  <Shield className="w-3 h-3 shrink-0 mt-0.5 text-accent" />
                  {preconfig.complianceNotes}
                </p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Auto-Generated Contract Type
                </p>
                <p className="text-xs font-medium text-foreground mt-0.5">{preconfig.contractType}</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tariff & Region Selection ─── */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandTariffs(!expandTariffs)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-primary" /> Target Markets & Tariff Regions
            </span>
            {expandTariffs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandTariffs && (
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">Select the markets you serve — this helps auto-calculate tariffs and duties for buyer invoices.</p>
              <div className="flex flex-wrap gap-1.5">
                {preconfig.tariffRegions.map(r => (
                  <Badge
                    key={r}
                    variant={selectedRegions.includes(r) ? "default" : "outline"}
                    className="text-[10px] cursor-pointer"
                    onClick={() => setSelectedRegions(prev =>
                      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
                    )}
                  >
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Additional Setup Notes (optional)</Label>
          <Textarea
            value={customNotes}
            onChange={e => setCustomNotes(e.target.value)}
            placeholder="Special pricing rules, seasonal adjustments, preferred payment terms..."
            className="text-xs min-h-[50px]"
          />
        </div>

        {/* Save */}
        <Button size="sm" className="w-full gap-2" onClick={handleSave}>
          {saved ? (
            <><Zap className="w-3.5 h-3.5" /> Configuration Saved!</>
          ) : (
            <><Settings2 className="w-3.5 h-3.5" /> Save Widget Configuration</>
          )}
        </Button>

        <p className="text-[9px] text-muted-foreground text-center">
          This configuration will be applied to your widget. Your buyers will see industry-specific invoices, document gates, and pricing fields automatically.
        </p>
      </CardContent>
    </Card>
  );
};

export default WidgetIndustryConfig;

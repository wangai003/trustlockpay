/**
 * Transport Method Registry
 * Supports multi-modal transport, carrier auto-suggest, and tracking URL builders
 */

export type TransportMode =
  | "air_freight"
  | "sea_freight"
  | "road_trucking"
  | "rail"
  | "courier_express"
  | "digital_delivery"
  | "hand_delivery"
  | "multi_modal";

export interface TransportMethodMeta {
  key: TransportMode;
  label: string;
  icon: string; // lucide icon name
  trackingLabel: string;
  vesselLabel: string;
  showVessel: boolean;
  showTrackingUrl: boolean;
  showEstimatedDelivery: boolean;
  showCarrier: boolean;
}

export const TRANSPORT_METHODS: TransportMethodMeta[] = [
  {
    key: "courier_express",
    label: "Courier / Express",
    icon: "Package",
    trackingLabel: "Tracking Number",
    vesselLabel: "Courier Service",
    showVessel: false,
    showTrackingUrl: true,
    showEstimatedDelivery: true,
    showCarrier: true,
  },
  {
    key: "air_freight",
    label: "Air Freight",
    icon: "Plane",
    trackingLabel: "Air Waybill (AWB)",
    vesselLabel: "Flight / Airline",
    showVessel: true,
    showTrackingUrl: true,
    showEstimatedDelivery: true,
    showCarrier: true,
  },
  {
    key: "sea_freight",
    label: "Sea Freight",
    icon: "Ship",
    trackingLabel: "Bill of Lading #",
    vesselLabel: "Vessel / Container #",
    showVessel: true,
    showTrackingUrl: true,
    showEstimatedDelivery: true,
    showCarrier: true,
  },
  {
    key: "road_trucking",
    label: "Road / Trucking",
    icon: "Truck",
    trackingLabel: "Waybill / CMR #",
    vesselLabel: "Vehicle / Fleet ID",
    showVessel: true,
    showTrackingUrl: false,
    showEstimatedDelivery: true,
    showCarrier: true,
  },
  {
    key: "rail",
    label: "Rail Freight",
    icon: "TrainFront",
    trackingLabel: "Rail Consignment Note #",
    vesselLabel: "Train / Wagon #",
    showVessel: true,
    showTrackingUrl: false,
    showEstimatedDelivery: true,
    showCarrier: true,
  },
  {
    key: "digital_delivery",
    label: "Digital Delivery",
    icon: "Download",
    trackingLabel: "Access Link / License Key",
    vesselLabel: "",
    showVessel: false,
    showTrackingUrl: true,
    showEstimatedDelivery: false,
    showCarrier: false,
  },
  {
    key: "hand_delivery",
    label: "Hand Delivery / Pickup",
    icon: "HandMetal",
    trackingLabel: "Confirmation Code",
    vesselLabel: "",
    showVessel: false,
    showTrackingUrl: false,
    showEstimatedDelivery: true,
    showCarrier: false,
  },
];

// ── Known carriers with auto-tracking URL builders ──

export interface KnownCarrier {
  name: string;
  modes: TransportMode[];
  regions: string[]; // "global", "africa", "caribbean", "europe", "asia", etc.
  buildTrackingUrl: (trackingNumber: string) => string;
}

export const KNOWN_CARRIERS: KnownCarrier[] = [
  // Global couriers
  { name: "DHL Express", modes: ["courier_express", "air_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.dhl.com/en/express/tracking.html?AWB=${t}` },
  { name: "FedEx", modes: ["courier_express", "air_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.fedex.com/fedextrack/?trknbr=${t}` },
  { name: "UPS", modes: ["courier_express"], regions: ["global"], buildTrackingUrl: (t) => `https://www.ups.com/track?tracknum=${t}` },
  { name: "TNT", modes: ["courier_express"], regions: ["global"], buildTrackingUrl: (t) => `https://www.tnt.com/express/en_gc/site/tracking.html?searchType=con&cons=${t}` },
  { name: "DPD", modes: ["courier_express", "road_trucking"], regions: ["europe"], buildTrackingUrl: (t) => `https://tracking.dpd.de/status/en_US/parcel/${t}` },
  { name: "USPS", modes: ["courier_express"], regions: ["north_america"], buildTrackingUrl: (t) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}` },
  { name: "Canada Post", modes: ["courier_express"], regions: ["north_america", "caribbean"], buildTrackingUrl: (t) => `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${t}` },
  { name: "Royal Mail", modes: ["courier_express"], regions: ["europe", "caribbean"], buildTrackingUrl: (t) => `https://www.royalmail.com/track-your-item#/tracking-results/${t}` },

  // Africa-focused
  { name: "Aramex", modes: ["courier_express"], regions: ["africa", "middle_east", "global"], buildTrackingUrl: (t) => `https://www.aramex.com/track/results?ShipmentNumber=${t}` },
  { name: "GIG Logistics", modes: ["courier_express", "road_trucking"], regions: ["africa"], buildTrackingUrl: (t) => `https://giglogistics.com/track?tracking=${t}` },
  { name: "Jumia Logistics", modes: ["courier_express"], regions: ["africa"], buildTrackingUrl: (t) => `https://www.jumia.com/tracking?code=${t}` },
  { name: "Sendy", modes: ["courier_express", "road_trucking"], regions: ["africa"], buildTrackingUrl: (t) => `https://app.sendyit.com/track/${t}` },
  { name: "Kobo360", modes: ["road_trucking"], regions: ["africa"], buildTrackingUrl: (t) => `https://www.kobo360.com/track/${t}` },

  // Caribbean
  { name: "LIAT Cargo", modes: ["air_freight"], regions: ["caribbean"], buildTrackingUrl: (t) => `https://www.liat.com/cargo-tracking?awb=${t}` },
  { name: "Caribbean Airlines Cargo", modes: ["air_freight"], regions: ["caribbean"], buildTrackingUrl: (t) => `https://www.caribbean-airlines.com/#/cargo/tracking?awb=${t}` },
  { name: "Tropical Shipping", modes: ["sea_freight"], regions: ["caribbean"], buildTrackingUrl: (t) => `https://www.tropical.com/tracking/?bol=${t}` },
  { name: "Crowley Logistics", modes: ["sea_freight"], regions: ["caribbean", "central_america"], buildTrackingUrl: (t) => `https://www.crowley.com/logistics/tracking/?ref=${t}` },

  // Sea freight global
  { name: "Maersk", modes: ["sea_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.maersk.com/tracking/${t}` },
  { name: "MSC", modes: ["sea_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.msc.com/track-a-shipment?query=${t}` },
  { name: "CMA CGM", modes: ["sea_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${t}` },
  { name: "Hapag-Lloyd", modes: ["sea_freight"], regions: ["global"], buildTrackingUrl: (t) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${t}` },
  { name: "COSCO Shipping", modes: ["sea_freight"], regions: ["global", "asia"], buildTrackingUrl: (t) => `https://elines.coscoshipping.com/ebusiness/cargoTracking?trackingType=BOOKING&number=${t}` },

  // Asia
  { name: "SF Express", modes: ["courier_express"], regions: ["asia"], buildTrackingUrl: (t) => `https://www.sf-express.com/we/ow/chn/en/dynamic_function/waybill/#search/bill-number/${t}` },
  { name: "Yamato Transport", modes: ["courier_express"], regions: ["asia"], buildTrackingUrl: (t) => `https://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.NQ0010?id=${t}` },

  // Latin America
  { name: "Correios (Brazil)", modes: ["courier_express"], regions: ["south_america"], buildTrackingUrl: (t) => `https://www.correios.com.br/rastreamento?objetos=${t}` },
];

// ── Industry defaults ──

const INDUSTRY_DEFAULT_TRANSPORT: Record<string, TransportMode[]> = {
  ecommerce: ["courier_express"],
  freelance: ["digital_delivery"],
  media_entertainment: ["digital_delivery"],
  education: ["digital_delivery"],
  agriculture: ["sea_freight", "road_trucking"],
  mining: ["sea_freight", "road_trucking"],
  energy: ["sea_freight"],
  renewable_energy: ["sea_freight", "road_trucking"],
  marine_fisheries: ["sea_freight"],
  manufacturing: ["sea_freight", "road_trucking"],
  textiles: ["sea_freight", "courier_express"],
  food_beverage: ["road_trucking", "air_freight"],
  pharmaceuticals: ["air_freight", "courier_express"],
  automotive: ["sea_freight", "road_trucking"],
  aviation: ["air_freight"],
  construction: ["road_trucking", "rail"],
  real_estate: ["hand_delivery"],
  logistics: ["road_trucking", "sea_freight"],
  tourism: ["digital_delivery"],
  telecommunications: ["courier_express"],
  water_sanitation: ["road_trucking"],
  waste_management: ["road_trucking"],
  insurance: ["digital_delivery"],
  legal_services: ["digital_delivery", "courier_express"],
  project_management: ["digital_delivery"],
};

export function getIndustryDefaultTransport(industry: string | null | undefined): TransportMode[] {
  if (!industry) return ["courier_express"];
  return INDUSTRY_DEFAULT_TRANSPORT[industry] || ["courier_express"];
}

export function getCarrierSuggestions(mode: TransportMode, region?: string): KnownCarrier[] {
  return KNOWN_CARRIERS.filter(
    (c) => c.modes.includes(mode) && (!region || c.regions.includes(region) || c.regions.includes("global"))
  );
}

export function getTransportMeta(mode: TransportMode): TransportMethodMeta | undefined {
  return TRANSPORT_METHODS.find((m) => m.key === mode);
}

export function autoTrackingUrl(carrierName: string, trackingNumber: string): string | null {
  const carrier = KNOWN_CARRIERS.find(
    (c) => c.name.toLowerCase() === carrierName.toLowerCase()
  );
  if (!carrier || !trackingNumber) return null;
  return carrier.buildTrackingUrl(trackingNumber);
}

// ── Transport leg for multi-modal ──

export interface TransportLeg {
  id: string;
  mode: TransportMode;
  carrierName: string;
  trackingNumber: string;
  trackingUrl: string;
  vesselId: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
}

export function createEmptyLeg(mode: TransportMode): TransportLeg {
  return {
    id: crypto.randomUUID(),
    mode,
    carrierName: "",
    trackingNumber: "",
    trackingUrl: "",
    vesselId: "",
    origin: "",
    destination: "",
    estimatedDelivery: "",
  };
}

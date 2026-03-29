import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, X, FileText, ArrowRight, Globe, Truck, FileCheck } from "lucide-react";
import TaxBreakdown, { type TaxLineItem } from "./TaxBreakdown";
import InvoiceFeeCalculator from "./InvoiceFeeCalculator";
import { selectProcessor } from "@/lib/feeEngine";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard } from "lucide-react";

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

interface StandaloneInvoiceProps {
  vendorName?: string;
  industry?: string;
  onProceed: (invoice: {
    items: InvoiceLineItem[];
    taxItems: TaxLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
    industry: string;
    currency: string;
    incoterms: string;
    deliveryTerms: string;
    documentGates: Record<string, string>;
  }) => void;
}

const INDUSTRY_OPTIONS = [
  { value: "ecommerce", label: "E-Commerce / Retail" },
  { value: "mining", label: "Mining & Minerals" },
  { value: "agriculture", label: "Agriculture & Commodities" },
  { value: "logistics", label: "Logistics & Shipping" },
  { value: "real_estate", label: "Real Estate" },
  { value: "construction", label: "Construction" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "technology", label: "Technology / SaaS" },
  { value: "healthcare", label: "Healthcare & Pharma" },
  { value: "energy", label: "Energy & Utilities" },
  { value: "automotive", label: "Automotive" },
  { value: "textiles", label: "Textiles & Apparel" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "professional_services", label: "Professional Services" },
  { value: "education", label: "Education" },
  { value: "default", label: "Other / General" },
];

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "GHS", "ZAR", "EGP", "XOF", "XAF", "TZS", "UGX", "RWF", "ZMW"];

// Industry-specific document gates
const INDUSTRY_DOC_GATES: Record<string, { field: string; label: string }[]> = {
  mining: [
    { field: "assay_certificate", label: "Assay Certificate Number" },
    { field: "export_license", label: "Export License Number" },
    { field: "origin_certificate", label: "Certificate of Origin" },
  ],
  agriculture: [
    { field: "phytosanitary_cert", label: "Phytosanitary Certificate" },
    { field: "quality_grade_cert", label: "Quality Grade Certificate" },
    { field: "export_permit", label: "Export Permit Number" },
  ],
  logistics: [
    { field: "bill_of_lading", label: "Bill of Lading Number" },
    { field: "insurance_policy", label: "Insurance Policy Number" },
    { field: "customs_declaration", label: "Customs Declaration Ref" },
  ],
  real_estate: [
    { field: "title_deed", label: "Title Deed Reference" },
    { field: "valuation_report", label: "Valuation Report Number" },
  ],
  construction: [
    { field: "building_permit", label: "Building Permit Number" },
    { field: "environmental_cert", label: "Environmental Certificate" },
  ],
  healthcare: [
    { field: "pharma_license", label: "Pharmaceutical License" },
    { field: "gmp_certificate", label: "GMP Certificate Number" },
  ],
  energy: [
    { field: "energy_license", label: "Energy License Number" },
    { field: "environmental_impact", label: "Environmental Impact Ref" },
  ],
  manufacturing: [
    { field: "quality_cert", label: "Quality Certification (ISO)" },
    { field: "origin_certificate", label: "Certificate of Origin" },
  ],
};

// Industry-specific unit defaults
const INDUSTRY_UNITS: Record<string, string[]> = {
  mining: ["MT", "KG", "Oz", "Carat", "Lot"],
  agriculture: ["MT", "KG", "Bags", "Tonnes", "Bushels"],
  logistics: ["Container", "Pallet", "CBM", "KG", "Trip"],
  real_estate: ["Unit", "SqM", "SqFt", "Acre", "Hectare"],
  construction: ["Unit", "SqM", "Lot", "Phase", "Item"],
  default: ["Unit", "Item", "Lot", "Pack", "Service"],
};

const StandaloneInvoice = ({ vendorName = "Vendor", industry: initialIndustry, onProceed }: StandaloneInvoiceProps) => {
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, unit: "Unit" },
  ]);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [note, setNote] = useState("");
  const [paymentType, setPaymentType] = useState<"fiat" | "crypto">("fiat");
  const [industry, setIndustry] = useState(initialIndustry || "default");
  const [currency, setCurrency] = useState("USD");
  const [incoterms, setIncoterms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [docGates, setDocGates] = useState<Record<string, string>>({});

  const addItem = () => {
    const defaultUnit = (INDUSTRY_UNITS[industry] || INDUSTRY_UNITS.default)[0];
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, unit: defaultUnit }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceLineItem, val: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const taxTotal = taxItems.reduce((sum, t) => {
    return sum + (t.type === "percentage" ? subtotal * (t.value / 100) : t.value);
  }, 0);

  const grandTotal = subtotal + taxTotal;

  const isValid = items.every((i) => i.description.trim() && i.unitPrice > 0) && subtotal > 0;

  const showIncoterms = ["mining", "agriculture", "logistics", "manufacturing", "textiles", "food_beverage"].includes(industry);
  const showDelivery = !["technology", "professional_services", "education"].includes(industry);
  const docGateFields = INDUSTRY_DOC_GATES[industry] || [];
  const unitOptions = INDUSTRY_UNITS[industry] || INDUSTRY_UNITS.default;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-xl max-w-md mx-auto">
      {/* Header */}
      <div className="bg-primary px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-bold text-primary-foreground">TrustLock Invoice</span>
        </div>
        <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
          <FileText className="w-3 h-3 mr-1" /> Draft
        </Badge>
      </div>

      <div className="p-5 space-y-4 bg-background">
        {/* Vendor info */}
        <div className="text-center pb-3 border-b border-border">
          <p className="text-xs text-muted-foreground">Invoice from</p>
          <p className="font-heading font-bold text-foreground">{vendorName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            INV-{new Date().getFullYear()}-{String(Math.floor(Math.random() * 9999)).padStart(4, "0")}
          </p>
        </div>

        {/* Industry & Currency row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Incoterms & Delivery (industry-aware) */}
        {(showIncoterms || showDelivery) && (
          <div className={`grid ${showIncoterms && showDelivery ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
            {showIncoterms && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Incoterms
                </Label>
                <Select value={incoterms} onValueChange={setIncoterms}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {showDelivery && (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Delivery Terms
                </Label>
                <Input
                  placeholder="e.g. 30 days after payment"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* Line items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-1 p-2.5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Item description"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                className="h-8 text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Unit</Label>
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    className="w-full h-8 mt-0.5 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Price ({currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs mt-0.5"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Line total: <span className="font-semibold text-foreground">{currency} {(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full gap-1 text-xs h-8" onClick={addItem}>
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>

        {/* Industry Document Gates */}
        {docGateFields.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" /> Required Documents
            </p>
            <div className="p-2.5 rounded-lg border border-accent/30 bg-accent/5 space-y-2">
              {docGateFields.map(gate => (
                <div key={gate.field}>
                  <Label className="text-[10px] text-muted-foreground">{gate.label}</Label>
                  <Input
                    placeholder={`Enter ${gate.label.toLowerCase()}`}
                    value={docGates[gate.field] || ""}
                    onChange={(e) => setDocGates(prev => ({ ...prev, [gate.field]: e.target.value }))}
                    className="h-8 text-xs mt-0.5"
                  />
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground">These documents are required by industry compliance standards</p>
            </div>
          </div>
        )}

        {/* Tax breakdown */}
        <TaxBreakdown
          subtotal={subtotal}
          taxItems={taxItems}
          onTaxItemsChange={setTaxItems}
          editable
        />

        {/* Payment method toggle for fee calculation */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Method</p>
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "fiat" | "crypto")}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="fiat" className="gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5" />
                Fiat (Card / Bank)
              </TabsTrigger>
              <TabsTrigger value="crypto" className="gap-1.5 text-xs">
                <Wallet className="w-3.5 h-3.5" />
                Crypto (USDC/USDT)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Fee Calculator — mandatory disclosure */}
        <InvoiceFeeCalculator
          escrowPrincipal={subtotal}
          processorId={paymentType === "crypto" ? "direct" : selectProcessor("global", false)}
          isCrypto={paymentType === "crypto"}
          taxAmount={taxTotal}
        />

        {/* Note */}
        <div>
          <Label className="text-xs text-muted-foreground">Note to buyer (optional)</Label>
          <Textarea
            placeholder="Payment terms, delivery info, special instructions..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 text-xs min-h-[60px]"
          />
        </div>

        <Button
          className="w-full gap-2"
          disabled={!isValid}
          onClick={() => onProceed({ items, taxItems, subtotal, taxTotal, grandTotal, note, industry, currency, incoterms, deliveryTerms, documentGates: docGates })}
        >
          Generate Payment Link <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default StandaloneInvoice;

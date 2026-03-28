// Phase 3: Proforma Invoice Generator — vendor responds to RFQ with formal pricing
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Plus, X, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TaxBreakdown, { type TaxLineItem } from "./TaxBreakdown";

interface ProformaInvoiceProps {
  rfqId?: string;
  vendorId: string;
  vendorName?: string;
  industry?: string;
  buyerName?: string;
  buyerEmail?: string;
  prefillSpecs?: Record<string, string>;
  onCreated?: (proformaId: string) => void;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
}

// Document gates per industry — mandatory fields before escrow can lock
const industryDocumentGates: Record<string, { field: string; label: string; type: "text" | "file" }[]> = {
  mining: [
    { field: "assay_certificate", label: "Assay Certificate Number", type: "text" },
    { field: "export_license", label: "Export License Number", type: "text" },
    { field: "origin_certificate", label: "Certificate of Origin", type: "text" },
  ],
  agriculture: [
    { field: "phytosanitary_cert", label: "Phytosanitary Certificate", type: "text" },
    { field: "quality_grade_cert", label: "Quality Grade Certificate", type: "text" },
    { field: "export_permit", label: "Export Permit Number", type: "text" },
  ],
  logistics: [
    { field: "bill_of_lading", label: "Bill of Lading Number", type: "text" },
    { field: "insurance_policy", label: "Insurance Policy Number", type: "text" },
    { field: "customs_declaration", label: "Customs Declaration Ref", type: "text" },
  ],
  real_estate: [
    { field: "title_deed", label: "Title Deed Reference", type: "text" },
    { field: "valuation_report", label: "Valuation Report Number", type: "text" },
  ],
  construction: [
    { field: "building_permit", label: "Building Permit Number", type: "text" },
    { field: "environmental_cert", label: "Environmental Certificate", type: "text" },
  ],
};

const incotermsOptions = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const ProformaInvoice = ({
  rfqId,
  vendorId,
  vendorName = "Vendor",
  industry,
  buyerName,
  buyerEmail,
  prefillSpecs,
  onCreated,
}: ProformaInvoiceProps) => {
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, unit: "MT" },
  ]);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [incoterms, setIncoterms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [gateValues, setGateValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const gates = industryDocumentGates[industry || ""] || [];

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, unit: "MT" }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, val: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const taxTotal = taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? subtotal * (t.value / 100) : t.value), 0);
  const grandTotal = subtotal + taxTotal;

  const allGatesFilled = gates.every((g) => (gateValues[g.field] || "").trim());
  const isValid = items.every((i) => i.description.trim() && i.unitPrice > 0) && subtotal > 0;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const proformaNumber = `PF-${Date.now().toString(36).toUpperCase()}`;

      const insertPayload = {
        rfq_id: rfqId || null,
        vendor_id: vendorId,
        proforma_number: proformaNumber,
        status: "issued",
        line_items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          unit: i.unit,
          total: i.quantity * i.unitPrice,
        })),
        tax_items: taxItems,
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        currency,
        locked_price: subtotal,
        incoterms: incoterms || null,
        payment_terms: paymentTerms || null,
        delivery_terms: deliveryTerms || null,
        shipping_method: shippingMethod || null,
        insurance_required: insuranceRequired,
        validity_days: validityDays,
        document_gates: gates.map((g) => ({ field: g.field, label: g.label })),
        gate_status: gateValues,
        industry: industry || null,
        notes: notes || null,
      } as any;
      const { data, error } = await supabase.from("proforma_invoices").insert(insertPayload).select().single();

      if (error) throw error;
      toast.success(`Proforma ${proformaNumber} created`);
      onCreated?.(data.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to create proforma");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-xl max-w-lg mx-auto">
      <div className="bg-primary px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-bold text-primary-foreground">TrustLock Proforma</span>
        </div>
        <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
          <FileText className="w-3 h-3 mr-1" /> Proforma Invoice
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4 bg-background">
        <div className="text-center pb-3 border-b border-border">
          <p className="text-xs text-muted-foreground">Proforma from</p>
          <p className="font-heading font-bold text-foreground">{vendorName}</p>
          {buyerName && <p className="text-xs text-muted-foreground mt-1">To: {buyerName}</p>}
        </div>

        {/* Prefill specs from RFQ */}
        {prefillSpecs && Object.keys(prefillSpecs).length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">RFQ Specifications</p>
            {Object.entries(prefillSpecs).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Line items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Line Items</p>
          {items.map((item, idx) => (
            <div key={item.id} className="space-y-1 p-2.5 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold">Item {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(item.id)} className="text-destructive"><X className="w-3.5 h-3.5" /></button>
                )}
              </div>
              <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, "description", e.target.value)} className="h-8 text-xs" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Qty</Label>
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Unit Price ({currency})</Label>
                  <Input type="number" min="0" step="0.01" value={item.unitPrice || ""} onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px]">Unit</Label>
                  <Select value={item.unit} onValueChange={(v) => updateItem(item.id, "unit", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["MT", "KG", "LBS", "Units", "Barrels", "Bags", "Containers", "Lots"].map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

        {/* Trade terms */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Incoterms</Label>
            <Select value={incoterms} onValueChange={setIncoterms}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {incotermsOptions.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["USD", "NGN", "KES", "ZAR", "GHS", "UGX", "EUR", "GBP"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Payment Terms</Label>
          <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g., 50% upfront, 50% on delivery" className="h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Delivery / Shipping Terms</Label>
          <Input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="e.g., 30 days from escrow lock" className="h-8 text-xs" />
        </div>

        {/* Tax breakdown */}
        <TaxBreakdown subtotal={subtotal} taxItems={taxItems} onTaxItemsChange={setTaxItems} editable />

        {/* Document Gates */}
        {gates.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">Document Gates (Required for Escrow)</p>
            </div>
            {gates.map((gate) => (
              <div key={gate.field} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {gate.label} <span className="text-destructive">*</span>
                  {(gateValues[gate.field] || "").trim() ? (
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
                </Label>
                <Input
                  value={gateValues[gate.field] || ""}
                  onChange={(e) => setGateValues({ ...gateValues, [gate.field]: e.target.value })}
                  placeholder={`Enter ${gate.label.toLowerCase()}`}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        )}

        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional terms or notes..." rows={2} className="text-xs" />

        {/* Summary */}
        <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
          </div>
          {taxTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes & Duties</span>
              <span className="font-medium">{currency} {taxTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1 mt-1">
            <span className="font-bold text-sm">Total</span>
            <span className="font-bold text-sm text-primary">{currency} {grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {!allGatesFilled && gates.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-700">All document gates must be filled before the buyer can fund escrow</p>
          </div>
        )}

        <Button className="w-full gap-2" disabled={loading || !isValid} onClick={handleCreate}>
          {loading ? "Creating..." : "Issue Proforma Invoice"} <FileText className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProformaInvoice;

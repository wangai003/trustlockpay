import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, X, FileText, ArrowRight } from "lucide-react";
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
}

interface StandaloneInvoiceProps {
  vendorName?: string;
  onProceed: (invoice: {
    items: InvoiceLineItem[];
    taxItems: TaxLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  }) => void;
}

const StandaloneInvoice = ({ vendorName = "Vendor", onProceed }: StandaloneInvoiceProps) => {
  const [items, setItems] = useState<InvoiceLineItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [note, setNote] = useState("");

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
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
              <div className="grid grid-cols-2 gap-2">
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
                  <Label className="text-[10px] text-muted-foreground">Unit Price ($)</Label>
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
                Line total: <span className="font-semibold text-foreground">${(item.quantity * item.unitPrice).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full gap-1 text-xs h-8" onClick={addItem}>
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>

        {/* Tax breakdown */}
        <TaxBreakdown
          subtotal={subtotal}
          taxItems={taxItems}
          onTaxItemsChange={setTaxItems}
          editable
        />

        {/* Fee Calculator — mandatory disclosure */}
        <InvoiceFeeCalculator
          escrowPrincipal={subtotal}
          processorId={selectProcessor("global", false)}
          isCrypto={false}
          taxAmount={taxTotal}
        />

        {/* Note */}
        <div>
          <Label className="text-xs text-muted-foreground">Note to buyer (optional)</Label>
          <Input
            placeholder="Payment terms, delivery info..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 text-xs"
          />
        </div>

        <Button
          className="w-full gap-2"
          disabled={!isValid}
          onClick={() => onProceed({ items, taxItems, subtotal, taxTotal, grandTotal, note })}
        >
          Generate Payment Link <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default StandaloneInvoice;

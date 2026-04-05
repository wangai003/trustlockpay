// Phase 3: RFQ (Request for Quote) form for B2B industries
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Send, Plus, X, AlertTriangle, Phone, User, Mail, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getRFQTerms } from "@/lib/rfqIndustryConfig";
import { COUNTRY_CODES } from "@/lib/countryCodes";

interface RFQFormProps {
  vendorId: string;
  vendorName?: string;
  industry?: string;
  vendorContact?: { phone?: string; email?: string; phoneCode?: string };
  onSubmitted?: (rfqId: string) => void;
}

interface SpecificationField {
  id: string;
  key: string;
  value: string;
}

const industryFields: Record<string, { label: string; placeholder: string; required: boolean }[]> = {
  mining: [
    { label: "Commodity Type", placeholder: "e.g., Gold ore, Copper concentrate", required: true },
    { label: "Tonnage Required", placeholder: "e.g., 500 MT", required: true },
    { label: "Grade / Purity", placeholder: "e.g., 22 carat, 99.5%", required: true },
    { label: "Assay Report Reference", placeholder: "Lab report number", required: false },
    { label: "Delivery Port", placeholder: "e.g., Durban, Mombasa", required: true },
  ],
  agriculture: [
    { label: "Product Type", placeholder: "e.g., Cocoa beans, Coffee, Cashews", required: true },
    { label: "Quantity (MT)", placeholder: "e.g., 100 MT", required: true },
    { label: "Quality Grade", placeholder: "e.g., Grade 1, FAQ", required: true },
    { label: "Phytosanitary Certificate", placeholder: "Certificate number", required: false },
    { label: "Harvest Season", placeholder: "e.g., 2026 Main Crop", required: false },
  ],
  logistics: [
    { label: "Cargo Description", placeholder: "e.g., Containerized machinery", required: true },
    { label: "Weight (MT)", placeholder: "e.g., 25 MT", required: true },
    { label: "Origin Port", placeholder: "e.g., Lagos, Tema", required: true },
    { label: "Destination Port", placeholder: "e.g., Rotterdam, Shanghai", required: true },
    { label: "Container Type", placeholder: "e.g., 40ft HC, Reefer", required: false },
  ],
  real_estate: [
    { label: "Property Type", placeholder: "e.g., Commercial, Residential, Land", required: true },
    { label: "Location / Address", placeholder: "Property address", required: true },
    { label: "Title Deed Reference", placeholder: "Deed number", required: false },
    { label: "Valuation Amount", placeholder: "e.g., $500,000", required: false },
  ],
  construction: [
    { label: "Project Type", placeholder: "e.g., Road, Building, Bridge", required: true },
    { label: "Project Location", placeholder: "Site address", required: true },
    { label: "Estimated Duration", placeholder: "e.g., 12 months", required: true },
    { label: "Regulatory Permits", placeholder: "Permit numbers", required: false },
  ],
};

const incotermsOptions = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];

const RFQForm = ({ vendorId, vendorName = "Vendor", industry, vendorContact, onSubmitted }: RFQFormProps) => {
  const terms = getRFQTerms(industry || "");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  // Phone numbers (up to 3)
  const [phone1, setPhone1] = useState("");
  const [code1, setCode1] = useState("+1");
  const [phone2, setPhone2] = useState("");
  const [code2, setCode2] = useState("+1");
  const [phone3, setPhone3] = useState("");
  const [code3, setCode3] = useState("+1");
  const [showPhone2, setShowPhone2] = useState(false);
  const [showPhone3, setShowPhone3] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("MT");
  const [incoterms, setIncoterms] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [specs, setSpecs] = useState<SpecificationField[]>([]);
  const [loading, setLoading] = useState(false);

  const fields = industryFields[industry || ""] || [];

  const addSpec = () => setSpecs([...specs, { id: crypto.randomUUID(), key: "", value: "" }]);
  const removeSpec = (id: string) => setSpecs(specs.filter((s) => s.id !== id));
  const updateSpec = (id: string, field: "key" | "value", val: string) =>
    setSpecs(specs.map((s) => (s.id === id ? { ...s, [field]: val } : s)));

  useState(() => {
    if (fields.length > 0 && specs.length === 0) {
      setSpecs(fields.map((f) => ({ id: crypto.randomUUID(), key: f.label, value: "" })));
    }
  });

  const requiredFieldsMissing = fields
    .filter((f) => f.required)
    .some((f) => {
      const spec = specs.find((s) => s.key === f.label);
      return !spec || !spec.value.trim();
    });

  const handleSubmit = async () => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setLoading(true);
    try {
      const rfqNumber = `RFQ-${Date.now().toString(36).toUpperCase()}`;
      const specifications: Record<string, string> = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) specifications[s.key] = s.value;
      });

      const payload = {
        vendor_id: vendorId,
        rfq_number: rfqNumber,
        buyer_name: buyerName.trim(),
        buyer_email: buyerEmail.trim(),
        buyer_company: buyerCompany.trim() || null,
        buyer_location: buyerLocation.trim() || null,
        buyer_phone_1: phone1.trim() || null,
        buyer_country_code_1: phone1.trim() ? code1 : null,
        buyer_phone_2: phone2.trim() || null,
        buyer_country_code_2: phone2.trim() ? code2 : null,
        buyer_phone_3: phone3.trim() || null,
        buyer_country_code_3: phone3.trim() ? code3 : null,
        industry: industry || null,
        specifications,
        quantity: quantity ? parseFloat(quantity) : null,
        unit: unit || null,
        incoterms: incoterms || null,
        requested_delivery_date: deliveryDate || null,
        notes: notes.trim() || null,
        rfq_label: terms.rfqLabel,
      };

      const { data, error } = await supabase.functions.invoke("submit-rfq", { body: payload });
      if (error || !data?.id) throw new Error(data?.error || error?.message || "Failed to submit");
      toast.success(`${terms.rfqLabel} ${rfqNumber} submitted successfully`);
      onSubmitted?.(data.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const PhoneRow = ({
    code, onCodeChange, phone, onPhoneChange, label, onRemove,
  }: {
    code: string; onCodeChange: (v: string) => void;
    phone: string; onPhoneChange: (v: string) => void;
    label: string; onRemove?: () => void;
  }) => (
    <div className="flex items-end gap-1.5">
      <div className="w-[90px] space-y-1">
        <Label className="text-[10px] text-muted-foreground">{label}</Label>
        <Select value={code} onValueChange={onCodeChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-48">
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} {c.country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 space-y-1">
        <Label className="text-[10px] text-muted-foreground invisible">Phone</Label>
        <Input value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="Phone number" className="h-8 text-xs" />
      </div>
      {onRemove && (
        <button onClick={onRemove} className="text-destructive mb-1"><X className="w-3.5 h-3.5" /></button>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden border-2 border-primary/20 shadow-xl max-w-lg mx-auto">
      <div className="bg-primary px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-bold text-primary-foreground">TrustLock {terms.rfqLabel}</span>
        </div>
        <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
          <FileText className="w-3 h-3 mr-1" /> {terms.rfqLabel}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-4 bg-background">
        <div className="text-center pb-3 border-b border-border">
          <p className="text-xs text-muted-foreground">{terms.rfqLabel} for</p>
          <p className="font-heading font-bold text-foreground">{vendorName}</p>
          {industry && (
            <Badge variant="outline" className="mt-1 text-[10px]">
              {industry.replace("_", " ").toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Vendor Contact Info */}
        {vendorContact && (vendorContact.phone || vendorContact.email) && (
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Vendor Contact</p>
            {vendorContact.email && (
              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <a href={`mailto:${vendorContact.email}`} className="text-primary underline">{vendorContact.email}</a>
              </div>
            )}
            {vendorContact.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>{vendorContact.phoneCode || ""} {vendorContact.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Buyer info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Full Name *</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="John Okafor" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="john@company.com" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Company</Label>
            <Input value={buyerCompany} onChange={(e) => setBuyerCompany(e.target.value)} placeholder="Acme Mining Corp" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Location</Label>
            <Input value={buyerLocation} onChange={(e) => setBuyerLocation(e.target.value)} placeholder="Accra, Ghana" className="h-8 text-xs" />
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Phone className="w-3 h-3" /> Contact Numbers
          </p>
          <PhoneRow code={code1} onCodeChange={setCode1} phone={phone1} onPhoneChange={setPhone1} label="Primary *" />
          {showPhone2 ? (
            <PhoneRow code={code2} onCodeChange={setCode2} phone={phone2} onPhoneChange={setPhone2} label="Secondary" onRemove={() => { setShowPhone2(false); setPhone2(""); }} />
          ) : null}
          {showPhone3 ? (
            <PhoneRow code={code3} onCodeChange={setCode3} phone={phone3} onPhoneChange={setPhone3} label="Alternate" onRemove={() => { setShowPhone3(false); setPhone3(""); }} />
          ) : null}
          {(!showPhone2 || !showPhone3) && (
            <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={() => !showPhone2 ? setShowPhone2(true) : setShowPhone3(true)}>
              <Plus className="w-3 h-3" /> Add another number
            </Button>
          )}
        </div>

        {/* Industry-specific fields */}
        {specs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Specifications</p>
            {specs.map((spec) => {
              const fieldDef = fields.find((f) => f.label === spec.key);
              return (
                <div key={spec.id} className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {spec.key}
                      {fieldDef?.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={spec.value}
                      onChange={(e) => updateSpec(spec.id, "value", e.target.value)}
                      placeholder={fieldDef?.placeholder || "Enter value"}
                      className="h-8 text-xs"
                    />
                  </div>
                  {!fieldDef && (
                    <button onClick={() => removeSpec(spec.id)} className="text-destructive mt-4"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1 text-xs h-7" onClick={addSpec}>
              <Plus className="w-3 h-3" /> Add Custom Field
            </Button>
          </div>
        )}

        {/* Quantity + Incoterms */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Quantity</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="500" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["MT", "KG", "LBS", "Units", "Barrels", "Bags", "Containers"].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Incoterms</Label>
            <Select value={incoterms} onValueChange={setIncoterms}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {incotermsOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Requested Delivery Date</Label>
          <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-8 text-xs" />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Additional Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={terms.specPrompt} rows={3} className="text-xs" />
        </div>

        {requiredFieldsMissing && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-700">Complete all required fields (*) before submitting</p>
          </div>
        )}

        <Button
          className="w-full gap-2"
          disabled={loading || !buyerName.trim() || !buyerEmail.trim()}
          onClick={handleSubmit}
        >
          {loading ? "Submitting..." : `Submit ${terms.rfqLabel}`} <Send className="w-4 h-4" />
        </Button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
          <Shield className="w-3 h-3" />
          Escrow protection activates when you accept the vendor's {terms.proformaLabel.toLowerCase()}
        </div>
      </CardContent>
    </Card>
  );
};

export default RFQForm;

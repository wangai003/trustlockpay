import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus, Trash2, Save, Send, ArrowLeft, FileUp, ChevronDown, ChevronUp } from "lucide-react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ALL_INDUSTRIES, INDUSTRY_LABELS } from "@/lib/industryList";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_usd: number;
  category: string;
}

const CATEGORIES = [
  { value: "goods", label: "Goods" },
  { value: "services", label: "Services" },
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "transport", label: "Transport" },
];

const REPAYMENT_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "120", label: "120 days" },
  { value: "180", label: "180 days" },
  { value: "360", label: "360 days" },
];

const PURPOSE_OPTIONS = [
  { value: "working_capital", label: "Working Capital" },
  { value: "inventory", label: "Inventory Purchase" },
  { value: "equipment", label: "Equipment" },
  { value: "project_execution", label: "Project Execution" },
  { value: "trade_finance", label: "Trade Finance" },
  { value: "other", label: "Other" },
];

const TRADE_SCOPES = [
  { value: "domestic", label: "Domestic" },
  { value: "regional", label: "Regional" },
  { value: "international", label: "International" },
  { value: "hybrid", label: "Hybrid" },
];

const emptyItem = (): LineItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit_price_usd: 0,
  category: "goods",
});

const VendorRequestFinancing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const preselectedLender = searchParams.get("lender") || "";

  // Form state
  const [selectedLender, setSelectedLender] = useState(preselectedLender);
  const [purpose, setPurpose] = useState("");
  const [repayment, setRepayment] = useState("");
  const [tradeScope, setTradeScope] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [showIndustryDocs, setShowIndustryDocs] = useState(false);

  // Fetch lenders for dropdown
  const { data: lenders } = useQuery({
    queryKey: ["lender-list-for-app"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lender_profiles")
        .select("user_id, institution_name, logo_url, lender_tier")
        .eq("is_verified", true)
        .eq("status", "active");
      return data || [];
    },
  });

  // Fetch vendor profile for industry
  const { data: profile } = useQuery({
    queryKey: ["vendor-profile-financing", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_industry, full_name, company_name, location")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unit_price_usd, 0),
    [items]
  );

  // Completion percentage
  const completionPct = useMemo(() => {
    let filled = 0;
    let total = 5;
    if (selectedLender) filled++;
    if (purpose) filled++;
    if (repayment) filled++;
    if (tradeScope) filled++;
    if (items.some((i) => i.description && i.unit_price_usd > 0)) filled++;
    return Math.round((filled / total) * 100);
  }, [selectedLender, purpose, repayment, tradeScope, items]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const updateItem = (id: string, field: keyof LineItem, value: string | number) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments((prev) => [...prev, ...files]);
  };

  const canSubmit = selectedLender && purpose && repayment && items.some((i) => i.description && i.unit_price_usd > 0);

  const handleSaveDraft = async () => {
    if (!user?.id || !selectedLender) {
      toast.error("Select a lender first");
      return;
    }
    setSaving(true);
    try {
      const { data: app, error } = await supabase
        .from("financing_applications")
        .insert({
          vendor_id: user.id,
          lender_id: selectedLender,
          requested_amount: totalAmount,
          status: "draft",
          industry: profile?.onboarding_industry || null,
          trade_scope: tradeScope || null,
          vendor_notes: vendorNotes || null,
          proposed_terms: { purpose, repayment_days: repayment } as any,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert line items
      if (app && items.filter((i) => i.description).length) {
        await supabase.from("financing_application_items").insert(
          items
            .filter((i) => i.description)
            .map((item, idx) => ({
              application_id: app.id,
              description: item.description,
              quantity: item.quantity,
              unit_price_usd: item.unit_price_usd,
              category: item.category,
              sort_order: idx,
            }))
        );
      }

      toast.success("Draft saved");
      navigate("/trustlock/vendor/lender-lookup");
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id) return;
    setSaving(true);
    try {
      const { data: app, error } = await supabase
        .from("financing_applications")
        .insert({
          vendor_id: user.id,
          lender_id: selectedLender,
          requested_amount: totalAmount,
          status: "submitted",
          industry: profile?.onboarding_industry || null,
          trade_scope: tradeScope || null,
          vendor_notes: vendorNotes || null,
          proposed_terms: { purpose, repayment_days: repayment } as any,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert line items
      if (app && items.filter((i) => i.description).length) {
        await supabase.from("financing_application_items").insert(
          items
            .filter((i) => i.description)
            .map((item, idx) => ({
              application_id: app.id,
              description: item.description,
              quantity: item.quantity,
              unit_price_usd: item.unit_price_usd,
              category: item.category,
              sort_order: idx,
            }))
        );
      }

      // Upload documents
      if (app && documents.length) {
        for (const file of documents) {
          const filePath = `financing/${app.id}/${Date.now()}_${file.name}`;
          const { data: upload } = await supabase.storage.from("protection-documents").upload(filePath, file);
          if (upload) {
            await supabase.from("financing_application_documents").insert({
              application_id: app.id,
              document_type: "supporting",
              file_url: filePath,
              file_name: file.name,
              file_type: file.type,
              uploaded_by: user.id,
            });
          }
        }
      }

      toast.success("Application submitted successfully");
      navigate("/trustlock/vendor/lender-lookup");
    } catch {
      toast.error("Failed to submit application");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <VendorHeader title="Request Financing" />
      <div className="p-3 sm:p-6 max-w-4xl space-y-4">
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Application progress</span>
            <span>{completionPct}%</span>
          </div>
          <Progress value={completionPct} className="h-2" />
        </div>

        {/* Section A: Core */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              Financing Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Lender *</Label>
                <Select value={selectedLender} onValueChange={setSelectedLender}>
                  <SelectTrigger><SelectValue placeholder="Choose a lender" /></SelectTrigger>
                  <SelectContent>
                    {(lenders || []).map((l) => (
                      <SelectItem key={l.user_id} value={l.user_id}>
                        {l.institution_name} (Tier {l.lender_tier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purpose of Funds *</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expected Repayment Timeline *</Label>
                <Select value={repayment} onValueChange={setRepayment}>
                  <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                  <SelectContent>
                    {REPAYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trade Scope</Label>
                <Select value={tradeScope} onValueChange={setTradeScope}>
                  <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                  <SelectContent>
                    {TRADE_SCOPES.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes for Lender</Label>
              <Textarea
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                placeholder="Describe the financing context, any linked contracts or escrow orders..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Itemized Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Itemized Breakdown
              </span>
              <Badge variant="outline" className="text-xs">
                Total: ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">Description</Label>}
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="e.g. Raw Materials"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">Category</Label>}
                  <Select value={item.category} onValueChange={(v) => updateItem(item.id, "category", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 sm:col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">Qty</Label>}
                  <Input
                    type="number" min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value) || 1)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">Unit Price (USD)</Label>}
                  <Input
                    type="number" min={0} step={0.01}
                    value={item.unit_price_usd || ""}
                    onChange={(e) => updateItem(item.id, "unit_price_usd", Number(e.target.value) || 0)}
                    className="h-8 text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-1 sm:col-span-1 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">&nbsp;</Label>}
                  <span className="block text-xs text-muted-foreground text-right pt-1.5">
                    ${(item.quantity * item.unit_price_usd).toFixed(2)}
                  </span>
                </div>
                <div className="col-span-1 space-y-1">
                  {idx === 0 && <Label className="text-[10px]">&nbsp;</Label>}
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addItem}>
              <Plus className="w-3 h-3" /> Add Line Item
            </Button>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" />
              Supporting Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Upload business registration, bank statements, ID, and any industry-specific documents (JPEG or PDF).</p>

            {profile?.onboarding_industry && (
              <Button
                variant="ghost" size="sm"
                className="gap-1 text-xs text-muted-foreground"
                onClick={() => setShowIndustryDocs(!showIndustryDocs)}
              >
                {showIndustryDocs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Industry requirements: {INDUSTRY_LABELS[profile.onboarding_industry] || profile.onboarding_industry}
              </Button>
            )}
            {showIndustryDocs && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Universal Requirements:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Business registration certificate (PDF/JPEG)</li>
                  <li>Government-issued ID of signatory (PDF/JPEG)</li>
                  <li>Bank statement — 3 months minimum (PDF)</li>
                  <li>Proof of address — within 3 months (PDF/JPEG)</li>
                </ul>
                <p className="font-medium text-foreground pt-2">Accepted formats: JPEG, PDF • Max 10MB per file</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg"
                multiple
                onChange={handleDocUpload}
                className="text-xs"
              />
            </div>
            {documents.length > 0 && (
              <div className="space-y-1">
                {documents.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDocuments((p) => p.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" className="gap-1" onClick={handleSaveDraft} disabled={saving || !selectedLender}>
            <Save className="w-4 h-4" /> Save Draft
          </Button>
          <Button className="gap-1" onClick={handleSubmit} disabled={saving || !canSubmit}>
            <Send className="w-4 h-4" /> {saving ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VendorRequestFinancing;

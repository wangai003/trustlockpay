import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Package, Briefcase, Wrench, FolderKanban,
  ShoppingBag, Hammer, BookOpen, ChevronDown, ChevronUp, Tag, Loader2, Upload, FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendor } from "@/contexts/VendorContext";
import { toast } from "sonner";
import { ALL_INDUSTRIES } from "@/lib/industryList";

const INDUSTRY_ICONS: Record<string, string> = {
  ecommerce: "🛒", construction: "🏗️", real_estate: "🏘️", mining: "⛏️",
  agriculture: "🌾", freelance: "💼", logistics: "🚚", tourism: "✈️",
  education: "🎓", project_management: "📋", automotive: "🚗", energy: "⚡",
  pharmaceuticals: "💊", telecommunications: "📡", manufacturing: "🏭",
  renewable_energy: "☀️", textiles: "🧵", marine_fisheries: "🐟",
  water_sanitation: "💧", media_entertainment: "🎬", aviation: "✈️",
  insurance: "🛡️", legal_services: "⚖️", food_beverage: "🍽️",
  waste_management: "♻️", other: "📦",
};

const OFFERING_TYPE_CONFIG = {
  product: {
    label: "Product",
    icon: ShoppingBag,
    desc: "Physical or digital goods with delivery-based milestones",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  service: {
    label: "Service",
    icon: Wrench,
    desc: "Professional services with time or task-based milestones",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  project: {
    label: "Project",
    icon: Hammer,
    desc: "Large-scale engagements with complex milestone negotiations",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
};

type OfferingType = "product" | "service" | "project";

interface Offering {
  id: string;
  name: string;
  offering_type: OfferingType;
  industry_key: string;
  category: string | null;
  description: string | null;
  base_price: number | null;
  currency: string;
  unit_label: string | null;
  is_active: boolean;
  site_id: string | null;
}

interface VendorOfferingCatalogProps {
  siteId?: string;
  siteName?: string;
}

const VendorOfferingCatalog = ({ siteId, siteName }: VendorOfferingCatalogProps) => {
  const { user } = useAuth();
  const { networkMode } = useVendor();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", offering_type: "product" as OfferingType, industry_key: "ecommerce",
    category: "", description: "", base_price: "", currency: "USD", unit_label: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    const query = supabase.from("vendor_offerings").select("*")
      .eq("vendor_id", user.id)
      .eq("network_mode", networkMode)
      .order("created_at", { ascending: false });
    if (siteId) query.eq("site_id", siteId);
    query.then(({ data }) => {
      if (data) setOfferings(data as any);
      setLoading(false);
    });
  }, [user?.id, siteId, networkMode]);

  const handleAdd = async () => {
    if (!user?.id || !form.name.trim()) return;
    const payload = {
      vendor_id: user.id,
      site_id: siteId || null,
      name: form.name.trim(),
      offering_type: form.offering_type,
      industry_key: form.industry_key,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      base_price: form.base_price ? parseFloat(form.base_price) : null,
      currency: form.currency,
      unit_label: form.unit_label.trim() || null,
      is_active: true,
    };
    const { data, error } = await supabase.from("vendor_offerings").insert(payload).select().single();
    if (error) { toast.error(error.message); return; }
    setOfferings(prev => [data as any, ...prev]);
    setForm({ name: "", offering_type: "product", industry_key: "ecommerce", category: "", description: "", base_price: "", currency: "USD", unit_label: "" });
    setShowAdd(false);
    toast.success(`"${form.name}" added to your catalog`);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vendor_offerings").delete().eq("id", id);
    setOfferings(prev => prev.filter(o => o.id !== id));
    toast.success("Offering removed");
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("vendor_offerings").update({ is_active: active }).eq("id", id);
    setOfferings(prev => prev.map(o => o.id === id ? { ...o, is_active: active } : o));
  };

  // Group by category
  const categories = Array.from(new Set(offerings.map(o => o.category || "Uncategorized")));
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = offerings.filter(o => (o.category || "Uncategorized") === cat);
    return acc;
  }, {} as Record<string, Offering[]>);

  // Stats
  const activeCount = offerings.filter(o => o.is_active).length;
  const industries = Array.from(new Set(offerings.map(o => o.industry_key)));

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-primary" />
            {siteId ? `Offerings — ${siteName}` : "My Offering Catalog"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {offerings.length === 0
              ? "Define what you sell — the widget adapts milestones, documents, and checkout flow per offering."
              : `${activeCount} active offering${activeCount !== 1 ? "s" : ""} across ${industries.length} industr${industries.length !== 1 ? "ies" : "y"}`
            }
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3.5 h-3.5" /> Add Offering
        </Button>
      </div>

      {/* How it works (empty state) */}
      {offerings.length === 0 && !showAdd && (
        <Card className="border-dashed border-2 border-border bg-muted/10">
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center gap-3">
              {Object.values(OFFERING_TYPE_CONFIG).map(cfg => (
                <div key={cfg.label} className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${cfg.border} ${cfg.bg}`}>
                  <cfg.icon className={`w-6 h-6 ${cfg.color}`} />
                  <span className="text-[11px] font-medium">{cfg.label}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add your products, services, or projects. Each offering gets its own industry template,
              milestones, and document requirements. The checkout widget dynamically adapts based on what the buyer selects.
            </p>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3" /> Create Your First Offering
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Form */}
      {showAdd && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">New Offering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Offering type selector */}
            <div className="space-y-2">
              <Label className="text-xs">What are you selling?</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(OFFERING_TYPE_CONFIG) as [OfferingType, typeof OFFERING_TYPE_CONFIG.product][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, offering_type: key }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                      form.offering_type === key ? `${cfg.border} ${cfg.bg} shadow-sm` : "border-border hover:border-primary/20"
                    }`}>
                    <cfg.icon className={`w-5 h-5 ${form.offering_type === key ? cfg.color : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{cfg.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input className="h-9" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Residential Builds" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Industry Template</Label>
                <Select value={form.industry_key} onValueChange={v => setForm(f => ({ ...f, industry_key: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_INDUSTRIES.map(ind => <SelectItem key={ind.value} value={ind.value}>{INDUSTRY_ICONS[ind.value] || "📦"} {ind.label}</SelectItem>)}
                    <SelectItem value="other">📦 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Custom Category</Label>
                <Input className="h-9" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Consulting, Exports" />
                <p className="text-[10px] text-muted-foreground">Group related offerings together</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Base Price</Label>
                <div className="flex gap-2">
                  <Input className="h-9 flex-1" type="number" min={0} step={0.01} value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} placeholder="0.00" />
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                      <SelectItem value="GHS">GHS</SelectItem>
                      <SelectItem value="KES">KES</SelectItem>
                      <SelectItem value="ZAR">ZAR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit Label (optional)</Label>
                <Input className="h-9" value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))} placeholder="e.g., per MT, per hour, per project" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea className="text-xs" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown to buyers at checkout..." />
              </div>
            </div>

            {/* Preview how it adapts */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-[10px] font-semibold text-foreground mb-1">🔄 Dynamic Checkout Preview</p>
              <p className="text-[10px] text-muted-foreground">
                {form.offering_type === "product" && "Buyer sees: Product details → Payment → Delivery confirmation milestone"}
                {form.offering_type === "service" && "Buyer sees: Service scope → Milestone negotiation → Task-based progress tracking"}
                {form.offering_type === "project" && "Buyer sees: Project spec → Multi-stage milestone negotiation → Document gates per phase"}
                {" • "}{ALL_INDUSTRIES.find(i => i.value === form.industry_key)?.label || "Custom"} template loaded automatically.
              </p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!form.name.trim()}>Add to Catalog</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offerings grouped by category */}
      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          {categories.length > 1 && (
            <div className="flex items-center gap-2">
              <Tag className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</span>
              <Badge variant="secondary" className="text-[9px]">{grouped[cat].length}</Badge>
            </div>
          )}
          {grouped[cat].map(offering => {
            const cfg = OFFERING_TYPE_CONFIG[offering.offering_type] || OFFERING_TYPE_CONFIG.product;
            const isExpanded = expandedId === offering.id;
            return (
              <div key={offering.id} className={`rounded-lg border ${offering.is_active ? "border-border" : "border-border/50 opacity-60"} bg-background`}>
                <div className="flex items-center gap-3 p-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{offering.name}</span>
                      <Badge variant="outline" className="text-[9px] shrink-0">{cfg.label}</Badge>
                      <Badge variant="outline" className="text-[9px] shrink-0">{INDUSTRY_ICONS[offering.industry_key] || "📦"} {ALL_INDUSTRIES.find(i => i.value === offering.industry_key)?.label || offering.industry_key}</Badge>
                    </div>
                    {offering.base_price && (
                      <span className="text-xs text-muted-foreground">{offering.currency} {offering.base_price.toLocaleString()}{offering.unit_label ? ` ${offering.unit_label}` : ""}</span>
                    )}
                  </div>
                  <Switch checked={offering.is_active} onCheckedChange={(v) => handleToggle(offering.id, v)} />
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : offering.id)}>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0 h-7 w-7" onClick={() => handleDelete(offering.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                      <div><span className="text-muted-foreground">Type:</span> <strong>{cfg.label}</strong> — {cfg.desc}</div>
                      <div><span className="text-muted-foreground">Industry:</span> <strong>{ALL_INDUSTRIES.find(i => i.value === offering.industry_key)?.label || "Custom"}</strong></div>
                      {offering.description && <div className="col-span-2"><span className="text-muted-foreground">Description:</span> {offering.description}</div>}
                      <div className="col-span-2 p-2 rounded bg-muted/30">
                        <p className="text-[10px] font-semibold mb-1">🔄 At checkout, this offering will:</p>
                        <ul className="text-[10px] text-muted-foreground space-y-0.5 ml-3 list-disc">
                          <li>Load the <strong>{ALL_INDUSTRIES.find(i => i.value === offering.industry_key)?.label}</strong> milestone template</li>
                          <li>Require industry-specific document gates (e.g., {offering.industry_key === "construction" ? "FIDIC contracts, site permits" : offering.industry_key === "mining" ? "assay certificates, customs declarations" : "delivery confirmation, receipts"})</li>
                          <li>{offering.offering_type === "project" ? "Trigger milestone negotiation before payment" : offering.offering_type === "service" ? "Show task-based progress milestones" : "Use standard delivery-based checkout"}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default VendorOfferingCatalog;

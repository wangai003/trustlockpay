import { useState, useEffect, useMemo } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Globe, Plus, ExternalLink, Copy, Trash2, CheckCircle, AlertTriangle,
  RotateCcw, DollarSign, Receipt, Layers, Shield, Store, CreditCard,
  Palette, Webhook, ShieldCheck, Users, Package, Eye, EyeOff, Loader2,
  Info, Building2, User, Briefcase,
} from "lucide-react";
import WidgetInstallGuide from "@/components/vendor/WidgetInstallGuide";
import WidgetPreviewMockup from "@/components/vendor/WidgetPreviewMockup";
import WidgetIndustryConfig from "@/components/vendor/WidgetIndustryConfig";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";
import { ALL_INDUSTRIES } from "@/lib/industryList";
import { useVendorSites, useAddSite, useDeleteSite } from "@/hooks/useSupabaseData";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getWidgetFeeState, processWidgetTransition, calculateWidgetTransitionFee,
  WIDGET_INSTALL_FEE, type WidgetFeeState, type WidgetState,
} from "@/lib/widgetFeeLogic";
import { isVendorInTrial } from "@/hooks/useVendorBilling";

/* ── constants ── */
const PLATFORM_OPTIONS = [
  "Shopify", "WooCommerce", "WordPress", "Wix", "Squarespace",
  "BigCommerce", "Magento", "PrestaShop", "OpenCart", "Jumia Seller",
  "Konga Seller", "Flutterwave Store", "Paystack Storefront", "Custom Website",
  "Portfolio / Blog", "Social Media Page", "Landing Page", "Service Website",
];
const NO_CHECKOUT_PLATFORMS = [
  "Jumia Seller", "Konga Seller", "Paystack Storefront",
  "Portfolio / Blog", "Social Media Page", "Landing Page", "Service Website",
];
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
const TRUSTLOCK_INDUSTRIES = [
  ...ALL_INDUSTRIES.map(i => ({ key: i.value, label: i.label, icon: INDUSTRY_ICONS[i.value] || "📦" })),
  { key: "other", label: "Other / Not Listed", icon: "📦" },
];
const PAYMENT_METHODS = [
  { id: "card", label: "Card (Visa/Mastercard)", region: "international" },
  { id: "bank_transfer", label: "Bank Transfer", region: "both" },
  { id: "mobile_money", label: "Mobile Money", region: "africa" },
  { id: "crypto", label: "Crypto (USDC/USDT)", region: "both" },
  { id: "apple_pay", label: "Apple Pay", region: "international" },
  { id: "google_pay", label: "Google Pay", region: "international" },
];

type AccountType = "individual" | "business";

/* ══════════════════════════════════════════════════════════════ */
const VendorSitesAndWidget = () => {
  const { vendor } = useVendor();
  const { user } = useAuth();
  const { toast } = useToast();

  /* ── Account type ── */
  const [accountType, setAccountType] = useState<AccountType>(() =>
    (localStorage.getItem("tl_vendor_account_type") as AccountType) || "individual"
  );
  useEffect(() => { localStorage.setItem("tl_vendor_account_type", accountType); }, [accountType]);

  /* ── Active top-level tab ── */
  const [activeTab, setActiveTab] = useState("sites");

  /* ───────── SITES STATE ───────── */
  const [showAdd, setShowAdd] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [sitePlatform, setSitePlatform] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteIndustry, setSiteIndustry] = useState("");
  const [hasCheckout, setHasCheckout] = useState(true);
  const [widgetStates, setWidgetStates] = useState<Record<string, WidgetFeeState>>(() => {
    const stored = localStorage.getItem("tl_site_widget_fee_states");
    return stored ? JSON.parse(stored) : {};
  });
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [pendingInvoiceAction, setPendingInvoiceAction] = useState<"install" | "restore" | null>(null);

  useEffect(() => { localStorage.setItem("tl_site_widget_fee_states", JSON.stringify(widgetStates)); }, [widgetStates]);

  const getSiteWidgetState = (siteId: string): WidgetFeeState =>
    widgetStates[siteId] || { widgetState: "never_installed" as WidgetState, installFeePaid: false, pendingRestorationFee: false, totalInstallFeesCharged: 0 };

  const anyInstallFeePaid = Object.values(widgetStates).some(s => s.installFeePaid);
  const anyPendingRestoration = Object.values(widgetStates).some(s => s.pendingRestorationFee);

  const { data: dbSites = [] } = useVendorSites();
  const addSite = useAddSite();
  const deleteSite = useDeleteSite();

  const allSites = dbSites.length > 0
    ? dbSites.map(s => ({ id: s.id, name: s.name, platform: s.platform || "Custom", url: s.url || "", industry: (s as any).industry || "" }))
    : vendor.sites.map(s => ({ ...s, industry: "" }));

  const [siteWidgetStates, setSiteWidgetStates] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem("tl_site_widget_states");
    return stored ? JSON.parse(stored) : {};
  });
  useEffect(() => { localStorage.setItem("tl_site_widget_states", JSON.stringify(siteWidgetStates)); }, [siteWidgetStates]);

  useEffect(() => {
    if (NO_CHECKOUT_PLATFORMS.includes(sitePlatform)) setHasCheckout(false);
  }, [sitePlatform]);

  const handleAddSite = async () => {
    if (!siteName) return;
    if (!siteIndustry) { sonnerToast.error("Please select an industry for your site."); return; }
    await addSite.mutateAsync({ name: siteName, platform: sitePlatform, url: siteUrl, industry: siteIndustry || undefined });
    setSiteName(""); setSitePlatform(""); setSiteUrl(""); setSiteIndustry(""); setHasCheckout(true); setShowAdd(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    await deleteSite.mutateAsync(siteId);
    const siteState = getSiteWidgetState(siteId);
    const { fee } = calculateWidgetTransitionFee(siteState.widgetState, "delete");
    setWidgetStates(prev => { const next = { ...prev }; delete next[siteId]; return next; });
    setSiteWidgetStates(prev => { const next = { ...prev }; delete next[siteId]; return next; });
    if (fee > 0) sonnerToast.info(`Widget removal noted. Restoration will incur a $${WIDGET_INSTALL_FEE} fee.`);
  };

  const handleFirstInstall = (siteId: string) => {
    const ws = getSiteWidgetState(siteId);
    if (isVendorInTrial()) {
      setWidgetStates(prev => ({ ...prev, [siteId]: { widgetState: "installed" as WidgetState, installFeePaid: true, pendingRestorationFee: false, totalInstallFeesCharged: 0 } }));
      setSiteWidgetStates(prev => ({ ...prev, [siteId]: true }));
      sonnerToast.success("Widget installed free during trial! 🎉");
      return;
    }
    if (ws.widgetState === "never_installed" || ws.widgetState === "deleted") {
      setActiveSiteId(siteId);
      setPendingInvoiceAction(ws.widgetState === "deleted" ? "restore" : "install");
      setShowInvoice(true);
    } else {
      setSiteWidgetStates(prev => ({ ...prev, [siteId]: true }));
      sonnerToast.success("Widget enabled on this site.");
    }
  };

  const handleConfirmInvoice = () => {
    if (!activeSiteId) return;
    const action = pendingInvoiceAction || "install";
    const siteState = getSiteWidgetState(activeSiteId);
    const { fee, newState, chargeMode } = calculateWidgetTransitionFee(siteState.widgetState, action);
    setWidgetStates(prev => ({
      ...prev,
      [activeSiteId]: {
        widgetState: newState,
        installFeePaid: siteState.installFeePaid || (action === "install" && fee > 0),
        pendingRestorationFee: chargeMode === "next_cycle",
        totalInstallFeesCharged: siteState.totalInstallFeesCharged + (fee > 0 ? fee : 0),
      },
    }));
    setSiteWidgetStates(prev => ({ ...prev, [activeSiteId]: true }));
    setShowInvoice(false); setPendingInvoiceAction(null); setActiveSiteId(null);
    if (chargeMode === "immediate") sonnerToast.success(`Widget installed! $${fee.toFixed(2)} one-time installation fee will be charged with your first plan payment.`);
    else if (chargeMode === "next_cycle") sonnerToast.success(`Widget restored! $${fee.toFixed(2)} restoration fee will be charged on your next billing cycle.`);
  };

  const handleToggleWidget = (siteId: string, enabled: boolean) => {
    if (enabled) {
      const ws = getSiteWidgetState(siteId);
      if (ws.widgetState === "never_installed" || ws.widgetState === "deleted") { handleFirstInstall(siteId); return; }
      setWidgetStates(prev => ({ ...prev, [siteId]: { ...ws, widgetState: "installed" as WidgetState } }));
    } else {
      const ws = getSiteWidgetState(siteId);
      setWidgetStates(prev => ({ ...prev, [siteId]: { ...ws, widgetState: "disabled" as WidgetState } }));
    }
    setSiteWidgetStates(prev => ({ ...prev, [siteId]: enabled }));
    sonnerToast.success(enabled ? "Widget enabled" : "Widget disabled — no fee charged.");
  };

  const handleRestoreWidget = (siteId: string) => {
    setActiveSiteId(siteId); setPendingInvoiceAction("restore"); setShowInvoice(true);
  };

  /* ───────── WIDGET CONFIG STATE ───────── */
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    multi_vendor_enabled: false, platform_commission_percent: 0, product_api_url: "",
    webhook_url: "", webhook_secret: "", white_label_enabled: false,
    brand_primary_color: "#1a56db", brand_logo_url: "", brand_name: "",
    default_industry_override: "", auto_kyc_passthrough: false, sandbox_mode: true,
    allowed_payment_methods: ["card", "bank_transfer", "mobile_money", "crypto"],
    max_order_amount: "", min_order_amount: "1.00", auto_refund_window_hours: 72,
    custom_checkout_message: "", require_buyer_account: false, enable_bulk_onboarding: false,
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("platform_widget_configs").select("*").eq("vendor_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setConfig({
            multi_vendor_enabled: data.multi_vendor_enabled,
            platform_commission_percent: data.platform_commission_percent || 0,
            product_api_url: data.product_api_url || "",
            webhook_url: data.webhook_url || "",
            webhook_secret: data.webhook_secret || "",
            white_label_enabled: data.white_label_enabled,
            brand_primary_color: data.brand_primary_color || "#1a56db",
            brand_logo_url: data.brand_logo_url || "",
            brand_name: data.brand_name || "",
            default_industry_override: data.default_industry_override || "",
            auto_kyc_passthrough: data.auto_kyc_passthrough,
            sandbox_mode: data.sandbox_mode,
            allowed_payment_methods: data.allowed_payment_methods || ["card", "bank_transfer", "mobile_money", "crypto"],
            max_order_amount: data.max_order_amount?.toString() || "",
            min_order_amount: data.min_order_amount?.toString() || "1.00",
            auto_refund_window_hours: data.auto_refund_window_hours || 72,
            custom_checkout_message: data.custom_checkout_message || "",
            require_buyer_account: data.require_buyer_account,
            enable_bulk_onboarding: data.enable_bulk_onboarding,
          });
        }
        setConfigLoading(false);
      });
  }, [user?.id]);

  const handleSaveConfig = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload = {
      vendor_id: user.id,
      multi_vendor_enabled: config.multi_vendor_enabled,
      platform_commission_percent: config.platform_commission_percent,
      product_api_url: config.product_api_url || null,
      webhook_url: config.webhook_url || null,
      webhook_secret: config.webhook_secret || null,
      white_label_enabled: config.white_label_enabled,
      brand_primary_color: config.brand_primary_color,
      brand_logo_url: config.brand_logo_url || null,
      brand_name: config.brand_name || null,
      default_industry_override: config.default_industry_override || null,
      auto_kyc_passthrough: config.auto_kyc_passthrough,
      sandbox_mode: config.sandbox_mode,
      allowed_payment_methods: config.allowed_payment_methods,
      max_order_amount: config.max_order_amount ? parseFloat(config.max_order_amount) : null,
      min_order_amount: config.min_order_amount ? parseFloat(config.min_order_amount) : 1.00,
      auto_refund_window_hours: config.auto_refund_window_hours,
      custom_checkout_message: config.custom_checkout_message || null,
      require_buyer_account: config.require_buyer_account,
      enable_bulk_onboarding: config.enable_bulk_onboarding,
    };
    const { error } = await supabase.from("platform_widget_configs").upsert(payload, { onConflict: "vendor_id" });
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Saved", description: "Widget configuration updated successfully." });
  };

  const togglePaymentMethod = (method: string) => {
    setConfig(prev => ({
      ...prev,
      allowed_payment_methods: prev.allowed_payment_methods.includes(method)
        ? prev.allowed_payment_methods.filter(m => m !== method)
        : [...prev.allowed_payment_methods, method],
    }));
  };

  const generateWebhookSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let secret = "whsec_";
    for (let i = 0; i < 32; i++) secret += chars.charAt(Math.floor(Math.random() * chars.length));
    setConfig(prev => ({ ...prev, webhook_secret: secret }));
  };

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <div>
      <VendorHeader title="My Sites & Widget Config" />
      <div className="p-6 space-y-6 max-w-5xl">

        {/* Account type selector */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Account Type</p>
                <p className="text-xs text-muted-foreground">This determines which configuration options are visible to you.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAccountType("individual")}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    accountType === "individual" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  <User className="w-4 h-4" /> Individual
                </button>
                <button
                  onClick={() => setAccountType("business")}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    accountType === "business" ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40 text-muted-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4" /> Business / Platform
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Main Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="sites" className="gap-2"><Globe className="w-4 h-4" /> My Sites</TabsTrigger>
            <TabsTrigger value="widget-config" className="gap-2"><Palette className="w-4 h-4" /> Widget Configuration</TabsTrigger>
          </TabsList>

          {/* ═══════ MY SITES TAB ═══════ */}
          <TabsContent value="sites" className="space-y-6 mt-4">
            {/* Industry info banner for first-time users */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">What is this page?</p>
                  <p>Register every website or platform where you sell. Each site gets its own <strong>Site ID</strong> and can have the TrustLock Pay widget installed. The widget adapts to your industry — from e-commerce product delivery to construction milestones, mining certifications, and more.</p>
                  <p>After adding a site, head to the <strong>Widget Configuration</strong> tab to fine-tune payment methods, branding, webhooks, and marketplace settings. Advanced options (multi-vendor, bulk onboarding, white-label) are available for Business accounts.</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-bold">Connected Platforms</h2>
                <p className="text-sm text-muted-foreground">Manage all your websites and e-commerce platforms</p>
              </div>
              <Button onClick={() => setShowAdd(!showAdd)} className="gap-2"><Plus className="w-4 h-4" /> Add Site</Button>
            </div>

            {/* Installation Fee Invoice Modal */}
            {showInvoice && (
              <Card className="border-accent/30 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    {pendingInvoiceAction === "restore" ? "Widget Restoration Invoice" : "Widget Installation Invoice"}
                  </CardTitle>
                  <CardDescription>
                    {pendingInvoiceAction === "restore"
                      ? "A restoration fee applies when re-installing a previously deleted widget."
                      : "A one-time installation fee is required for first-time widget setup."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-background rounded-lg border border-border p-4 space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service</span><span className="font-medium">TrustLock Pay Widget — {pendingInvoiceAction === "restore" ? "Restoration" : "Installation"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee Type</span><span>{pendingInvoiceAction === "restore" ? "Restoration (one-time)" : "Installation (one-time)"}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-foreground">${WIDGET_INSTALL_FEE.toFixed(2)}</span></div>
                    <div className="border-t border-border pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Charge Method</span>
                        <span className="text-xs">{pendingInvoiceAction === "restore" ? "Added to your next billing cycle" : "Charged with your first plan payment"}</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-2">
                      <p className="text-[10px] text-muted-foreground"><strong>Note:</strong> Disabling and re-enabling the widget will never incur additional fees. This fee only applies on first installation or after a full widget deletion and restoration.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2" onClick={handleConfirmInvoice}>
                      <DollarSign className="w-3 h-3" /> Accept & {pendingInvoiceAction === "restore" ? "Restore" : "Install"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowInvoice(false); setPendingInvoiceAction(null); }}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {anyInstallFeePaid && (
              <Card className="border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Widget installation fees active.</strong> Disabling and re-enabling any widget is free.
                    {anyPendingRestoration && <Badge variant="outline" className="ml-2 text-[9px] border-accent/30 text-accent">$5 restoration fee pending on next cycle</Badge>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Site Form */}
            {showAdd && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base">Add New Site</CardTitle>
                  <CardDescription>Connect another platform to your TrustLock account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Site Name</Label>
                      <Input placeholder="e.g., My Etsy Store" value={siteName} onChange={e => setSiteName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Platform</Label>
                      <Select value={sitePlatform} onValueChange={setSitePlatform}>
                        <SelectTrigger><SelectValue placeholder="Select a platform" /></SelectTrigger>
                        <SelectContent>{PLATFORM_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Website URL</Label>
                      <Input placeholder="e.g., mystore.myshopify.com" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Industry / Category</Label>
                      <Select value={siteIndustry} onValueChange={setSiteIndustry}>
                        <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                        <SelectContent>{TRUSTLOCK_INDUSTRIES.map(ind => <SelectItem key={ind.key} value={ind.key}>{ind.icon} {ind.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">This determines your escrow milestone template, document gates, and compliance requirements</p>
                    </div>

                    {siteIndustry && siteIndustry !== "other" && (
                      <div className="sm:col-span-2">
                        <WidgetIndustryConfig industry={siteIndustry} onConfigSave={(cfg) => localStorage.setItem(`tl_site_industry_config_${siteIndustry}`, JSON.stringify(cfg))} />
                      </div>
                    )}
                    {siteIndustry === "other" && (
                      <div className="sm:col-span-2 p-3 bg-muted/20 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground"><strong>Custom Industry:</strong> Your widget will use the default escrow workflow. You can manually configure pricing, documents, and compliance fields from your dashboard after setup.</p>
                      </div>
                    )}

                    <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                      <Switch checked={hasCheckout} onCheckedChange={setHasCheckout} />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{hasCheckout ? "My site has a checkout page" : "My site does NOT have a checkout page"}</p>
                        <p className="text-[10px] text-muted-foreground">{hasCheckout ? "The TrustLock widget will be installed on your checkout page" : "You will use Standalone Payment Links to collect escrow-protected payments"}</p>
                      </div>
                      {!hasCheckout && <Badge variant="secondary" className="text-[9px] shrink-0">Standalone Links</Badge>}
                    </div>

                    {!hasCheckout && (
                      <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                        <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div className="text-xs text-muted-foreground">
                          <p className="font-semibold text-foreground mb-1">How it works without a checkout page</p>
                          <ol className="list-decimal ml-4 space-y-1">
                            <li>Add your site so TrustLock knows your business</li>
                            <li>Go to <strong>Standalone Links</strong> to create payment links</li>
                            <li>Share links with buyers via WhatsApp, email, SMS, or social media</li>
                            <li>Buyers complete the full TrustLock escrow checkout through the link</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSite}>Connect Site</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Connected Sites */}
            <div className="grid gap-4">
              {allSites.map((site, siteIdx) => {
                const isWidgetEnabled = siteWidgetStates[site.id] ?? false;
                const siteWS = getSiteWidgetState(site.id);
                const isDeleted = siteWS.widgetState === "deleted";
                const isNoCheckoutPlatform = NO_CHECKOUT_PLATFORMS.includes(site.platform || "");
                const row = siteIdx + 1;
                return (
                  <Card key={site.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isNoCheckoutPlatform ? "bg-accent/15" : isWidgetEnabled ? "bg-primary/15" : "bg-muted/20"}`}>
                          {isNoCheckoutPlatform ? <ExternalLink className="w-6 h-6 text-accent" /> : isWidgetEnabled ? <Shield className="w-6 h-6 text-primary" /> : <Globe className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <TLId code={dynTLId("V", "SIT", row, "LBL-NAME")} inline><h3 className="font-heading font-bold">{site.name}</h3></TLId>
                            <TLId code={dynTLId("V", "SIT", row, "BDG-PLATFORM")} inline><Badge variant="secondary" className="text-[10px]">{site.platform}</Badge></TLId>
                            {site.industry && <Badge variant="outline" className="text-[10px]">{INDUSTRY_ICONS[site.industry] || "📦"} {TRUSTLOCK_INDUSTRIES.find(i => i.key === site.industry)?.label || site.industry}</Badge>}
                            {isNoCheckoutPlatform
                              ? <TLId code={dynTLId("V", "SIT", row, "BDG-STATUS")} inline><Badge className="bg-accent/15 text-accent text-[10px]">Standalone Links</Badge></TLId>
                              : <TLId code={dynTLId("V", "SIT", row, "BDG-STATUS")} inline><Badge className="bg-primary/15 text-primary text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" /> Active</Badge></TLId>
                            }
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <TLId code={dynTLId("V", "SIT", row, "LBL-URL")} inline><span><ExternalLink className="w-3 h-3 inline mr-1" />{site.url}</span></TLId>
                          </p>

                          {isNoCheckoutPlatform ? (
                            <div className="mt-3 space-y-3">
                              <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                                <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                <div className="text-xs text-muted-foreground">
                                  <p className="font-semibold text-foreground mb-1">This site uses Standalone Payment Links</p>
                                  <p>Since {site.platform} does not support custom checkout widgets, you collect payments by sharing TrustLock payment links.</p>
                                </div>
                              </div>
                              <Button size="sm" variant="default" className="gap-1.5 text-xs" asChild>
                                <a href="/trustlock/vendor/standalone-links"><ExternalLink className="w-3 h-3" /> Create Standalone Payment Link</a>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="mt-3 flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                                <TLId code={dynTLId("V", "SIT", row, "TGL-WIDGET")} inline>
                                  <Switch checked={isWidgetEnabled} onCheckedChange={(checked) => handleToggleWidget(site.id, checked)} />
                                </TLId>
                                <div>
                                  <p className="text-xs font-semibold">{isWidgetEnabled ? "Widget Enabled" : "Widget Disabled"}</p>
                                  <p className="text-[10px] text-muted-foreground">{isWidgetEnabled ? "TrustLock Pay widget is active on this storefront" : "Toggle to enable the TrustLock Pay widget"}</p>
                                </div>
                                {isDeleted && (
                                  <Button variant="outline" size="sm" className="ml-auto text-xs gap-1" onClick={() => handleRestoreWidget(site.id)}>
                                    <RotateCcw className="w-3 h-3" /> Restore Widget ($5)
                                  </Button>
                                )}
                              </div>
                              {isWidgetEnabled && (
                                <>
                                  {siteWS.installFeePaid && !siteWS.pendingRestorationFee ? (
                                    <>
                                      <WidgetInstallGuide platform={site.platform || "Custom Website"} siteId={site.id} vendorSlug={vendor.name.toLowerCase().replace(/\s/g, '-')} />
                                      <div className="mt-4"><WidgetPreviewMockup /></div>
                                    </>
                                  ) : (
                                    <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                        <div className="text-xs text-muted-foreground">
                                          <p className="font-semibold text-foreground mb-1">Widget embed code locked</p>
                                          <p>Your $5.00 installation fee must be paid before you can access the embed code. Go to <strong>Bill Payments</strong> to complete payment.</p>
                                          <Button size="sm" variant="outline" className="mt-2 text-xs gap-1" onClick={() => window.location.href = "/trustlock/vendor/bill-payments"}>
                                            <DollarSign className="w-3 h-3" /> Pay Installation Fee
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                        <TLId code={dynTLId("V", "SIT", row, "BTN-DELETE")} inline>
                          <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteSite(site.id)}><Trash2 className="w-4 h-4" /></Button>
                        </TLId>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Industries list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Industries Served by TrustLock</CardTitle>
                <CardDescription>TrustLock provides escrow-backed checkout workflows tailored to these industries. Select the relevant industry when adding a site to automatically load the right milestones, document gates, and compliance requirements.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {TRUSTLOCK_INDUSTRIES.map(ind => (
                    <div key={ind.key} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-colors">
                      <span className="text-lg">{ind.icon}</span>
                      <span className="text-xs font-medium">{ind.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ WIDGET CONFIGURATION TAB ═══════ */}
          <TabsContent value="widget-config" className="space-y-6 mt-4">
            {/* Intro banner */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Widget Configuration</p>
                  <p>These settings control <strong>how</strong> the TrustLock Pay widget behaves across all your sites — payment methods, transaction limits, branding, webhooks, and marketplace features. All vendors can use these settings; advanced options like multi-vendor routing and white-labeling are especially useful for Business / Platform accounts.</p>
                  <p>If any section doesn't apply to your business, simply skip it and continue with the defaults.</p>
                </div>
              </CardContent>
            </Card>

            {configLoading ? (
              <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={config.sandbox_mode ? "secondary" : "default"} className="text-xs">{config.sandbox_mode ? "🟡 Sandbox" : "🟢 Live"}</Badge>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sandbox-toggle" className="text-sm">Sandbox Mode</Label>
                    <Switch id="sandbox-toggle" checked={config.sandbox_mode} onCheckedChange={(v) => setConfig(prev => ({ ...prev, sandbox_mode: v }))} />
                  </div>
                </div>

                <Tabs defaultValue="marketplace" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 h-auto">
                    <TabsTrigger value="marketplace" className="text-xs gap-1"><Store className="w-3 h-3" /> Marketplace</TabsTrigger>
                    <TabsTrigger value="payments" className="text-xs gap-1"><CreditCard className="w-3 h-3" /> Payments</TabsTrigger>
                    <TabsTrigger value="branding" className="text-xs gap-1"><Palette className="w-3 h-3" /> Branding</TabsTrigger>
                    <TabsTrigger value="integration" className="text-xs gap-1"><Webhook className="w-3 h-3" /> Integration</TabsTrigger>
                    <TabsTrigger value="compliance" className="text-xs gap-1"><ShieldCheck className="w-3 h-3" /> Compliance</TabsTrigger>
                  </TabsList>

                  {/* Marketplace */}
                  <TabsContent value="marketplace" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Store className="w-4 h-4" /> Multi-Vendor Cart Routing</CardTitle>
                        <CardDescription>Enable this if your platform hosts multiple vendors (like Amazon, Jumia, Jiji). A single checkout will be split into separate escrow transactions per vendor.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>Enable Multi-Vendor Mode</Label><Switch checked={config.multi_vendor_enabled} onCheckedChange={(v) => setConfig(prev => ({ ...prev, multi_vendor_enabled: v }))} /></div>
                        {config.multi_vendor_enabled && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label>Platform Commission (%)</Label>
                                <Input type="number" min={0} max={30} step={0.1} value={config.platform_commission_percent} onChange={(e) => setConfig(prev => ({ ...prev, platform_commission_percent: parseFloat(e.target.value) || 0 }))} placeholder="e.g. 5.0" />
                                <p className="text-xs text-muted-foreground">Your marketplace commission layered on top of TrustLock's 1.5% fee.</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Product API Endpoint</Label>
                                <Input value={config.product_api_url} onChange={(e) => setConfig(prev => ({ ...prev, product_api_url: e.target.value }))} placeholder="https://api.yourplatform.com/products" />
                                <p className="text-xs text-muted-foreground">URL where the widget fetches dynamic product pricing and vendor mappings.</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <div><Label>Bulk Vendor Onboarding</Label><p className="text-xs text-muted-foreground">Allow CSV/API batch registration of sub-vendors</p></div>
                                <Switch checked={config.enable_bulk_onboarding} onCheckedChange={(v) => setConfig(prev => ({ ...prev, enable_bulk_onboarding: v }))} />
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><Package className="w-4 h-4" /> Default Industry Template</CardTitle>
                        <CardDescription>Force all transactions through a specific industry workflow, or let each vendor/product choose their own.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Select value={config.default_industry_override || "none"} onValueChange={(v) => setConfig(prev => ({ ...prev, default_industry_override: v === "none" ? "" : v }))}>
                          <SelectTrigger><SelectValue placeholder="Let vendors choose" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Let vendors choose (no override)</SelectItem>
                            {ALL_INDUSTRIES.map(ind => <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Payments */}
                  <TabsContent value="payments" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-4 h-4" /> Allowed Payment Methods</CardTitle><CardDescription>Select which payment methods appear in the widget checkout.</CardDescription></CardHeader>
                      <CardContent className="space-y-3">
                        {PAYMENT_METHODS.map(pm => (
                          <div key={pm.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={config.allowed_payment_methods.includes(pm.id)} onCheckedChange={() => togglePaymentMethod(pm.id)} />
                              <div><span className="text-sm font-medium">{pm.label}</span><Badge variant="outline" className="ml-2 text-[10px]">{pm.region}</Badge></div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Transaction Limits</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Minimum Order ($)</Label><Input type="number" min={0} step={0.01} value={config.min_order_amount} onChange={(e) => setConfig(prev => ({ ...prev, min_order_amount: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Maximum Order ($)</Label><Input type="number" min={0} step={0.01} value={config.max_order_amount} onChange={(e) => setConfig(prev => ({ ...prev, max_order_amount: e.target.value }))} placeholder="No limit" /></div>
                        <div className="space-y-2 col-span-2">
                          <Label>Auto-Refund Window (hours)</Label>
                          <Input type="number" min={1} max={720} value={config.auto_refund_window_hours} onChange={(e) => setConfig(prev => ({ ...prev, auto_refund_window_hours: parseInt(e.target.value) || 72 }))} />
                          <p className="text-xs text-muted-foreground">If a vendor doesn't claim an order within this window, the buyer receives an automatic refund.</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-4 h-4" /> Buyer Requirements</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div><Label>Require TrustLock Account</Label><p className="text-xs text-muted-foreground">Buyers must sign in before checkout</p></div>
                          <Switch checked={config.require_buyer_account} onCheckedChange={(v) => setConfig(prev => ({ ...prev, require_buyer_account: v }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Custom Checkout Message</Label>
                          <Textarea value={config.custom_checkout_message} onChange={(e) => setConfig(prev => ({ ...prev, custom_checkout_message: e.target.value }))} placeholder="e.g. 'All purchases are protected by TrustLock Escrow.'" rows={2} />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Branding */}
                  <TabsContent value="branding" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Palette className="w-4 h-4" /> White-Label Branding</CardTitle><CardDescription>Customize the widget appearance to match your platform's identity.</CardDescription></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between"><Label>Enable White-Label Mode</Label><Switch checked={config.white_label_enabled} onCheckedChange={(v) => setConfig(prev => ({ ...prev, white_label_enabled: v }))} /></div>
                        {config.white_label_enabled && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <div className="space-y-2"><Label>Brand Name</Label><Input value={config.brand_name} onChange={(e) => setConfig(prev => ({ ...prev, brand_name: e.target.value }))} placeholder="Your Platform Name" /></div>
                              <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <div className="flex items-center gap-3">
                                  <input type="color" value={config.brand_primary_color} onChange={(e) => setConfig(prev => ({ ...prev, brand_primary_color: e.target.value }))} className="w-10 h-10 rounded border cursor-pointer" />
                                  <Input value={config.brand_primary_color} onChange={(e) => setConfig(prev => ({ ...prev, brand_primary_color: e.target.value }))} className="w-32" />
                                  <div className="h-10 flex-1 rounded border flex items-center justify-center text-white text-sm font-medium" style={{ background: config.brand_primary_color }}>Preview</div>
                                </div>
                              </div>
                              <div className="space-y-2"><Label>Logo URL</Label><Input value={config.brand_logo_url} onChange={(e) => setConfig(prev => ({ ...prev, brand_logo_url: e.target.value }))} placeholder="https://yourplatform.com/logo.png" /></div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Integration */}
                  <TabsContent value="integration" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Webhook className="w-4 h-4" /> Webhook Configuration</CardTitle><CardDescription>Receive real-time notifications when escrow events occur.</CardDescription></CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Webhook URL</Label><Input value={config.webhook_url} onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))} placeholder="https://api.yourplatform.com/webhooks/trustlock" /></div>
                        <div className="space-y-2">
                          <Label>Webhook Secret</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input type={showSecret ? "text" : "password"} value={config.webhook_secret} onChange={(e) => setConfig(prev => ({ ...prev, webhook_secret: e.target.value }))} placeholder="whsec_..." />
                              <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <Button variant="outline" size="sm" onClick={generateWebhookSecret}>Generate</Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Used to verify webhook payloads via HMAC-SHA256.</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="w-4 h-4" /> Widget Embed Code</CardTitle></CardHeader>
                      <CardContent>
                        <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`<script
  src="https://dbajucxswcgxllmwxnia.supabase.co/functions/v1/widget-embed"
  data-site-id="YOUR_SITE_ID"
  data-vendor-id="${user?.id || "YOUR_VENDOR_ID"}"
  data-mode="${config.sandbox_mode ? "sandbox" : "live"}"
  ${config.multi_vendor_enabled && config.platform_commission_percent ? `data-platform-fee="${config.platform_commission_percent}"` : ""}
  ${config.brand_name ? `data-platform-name="${config.brand_name}"` : ""}
></script>`}
                        </pre>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                          navigator.clipboard.writeText(`<script src="https://dbajucxswcgxllmwxnia.supabase.co/functions/v1/widget-embed" data-site-id="YOUR_SITE_ID" data-vendor-id="${user?.id}" data-mode="${config.sandbox_mode ? "sandbox" : "live"}"></script>`);
                          toast({ title: "Copied!", description: "Embed code copied to clipboard." });
                        }}>
                          <Copy className="w-3 h-3 mr-1" /> Copy Embed Code
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Compliance */}
                  <TabsContent value="compliance" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> KYC Passthrough</CardTitle><CardDescription>If your platform already performs KYC/KYB on your vendors, enable this to skip redundant verification.</CardDescription></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between"><Label>Auto KYC Passthrough</Label><Switch checked={config.auto_kyc_passthrough} onCheckedChange={(v) => setConfig(prev => ({ ...prev, auto_kyc_passthrough: v }))} /></div>
                        {config.auto_kyc_passthrough && (
                          <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">Enabling this means TrustLock trusts your platform's KYC process. You are responsible for maintaining compliance. TrustLock reserves the right to request additional verification for high-value transactions.</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => window.location.reload()}>Reset</Button>
                  <Button onClick={handleSaveConfig} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Configuration"}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorSitesAndWidget;

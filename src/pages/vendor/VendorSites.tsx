import VendorHeader from "@/components/vendor/VendorHeader";
import { useVendor } from "@/contexts/VendorContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe, Plus, ExternalLink, Copy, Trash2, CheckCircle, AlertTriangle,
  RotateCcw, DollarSign, Receipt, Tag, Layers, Shield
} from "lucide-react";
import { useState, useEffect } from "react";
import WidgetInstallGuide from "@/components/vendor/WidgetInstallGuide";
import WidgetPreviewMockup from "@/components/vendor/WidgetPreviewMockup";
import WidgetIndustryConfig from "@/components/vendor/WidgetIndustryConfig";
import { dynTLId } from "@/lib/tlIdRegistry";
import { ALL_INDUSTRIES } from "@/lib/industryList";

const PLATFORM_OPTIONS = [
  "Shopify", "WooCommerce", "WordPress", "Wix", "Squarespace",
  "BigCommerce", "Magento", "PrestaShop", "OpenCart", "Jumia Seller",
  "Konga Seller", "Flutterwave Store", "Paystack Storefront", "Custom Website",
  "Portfolio / Blog", "Social Media Page", "Landing Page", "Service Website",
];

// Platforms that inherently don't have checkout pages
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
import { useVendorSites, useAddSite, useDeleteSite } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import {
  getWidgetFeeState,
  processWidgetTransition,
  calculateWidgetTransitionFee,
  WIDGET_INSTALL_FEE,
  type WidgetFeeState,
  type WidgetState,
} from "@/lib/widgetFeeLogic";
import { isVendorInTrial } from "@/hooks/useVendorBilling";

const VendorSites = () => {
  const { vendor } = useVendor();
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

  // Persist per-site widget fee states
  useEffect(() => {
    localStorage.setItem("tl_site_widget_fee_states", JSON.stringify(widgetStates));
  }, [widgetStates]);

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

  // Track per-site widget enabled state
  const [siteWidgetStates, setSiteWidgetStates] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem("tl_site_widget_states");
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem("tl_site_widget_states", JSON.stringify(siteWidgetStates));
  }, [siteWidgetStates]);

  // Auto-detect no-checkout platforms
  useEffect(() => {
    if (NO_CHECKOUT_PLATFORMS.includes(sitePlatform)) {
      setHasCheckout(false);
    }
  }, [sitePlatform]);

  const handleAddSite = async () => {
    if (!siteName) return;
    if (!siteIndustry) {
      toast.error("Please select an industry for your site.");
      return;
    }
    await addSite.mutateAsync({ name: siteName, platform: sitePlatform, url: siteUrl, industry: siteIndustry || undefined });
    setSiteName(""); setSitePlatform(""); setSiteUrl(""); setSiteIndustry(""); setHasCheckout(true);
    setShowAdd(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    await deleteSite.mutateAsync(siteId);
    const siteState = getSiteWidgetState(siteId);
    const { fee } = calculateWidgetTransitionFee(siteState.widgetState, "delete");
    setWidgetStates(prev => {
      const next = { ...prev };
      delete next[siteId];
      return next;
    });
    setSiteWidgetStates(prev => {
      const next = { ...prev };
      delete next[siteId];
      return next;
    });
    if (fee > 0) {
      toast.info(`Widget removal noted. Restoration will incur a $${WIDGET_INSTALL_FEE} fee.`);
    }
  };

  const handleFirstInstall = (siteId: string) => {
    const ws = getSiteWidgetState(siteId);
    const vendorInTrial = isVendorInTrial();

    if (vendorInTrial) {
      // Trial mode: skip fees, install immediately
      const updated: WidgetFeeState = {
        widgetState: "installed" as WidgetState,
        installFeePaid: true, // Treated as paid during trial
        pendingRestorationFee: false,
        totalInstallFeesCharged: 0,
      };
      setWidgetStates(prev => ({ ...prev, [siteId]: updated }));
      setSiteWidgetStates(prev => ({ ...prev, [siteId]: true }));
      toast.success("Widget installed free during trial! 🎉");
      return;
    }

    if (ws.widgetState === "never_installed") {
      setActiveSiteId(siteId);
      setPendingInvoiceAction("install");
      setShowInvoice(true);
    } else if (ws.widgetState === "deleted") {
      setActiveSiteId(siteId);
      setPendingInvoiceAction("restore");
      setShowInvoice(true);
    } else {
      setSiteWidgetStates(prev => ({ ...prev, [siteId]: true }));
      toast.success("Widget enabled on this site.");
    }
  };

  const handleConfirmInvoice = () => {
    if (!activeSiteId) return;
    const action = pendingInvoiceAction || "install";
    const siteState = getSiteWidgetState(activeSiteId);
    const { fee, newState, chargeMode } = calculateWidgetTransitionFee(siteState.widgetState, action);
    const updated: WidgetFeeState = {
      widgetState: newState,
      installFeePaid: siteState.installFeePaid || (action === "install" && fee > 0),
      pendingRestorationFee: chargeMode === "next_cycle",
      totalInstallFeesCharged: siteState.totalInstallFeesCharged + (fee > 0 ? fee : 0),
    };
    setWidgetStates(prev => ({ ...prev, [activeSiteId]: updated }));
    setSiteWidgetStates(prev => ({ ...prev, [activeSiteId]: true }));
    setShowInvoice(false);
    setPendingInvoiceAction(null);
    setActiveSiteId(null);

    if (chargeMode === "immediate") {
      toast.success(`Widget installed! $${fee.toFixed(2)} one-time installation fee will be charged with your first plan payment.`);
    } else if (chargeMode === "next_cycle") {
      toast.success(`Widget restored! $${fee.toFixed(2)} restoration fee will be charged on your next billing cycle.`);
    }
  };

  const handleToggleWidget = (siteId: string, enabled: boolean) => {
    if (enabled) {
      const ws = getSiteWidgetState(siteId);
      if (ws.widgetState === "never_installed" || ws.widgetState === "deleted") {
        handleFirstInstall(siteId);
        return;
      }
      // Re-enable from disabled
      setWidgetStates(prev => ({ ...prev, [siteId]: { ...ws, widgetState: "installed" as WidgetState } }));
    } else {
      const ws = getSiteWidgetState(siteId);
      setWidgetStates(prev => ({ ...prev, [siteId]: { ...ws, widgetState: "disabled" as WidgetState } }));
    }
    setSiteWidgetStates(prev => ({ ...prev, [siteId]: enabled }));
    toast.success(enabled ? "Widget enabled" : "Widget disabled — no fee charged.");
  };

  const handleRestoreWidget = (siteId: string) => {
    setActiveSiteId(siteId);
    setPendingInvoiceAction("restore");
    setShowInvoice(true);
  };

  return (
    <div>
      <VendorHeader title="My Sites" />
      <div className="p-6 space-y-6">
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">TrustLock Pay Widget — {pendingInvoiceAction === "restore" ? "Restoration" : "Installation"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee Type</span>
                  <span>{pendingInvoiceAction === "restore" ? "Restoration (one-time)" : "Installation (one-time)"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-foreground">${WIDGET_INSTALL_FEE.toFixed(2)}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Charge Method</span>
                    <span className="text-xs">
                      {pendingInvoiceAction === "restore"
                        ? "Added to your next billing cycle (monthly/yearly)"
                        : "Charged with your first plan payment"}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    <strong>Note:</strong> Disabling and re-enabling the widget will never incur additional fees.
                    This fee only applies on first installation or after a full widget deletion and restoration.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-2" onClick={handleConfirmInvoice}>
                  <DollarSign className="w-3 h-3" /> Accept & {pendingInvoiceAction === "restore" ? "Restore" : "Install"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowInvoice(false); setPendingInvoiceAction(null); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widget Fee Status */}
        {anyInstallFeePaid && (
          <Card className="border-primary/20">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">Widget installation fees active.</strong> Disabling and re-enabling any widget is free.
                {anyPendingRestoration && (
                  <Badge variant="outline" className="ml-2 text-[9px] border-accent/30 text-accent">
                    $5 restoration fee pending on next cycle
                  </Badge>
                )}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Website URL</Label>
                  <Input placeholder="e.g., mystore.myshopify.com" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Industry / Category</Label>
                  <Select value={siteIndustry} onValueChange={setSiteIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUSTLOCK_INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.key} value={ind.key}>
                          {ind.icon} {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-[10px] text-muted-foreground">This determines your escrow milestone template, document gates, and compliance requirements</p>
                </div>

                {/* Industry-specific widget pre-configuration */}
                {siteIndustry && siteIndustry !== "other" && (
                  <div className="sm:col-span-2">
                    <WidgetIndustryConfig
                      industry={siteIndustry}
                      onConfigSave={(config) => {
                        localStorage.setItem(`tl_site_industry_config_${siteIndustry}`, JSON.stringify(config));
                      }}
                    />
                  </div>
                )}

                {siteIndustry === "other" && (
                  <div className="sm:col-span-2 p-3 bg-muted/20 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong>Custom Industry:</strong> Your widget will use the default escrow workflow. You can manually configure pricing, documents, and compliance fields from your dashboard after setup.
                    </p>
                  </div>
                )}

                {/* Checkout toggle */}
                <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                  <Switch checked={hasCheckout} onCheckedChange={setHasCheckout} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">
                      {hasCheckout ? "My site has a checkout page" : "My site does NOT have a checkout page"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {hasCheckout
                        ? "The TrustLock widget will be installed on your checkout page"
                        : "You will use Standalone Payment Links to collect escrow-protected payments"}
                    </p>
                  </div>
                  {!hasCheckout && (
                    <Badge variant="secondary" className="text-[9px] shrink-0">Standalone Links</Badge>
                  )}
                </div>

                {/* No-checkout guidance */}
                {!hasCheckout && (
                  <div className="sm:col-span-2 flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground mb-1">How it works without a checkout page</p>
                      <ol className="list-decimal ml-4 space-y-1">
                        <li>Add your site so TrustLock knows your business</li>
                        <li>Go to <strong>Standalone Links</strong> to create payment links for your products or services</li>
                        <li>Share links with buyers via WhatsApp, email, SMS, or social media</li>
                        <li>Buyers complete the full TrustLock escrow checkout through the link</li>
                      </ol>
                      <p className="mt-2 italic">No coding or website changes required!</p>
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
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isNoCheckoutPlatform ? "bg-accent/15" : isWidgetEnabled ? "bg-primary/15" : "bg-muted/20"
                    }`}>
                      {isNoCheckoutPlatform
                        ? <ExternalLink className="w-6 h-6 text-accent" />
                        : isWidgetEnabled
                          ? <Shield className="w-6 h-6 text-primary" />
                          : <Globe className="w-6 h-6 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold">{site.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">{site.platform}</Badge>
                        {site.industry && (
                          <Badge variant="outline" className="text-[10px]">
                            {INDUSTRY_ICONS[site.industry] || "📦"} {TRUSTLOCK_INDUSTRIES.find(i => i.key === site.industry)?.label || site.industry}
                          </Badge>
                        )}
                        {isNoCheckoutPlatform ? (
                          <Badge className="bg-accent/15 text-accent text-[10px]">Standalone Links</Badge>
                        ) : (
                          <Badge className="bg-primary/15 text-primary text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" /> Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <span><ExternalLink className="w-3 h-3 inline mr-1" />{site.url}</span>
                      </p>

                      {/* No-checkout platform: Standalone Links guidance */}
                      {isNoCheckoutPlatform ? (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                              <p className="font-semibold text-foreground mb-1">This site uses Standalone Payment Links</p>
                              <p>Since {site.platform} does not support custom checkout widgets, you collect payments by sharing TrustLock payment links with your buyers. Links can be sent via WhatsApp, email, SMS, or posted on social media.</p>
                            </div>
                          </div>
                          <Button size="sm" variant="default" className="gap-1.5 text-xs" asChild>
                            <a href="/trustlock/vendor/standalone-links">
                              <ExternalLink className="w-3 h-3" /> Create Standalone Payment Link
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Widget Toggle */}
                          <div className="mt-3 flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                            <Switch
                                checked={isWidgetEnabled}
                                onCheckedChange={(checked) => handleToggleWidget(site.id, checked)}
                              />
                            <div>
                              <p className="text-xs font-semibold">{isWidgetEnabled ? "Widget Enabled" : "Widget Disabled"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {isWidgetEnabled
                                  ? "TrustLock Pay widget is active on this storefront"
                                  : "Toggle to enable the TrustLock Pay widget"}
                              </p>
                            </div>
                            {isDeleted && (
                              <Button variant="outline" size="sm" className="ml-auto text-xs gap-1" onClick={() => handleRestoreWidget(site.id)}>
                                <RotateCcw className="w-3 h-3" /> Restore Widget ($5)
                              </Button>
                            )}
                          </div>

                          {/* Guided Installation — gated behind payment confirmation */}
                          {isWidgetEnabled && (
                            <>
                              {siteWS.installFeePaid && !siteWS.pendingRestorationFee ? (
                                <>
                                  <WidgetInstallGuide
                                    platform={site.platform || "Custom Website"}
                                    siteId={site.id}
                                    vendorSlug={vendor.name.toLowerCase().replace(/\s/g, '-')}
                                  />
                                  <div className="mt-4">
                                    <WidgetPreviewMockup />
                                  </div>
                                </>
                              ) : (
                                <div className="mt-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                    <div className="text-xs text-muted-foreground">
                                      <p className="font-semibold text-foreground mb-1">Widget embed code locked</p>
                                      <p>Your $5.00 installation fee must be paid before you can access the embed code and install guide. Go to <strong>Bill Payments</strong> to complete payment.</p>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-2 text-xs gap-1"
                                        onClick={() => window.location.href = "/trustlock/vendor/bill-payments"}
                                      >
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
                    <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDeleteSite(site.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Industries Served by TrustLock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Industries Served by TrustLock
            </CardTitle>
            <CardDescription>TrustLock provides escrow-backed checkout workflows tailored to these industries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {TRUSTLOCK_INDUSTRIES.map((ind) => (
                <div
                  key={ind.key}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-lg">{ind.icon}</span>
                  <span className="text-xs font-medium">{ind.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorSites;

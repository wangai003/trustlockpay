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
  RotateCcw, DollarSign, Receipt, Tag, Layers
} from "lucide-react";
import { useState, useEffect } from "react";
import WidgetInstallGuide from "@/components/vendor/WidgetInstallGuide";

const PLATFORM_OPTIONS = [
  "Shopify", "WooCommerce", "WordPress", "Wix", "Squarespace",
  "BigCommerce", "Magento", "PrestaShop", "OpenCart", "Jumia Seller",
  "Konga Seller", "Flutterwave Store", "Paystack Storefront", "Custom Website",
];

const TRUSTLOCK_INDUSTRIES = [
  { key: "construction", label: "Construction", icon: "🏗️" },
  { key: "real_estate", label: "Real Estate", icon: "🏘️" },
  { key: "agriculture", label: "Agriculture", icon: "🌾" },
  { key: "mining", label: "Mining & Export", icon: "⛏️" },
  { key: "tourism", label: "Tourism & Hospitality", icon: "✈️" },
  { key: "retail", label: "Retail & E-Commerce", icon: "🛒" },
  { key: "freelance", label: "Freelance & Consulting", icon: "💼" },
  { key: "logistics", label: "Logistics & Shipping", icon: "🚚" },
  { key: "education", label: "Education & Training", icon: "🎓" },
  { key: "project_management", label: "Project Management", icon: "📋" },
];
import { useVendorSites, useAddSite, useDeleteSite } from "@/hooks/useSupabaseData";
import { toast } from "sonner";
import {
  getWidgetFeeState,
  processWidgetTransition,
  WIDGET_INSTALL_FEE,
  type WidgetFeeState,
  type WidgetState,
} from "@/lib/widgetFeeLogic";

const VendorSites = () => {
  const { vendor } = useVendor();
  const [showAdd, setShowAdd] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [sitePlatform, setSitePlatform] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteIndustry, setSiteIndustry] = useState("");
  const [widgetState, setWidgetState] = useState<WidgetFeeState>(getWidgetFeeState);
  const [showInvoice, setShowInvoice] = useState(false);
  const [pendingInvoiceAction, setPendingInvoiceAction] = useState<"install" | "restore" | null>(null);

  const { data: dbSites = [] } = useVendorSites();
  const addSite = useAddSite();
  const deleteSite = useDeleteSite();

  const allSites = dbSites.length > 0
    ? dbSites.map(s => ({ id: s.id, name: s.name, platform: s.platform || "Custom", url: s.url || "" }))
    : vendor.sites;

  // Track per-site widget enabled state
  const [siteWidgetStates, setSiteWidgetStates] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem("tl_site_widget_states");
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem("tl_site_widget_states", JSON.stringify(siteWidgetStates));
  }, [siteWidgetStates]);

  const handleAddSite = async () => {
    if (!siteName) return;
    await addSite.mutateAsync({ name: siteName, platform: sitePlatform, url: siteUrl });
    setSiteName(""); setSitePlatform(""); setSiteUrl("");
    setShowAdd(false);
  };

  const handleDeleteSite = async (siteId: string) => {
    await deleteSite.mutateAsync(siteId);
    // Mark widget as deleted for this site
    const { fee, chargeMode, state } = processWidgetTransition("delete");
    setWidgetState(state);
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
    const ws = getWidgetFeeState();
    if (ws.widgetState === "never_installed") {
      setPendingInvoiceAction("install");
      setShowInvoice(true);
    } else if (ws.widgetState === "deleted") {
      setPendingInvoiceAction("restore");
      setShowInvoice(true);
    } else {
      // Already installed/disabled — just enable
      setSiteWidgetStates(prev => ({ ...prev, [siteId]: true }));
      toast.success("Widget enabled on this site.");
    }
  };

  const handleConfirmInvoice = () => {
    const action = pendingInvoiceAction || "install";
    const { fee, chargeMode, state } = processWidgetTransition(action);
    setWidgetState(state);
    setShowInvoice(false);
    setPendingInvoiceAction(null);

    if (chargeMode === "immediate") {
      toast.success(`Widget installed! $${fee.toFixed(2)} one-time installation fee will be charged with your first plan payment.`);
    } else if (chargeMode === "next_cycle") {
      toast.success(`Widget restored! $${fee.toFixed(2)} restoration fee will be charged on your next billing cycle.`);
    }
  };

  const handleToggleWidget = (siteId: string, enabled: boolean) => {
    if (enabled) {
      const ws = getWidgetFeeState();
      if (ws.widgetState === "never_installed" || ws.widgetState === "deleted") {
        handleFirstInstall(siteId);
        return;
      }
      processWidgetTransition("enable");
    } else {
      processWidgetTransition("disable");
    }
    setSiteWidgetStates(prev => ({ ...prev, [siteId]: enabled }));
    setWidgetState(getWidgetFeeState());
    toast.success(enabled ? "Widget enabled" : "Widget disabled — no fee charged.");
  };

  const handleRestoreWidget = (siteId: string) => {
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
        {widgetState.installFeePaid && (
          <Card className="border-primary/20">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-primary shrink-0" />
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">Installation fee paid.</strong> Disabling and re-enabling the widget on any site is free.
                {widgetState.pendingRestorationFee && (
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
          {allSites.map((site) => {
            const isWidgetEnabled = siteWidgetStates[site.id] ?? false;
            const isDeleted = widgetState.widgetState === "deleted";
            return (
              <Card key={site.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-bold">{site.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">{site.platform}</Badge>
                        <Badge className="bg-primary/15 text-primary text-[10px]"><CheckCircle className="w-3 h-3 mr-0.5" /> Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> {site.url}
                      </p>

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

                      {/* Guided Installation */}
                      {isWidgetEnabled && (
                        <WidgetInstallGuide
                          platform={site.platform || "Custom Website"}
                          siteId={site.id}
                          vendorSlug={vendor.name.toLowerCase().replace(/\s/g, '-')}
                        />
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

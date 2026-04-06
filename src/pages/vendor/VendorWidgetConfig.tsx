import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Settings2, Globe, Palette, ShieldCheck, Webhook, CreditCard,
  Store, Users, Package, AlertTriangle, Copy, Eye, EyeOff, Loader2
} from "lucide-react";
import { ALL_INDUSTRIES } from "@/lib/industryList";

const PAYMENT_METHODS = [
  { id: "card", label: "Card (Visa/Mastercard)", region: "international" },
  { id: "bank_transfer", label: "Bank Transfer", region: "both" },
  { id: "mobile_money", label: "Mobile Money", region: "africa" },
  { id: "crypto", label: "Crypto (USDC/USDT)", region: "both" },
  { id: "apple_pay", label: "Apple Pay", region: "international" },
  { id: "google_pay", label: "Google Pay", region: "international" },
];

const VendorWidgetConfig = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [config, setConfig] = useState({
    multi_vendor_enabled: false,
    platform_commission_percent: 0,
    product_api_url: "",
    webhook_url: "",
    webhook_secret: "",
    white_label_enabled: false,
    brand_primary_color: "#1a56db",
    brand_logo_url: "",
    brand_name: "",
    default_industry_override: "",
    auto_kyc_passthrough: false,
    sandbox_mode: true,
    allowed_payment_methods: ["card", "bank_transfer", "mobile_money", "crypto"],
    max_order_amount: "",
    min_order_amount: "1.00",
    auto_refund_window_hours: 72,
    custom_checkout_message: "",
    require_buyer_account: false,
    enable_bulk_onboarding: false,
  });

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("platform_widget_configs")
      .select("*")
      .eq("vendor_id", user.id)
      .maybeSingle()
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
        setLoading(false);
      });
  }, [user?.id]);

  const handleSave = async () => {
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

    const { error } = await supabase
      .from("platform_widget_configs")
      .upsert(payload, { onConflict: "vendor_id" });

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Widget configuration updated successfully." });
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Widget Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Configure your TrustLock Pay widget for your platform. Business accounts get access to advanced multi-vendor and API features.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={config.sandbox_mode ? "secondary" : "default"} className="text-xs">
          {config.sandbox_mode ? "🟡 Sandbox" : "🟢 Live"}
        </Badge>
        <div className="flex items-center gap-2">
          <Label htmlFor="sandbox-toggle" className="text-sm">Sandbox Mode</Label>
          <Switch
            id="sandbox-toggle"
            checked={config.sandbox_mode}
            onCheckedChange={(v) => setConfig(prev => ({ ...prev, sandbox_mode: v }))}
          />
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

        {/* ─── Marketplace Tab ─── */}
        <TabsContent value="marketplace" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="w-4 h-4" /> Multi-Vendor Cart Routing
              </CardTitle>
              <CardDescription>
                Enable this if your platform hosts multiple vendors (like Amazon, Jumia, Jiji). A single checkout will be split into separate escrow transactions per vendor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Multi-Vendor Mode</Label>
                <Switch
                  checked={config.multi_vendor_enabled}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, multi_vendor_enabled: v }))}
                />
              </div>

              {config.multi_vendor_enabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Platform Commission (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        step={0.1}
                        value={config.platform_commission_percent}
                        onChange={(e) => setConfig(prev => ({ ...prev, platform_commission_percent: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g. 5.0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your marketplace commission layered on top of TrustLock's 1.5% fee. Shown as a separate line item at checkout.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Product API Endpoint</Label>
                      <Input
                        value={config.product_api_url}
                        onChange={(e) => setConfig(prev => ({ ...prev, product_api_url: e.target.value }))}
                        placeholder="https://api.yourplatform.com/products"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL where the widget fetches dynamic product pricing and vendor mappings. Leave empty to use static widget amounts.
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Bulk Vendor Onboarding</Label>
                        <p className="text-xs text-muted-foreground">Allow CSV/API batch registration of sub-vendors</p>
                      </div>
                      <Switch
                        checked={config.enable_bulk_onboarding}
                        onCheckedChange={(v) => setConfig(prev => ({ ...prev, enable_bulk_onboarding: v }))}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-4 h-4" /> Default Industry Template
              </CardTitle>
              <CardDescription>
                Force all transactions through a specific industry workflow, or let each vendor/product choose their own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={config.default_industry_override || "none"}
                onValueChange={(v) => setConfig(prev => ({ ...prev, default_industry_override: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Let vendors choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Let vendors choose (no override)</SelectItem>
                  {INDUSTRY_LIST.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Payments Tab ─── */}
        <TabsContent value="payments" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Allowed Payment Methods
              </CardTitle>
              <CardDescription>
                Select which payment methods appear in the widget checkout. Unchecked methods will be hidden from buyers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PAYMENT_METHODS.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={config.allowed_payment_methods.includes(pm.id)}
                      onCheckedChange={() => togglePaymentMethod(pm.id)}
                    />
                    <div>
                      <span className="text-sm font-medium">{pm.label}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{pm.region}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transaction Limits</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Order ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={config.min_order_amount}
                  onChange={(e) => setConfig(prev => ({ ...prev, min_order_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Order ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={config.max_order_amount}
                  onChange={(e) => setConfig(prev => ({ ...prev, max_order_amount: e.target.value }))}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Auto-Refund Window (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={config.auto_refund_window_hours}
                  onChange={(e) => setConfig(prev => ({ ...prev, auto_refund_window_hours: parseInt(e.target.value) || 72 }))}
                />
                <p className="text-xs text-muted-foreground">
                  If a vendor doesn't claim/acknowledge an order within this window, the buyer receives an automatic refund.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-4 h-4" /> Buyer Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require TrustLock Account</Label>
                  <p className="text-xs text-muted-foreground">Buyers must sign in or create an account before checkout</p>
                </div>
                <Switch
                  checked={config.require_buyer_account}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, require_buyer_account: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Checkout Message</Label>
                <Textarea
                  value={config.custom_checkout_message}
                  onChange={(e) => setConfig(prev => ({ ...prev, custom_checkout_message: e.target.value }))}
                  placeholder="e.g. 'All purchases on our platform are protected by TrustLock Escrow.'"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Branding Tab ─── */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-4 h-4" /> White-Label Branding
              </CardTitle>
              <CardDescription>
                Customize the widget appearance to match your platform's identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable White-Label Mode</Label>
                <Switch
                  checked={config.white_label_enabled}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, white_label_enabled: v }))}
                />
              </div>

              {config.white_label_enabled && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input
                        value={config.brand_name}
                        onChange={(e) => setConfig(prev => ({ ...prev, brand_name: e.target.value }))}
                        placeholder="Your Platform Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config.brand_primary_color}
                          onChange={(e) => setConfig(prev => ({ ...prev, brand_primary_color: e.target.value }))}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={config.brand_primary_color}
                          onChange={(e) => setConfig(prev => ({ ...prev, brand_primary_color: e.target.value }))}
                          className="w-32"
                        />
                        <div
                          className="h-10 flex-1 rounded border flex items-center justify-center text-white text-sm font-medium"
                          style={{ background: config.brand_primary_color }}
                        >
                          Preview
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input
                        value={config.brand_logo_url}
                        onChange={(e) => setConfig(prev => ({ ...prev, brand_logo_url: e.target.value }))}
                        placeholder="https://yourplatform.com/logo.png"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Integration Tab ─── */}
        <TabsContent value="integration" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="w-4 h-4" /> Webhook Configuration
              </CardTitle>
              <CardDescription>
                Receive real-time notifications when escrow events occur (locked, released, disputed, refunded).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  value={config.webhook_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://api.yourplatform.com/webhooks/trustlock"
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSecret ? "text" : "password"}
                      value={config.webhook_secret}
                      onChange={(e) => setConfig(prev => ({ ...prev, webhook_secret: e.target.value }))}
                      placeholder="whsec_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={generateWebhookSecret}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to verify webhook payloads via HMAC-SHA256. Keep this secret safe.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-4 h-4" /> Widget Embed Code
              </CardTitle>
            </CardHeader>
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
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `<script src="https://dbajucxswcgxllmwxnia.supabase.co/functions/v1/widget-embed" data-site-id="YOUR_SITE_ID" data-vendor-id="${user?.id}" data-mode="${config.sandbox_mode ? "sandbox" : "live"}"></script>`
                  );
                  toast({ title: "Copied!", description: "Embed code copied to clipboard." });
                }}
              >
                <Copy className="w-3 h-3 mr-1" /> Copy Embed Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Compliance Tab ─── */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> KYC Passthrough
              </CardTitle>
              <CardDescription>
                If your platform already performs KYC/KYB on your vendors, enable this to skip redundant verification on TrustLock.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Auto KYC Passthrough</Label>
                <Switch
                  checked={config.auto_kyc_passthrough}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, auto_kyc_passthrough: v }))}
                />
              </div>
              {config.auto_kyc_passthrough && (
                <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    Enabling this means TrustLock trusts your platform's KYC process. You are responsible for maintaining compliance with applicable AML/CTF regulations. TrustLock reserves the right to request additional verification for high-value transactions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => window.location.reload()}>Reset</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
};

export default VendorWidgetConfig;

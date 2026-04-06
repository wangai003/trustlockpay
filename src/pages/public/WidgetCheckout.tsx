import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, CheckCircle, Loader2, Package, AlertTriangle, Building2, User, FileText, CreditCard, Copy, Clock, ArrowRight, Handshake, Globe, MapPin, Phone, Wallet, Coins } from "lucide-react";
import InternationalBankSelector from "@/components/shared/InternationalBankSelector";
import { type InternationalRegion, getProcessorForRegion } from "@/lib/internationalBankData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import IndustryBlueprintCard, { INDUSTRY_MILESTONES } from "@/components/shared/IndustryBlueprintCard";
import MilestonePaymentSchedule, { type ScheduleItem, type CounterProposalContact } from "@/components/shared/MilestonePaymentSchedule";
import { isRFQEligible, getRFQTerms } from "@/lib/rfqIndustryConfig";
import { isMilestoneIndustryByKey } from "@/lib/industryList";
import RFQForm from "@/components/shared/RFQForm";
import ReturningBuyerBanner from "@/components/shared/ReturningBuyerBanner";
import TradeScopeSelector, { type TradeScope } from "@/components/shared/TradeScopeSelector";
import { selectProcessor, PROCESSORS, type PaymentMethod as FeePaymentMethod } from "@/lib/feeEngine";

interface VendorInfo {
  name: string;
  industry: string;
  currency: string;
}

const WidgetCheckout = () => {
  const [params] = useSearchParams();
  const vendorId = params.get("vendor") || "";
  const siteId = params.get("site") || "";
  const mode = params.get("mode") || "sandbox";
  const isEmbed = params.get("embed") === "true";
  const isSandbox = mode === "sandbox";

  const [step, setStep] = useState<"loading" | "form" | "processing" | "done" | "error" | "rfq" | "rfq_done" | "vendor_locked" | "counter_submitted">("loading");
  const [vendor, setVendor] = useState<VendorInfo>({ name: "Demo Vendor", industry: "general", currency: "USD" });
  const [checkoutMode, setCheckoutMode] = useState<"direct" | "rfq">("direct");
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    item: params.get("product_name") || "Sample Product",
    amount: params.get("product_price") || "25.00",
    buyerEntityType: "individual" as "individual" | "company" | "sole_proprietor",
    buyerCompanyName: "",
    buyerCountry: "US",
    paymentMethod: "card" as string,
  });
  const [payMode, setPayMode] = useState<"africa" | "international">("international");
  const [confirmationCode, setConfirmationCode] = useState("");
  const rfqEligible = isRFQEligible(vendor.industry);
  const rfqTerms = getRFQTerms(vendor.industry);
  const [scheduleAccepted, setScheduleAccepted] = useState(false);
  const [agreedSchedule, setAgreedSchedule] = useState<ScheduleItem[] | null>(null);
  const [intlBankSelected, setIntlBankSelected] = useState<string | null>(null);
  const [intlBankRegion, setIntlBankRegion] = useState<InternationalRegion | null>(null);

  // Resolve milestone templates for this industry
  const isMilestoneIndustry = isMilestoneIndustryByKey(vendor.industry);
  const milestoneSchedule = useMemo(() => {
    if (!isMilestoneIndustry) return [];
    const key = vendor.industry.replace(/_/g, "-");
    const templates = INDUSTRY_MILESTONES[key] || INDUSTRY_MILESTONES[vendor.industry] || [];
    // Check for vendor-preset percentages in localStorage
    try {
      const raw = localStorage.getItem(`tl_widget_config_${vendor.industry}`);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.milestonePercentages) {
          return templates.map((t, i) => ({
            name: t.name,
            percentage: cfg.milestonePercentages[i] ?? t.percentage,
            description: t.description,
          }));
        }
      }
    } catch {}
    return templates.map(t => ({ name: t.name, percentage: t.percentage, description: t.description }));
  }, [vendor.industry, isMilestoneIndustry]);

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  const loadVendor = async () => {
    if (!vendorId) {
      setStep("form");
      return;
    }

    try {
      // Try to load vendor info from vendor_settings
      const { data } = await supabase
        .from("vendor_settings")
        .select("industry_category, supported_currencies, vendor_id")
        .eq("vendor_id", vendorId)
        .maybeSingle();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", vendorId)
          .maybeSingle();

        setVendor({
          name: profile?.full_name || "Vendor",
          industry: data.industry_category || "general",
          currency: (data.supported_currencies as string[] | null)?.[0] || "USD",
        });

        // Check vendor billing status (live mode only)
        if (!isSandbox) {
          const { data: sub } = await supabase
            .from("vendor_subscriptions")
            .select("status, grace_ends_at")
            .eq("vendor_id", vendorId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sub && (sub.status === "expired" || sub.status === "locked")) {
            const graceEnd = sub.grace_ends_at ? new Date(sub.grace_ends_at) : null;
            if (!graceEnd || new Date() > graceEnd) {
              setStep("vendor_locked");
              return;
            }
          }
        }
      }
    } catch {
      // Use defaults
    }
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyerName.trim() || !form.buyerEmail.trim() || !form.amount) return;

    setStep("processing");

    if (isSandbox) {
      // Simulate processing delay
      await new Promise((r) => setTimeout(r, 2000));
      const code = `TL-DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setConfirmationCode(code);
      setStep("done");

      // Notify parent iframe
      if (isEmbed && window.parent !== window) {
        window.parent.postMessage({
          type: "tl:payment_complete",
          payload: {
            confirmationCode: code,
            amount: parseFloat(form.amount),
            buyer: form.buyerName,
            vendor: vendor.name,
            mode: "sandbox",
          },
        }, "*");
      }
      return;
    }

    // Live mode — call checkout-widget edge function
    try {
      const amount = parseFloat(form.amount);
      const { data, error } = await supabase.functions.invoke("checkout-widget", {
        body: {
          action: "create_session",
          vendorId,
          amount,
          item: form.item,
          buyerEmail: form.buyerEmail,
          buyerName: form.buyerName,
          buyerLocation: form.buyerCountry,
          paymentMethod: form.paymentMethod,
          industry: vendor.industry,
          orderType: "simple",
          buyerEntityType: form.buyerEntityType,
          buyerCompanyName: form.buyerEntityType !== "individual" ? form.buyerCompanyName : null,
          ...(intlBankSelected && intlBankRegion ? {
            bankTransferDetails: {
              bankName: intlBankSelected,
              region: intlBankRegion,
              processor: getProcessorForRegion(intlBankRegion),
            },
          } : {}),
          ...(isExternalPlatform ? {
            marketplaceMetadata: {
              platform: platformName,
              product_id: productId,
              vendor_ref: vendorRef,
              category: productCategory,
            },
          } : {}),
        },
      });

      if (error || !data?.sessionId) {
        setStep("error");
        return;
      }

      // In live mode, this would redirect to the payment processor
      // For now, show confirmation
      setConfirmationCode(data.sessionId);
      setStep("done");
    } catch {
      setStep("error");
    }
  };

  const baseAmount = parseFloat(form.amount || "0");
  const isCryptoPayment = form.paymentMethod === "usdc" || form.paymentMethod === "usdt";
  const feeMethod: FeePaymentMethod = isCryptoPayment ? "crypto"
    : form.paymentMethod === "mobile_money" ? "mobile_money"
    : form.paymentMethod === "bank_transfer" ? "bank_transfer"
    : "card";
  const selectedProcessorId = selectProcessor(form.buyerCountry, isCryptoPayment, undefined, feeMethod);
  const selectedProcessor = PROCESSORS[selectedProcessorId];

  const platformFeeAmount = Math.round(baseAmount * 0.005 * 100) / 100;
  const processorFeeAmount = isCryptoPayment ? 0 : Math.round(baseAmount * (selectedProcessor.feeRate / 100) * 100) / 100;

  // Platform/marketplace commission fee
  const externalPlatformFeePercent = parseFloat(params.get("platform_fee") || "0");
  const externalPlatformFeeAmount = externalPlatformFeePercent > 0 ? Math.round(baseAmount * (externalPlatformFeePercent / 100) * 100) / 100 : 0;

  const feeAmount = Math.round((platformFeeAmount + processorFeeAmount + externalPlatformFeeAmount) * 100) / 100;
  const totalAmount = Math.round((baseAmount + feeAmount) * 100) / 100;

  // Read multi-vendor platform params
  const productId = params.get("product_id") || "";
  const vendorRef = params.get("vendor_ref") || "";
  const productCategory = params.get("category") || "";
  const isExternalPlatform = !!params.get("platform") || !!params.get("platform_name");
  const platformName = params.get("platform") || params.get("platform_name") || "";

  const closeWidget = () => {
    if (isEmbed && window.parent !== window) {
      window.parent.postMessage({ type: "tl:close" }, "*");
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isEmbed ? "p-3" : "p-4 flex items-center justify-center"}`}>
      <div className={`w-full ${isEmbed ? "" : "max-w-md mx-auto"}`}>
        {/* Sandbox banner */}
        {isSandbox && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              <strong>Sandbox Mode</strong> — No real money is charged. This is a test transaction.
            </p>
          </div>
        )}

        {/* Returning buyer sign-in prompt */}
        <ReturningBuyerBanner />

        {/* External platform integration banner */}
        {isExternalPlatform && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Order from <strong className="text-foreground">{platformName}</strong>
              {productId && <> · Product #{productId}</>}
              {vendorRef && <> · Vendor: {vendorRef}</>}
            </p>
          </div>
        )}

        {step === "form" && (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-4">
              {/* Vendor header */}
              <div className="text-center space-y-1">
                <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold">{vendor.name}</p>
                <div className="flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Escrow-protected payment</span>
                </div>
              </div>

              {/* Industry Blueprint — shows buyer what security protocols apply */}
              <IndustryBlueprintCard industry={vendor.industry} />

              {/* Milestone Payment Schedule — pre-escrow negotiation for milestone industries */}
              {isMilestoneIndustry && milestoneSchedule.length > 0 && parseFloat(form.amount || "0") > 0 && (
                <MilestonePaymentSchedule
                  industry={vendor.industry}
                  orderAmount={parseFloat(form.amount || "0")}
                  defaultSchedule={milestoneSchedule}
                  vendorName={vendor.name}
                  readOnly={scheduleAccepted}
                  onAccept={(schedule) => {
                    setAgreedSchedule(schedule);
                    setScheduleAccepted(true);
                    toast.success("Payment schedule accepted — proceed to payment");
                  }}
                  onCounterPropose={async (schedule, contact) => {
                    try {
                      await supabase.from("milestone_counter_proposals").insert({
                        vendor_id: vendorId,
                        site_id: siteId || null,
                        industry: vendor.industry,
                        order_item: form.item,
                        order_amount: parseFloat(form.amount || "0"),
                        buyer_full_name: contact.fullName,
                        buyer_email: contact.email,
                        buyer_phone: contact.phone || null,
                        buyer_country_code: contact.countryCode,
                        vendor_schedule: milestoneSchedule as any,
                        proposed_schedule: schedule as any,
                      } as any);
                      setStep("counter_submitted");
                      toast.success("Counter-proposal submitted!");
                    } catch {
                      toast.error("Failed to submit counter-proposal. Please try again.");
                    }
                  }}
                />
              )}

              {/* Checkout mode toggle — RFQ-eligible industries only */}
              {rfqEligible && (
                <div className="space-y-1.5">
                  <Label className="text-xs">How would you like to proceed?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("direct")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                        checkoutMode === "direct"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="font-medium">Direct Pay</span>
                      <span className="text-[10px] leading-tight">Pay now at listed price</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("rfq")}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                        checkoutMode === "rfq"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{rfqTerms.rfqLabel}</span>
                      <span className="text-[10px] leading-tight">Request custom pricing</span>
                    </button>
                  </div>
                </div>
              )}

              {/* If RFQ mode selected, show RFQ form instead of payment form */}
              {checkoutMode === "rfq" && rfqEligible ? (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Submit your requirements and the vendor will respond with a custom {rfqTerms.proformaLabel.toLowerCase()}.
                      No payment is charged at this stage.
                    </p>
                  </div>
                  <RFQForm
                    vendorId={vendorId}
                    vendorName={vendor.name}
                    industry={vendor.industry}
                    onSubmitted={() => setStep("rfq_done")}
                  />
                </div>
              ) : (

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Your Name</Label>
                  <Input
                    placeholder="Full name"
                    value={form.buyerName}
                    onChange={(e) => setForm((p) => ({ ...p, buyerName: e.target.value }))}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={form.buyerEmail}
                    onChange={(e) => setForm((p) => ({ ...p, buyerEmail: e.target.value }))}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                {/* Entity Type Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">I'm purchasing as</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "individual" as const, label: "Individual", icon: User },
                      { key: "company" as const, label: "Company", icon: Building2 },
                      { key: "sole_proprietor" as const, label: "Sole Prop.", icon: User },
                    ]).map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, buyerEntityType: opt.key }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                          form.buyerEntityType === opt.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.buyerEntityType !== "individual" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Company / Business Name</Label>
                    <Input
                      placeholder="e.g. Kente Craft Ltd"
                      value={form.buyerCompanyName}
                      onChange={(e) => setForm(p => ({ ...p, buyerCompanyName: e.target.value }))}
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Item / Service</Label>
                  <Input
                    placeholder="What are you paying for?"
                    value={form.item}
                    onChange={(e) => setForm((p) => ({ ...p, item: e.target.value }))}
                    required
                    readOnly={isExternalPlatform}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Amount ({vendor.currency})</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    required
                    readOnly={isExternalPlatform}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Buyer Country for dynamic fee calculation */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Your Country / Region</Label>
                  <Select value={form.buyerCountry} onValueChange={(v) => setForm(p => ({ ...p, buyerCountry: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">🇺🇸 United States</SelectItem>
                      <SelectItem value="UK">🇬🇧 United Kingdom</SelectItem>
                      <SelectItem value="CA">🇨🇦 Canada</SelectItem>
                      <SelectItem value="EU">🇪🇺 Europe</SelectItem>
                      <SelectItem value="Nigeria">🇳🇬 Nigeria</SelectItem>
                      <SelectItem value="Kenya">🇰🇪 Kenya</SelectItem>
                      <SelectItem value="Ghana">🇬🇭 Ghana</SelectItem>
                      <SelectItem value="South Africa">🇿🇦 South Africa</SelectItem>
                      <SelectItem value="Egypt">🇪🇬 Egypt</SelectItem>
                      <SelectItem value="Cameroon">🇨🇲 Cameroon</SelectItem>
                      <SelectItem value="Uganda">🇺🇬 Uganda</SelectItem>
                      <SelectItem value="Tanzania">🇹🇿 Tanzania</SelectItem>
                      <SelectItem value="Rwanda">🇷🇼 Rwanda</SelectItem>
                      <SelectItem value="IN">🇮🇳 India</SelectItem>
                      <SelectItem value="CN">🇨🇳 China</SelectItem>
                      <SelectItem value="JP">🇯🇵 Japan</SelectItem>
                      <SelectItem value="BR">🇧🇷 Brazil</SelectItem>
                      <SelectItem value="AU">🇦🇺 Australia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Dual-Mode Payment Toggle: Africa / International */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPayMode("africa"); setForm(p => ({ ...p, paymentMethod: "mobile_money" })); }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-colors text-xs font-medium ${payMode === "africa" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >
                    <MapPin className="w-3.5 h-3.5" /> Africa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPayMode("international"); setForm(p => ({ ...p, paymentMethod: "card" })); }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg border-2 transition-colors text-xs font-medium ${payMode === "international" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >
                    <Globe className="w-3.5 h-3.5" /> International
                  </button>
                </div>

                {/* Payment methods based on mode */}
                {payMode === "africa" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "mobile_money", label: "Mobile Money", icon: Phone, sub: "M-Pesa, MTN, Airtel" },
                      { key: "bank_transfer", label: "Bank Transfer", icon: Building2, sub: "Local bank" },
                      { key: "usdc", label: "USDC", icon: Wallet, sub: "Polygon" },
                      { key: "usdt", label: "USDT", icon: Wallet, sub: "Polygon" },
                    ].map(pm => (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, paymentMethod: pm.key }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors ${form.paymentMethod === pm.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                      >
                        <pm.icon className={`w-4 h-4 ${form.paymentMethod === pm.key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-[11px] font-medium">{pm.label}</span>
                        <span className="text-[9px] text-muted-foreground">{pm.sub}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { key: "card", label: "Card", icon: CreditCard, sub: "Visa / MC" },
                        { key: "bank_transfer", label: "Bank", icon: Building2, sub: "Checking / Savings" },
                        { key: "usdc", label: "USDC", icon: Wallet, sub: "Polygon" },
                        { key: "usdt", label: "USDT", icon: Wallet, sub: "Polygon" },
                      ].map(pm => (
                        <button
                          key={pm.key}
                          type="button"
                          onClick={() => { setForm(p => ({ ...p, paymentMethod: pm.key })); if (pm.key !== "bank_transfer") { setIntlBankSelected(null); setIntlBankRegion(null); } }}
                          className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors ${form.paymentMethod === pm.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                        >
                          <pm.icon className={`w-4 h-4 ${form.paymentMethod === pm.key ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="text-[11px] font-medium">{pm.label}</span>
                          <span className="text-[9px] text-muted-foreground">{pm.sub}</span>
                        </button>
                      ))}
                    </div>

                    {/* International Bank Selector */}
                    {form.paymentMethod === "bank_transfer" && (
                      <InternationalBankSelector
                        selectedBank={intlBankSelected}
                        onBankSelected={(bank, region) => {
                          setIntlBankSelected(bank);
                          setIntlBankRegion(region);
                        }}
                        onClear={() => { setIntlBankSelected(null); setIntlBankRegion(null); }}
                      />
                    )}
                  </>
                )}

                {/* Fee breakdown */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (0.5%)</span>
                    <span>${platformFeeAmount.toFixed(2)}</span>
                  </div>
                  {externalPlatformFeeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{platformName || "Marketplace"} Fee ({externalPlatformFeePercent}%)</span>
                      <span>${externalPlatformFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processor Fee ({isCryptoPayment ? "Direct — $0" : `${selectedProcessor.name} ${selectedProcessor.feeRate}%`})</span>
                    <span>{isCryptoPayment ? "$0.00" : `$${processorFeeAmount.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxes & Tariffs</span>
                    <span className="text-muted-foreground italic">Varies by corridor</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow Service Fee (1.0%)</span>
                    <span className="text-muted-foreground italic">Deducted at release</span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
                    <span>Total Due Now</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2 text-sm"
                  disabled={isMilestoneIndustry && !scheduleAccepted}
                >
                  <Lock className="w-4 h-4" />
                  {isMilestoneIndustry && !scheduleAccepted
                    ? "Accept milestone schedule above first"
                    : isSandbox ? "Test Escrow Payment" : "Pay with Escrow"}
                </Button>
              </form>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Shield className="w-3 h-3" /> Escrow Protected
                </Badge>
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Lock className="w-3 h-3" /> Encrypted
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RFQ Submitted Confirmation */}
        {step === "rfq_done" && (
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{rfqTerms.rfqLabel} Submitted!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your request has been sent to <strong>{vendor.name}</strong>. They will review your requirements
                  and respond with a custom {rfqTerms.proformaLabel.toLowerCase()} via email or phone.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">
                  No payment has been charged. Escrow protection will activate automatically once you accept the vendor's quote and proceed to payment.
                </p>
              </div>
              {isEmbed && (
                <Button variant="outline" size="sm" className="text-xs" onClick={closeWidget}>
                  Close
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Counter-proposal submitted confirmation */}
        {step === "counter_submitted" && (
          <Card className="border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Handshake className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Counter-Proposal Submitted!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your proposed milestone percentages have been sent to <strong>{vendor.name}</strong> for review.
                  They will contact you via email or phone once they've reviewed your proposal.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  <strong>What happens next?</strong>
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 text-left list-disc list-inside">
                  <li>The vendor reviews your proposed schedule</li>
                  <li>If agreed, you'll receive a separate payment link with the locked schedule</li>
                  <li>If they counter, they'll reach out to negotiate further</li>
                  <li>No payment is charged until both parties agree</li>
                </ul>
              </div>
              {isEmbed && (
                <Button variant="outline" size="sm" className="text-xs" onClick={closeWidget}>
                  Close
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-sm font-semibold">Processing Payment...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isSandbox ? "Simulating escrow lock..." : "Securing funds in escrow..."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "done" && (
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              {/* Success header */}
              <div className="text-center space-y-2">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-bold">
                  {isSandbox ? "Test Payment Successful!" : "Payment Locked in Escrow!"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSandbox
                    ? "This sandbox transaction simulates the full escrow-protected payment flow."
                    : "Your funds are safely held in escrow until the order is fulfilled."}
                </p>
              </div>

              {/* On-screen receipt */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Transaction Receipt</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confirmation Code</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary">{confirmationCode}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(confirmationCode).catch(() => {});
                          toast.success("Confirmation code copied!");
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buyer</span>
                    <span className="font-medium">{form.buyerName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{form.buyerEmail}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Item</span>
                    <span className="font-medium">{form.item}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Vendor</span>
                    <span className="font-medium">{vendor.name}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${parseFloat(form.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Platform Fee (0.5%)</span>
                    <span>${(parseFloat(form.amount) * 0.005).toFixed(2)}</span>
                  </div>
                  {externalPlatformFeeAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{platformName || "Marketplace"} Fee ({externalPlatformFeePercent}%)</span>
                      <span>${externalPlatformFeeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Processor Fee ({isCryptoPayment ? "Direct" : `${selectedProcessor.name} ${selectedProcessor.feeRate}%`})</span>
                    <span>{isCryptoPayment ? "$0.00" : `$${processorFeeAmount.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxes & Tariffs</span>
                    <span className="text-muted-foreground italic">Varies by corridor</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Escrow Service Fee (1.0%)</span>
                    <span className="text-muted-foreground italic">At release</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-xs font-bold">
                    <span>Total Charged</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Lock className="w-3 h-3" />
                      {isSandbox ? "Demo — Funds Locked" : "In Escrow"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Date</span>
                    <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>

              {/* What happens next */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-primary" /> What happens next?
                </p>
                <ul className="text-[11px] text-muted-foreground space-y-1.5 ml-5">
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    <span>Your funds are held in a secure escrow vault — the vendor <strong>cannot</strong> access them yet.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    <span>The vendor fulfills your order according to the agreed milestones.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">3.</span>
                    <span>Once you confirm delivery, funds are released to the vendor automatically.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary font-bold mt-0.5">4.</span>
                    <span>If there's a dispute, TrustLock mediates with full blockchain-backed proof.</span>
                  </li>
                </ul>
              </div>

              {isSandbox && (
                <div className="bg-accent/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">
                    <strong className="text-foreground">✓ Widget verified!</strong> This was a sandbox test. In live mode, real funds are locked and the full escrow lifecycle activates. Save your confirmation code above for your records.
                  </p>
                </div>
              )}

              {isEmbed && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={closeWidget}>
                  Close
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === "vendor_locked" && (
          <Card className="border-amber-500/30">
            <CardContent className="p-5 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold">Vendor Temporarily Unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>{vendor.name}</strong> is not currently accepting orders via TrustLock. Please contact the vendor directly or check back later.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground">
                  Your funds are safe — TrustLock never processes payments through inactive vendors.
                </p>
              </div>
              {isEmbed && (
                <Button variant="outline" size="sm" className="text-xs" onClick={closeWidget}>Close</Button>
              )}
            </CardContent>
          </Card>
        )}

        {step === "error" && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-sm font-semibold">Payment Failed</p>
              <p className="text-xs text-muted-foreground">
                Unable to process this transaction. Please try again or contact the vendor.
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep("form")}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-3">
          <p className="text-[10px] text-muted-foreground">
            Powered by <strong className="text-primary">TrustLock</strong> Escrow Protection
          </p>
        </div>
      </div>
    </div>
  );
};

export default WidgetCheckout;

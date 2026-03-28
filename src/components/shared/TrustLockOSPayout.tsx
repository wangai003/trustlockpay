import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield, Lock, Globe, Smartphone, ArrowRight, AlertTriangle,
  Check, Copy, Info, Loader2,
  Wallet, ArrowDown, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ProviderSearch from "@/components/shared/ProviderSearch";
import {
  type PaymentProvider,
  PRIVACY_DISCLAIMER,
  FEE_DISCLOSURE,
} from "@/lib/paymentProviders";
import { AZIX_WALLETS, calculateFeesV2, selectProcessor, type TransactionType } from "@/lib/feeEngine";
import {
  useGetOrCreateSeedToken,
  useInitiatePayout,
  useCancelPayout,
} from "@/hooks/useSupabaseData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrustLockOSPayoutProps {
  role: "admin" | "vendor" | "buyer";
  prefillAmount?: string;
  prefillOrderNumber?: string;
  payoutType?: "release" | "refund" | "split";
  transactionId?: string;
  onComplete?: (confirmationCode: string) => void;
  isTestnet?: boolean;
}

interface PayoutFieldConfig {
  field_name: string;
  label: string;
  type: string;
  placeholder: string;
  validation_regex: string;
  is_required: boolean;
}

interface PayoutConfig {
  id: string;
  country_code: string;
  country_name: string;
  payout_method: string;
  required_fields: PayoutFieldConfig[];
  provider: string;
}

const PAYOUT_COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "EU", name: "European Union" },
  { code: "AE", name: "UAE" },
  { code: "GLOBAL", name: "Crypto (Any Country)" },
];

const TrustLockOSPayout = ({
  role,
  prefillAmount = "",
  prefillOrderNumber = "",
  payoutType = "release",
  transactionId,
  onComplete,
  isTestnet = true,
}: TrustLockOSPayoutProps) => {
  const [mode, setMode] = useState<"diaspora" | "local">("local");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [providerFields, setProviderFields] = useState<Record<string, string>>({});
  const [amount] = useState(prefillAmount);
  const [processing, setProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [result, setResult] = useState<{ confirmationCode: string; status: string } | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFees, setShowFees] = useState(false);

  // Dynamic payout fields state
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [payoutConfigs, setPayoutConfigs] = useState<PayoutConfig[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [loadingFields, setLoadingFields] = useState(false);

  // OS Payout token → hardwired to Escrow Wallet (escrow disbursement)
  // Trickle-down: escrow service fees (stablecoins) flow from Escrow Wallet
  // → Transaction Fee Wallet via the OS Pay token — no conversion needed
  const getSeedToken = useGetOrCreateSeedToken("os_payout");
  const initiatePayout = useInitiatePayout();
  const cancelPayout = useCancelPayout();

  const [seedToken, setSeedToken] = useState<string>("");
  useEffect(() => {
    getSeedToken.mutate(undefined, {
      onSuccess: (data) => setSeedToken(data?.token?.token || "TL-DEMO-TOKEN-XXXX"),
    });
  }, []);

  // Fetch payout field configs when country changes
  const fetchPayoutFields = useCallback(async (countryCode: string) => {
    if (!countryCode) return;
    setLoadingFields(true);
    setPayoutConfigs([]);
    setSelectedMethod("");
    setDynamicFields({});

    try {
      const { data, error } = await supabase.functions.invoke("select-processor", {
        body: { action: "get_payout_fields", country_code: countryCode },
      });

      if (error) throw error;
      if (data?.configs && Array.isArray(data.configs)) {
        setPayoutConfigs(data.configs as PayoutConfig[]);
        // Auto-select first method
        if (data.configs.length > 0) {
          setSelectedMethod(data.configs[0].payout_method);
        }
      }
    } catch (err) {
      console.error("Failed to fetch payout fields:", err);
      toast.error("Failed to load payout fields for this country");
    } finally {
      setLoadingFields(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchPayoutFields(selectedCountry);
    }
  }, [selectedCountry, fetchPayoutFields]);

  const activeConfig = payoutConfigs.find((c) => c.payout_method === selectedMethod);
  const activeFields = activeConfig?.required_fields ?? [];

  const amountNum = parseFloat(amount) || 0;
  const isCrypto = selectedProvider?.category === "crypto_wallet" || selectedMethod === "crypto";
  const txType: TransactionType = payoutType === "refund"
    ? (isCrypto ? "refund_crypto" : "refund_fiat")
    : payoutType === "split"
      ? "split_payout"
      : "release_to_vendor";
  const processorId = selectProcessor("global", isCrypto);
  const fees = amountNum > 0 ? calculateFeesV2(amountNum, txType, processorId) : null;

  const handleFieldChange = (key: string, value: string) => {
    setProviderFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleDynamicFieldChange = (fieldName: string, value: string) => {
    setDynamicFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const isFormValid = () => {
    if (amountNum <= 0) return false;

    // If dynamic fields are active, validate those
    if (selectedCountry && activeFields.length > 0) {
      const requiredDynamic = activeFields.filter((f) => f.is_required);
      return requiredDynamic.every((f) => dynamicFields[f.field_name]?.trim());
    }

    // Otherwise fall back to provider-based validation
    if (!selectedProvider) return false;
    const required = selectedProvider.fields.filter((f) => f.required);
    return required.every((f) => providerFields[f.key]?.trim());
  };

  const handleConfirmAndPay = async () => {
    setConfirmDialog(false);
    setProcessing(true);

    const providerName = selectedProvider?.name ?? activeConfig?.provider ?? "Direct";
    const providerCategory = selectedProvider?.category ?? selectedMethod ?? "unknown";

    try {
      const res = await initiatePayout.mutateAsync({
        seedToken,
        role,
        payoutType,
        transactionId,
        orderNumber: prefillOrderNumber,
        amount: String(amountNum),
        paymentCategory: providerCategory,
        paymentProvider: providerName,
        providerDetails: { ...providerFields, ...dynamicFields },
        mode,
      });

      setResult({
        confirmationCode: res.confirmationCode,
        status: "completed",
      });

      toast.success("Funds are being transferred to your account");
      onComplete?.(res.confirmationCode);
    } catch {
      // handled by hook
    } finally {
      setProcessing(false);
    }
  };

  // ─── Success Screen ──────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Transaction Successful</h3>
            <p className="text-sm text-muted-foreground">
              Your funds are being transferred via {selectedProvider?.name}. You will receive a notification once the transfer is complete.
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Confirmation Code</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-bold font-mono text-primary">{result.confirmationCode}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.confirmationCode); toast.success("Copied!"); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Save this code for your records. Use it for any disputes or inquiries.</p>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Amount: <span className="font-semibold text-foreground">${amountNum.toFixed(2)}</span></p>
              {fees && <p>Fees: <span className="font-semibold text-foreground">${fees.totalFees.toFixed(2)}</span></p>}
              {fees && <p>Net received: <span className="font-semibold text-primary">${fees.netAmount.toFixed(2)}</span></p>}
              <p>Provider: <span className="font-semibold text-foreground">{selectedProvider?.name ?? activeConfig?.provider ?? "Direct"}</span></p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Testnet Banner */}
      {isTestnet && (
        <div className="rounded-t-xl bg-accent/20 border border-accent/40 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] sm:text-xs font-semibold text-accent">TESTNET MODE — No real funds will be transferred</span>
        </div>
      )}

      {/* Header */}
      <div className={cn("bg-primary p-4 flex items-center justify-between", isTestnet ? "rounded-none -mt-4" : "rounded-t-xl")}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-foreground" />
          <span className="font-heading font-bold text-sm text-primary-foreground">TrustLock OS Payout</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] border-0", isTestnet ? "bg-accent/30 text-accent" : "bg-primary-foreground/20 text-primary-foreground")}>
            {isTestnet ? "TEST" : "LIVE"}
          </Badge>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
            {payoutType === "refund" ? "Refund" : payoutType === "split" ? "Split Pay" : "Fund Release"}
          </Badge>
        </div>
      </div>

      {/* ═══ ESCROW WALLET SEED TOKEN (Top) ═══ */}
      <Card className="rounded-t-none -mt-4 border-t-0 border-2 border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold">Escrow Custodian Wallet</p>
            <Badge variant="outline" className="text-[10px] ml-auto">
              {payoutType === "refund" ? "Refund Mode" : payoutType === "split" ? "Split Mode" : "Release Mode"}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {payoutType === "refund"
              ? "Funds will be returned to the buyer from the escrow wallet. No fees are deducted — escrow and platform fees are waived on refunds."
              : payoutType === "split"
                ? "Both buyer and vendor receive their split simultaneously. Escrow service fee is deducted from the vendor's share only, then forwarded to the transaction fee wallet below."
                : "Vendor's funds are released first. The escrow service fee (1.0%) is deducted and forwarded to the transaction fee wallet below."}
          </p>
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Escrow Seed Token (Payout)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={seedToken}
                disabled
                className="font-mono text-xs bg-muted flex-1"
              />
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>
          <div className="p-2 rounded bg-muted text-[10px]">
            <p className="text-muted-foreground">Linked to → <span className="font-semibold text-foreground">{AZIX_WALLETS.escrow.label}</span></p>
            <p className="font-mono font-medium">{AZIX_WALLETS.escrow.publicKey}</p>
            <p className="text-muted-foreground mt-1">{AZIX_WALLETS.escrow.purpose}</p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ FLOW CONNECTOR: Escrow → Payment Methods → Transaction Wallet ═══ */}
      <div className="flex flex-col items-center gap-1 -my-2 relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
          <span className="font-semibold">
            {payoutType === "refund"
              ? "Funds → Buyer (no fees deducted)"
              : payoutType === "split"
                ? "Funds → Both Parties · Vendor fees ↓ trickle down"
                : "Vendor paid first · Escrow fee ↓ trickles down"}
          </span>
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
        </div>
      </div>

      {/* Dual Mode Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => { setMode("local"); setSelectedProvider(null); setProviderFields({}); }}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
            mode === "local" ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Smartphone className="w-4 h-4" />
          Local (Africa)
        </button>
        <button
          onClick={() => { setMode("diaspora"); setSelectedProvider(null); setProviderFields({}); }}
          className={cn(
            "flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
            mode === "diaspora" ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-4 h-4" />
          Diaspora
        </button>
      </div>

      {/* Dual Mode Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Local Panel */}
        <Card className={cn("border-2 transition-all", mode === "local" ? "border-primary/30 shadow-md" : "border-border opacity-50 pointer-events-none")}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Local Payment (Africa)</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Select your payment method to receive funds. Banks, mobile wallets, and crypto wallets from across Africa are supported.
            </p>
            {mode === "local" && (
              <>
                <ProviderSearch mode="local" onSelect={setSelectedProvider} selected={selectedProvider} />
                {selectedProvider && selectedProvider.fields.length > 0 && (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                    <p className="text-xs font-semibold text-foreground">{selectedProvider.name}</p>
                    {selectedProvider.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-[10px] text-muted-foreground">{field.label}{field.required && " *"}</Label>
                        {field.type === "select" ? (
                          <select
                            className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                            value={providerFields[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          >
                            <option value="">{field.placeholder}</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder={field.placeholder}
                            value={providerFields[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="mt-1 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Diaspora Panel */}
        <Card className={cn("border-2 transition-all", mode === "diaspora" ? "border-primary/30 shadow-md" : "border-border opacity-50 pointer-events-none")}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Diaspora Payment</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Receive funds via card, PayPal, Apple Pay, Google Pay, or direct crypto transfer.
            </p>
            {mode === "diaspora" && (
              <>
                <ProviderSearch mode="diaspora" onSelect={setSelectedProvider} selected={selectedProvider} />
                {selectedProvider && selectedProvider.fields.length > 0 && (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                    <p className="text-xs font-semibold text-foreground">{selectedProvider.name}</p>
                    {selectedProvider.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-[10px] text-muted-foreground">{field.label}{field.required && " *"}</Label>
                        {field.type === "select" ? (
                          <select
                            className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                            value={providerFields[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          >
                            <option value="">{field.placeholder}</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            placeholder={field.placeholder}
                            value={providerFields[field.key] || ""}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="mt-1 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Payout Fields — Country-Specific */}
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Payout Destination</h3>
          </div>

          {/* Country Selector */}
          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Select Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose your country" />
              </SelectTrigger>
              <SelectContent>
                {PAYOUT_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loading */}
          {loadingFields && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading payout fields...</span>
            </div>
          )}

          {/* Method Selector (if multiple methods available) */}
          {payoutConfigs.length > 1 && (
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Payout Method</Label>
              <div className="flex gap-2 mt-1">
                {[...new Set(payoutConfigs.map((c) => c.payout_method))].map((method) => (
                  <button
                    key={method}
                    onClick={() => { setSelectedMethod(method); setDynamicFields({}); }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                      selectedMethod === method
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Fields */}
          {activeFields.length > 0 && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  {activeConfig?.provider && (
                    <Badge variant="outline" className="mr-2 text-[10px]">via {activeConfig.provider}</Badge>
                  )}
                  Required Information
                </p>
              </div>
              {activeFields.map((field) => (
                <div key={field.field_name}>
                  <Label className="text-[10px] text-muted-foreground">
                    {field.label}{field.is_required && " *"}
                  </Label>
                  {field.type === "select" ? (
                    <Select
                      value={dynamicFields[field.field_name] || ""}
                      onValueChange={(val) => handleDynamicFieldChange(field.field_name, val)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={field.placeholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.validation_regex
                          .replace(/^\^?\(?/, "")
                          .replace(/\)?\$$/, "")
                          .split("|")
                          .filter(Boolean)
                          .map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === "tel" ? "tel" : "text"}
                      placeholder={field.placeholder}
                      value={dynamicFields[field.field_name] || ""}
                      onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                      className="mt-1 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedCountry && !loadingFields && payoutConfigs.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No specific payout configuration found for this country. Please use the provider search above.
            </p>
          )}
        </CardContent>
      </Card>
      {/* Fee Summary */}
      {fees && amountNum > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fee Breakdown</p>
              <button onClick={() => setShowFees(!showFees)} className="text-muted-foreground hover:text-foreground">
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Payout Amount</span><span className="font-medium text-foreground">${amountNum.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TrustLock Fee</span><span className="text-muted-foreground">-${fees.trustlockFee.toFixed(2)}</span></div>
              {fees.processorFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Processor Fee</span><span className="text-muted-foreground">-${fees.processorFee.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Escrow Fee</span><span className="text-muted-foreground">-${fees.escrowFee.toFixed(2)}</span></div>
              {fees.gasFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Network Gas</span><span className="text-muted-foreground">-${fees.gasFee.toFixed(4)}</span></div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold text-sm text-foreground">You Receive</span>
                <span className="font-bold text-sm text-primary">${fees.netAmount.toFixed(2)}</span>
              </div>
            </div>
            {showFees && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">{FEE_DISCLOSURE}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ TRANSACTION FEE WALLET SEED TOKEN (Bottom) ═══ */}
      <div className="flex flex-col items-center gap-1 -mb-2 relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
          <span className="font-semibold">
            {payoutType === "refund"
              ? "No fees forwarded on refunds"
              : "Escrow service fees trickle down here"}
          </span>
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
        </div>
      </div>

      <Card className={cn(
        "border-2 transition-all",
        payoutType === "refund"
          ? "border-muted opacity-60"
          : "border-accent/30"
      )}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            <p className="text-xs font-semibold">Transaction Fee Wallet</p>
            {payoutType === "refund" && (
              <Badge variant="secondary" className="text-[10px] ml-auto">Inactive on Refunds</Badge>
            )}
            {payoutType !== "refund" && (
              <Badge className="text-[10px] ml-auto bg-accent/20 text-accent border-0">Receiving Fees</Badge>
            )}
          </div>

          {payoutType === "refund" ? (
            <p className="text-[10px] text-muted-foreground">
              This wallet does not receive any fees during a refund. The escrow wallet returns the full principal to the buyer with no deductions.
            </p>
          ) : payoutType === "split" ? (
            <p className="text-[10px] text-muted-foreground">
              The 1.0% escrow service fee deducted from the <strong>vendor's share only</strong> is forwarded here.
              The buyer's share is released without any fee deduction. Both parties are paid simultaneously.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              The 1.0% escrow service fee deducted at release is forwarded from the escrow wallet to this transaction fee wallet.
              This wallet also collects platform fees from TrustLock OS Pay service payments.
            </p>
          )}

          <div>
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Transaction Fee Seed Token (OS Pay)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={payoutType === "refund" ? "— No fee transfer on refunds —" : seedToken ? `PAY-${seedToken.slice(3)}` : "TL-PAY-DEMO-XXXX"}
                disabled
                className={cn(
                  "font-mono text-xs flex-1",
                  payoutType === "refund" ? "bg-muted/50 text-muted-foreground italic" : "bg-muted"
                )}
              />
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>

          <div className="p-2 rounded bg-muted text-[10px]">
            <p className="text-muted-foreground">Linked to → <span className="font-semibold text-foreground">{AZIX_WALLETS.transaction.label}</span></p>
            <p className="font-mono font-medium">{AZIX_WALLETS.transaction.publicKey}</p>
            <p className="text-muted-foreground mt-1">{AZIX_WALLETS.transaction.purpose}</p>
          </div>

          {payoutType !== "refund" && fees && amountNum > 0 && (
            <div className="p-2 rounded border border-accent/20 bg-accent/5 text-[10px] space-y-1">
              <p className="font-semibold text-accent">Fee Trickle-Down Summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow fee collected</span>
                <span className="font-medium text-foreground">${fees.escrowFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">→ Forwarded to Transaction Wallet</span>
                <span className="font-medium text-accent">${fees.feeTrickleToTransactionWallet.toFixed(2)}</span>
              </div>
              {payoutType === "split" && (
                <p className="text-muted-foreground pt-1 border-t border-accent/10">
                  Fee calculated on vendor's share only. Buyer's portion is fee-free.
                </p>
              )}
            </div>
          )}

          <Separator />

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Same seed token wired in TrustLock OS Pay — unified fee collection point</span>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Disclaimer */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <button onClick={() => setShowPrivacy(!showPrivacy)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-semibold uppercase tracking-wider">Confidential Data Notice</span>
        </button>
        {showPrivacy && <p className="text-[10px] text-muted-foreground leading-relaxed">{PRIVACY_DISCLAIMER}</p>}
        {!showPrivacy && <p className="text-[10px] text-muted-foreground">We do not save your card, bank, or wallet details. Tap to read more.</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1 h-12 gap-2 font-semibold"
          onClick={() => setConfirmDialog(true)}
          disabled={processing || !isFormValid()}
        >
          {processing ? "Processing..." : (
            <>
              Confirm & Receive Funds
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Dual-wallet system: Escrow Wallet → Client Payout → Fee trickle → Transaction Wallet · Secured by Azix on Polygon</span>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to receive <strong>${amountNum.toFixed(2)}</strong> via <strong>{selectedProvider?.name ?? activeConfig?.provider ?? "Direct"}</strong>?
              {fees && <> After fees, you will receive <strong className="text-primary">${fees.netAmount.toFixed(2)}</strong>.</>}
              {" "}This action will instruct the Azix wallet to release funds to your selected payment method.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndPay}>
              Yes, Release Funds
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrustLockOSPayout;

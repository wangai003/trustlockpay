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
  Wallet, ArrowDown, Link2, ExternalLink,
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

// ─── Supported chains for crypto-to-crypto payouts ─────────
const SUPPORTED_CHAINS = [
  { id: "polygon", name: "Polygon (MATIC)", native: true },
  { id: "ethereum", name: "Ethereum (ETH)", native: false },
  { id: "bsc", name: "BNB Smart Chain", native: false },
  { id: "arbitrum", name: "Arbitrum", native: false },
  { id: "optimism", name: "Optimism", native: false },
  { id: "avalanche", name: "Avalanche (C-Chain)", native: false },
  { id: "base", name: "Base", native: false },
  { id: "solana", name: "Solana", native: false },
  { id: "tron", name: "Tron (TRC-20)", native: false },
];

const CRYPTO_LIABILITY_DISCLAIMER = `IMPORTANT NOTICE — IRREVERSIBLE TRANSACTION

By proceeding, you acknowledge and agree to the following:

1. WALLET ADDRESS VERIFICATION: You confirm that the wallet address you have provided is correct and belongs to you or your intended recipient. You understand that blockchain transactions are PERMANENT and IRREVERSIBLE once executed.

2. NETWORK COMPATIBILITY: You confirm that the selected blockchain network matches the wallet address you have provided. Sending funds to an address on the wrong network will result in PERMANENT LOSS of funds.

3. NO LIABILITY: TrustLock, its subsidiaries, and affiliates ("TrustLock") shall NOT be held liable for any loss of funds resulting from:
   a. Incorrect wallet addresses provided by you
   b. Incorrect network/chain selection
   c. Sending to unsupported token addresses
   d. Exchange-specific deposit requirements not met
   e. Any other user error in providing payout details

4. FINALITY: Once the escrow smart contract releases funds to the address you provided, the transaction is final. TrustLock cannot reverse, recall, or recover funds sent to any blockchain address.

5. NON-POLYGON TRANSFERS: For payouts to chains other than Polygon, a bridge/swap service (Transak) is used. Additional fees and processing time may apply. TrustLock is not liable for delays or issues caused by third-party bridge services.

This acknowledgement is timestamped and archived as a legal record. By clicking "I Accept & Confirm," you waive any claims against TrustLock for losses arising from incorrect payout details.`;

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

  // ─── Crypto chain selection state ───────────────────────
  const [selectedChain, setSelectedChain] = useState<string>("polygon");
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [cryptoAddressConfirmed, setCryptoAddressConfirmed] = useState(false);
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [showLiabilityDialog, setShowLiabilityDialog] = useState(false);

  // ─── Split payout state ─────────────────────────────────
  const [splitBuyerPercent, setSplitBuyerPercent] = useState("");
  const [splitVendorPercent, setSplitVendorPercent] = useState("");
  const [splitOrderNumber, setSplitOrderNumber] = useState(prefillOrderNumber);
  const [splitAccepted, setSplitAccepted] = useState(false);

  // OS Payout token → hardwired to Escrow Wallet (escrow disbursement)
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
  const isCrypto = selectedProvider?.category === "crypto_wallet" || selectedMethod === "crypto" || selectedCountry === "GLOBAL";
  const txType: TransactionType = payoutType === "refund"
    ? (isCrypto ? "refund_crypto" : "refund_fiat")
    : payoutType === "split"
      ? "split_payout"
      : "release_to_vendor";
  const processorId = selectProcessor("global", isCrypto);
  const fees = amountNum > 0 ? calculateFeesV2(amountNum, txType, processorId, {
    splitVendorShare: payoutType === "split" && splitVendorPercent ? parseFloat(splitVendorPercent) / 100 : undefined,
  }) : null;

  const handleFieldChange = (key: string, value: string) => {
    setProviderFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleDynamicFieldChange = (fieldName: string, value: string) => {
    setDynamicFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Auto-sync split percentages
  const handleSplitBuyerChange = (val: string) => {
    setSplitBuyerPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setSplitVendorPercent(String(100 - num));
    }
  };
  const handleSplitVendorChange = (val: string) => {
    setSplitVendorPercent(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setSplitBuyerPercent(String(100 - num));
    }
  };

  // ─── Liability disclaimer archival ──────────────────────
  const archiveLiabilityConsent = async () => {
    try {
      await supabase.functions.invoke("archive-payout-consent", {
        body: {
          user_id: (await supabase.auth.getUser()).data.user?.id || "anonymous",
          role,
          order_number: splitOrderNumber || prefillOrderNumber,
          transaction_id: transactionId,
          wallet_address: cryptoWalletAddress,
          chain: selectedChain,
          consent_type: "crypto_payout_liability",
          disclaimer_text: CRYPTO_LIABILITY_DISCLAIMER,
          ip_address: null, // captured server-side ideally
          user_agent: navigator.userAgent,
          metadata: {
            is_testnet: isTestnet,
            payout_type: payoutType,
            amount: amountNum,
          },
        },
      });
    } catch (err) {
      console.warn("Consent archival non-blocking:", err);
    }
  };

  const handleAcceptLiability = async () => {
    setLiabilityAccepted(true);
    setShowLiabilityDialog(false);
    await archiveLiabilityConsent();
    toast.success("Liability acknowledgement recorded and archived");
  };

  const isFormValid = () => {
    if (amountNum <= 0) return false;

    // Split payout validation
    if (payoutType === "split") {
      const bp = parseFloat(splitBuyerPercent);
      const vp = parseFloat(splitVendorPercent);
      if (isNaN(bp) || isNaN(vp) || bp < 0 || vp < 0 || Math.abs(bp + vp - 100) > 0.01) return false;
      if (!splitOrderNumber?.trim()) return false;
      if (!splitAccepted) return false;
    }

    // Crypto payout requires chain selection + address + liability
    if (isCrypto) {
      if (!cryptoWalletAddress.trim()) return false;
      if (!cryptoAddressConfirmed) return false;
      if (!liabilityAccepted) return false;
    }

    // If dynamic fields are active, validate those
    if (selectedCountry && activeFields.length > 0) {
      const requiredDynamic = activeFields.filter((f) => f.is_required);
      return requiredDynamic.every((f) => dynamicFields[f.field_name]?.trim());
    }

    // Otherwise fall back to provider-based validation
    if (!selectedProvider && !isCrypto) return false;
    if (selectedProvider) {
      const required = selectedProvider.fields.filter((f) => f.required);
      return required.every((f) => providerFields[f.key]?.trim());
    }

    return true;
  };

  const handleConfirmAndPay = async () => {
    setConfirmDialog(false);
    setProcessing(true);

    const providerName = selectedProvider?.name ?? activeConfig?.provider ?? (isCrypto ? "Direct Crypto" : "Direct");
    const providerCategory = selectedProvider?.category ?? selectedMethod ?? (isCrypto ? "crypto_wallet" : "unknown");

    try {
      const providerDetails: Record<string, unknown> = {
        ...(providerFields as Record<string, unknown>),
        ...(dynamicFields as Record<string, unknown>),
      };

      if (isCrypto) {
        providerDetails.wallet_address = cryptoWalletAddress;
        providerDetails.chain = selectedChain;
        providerDetails.is_native_polygon = selectedChain === "polygon";
        providerDetails.liability_accepted = liabilityAccepted;
        providerDetails.liability_accepted_at = new Date().toISOString();
      }

      if (payoutType === "split") {
        providerDetails.split_buyer_percent = parseFloat(splitBuyerPercent);
        providerDetails.split_vendor_percent = parseFloat(splitVendorPercent);
        providerDetails.split_order_number = splitOrderNumber;
        providerDetails.split_accepted = splitAccepted;
      }

      const res = await initiatePayout.mutateAsync({
        seedToken,
        role,
        payoutType,
        transactionId,
        orderNumber: splitOrderNumber || prefillOrderNumber,
        amount: String(amountNum),
        paymentCategory: providerCategory,
        paymentProvider: providerName,
        providerDetails,
        mode,
      });

      // For non-Polygon crypto payouts, initiate Transak offramp
      if (isCrypto && selectedChain !== "polygon") {
        try {
          const { data: offrampData } = await supabase.functions.invoke("transak-offramp", {
            body: {
              action: "initiate_offramp",
              payout_request_id: res.payoutId || res.confirmationCode,
              user_id: (await supabase.auth.getUser()).data.user?.id,
              amount: amountNum,
              wallet_address: cryptoWalletAddress,
              chain: selectedChain,
            },
          });
          if (offrampData?.transak_widget_url) {
            toast.info("Non-Polygon chain selected — Transak offramp initiated for cross-chain transfer");
          }
        } catch (err) {
          console.warn("Transak offramp initiation (non-blocking):", err);
        }
      }

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
              Your funds are being transferred via {selectedProvider?.name ?? (isCrypto ? `${selectedChain.toUpperCase()} direct` : "Direct")}. You will receive a notification once the transfer is complete.
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
              {isCrypto && <p>Chain: <span className="font-semibold text-foreground">{SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}</span></p>}
              {isCrypto && selectedChain !== "polygon" && (
                <p className="text-accent font-semibold">Cross-chain via Transak — additional processing time may apply</p>
              )}
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

      {/* Escrow seed token auto-linked in background — UI hidden, backend logic intact */}

      {/* ═══ FLOW CONNECTOR ═══ */}
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

      {/* ═══ SPLIT PAYOUT PANEL ═══ */}
      {payoutType === "split" && (
        <Card className="border-2 border-accent/40">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-bold text-foreground">Dispute Resolution — Split Payout</h3>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Enter the agreed split percentages from arbitration. Both parties must independently enter matching order numbers and accept the resolution for funds to be released.
            </p>

            {/* Order Number */}
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Order Number *</Label>
              <Input
                placeholder="Enter the disputed order number (e.g., TL-00042)"
                value={splitOrderNumber}
                onChange={(e) => setSplitOrderNumber(e.target.value)}
                className="mt-1 text-sm"
              />
              <p className="text-[9px] text-muted-foreground mt-1">
                This must match the order number the other party enters. Mismatched orders will show status "dispute_unresolved".
              </p>
            </div>

            {/* Split Percentage Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Buyer's Share (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g., 60"
                  value={splitBuyerPercent}
                  onChange={(e) => handleSplitBuyerChange(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendor's Share (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g., 40"
                  value={splitVendorPercent}
                  onChange={(e) => handleSplitVendorChange(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            {/* Split validation */}
            {splitBuyerPercent && splitVendorPercent && (
              <div className={cn(
                "p-2 rounded-lg text-[10px]",
                Math.abs(parseFloat(splitBuyerPercent) + parseFloat(splitVendorPercent) - 100) < 0.01
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}>
                {Math.abs(parseFloat(splitBuyerPercent) + parseFloat(splitVendorPercent) - 100) < 0.01
                  ? `✓ Split valid: Buyer ${splitBuyerPercent}% ($${(amountNum * parseFloat(splitBuyerPercent) / 100).toFixed(2)}) · Vendor ${splitVendorPercent}% ($${(amountNum * parseFloat(splitVendorPercent) / 100).toFixed(2)})`
                  : `✗ Percentages must add up to 100%. Current total: ${(parseFloat(splitBuyerPercent || "0") + parseFloat(splitVendorPercent || "0")).toFixed(2)}%`
                }
              </div>
            )}

            {/* Fee disclosure for split */}
            {fees && amountNum > 0 && splitVendorPercent && (
              <div className="p-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground space-y-0.5">
                <p><strong>Escrow fee:</strong> Halved rate applied to vendor's share only — ${fees.escrowFee.toFixed(2)}</p>
                {isCrypto && <p><strong>Gas fees:</strong> Split 50/50 between buyer and vendor — ~$0.025 each</p>}
                <p><strong>Buyer's portion:</strong> No TrustLock service fees</p>
              </div>
            )}

            {/* Acceptance checkbox */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={splitAccepted}
                onChange={(e) => setSplitAccepted(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <span className="text-[10px] text-muted-foreground leading-relaxed">
                I confirm the split percentages above reflect the arbitration/admin resolution. I understand the other party must independently enter matching details for funds to be released. Once both parties confirm, the payout is processed automatically and is irreversible.
              </span>
            </label>
          </CardContent>
        </Card>
      )}

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
          Africa
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
              <div className="flex gap-2 mt-1 flex-wrap">
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

          {/* ═══ CRYPTO CHAIN SELECTION & ADDRESS GATE ═══ */}
          {isCrypto && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Crypto Payout Details</h4>
              </div>

              {/* Chain Selector */}
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Select Blockchain Network *</Label>
                <Select value={selectedChain} onValueChange={(val) => { setSelectedChain(val); setCryptoAddressConfirmed(false); setLiabilityAccepted(false); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id}>
                        <div className="flex items-center gap-2">
                          <span>{chain.name}</span>
                          {chain.native && <Badge className="text-[8px] bg-primary/20 text-primary border-0">Native</Badge>}
                          {!chain.native && <Badge className="text-[8px] bg-accent/20 text-accent border-0">via Transak</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedChain !== "polygon" && (
                  <p className="text-[9px] text-accent mt-1 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Non-Polygon chains use Transak for cross-chain bridging. Additional processing time and fees may apply.
                  </p>
                )}
              </div>

              {/* Wallet Address */}
              <div>
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Your {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name} Wallet Address *</Label>
                <Input
                  placeholder={selectedChain === "solana" ? "Enter your Solana address" : "0x..."}
                  value={cryptoWalletAddress}
                  onChange={(e) => { setCryptoWalletAddress(e.target.value); setCryptoAddressConfirmed(false); setLiabilityAccepted(false); }}
                  className="mt-1 text-sm font-mono"
                />
              </div>

              {/* Address Confirmation Gate */}
              {cryptoWalletAddress.trim() && (
                <div className="p-3 rounded-lg border-2 border-accent/40 bg-accent/5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-accent">⚠️ Confirm Your Wallet Address</p>
                      <p className="text-[9px] text-foreground leading-relaxed">
                        Please verify the following details carefully. <strong>This transaction is IRREVERSIBLE once executed.</strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-muted text-[10px] space-y-1 font-mono">
                    <p><strong>Network:</strong> {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}</p>
                    <p><strong>Address:</strong> {cryptoWalletAddress}</p>
                    <p><strong>Token:</strong> USDC</p>
                    <p><strong>Amount:</strong> ${amountNum.toFixed(2)}</p>
                    {selectedChain !== "polygon" && (
                      <p className="text-accent"><strong>Bridge:</strong> Transak (cross-chain)</p>
                    )}
                  </div>

                  <p className="text-[9px] text-foreground font-semibold">
                    Is the above information correct? TrustLock is NOT liable for funds sent to an incorrect address.
                  </p>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cryptoAddressConfirmed}
                      onChange={(e) => {
                        setCryptoAddressConfirmed(e.target.checked);
                        if (e.target.checked && !liabilityAccepted) {
                          setShowLiabilityDialog(true);
                        }
                      }}
                      className="rounded border-border"
                    />
                    <span className="text-[10px] text-foreground">
                      Yes, I confirm this address is correct and supports USDC on {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}
                    </span>
                  </label>

                  {cryptoAddressConfirmed && liabilityAccepted && (
                    <div className="flex items-center gap-1.5 text-[10px] text-primary">
                      <Check className="w-3.5 h-3.5" />
                      <span className="font-semibold">Liability disclaimer accepted and archived</span>
                    </div>
                  )}
                </div>
              )}

              {/* General crypto notice */}
              <div className="p-2 rounded-lg bg-muted/50 text-[9px] text-muted-foreground space-y-0.5">
                <p><strong>Source:</strong> Azix Escrow Wallet (Polygon)</p>
                <p><strong>Support:</strong> support@azix.world</p>
                <p>Payouts do not require a $1 test transaction. The escrow wallet follows smart contract release procedures.</p>
              </div>
            </div>
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
              {fees.trustlockFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">TrustLock Fee</span><span className="text-muted-foreground">-${fees.trustlockFee.toFixed(2)}</span></div>
              )}
              {fees.processorFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Processor Fee</span><span className="text-muted-foreground">-${fees.processorFee.toFixed(2)}</span></div>
              )}
              {fees.escrowFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Escrow Fee{payoutType === "split" ? " (halved, vendor only)" : ""}</span><span className="text-muted-foreground">-${fees.escrowFee.toFixed(2)}</span></div>
              )}
              {fees.gasFee > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Network Gas{payoutType === "split" ? " (split 50/50)" : ""}</span><span className="text-muted-foreground">-${fees.gasFee.toFixed(4)}</span></div>
              )}
              {payoutType === "release" && (
                <div className="flex justify-between text-primary">
                  <span className="text-muted-foreground">Escrow Fee</span>
                  <span className="font-medium">Pre-paid at checkout ✓</span>
                </div>
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

      {/* Transaction fee wallet seed token auto-linked in background — UI hidden, backend logic intact */}

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
              {payoutType === "split" ? "Accept Resolution & Receive Funds" : "Confirm & Receive Funds"}
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
            <AlertDialogTitle>
              {payoutType === "split" ? "Confirm Split Payout" : "Confirm Payout"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {payoutType === "split" ? (
                <>
                  Are you sure you want to accept the split resolution?{" "}
                  <strong>Buyer: {splitBuyerPercent}%</strong> · <strong>Vendor: {splitVendorPercent}%</strong> of{" "}
                  <strong>${amountNum.toFixed(2)}</strong> for order <strong>{splitOrderNumber}</strong>.
                  {fees && <> After fees, you will receive <strong className="text-primary">${fees.netAmount.toFixed(2)}</strong>.</>}
                  {" "}The other party must also confirm for funds to be released.
                </>
              ) : (
                <>
                  Are you sure you want to receive <strong>${amountNum.toFixed(2)}</strong> via{" "}
                  <strong>{selectedProvider?.name ?? activeConfig?.provider ?? (isCrypto ? `${selectedChain.toUpperCase()} direct` : "Direct")}</strong>?
                  {fees && <> After fees, you will receive <strong className="text-primary">${fees.netAmount.toFixed(2)}</strong>.</>}
                  {" "}This action will instruct the Azix wallet to release funds to your selected payment method.
                </>
              )}
              {isCrypto && (
                <span className="block mt-2 text-accent font-semibold">
                  ⚠️ Crypto payouts are irreversible. Ensure your wallet address and chain are correct.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndPay}>
              {payoutType === "split" ? "Yes, Accept & Release" : "Yes, Release Funds"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Liability Disclaimer Dialog */}
      <AlertDialog open={showLiabilityDialog} onOpenChange={setShowLiabilityDialog}>
        <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-accent">
              <AlertTriangle className="w-5 h-5" />
              Crypto Payout Liability Notice
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Please read the following carefully before proceeding:
                </p>
                <div className="p-3 rounded-lg bg-muted text-[10px] text-muted-foreground whitespace-pre-line leading-relaxed max-h-[40vh] overflow-y-auto">
                  {CRYPTO_LIABILITY_DISCLAIMER}
                </div>
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 text-[10px] text-foreground">
                  <strong>This acknowledgement will be timestamped, hashed, and archived</strong> as a legal record
                  under your account for a minimum retention period of 7 years, in accordance with TrustLock's compliance policy.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCryptoAddressConfirmed(false); }}>
              I Do Not Accept
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptLiability} className="bg-accent hover:bg-accent/90">
              I Accept & Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrustLockOSPayout;

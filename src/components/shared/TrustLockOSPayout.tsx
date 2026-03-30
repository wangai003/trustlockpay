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
  Check, Copy, Info, Loader2, X, Home,
  Wallet, ArrowDown, ExternalLink, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ProviderSearch from "@/components/shared/ProviderSearch";
import FundMovementTracker, { type FundFlowType } from "@/components/shared/FundMovementTracker";
import TransactionFailureState from "@/components/shared/TransactionFailureState";
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

// Admin escrow custodian wallet (locked)
const ADMIN_ESCROW_WALLET = (typeof AZIX_WALLETS?.escrow === "object" ? AZIX_WALLETS.escrow.publicKey : AZIX_WALLETS?.escrow) || "0x4E1c...A83b";

const TrustLockOSPayout = ({
  role,
  prefillAmount = "",
  prefillOrderNumber = "",
  payoutType: initialPayoutType = "release",
  transactionId,
  onComplete,
  isTestnet = true,
}: TrustLockOSPayoutProps) => {
   // ─── Admin can select payout action type ──────────────
  const [adminAction, setAdminAction] = useState<"release" | "refund" | "split">(
    role === "admin" ? (initialPayoutType === "release" ? "refund" : initialPayoutType) : initialPayoutType
  );
  const payoutType = role === "admin" ? adminAction : initialPayoutType;

  const [mode, setMode] = useState<"diaspora" | "local">("local");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [providerFields, setProviderFields] = useState<Record<string, string>>({});
  const [amount] = useState(prefillAmount);
  const [processing, setProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [reviewStep, setReviewStep] = useState(false);
  const [result, setResult] = useState<{ confirmationCode: string; status: string } | null>(null);
  const [failureState, setFailureState] = useState<{ message: string } | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  // Order number (required for all roles)
  const [orderNumber, setOrderNumber] = useState(prefillOrderNumber);

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

  // ─── Split payout state (admin only) ────────────────────
  const [splitBuyerPercent, setSplitBuyerPercent] = useState("");
  const [splitVendorPercent, setSplitVendorPercent] = useState("");

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

  // ─── Testnet auto-fill: no longer pre-selects crypto; simulation uses provider search ───

  // For admin, auto-lock crypto method and wallet
  const isAdmin = role === "admin";

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
    if (selectedCountry && !isAdmin) {
      fetchPayoutFields(selectedCountry);
    }
  }, [selectedCountry, fetchPayoutFields, isAdmin]);

  const activeConfig = payoutConfigs.find((c) => c.payout_method === selectedMethod);
  const activeFields = activeConfig?.required_fields ?? [];

  const amountNum = parseFloat(amount) || 0;
  const isCrypto = isAdmin || selectedProvider?.category === "crypto_wallet" || selectedMethod === "crypto";
  const showCryptoDetails = !isAdmin && (selectedProvider?.category === "crypto_wallet");
  const txType: TransactionType = payoutType === "refund"
    ? (isCrypto ? "refund_crypto" : "refund_fiat")
    : payoutType === "split"
      ? "split_payout"
      : "release_to_vendor";
  const processorId = selectProcessor("global", isCrypto);
  const fees = amountNum > 0 ? calculateFeesV2(amountNum, txType, processorId, {
    splitVendorShare: payoutType === "split" && splitVendorPercent ? parseFloat(splitVendorPercent) / 100 : undefined,
  }) : null;

  // ─── Input sanitization & auto-correction per field type ──
  const sanitizeField = (key: string, raw: string): string => {
    const stripped = raw;

    // Card number: digits only, spaces every 4, max 19 digits
    if (key === "card_number") {
      const digits = stripped.replace(/\D/g, "").slice(0, 19);
      return digits.replace(/(.{4})/g, "$1 ").trim();
    }

    // Expiry date: digits only, auto-insert slash, MM/YY
    if (key === "expiry" || key === "card_expiry") {
      const digits = stripped.replace(/\D/g, "").slice(0, 4);
      if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
      return digits;
    }

    // CVV / CVC: digits only, max 4
    if (key === "cvv" || key === "card_cvc") {
      return stripped.replace(/\D/g, "").slice(0, 4);
    }

    // Phone number: allow digits, +, spaces, hyphens only — max 20 chars
    if (key === "phone_number") {
      return stripped.replace(/[^\d+\-\s]/g, "").slice(0, 20);
    }

    // BVN (Nigeria): digits only, max 11
    if (key === "bvn") {
      return stripped.replace(/\D/g, "").slice(0, 11);
    }

    // NUBAN / Account number: digits only, max 20
    if (key === "account_number") {
      return stripped.replace(/\D/g, "").slice(0, 20);
    }

    // Routing number: digits only, max 9
    if (key === "routing_number") {
      return stripped.replace(/\D/g, "").slice(0, 9);
    }

    // Branch code: alphanumeric, max 10
    if (key === "branch_code") {
      return stripped.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    }

    // SWIFT/BIC: uppercase alphanumeric, max 11
    if (key === "swift_bic") {
      return stripped.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
    }

    // National ID: alphanumeric, max 20
    if (key === "national_id" || key === "id_number") {
      return stripped.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    }

    // Wallet address: hex chars + 0x prefix, max 42 for EVM
    if (key === "wallet_address") {
      // Allow hex chars and 0x prefix
      const cleaned = stripped.replace(/[^a-fA-F0-9x]/g, "");
      // Auto-prepend 0x if user starts typing hex without it
      if (cleaned.length > 0 && !cleaned.startsWith("0x") && !cleaned.startsWith("0X")) {
        // Don't force prefix if user is clearly typing a Solana address (base58)
        if (/^[0-9a-fA-F]+$/.test(cleaned)) {
          return `0x${cleaned}`.slice(0, 42);
        }
      }
      return cleaned.slice(0, 42);
    }

    // Email: trim whitespace, lowercase
    if (key === "email") {
      return stripped.trim().toLowerCase();
    }

    // Cardholder / Account holder name: letters, spaces, hyphens, apostrophes, max 80
    if (key === "cardholder" || key === "account_holder" || key === "account_name") {
      return stripped.replace(/[^a-zA-ZÀ-ÿ\s\-'.]/g, "").slice(0, 80);
    }

    // Default: trim, max 100
    return stripped.slice(0, 100);
  };

  const handleFieldChange = (key: string, value: string) => {
    const sanitized = sanitizeField(key, value);
    setProviderFields((prev) => ({ ...prev, [key]: sanitized }));
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
          user_id: (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000",
          role,
          order_number: orderNumber,
          transaction_id: transactionId,
          wallet_address: isAdmin ? ADMIN_ESCROW_WALLET : cryptoWalletAddress,
          chain: selectedChain,
          consent_type: "crypto_payout_liability",
          disclaimer_text: CRYPTO_LIABILITY_DISCLAIMER,
          ip_address: null,
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

  // ─── Role-specific labels ───────────────────────────────
  const getRoleLabel = () => {
    if (isAdmin) {
      if (payoutType === "refund") return "Admin — Process Refund";
      if (payoutType === "split") return "Admin — Process Split Pay";
      return "Admin — Process Refund";
    }
    if (role === "vendor") return "Vendor — Receive Released Funds";
    if (role === "buyer" && initialPayoutType === "release") return "Buyer — Release & Transfer Funds to Vendor";
    return "Buyer — Receive Refund";
  };

  const getActionBadge = () => {
    if (isAdmin) {
      if (payoutType === "refund") return "Refund Authorization";
      if (payoutType === "split") return "Split Pay Authorization";
      return "Refund Authorization";
    }
    if (role === "vendor") return "Fund Release";
    if (role === "buyer" && initialPayoutType === "release") return "Release Authorization";
    return "Refund";
  };

  const isFormValid = () => {
    // Order number always required
    if (!orderNumber?.trim()) return false;

    // Admin: just needs order number + action (split needs percentages)
    if (isAdmin) {
      if (payoutType === "split") {
        const bp = parseFloat(splitBuyerPercent);
        const vp = parseFloat(splitVendorPercent);
        if (isNaN(bp) || isNaN(vp) || bp < 0 || vp < 0 || Math.abs(bp + vp - 100) > 0.01) return false;
      }
      return true;
    }

    // Vendor/Buyer: needs payment method + financial details
    if (isCrypto) {
      if (!cryptoWalletAddress.trim()) return false;
      if (!cryptoAddressConfirmed) return false;
      if (!liabilityAccepted) return false;
      return true;
    }

    // If dynamic fields are active, validate those
    if (selectedCountry && activeFields.length > 0) {
      const requiredDynamic = activeFields.filter((f) => f.is_required);
      return requiredDynamic.every((f) => dynamicFields[f.field_name]?.trim());
    }

    // Otherwise fall back to provider-based validation
    if (!selectedProvider) return false;
    if (selectedProvider) {
      const required = selectedProvider.fields.filter((f) => f.required);
      return required.every((f) => providerFields[f.key]?.trim());
    }

    return true;
  };

  // ─── Review step: confirm details before submission ─────
  // Helper to check individual field validity for red highlighting
  const getFieldErrors = () => {
    const errors: Record<string, boolean> = {};
    if (!orderNumber?.trim()) errors.orderNumber = true;
    if (isAdmin && payoutType === "split") {
      const bp = parseFloat(splitBuyerPercent);
      const vp = parseFloat(splitVendorPercent);
      if (isNaN(bp) || bp < 0) errors.splitBuyerPercent = true;
      if (isNaN(vp) || vp < 0) errors.splitVendorPercent = true;
      if (!isNaN(bp) && !isNaN(vp) && Math.abs(bp + vp - 100) > 0.01) {
        errors.splitBuyerPercent = true;
        errors.splitVendorPercent = true;
      }
    }
    if (!isAdmin) {
      if (isCrypto) {
        if (!cryptoWalletAddress.trim()) errors.cryptoWalletAddress = true;
        if (!cryptoAddressConfirmed) errors.cryptoAddressConfirmed = true;
        if (!liabilityAccepted) errors.liabilityAccepted = true;
      } else if (selectedCountry && activeFields.length > 0) {
        activeFields.filter(f => f.is_required).forEach(f => {
          if (!dynamicFields[f.field_name]?.trim()) errors[`dynamic_${f.field_name}`] = true;
        });
      } else if (selectedProvider) {
        selectedProvider.fields.filter(f => f.required).forEach(f => {
          if (!providerFields[f.key]?.trim()) errors[`provider_${f.key}`] = true;
        });
      } else if (!selectedProvider && !isCrypto && !(selectedCountry && activeFields.length > 0)) {
        errors.paymentMethod = true;
      }
    }
    return errors;
  };

  const fieldErrors = validationAttempted ? getFieldErrors() : {};

  const handleProceedToReview = () => {
    if (!isFormValid()) {
      setValidationAttempted(true);
      toast.error("Please complete all highlighted fields before proceeding");
      return;
    }
    setValidationAttempted(false);
    setReviewStep(true);
  };

  // ─── Generate mock confirmation code ─────────────────────
  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const handleConfirmAndPay = async () => {
    setProcessing(true);
    // Keep reviewStep = true so the user sees the loading state

    const providerName = isAdmin
      ? "TrustLock Escrow Wallet"
      : selectedProvider?.name ?? activeConfig?.provider ?? (isCrypto ? "Direct Crypto" : "Direct");
    const providerCategory = isAdmin
      ? "crypto_wallet"
      : selectedProvider?.category ?? selectedMethod ?? (isCrypto ? "crypto_wallet" : "unknown");

    try {
      // ═══ TESTNET SIMULATION — bypass edge function, simulate seamless execution ═══
      if (isTestnet) {
        await new Promise((r) => setTimeout(r, 1800)); // Simulate processing delay
        const mockCode = generateConfirmationCode();
        setResult({ confirmationCode: mockCode, status: "completed" });

        if (isAdmin) {
          toast.success(`${payoutType === "refund" ? "Refund" : payoutType === "split" ? "Split payout" : "Release"} processed successfully`);
        } else {
          toast.success("Payout submitted — funds will be deposited within 24–48 hours");
        }
        onComplete?.(mockCode);
        return;
      }

      // ═══ MAINNET — real edge function call ═══
      const providerDetails: Record<string, unknown> = {
        ...(providerFields as Record<string, unknown>),
        ...(dynamicFields as Record<string, unknown>),
      };

      if (isCrypto && !isAdmin) {
        providerDetails.wallet_address = cryptoWalletAddress;
        providerDetails.chain = selectedChain;
        providerDetails.is_native_polygon = selectedChain === "polygon";
        providerDetails.liability_accepted = liabilityAccepted;
        providerDetails.liability_accepted_at = new Date().toISOString();
      }

      if (isAdmin) {
        providerDetails.admin_wallet_address = ADMIN_ESCROW_WALLET;
        providerDetails.chain = "polygon";
        providerDetails.is_native_polygon = true;
        providerDetails.admin_action = payoutType;
      }

      if (payoutType === "split") {
        providerDetails.split_buyer_percent = parseFloat(splitBuyerPercent);
        providerDetails.split_vendor_percent = parseFloat(splitVendorPercent);
      }

      const res = await initiatePayout.mutateAsync({
        seedToken,
        role,
        payoutType,
        transactionId,
        orderNumber,
        amount: String(amountNum),
        paymentCategory: providerCategory,
        paymentProvider: providerName,
        providerDetails,
        mode,
      });

      // For non-Polygon crypto payouts, initiate Transak offramp
      if (isCrypto && !isAdmin && selectedChain !== "polygon") {
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
            toast.info("Non-Polygon chain — cross-chain transfer initiated via Transak");
          }
        } catch (err) {
          console.warn("Transak offramp initiation (non-blocking):", err);
        }
      }

      setResult({
        confirmationCode: res.confirmationCode,
        status: "completed",
      });

      if (isAdmin) {
        toast.success(`${payoutType === "refund" ? "Refund" : payoutType === "split" ? "Split payout" : "Release"} processed successfully`);
      } else {
        toast.success("Payout submitted — funds will be deposited within 24–48 hours");
      }
      onComplete?.(res.confirmationCode);
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred while processing your payout.";
      setFailureState({ message: msg });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Failure Screen ──────────────────────────────────────
  if (failureState) {
    return (
      <TransactionFailureState
        flow="os_payout"
        role={role}
        errorMessage={failureState.message}
        orderNumber={orderNumber}
        amount={amount}
        method={selectedMethod || selectedProvider?.name || (isCrypto ? `Crypto (${selectedChain})` : undefined)}
        onRetry={() => {
          setFailureState(null);
          handleConfirmAndPay();
        }}
        onBack={() => {
          setFailureState(null);
          setReviewStep(false);
        }}
      />
    );
  }

  // ─── Success Screen ──────────────────────────────────────
  if (result) {
    const isAdminSuccess = isAdmin;
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {isAdminSuccess ? "Payout Authorized Successfully" : "Submission Successful"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAdminSuccess
                ? `The ${payoutType === "split" ? "split payout" : payoutType} has been authorized. Funds are being transferred from the TrustLock escrow custodian wallet to the designated recipient(s).`
                : `Your payout details have been submitted and verified. Funds will be deposited into your ${isCrypto ? (selectedChain === "polygon" ? "Polygon wallet" : `${SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name} wallet`) : "selected account"} within 24–48 business hours.`
              }
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
              <p>Order: <span className="font-semibold text-foreground">{orderNumber}</span></p>
              {amountNum > 0 && <p>Amount: <span className="font-semibold text-foreground">${amountNum.toFixed(2)}</span></p>}
              {fees && <p>Net received: <span className="font-semibold text-primary">${fees.netAmount.toFixed(2)}</span></p>}
              {!isAdmin && <p>Method: <span className="font-semibold text-foreground">{selectedProvider?.name ?? activeConfig?.provider ?? (isCrypto ? "Direct Crypto" : "Direct")}</span></p>}
              {isCrypto && !isAdmin && <p>Chain: <span className="font-semibold text-foreground">{SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}</span></p>}
              {isCrypto && !isAdmin && selectedChain !== "polygon" && (
                <p className="text-accent font-semibold">Cross-chain via Transak — additional processing time may apply</p>
              )}
              {payoutType === "split" && (
                <p>Split: <span className="font-semibold text-foreground">Vendor {splitVendorPercent}% · Buyer {splitBuyerPercent}%</span></p>
              )}
            </div>
            {/* Fund Movement Tracker */}
            <FundMovementTracker
              flowType={
                isAdmin
                  ? payoutType === "refund" ? "payout_refund" : "payout_split"
                  : role === "buyer" && initialPayoutType === "release"
                    ? "buyer_release"
                    : isCrypto && selectedChain === "polygon"
                      ? "payout_crypto_direct"
                      : isCrypto
                        ? "payout_crypto_bridge"
                        : "payout_release"
              }
              role={role}
              method={selectedProvider?.name || selectedMethod}
              chain={SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}
              providerName={selectedProvider?.name || activeConfig?.provider}
              splitVendorPercent={splitVendorPercent}
              splitBuyerPercent={splitBuyerPercent}
              amount={amountNum}
            />

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">📋 What happens next?</p>
              {isAdmin ? (
                <p>The escrow smart contract has been instructed to disburse funds. Recipients will receive funds via their selected payment method within 24–48 hours. Both parties will be notified via email and in-app notification.</p>
              ) : isCrypto && selectedChain === "polygon" ? (
                <p>Funds will transfer directly from the TrustLock escrow custodian wallet to your Polygon wallet address. No intermediary processor is required. You will receive a blockchain confirmation once the transaction is finalized on-chain.</p>
              ) : isCrypto ? (
                <p>Funds will travel from the TrustLock escrow custodian wallet through our payment processor (Transak) to bridge to your {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name} wallet. Processing typically takes 24–48 hours.</p>
              ) : (
                <p>Funds will travel from the TrustLock escrow custodian wallet through our payment processor to your {selectedProvider?.name || "selected account"}. Processing typically takes 24–48 business hours. You will receive a confirmation notification once complete.</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setReviewStep(false);
                  setOrderNumber("");
                  setSelectedProvider(null);
                  setProviderFields({});
                  setCryptoWalletAddress("");
                  setCryptoAddressConfirmed(false);
                  setLiabilityAccepted(false);
                  setValidationAttempted(false);
                }}
                className="gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const basePath = role === "admin" ? "/trustlock/admin" : role === "buyer" ? "/trustlock/buyer" : "/trustlock/vendor";
                  window.location.href = basePath;
                }}
                className="gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Review Step (pre-submission confirmation) ───────────
  if (reviewStep) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="border-2 border-accent/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold text-foreground">Review & Confirm Your Details</h3>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Please carefully review all details below before submitting. Once submitted, the payout request is final.
            </p>

            <div className="space-y-2 p-4 rounded-lg bg-muted/50 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-semibold text-foreground capitalize">{role}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Action</span><span className="font-semibold text-foreground capitalize">{payoutType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order Number</span><span className="font-semibold text-foreground">{orderNumber}</span></div>
              {amountNum > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold text-foreground">${amountNum.toFixed(2)}</span></div>
              )}
              {isAdmin && payoutType === "split" && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Vendor Share</span><span className="font-semibold text-foreground">{splitVendorPercent}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Buyer Share</span><span className="font-semibold text-foreground">{splitBuyerPercent}%</span></div>
                </>
              )}
              {!isAdmin && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-semibold text-foreground">{mode === "local" ? "Africa" : "International"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-semibold text-foreground">{selectedProvider?.name ?? activeConfig?.provider ?? (isCrypto ? "Crypto" : "—")}</span></div>
                  {isCrypto && (
                    <>
                      <div className="flex justify-between"><span className="text-muted-foreground">Chain</span><span className="font-semibold text-foreground">{SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}</span></div>
                      <div className="flex justify-between flex-wrap"><span className="text-muted-foreground">Wallet</span><span className="font-semibold text-foreground font-mono text-[10px] break-all">{cryptoWalletAddress}</span></div>
                    </>
                  )}
                  {/* Show filled dynamic fields */}
                  {Object.entries(dynamicFields).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k.replace(/_/g, " ")}</span><span className="font-semibold text-foreground">{v}</span></div>
                  ))}
                  {/* Show filled provider fields */}
                  {Object.entries(providerFields).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k.replace(/_/g, " ")}</span><span className="font-semibold text-foreground">{v}</span></div>
                  ))}
                </>
              )}
              {isAdmin && (
                <>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Admin Wallet</span><span className="font-semibold text-foreground font-mono text-[10px]">{ADMIN_ESCROW_WALLET}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span className="font-semibold text-foreground">Polygon</span></div>
                </>
              )}
              {fees && (
                <>
                  <Separator />
                  {fees.totalFees > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Total Fees</span><span className="text-muted-foreground">-${fees.totalFees.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-primary"><span className="font-semibold">Net Amount</span><span className="font-bold">${fees.netAmount.toFixed(2)}</span></div>
                </>
              )}
            </div>

            <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 text-[10px] text-foreground">
              <strong>⚠️ Please confirm:</strong> All financial details above are correct. Once you submit, the payout request will be processed and funds will be disbursed accordingly. This action cannot be reversed.
            </div>

            {processing ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-semibold text-foreground">Processing your payout...</p>
                <p className="text-[10px] text-muted-foreground">Please wait while we securely process your transaction.</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setReviewStep(false)} disabled={processing}>
                  ← Go Back & Edit
                </Button>
                <Button className="flex-1 gap-2" onClick={handleConfirmAndPay} disabled={processing}>
                  <Check className="w-4 h-4" />
                  Confirm & Submit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main Form ───────────────────────────────────────────
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
            {getActionBadge()}
          </Badge>
        </div>
      </div>

      {/* Upfront Fee Disclosure */}
      {!isAdmin && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="text-xs font-semibold text-foreground">Payout Fee Notice</span>
          </div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Your payout may include deductions for <strong className="text-foreground">Processor Fees</strong> (1.5–2.9% for fiat; $0 for direct crypto) 
            and <strong className="text-foreground">Network Gas</strong> (variable, absorbed by TrustLock on standard releases). 
            The <strong className="text-foreground">1% Escrow Fee</strong> was pre-paid at checkout and trickles back to TrustLock after you receive your funds — it is <em>not</em> deducted from your payout.
            A full breakdown will be shown before you confirm.
          </p>
        </div>
      )}

      {/* Escrow seed token auto-linked in background — UI hidden, backend logic intact */}

      {isAdmin && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Admin Escrow Control Panel</h3>
            </div>

            {/* Action Selector */}
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Payout Action *</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {(["refund", "split"] as const).map((action) => (
                  <button
                    key={action}
                    onClick={() => setAdminAction(action)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-semibold transition-all",
                      adminAction === action
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {action === "refund" ? "Refund" : "Split Pay"}
                  </button>
                ))}
              </div>
            </div>

            {/* Split percentage fields (only when split selected) */}
            {adminAction === "split" && (
              <div className="space-y-3 p-3 rounded-lg bg-accent/5 border border-accent/30">
                <p className="text-[10px] font-bold text-foreground">Split Pay Percentage</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendor Share (%)</Label>
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
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Buyer Share (%)</Label>
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
                </div>
                {splitBuyerPercent && splitVendorPercent && (
                  <div className={cn(
                    "p-2 rounded-lg text-[10px]",
                    Math.abs(parseFloat(splitBuyerPercent) + parseFloat(splitVendorPercent) - 100) < 0.01
                      ? "bg-primary/10 text-primary"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {Math.abs(parseFloat(splitBuyerPercent) + parseFloat(splitVendorPercent) - 100) < 0.01
                      ? `✓ Valid: Vendor ${splitVendorPercent}% · Buyer ${splitBuyerPercent}%`
                      : `✗ Must equal 100%. Current: ${(parseFloat(splitBuyerPercent || "0") + parseFloat(splitVendorPercent || "0")).toFixed(2)}%`
                    }
                  </div>
                )}
              </div>
            )}

            {/* Admin wallet (locked) */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin Escrow Wallet (Locked)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={ADMIN_ESCROW_WALLET}
                  disabled
                  className="text-sm font-mono bg-muted cursor-not-allowed"
                />
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">
                Method: Crypto (Polygon) · This wallet is directly linked to the TrustLock escrow custodian smart contract.
              </p>
            </div>

            {/* Order Number */}
            <div>
              <Label className={cn("text-[10px] uppercase tracking-wider", fieldErrors.orderNumber ? "text-destructive" : "text-muted-foreground")}>Order Number *</Label>
              <Input
                placeholder="Enter exact order number (e.g., TL-00042)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, "").toUpperCase().slice(0, 20))}
                className={cn("mt-1 text-sm", fieldErrors.orderNumber && "border-destructive ring-destructive/30 ring-2")}
              />
              {fieldErrors.orderNumber && <p className="text-[9px] text-destructive mt-1 font-medium">Order number is required</p>}
              <p className="text-[9px] text-muted-foreground mt-1">
                {adminAction === "release"
                  ? "Must match the vendor's order number. This triggers release from the escrow smart contract."
                  : adminAction === "refund"
                    ? "Must match the buyer's order number. Admin approval triggers refund from escrow to buyer."
                    : "Must match both vendor and buyer order numbers. Split percentages will be applied to this order."
                }
              </p>
            </div>

            {/* Admin visual feedback for escrow flow */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[10px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">🔐 Escrow Flow Preview</p>
              {adminAction === "release" && (
                <p>TrustLock Escrow Wallet → Payment Processor API → Vendor's selected payment method</p>
              )}
              {adminAction === "refund" && (
                <p>TrustLock Escrow Wallet → Payment Processor API → Buyer's selected payment method</p>
              )}
              {adminAction === "split" && (
                <p>TrustLock Escrow Wallet → Payment Processor API → Vendor ({splitVendorPercent || "?"}%) + Buyer ({splitBuyerPercent || "?"}%) via their respective payment methods</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ VENDOR / BUYER FLOW ═══ */}
      {!isAdmin && (
        <>
          {/* Order Number Field */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Order Details</h3>
              </div>
              <div>
              <Label className={cn("text-[10px] uppercase tracking-wider", fieldErrors.orderNumber ? "text-destructive" : "text-muted-foreground")}>Order Number *</Label>
              <Input
                placeholder="Enter your order number (e.g., TL-00042)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, "").toUpperCase().slice(0, 20))}
                className={cn("mt-1 text-sm", fieldErrors.orderNumber && "border-destructive ring-destructive/30 ring-2")}
              />
              {fieldErrors.orderNumber && <p className="text-[9px] text-destructive mt-1 font-medium">Order number is required</p>}
                <p className="text-[9px] text-muted-foreground mt-1">
                  {role === "vendor"
                    ? "Enter the order number for the released/completed order. For milestone-based orders, use the same order number for each milestone release."
                    : "Enter the order number for the refunded order. This must match the order approved for refund by admin."
                  }
                </p>
              </div>
            </CardContent>
          </Card>

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
              International
            </button>
          </div>

          {/* Payment Method Selection */}
          <Card className={cn("border-2 transition-all", fieldErrors.paymentMethod ? "border-destructive ring-destructive/30 ring-2 shadow-destructive/20" : "border-primary/30 shadow-md")}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                {mode === "local" ? <Smartphone className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                <h3 className="text-sm font-bold text-foreground">
                  {mode === "local" ? "Africa Payment Method" : "International Payment Method"}
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {mode === "local"
                  ? "Select how you want to receive funds — bank transfer, mobile wallet, or crypto."
                  : "Select how you want to receive funds — card, PayPal, Apple Pay, Google Pay, bank, or crypto."
                }
              </p>
              <ProviderSearch mode={mode === "local" ? "local" : "diaspora"} onSelect={setSelectedProvider} selected={selectedProvider} />
              {fieldErrors.paymentMethod && (
                <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Please select a payment method to continue
                </p>
              )}
              {selectedProvider && selectedProvider.fields.length > 0 && selectedProvider.category !== "crypto_wallet" && (
                <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-xs font-semibold text-foreground">{selectedProvider.name} — Enter Your Details</p>
                  {selectedProvider.fields.map((field) => (
                    <div key={field.key}>
                      <Label className={cn("text-[10px]", fieldErrors[`provider_${field.key}`] ? "text-destructive" : "text-muted-foreground")}>{field.label}{field.required && " *"}</Label>
                      {field.type === "select" ? (
                        <select
                          className={cn("w-full mt-1 rounded-md border bg-background px-3 py-2 text-sm", fieldErrors[`provider_${field.key}`] ? "border-destructive ring-destructive/30 ring-2" : "border-border")}
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
                          className={cn("mt-1 text-sm", fieldErrors[`provider_${field.key}`] && "border-destructive ring-destructive/30 ring-2")}
                        />
                      )}
                      {fieldErrors[`provider_${field.key}`] && <p className="text-[9px] text-destructive mt-1 font-medium">This field is required</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


          {/* ═══ CRYPTO CHAIN SELECTION & ADDRESS GATE ═══ */}
          {showCryptoDetails && (
            <Card className="border-2 border-primary/20">
              <CardContent className="p-4 space-y-4">
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
                            {chain.native && <Badge className="text-[8px] bg-primary/20 text-primary border-0">Direct</Badge>}
                            {!chain.native && <Badge className="text-[8px] bg-accent/20 text-accent border-0">via Processor</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedChain === "polygon" ? (
                    <p className="text-[9px] text-primary mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Polygon — funds transfer directly from escrow wallet to your wallet. No intermediary.
                    </p>
                  ) : (
                    <p className="text-[9px] text-accent mt-1 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Non-Polygon chain — funds travel from escrow wallet through payment processor API to your wallet.
                    </p>
                  )}
                </div>

                <div>
                  <Label className={cn("text-[10px] uppercase tracking-wider", fieldErrors.cryptoWalletAddress ? "text-destructive" : "text-muted-foreground")}>Your {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name} Wallet Address *</Label>
                  <Input
                    placeholder={selectedChain === "solana" ? "Enter your Solana address" : "0x..."}
                    value={cryptoWalletAddress}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^a-fA-F0-9x]/g, "").slice(0, 42); setCryptoWalletAddress(cleaned); setCryptoAddressConfirmed(false); setLiabilityAccepted(false); }}
                    className={cn("mt-1 text-sm font-mono", fieldErrors.cryptoWalletAddress && "border-destructive ring-destructive/30 ring-2")}
                  />
                  {fieldErrors.cryptoWalletAddress && <p className="text-[9px] text-destructive mt-1 font-medium">Wallet address is required</p>}
                </div>

                {/* Address Confirmation Gate */}
                {cryptoWalletAddress.trim() && (
                  <div className="p-3 rounded-lg border-2 border-accent/40 bg-accent/5 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-accent">⚠️ Confirm Your Wallet Address</p>
                        <p className="text-[9px] text-foreground leading-relaxed">
                          Verify carefully. <strong>This transaction is IRREVERSIBLE.</strong>
                        </p>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-muted text-[10px] space-y-1 font-mono">
                      <p><strong>Network:</strong> {SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name}</p>
                      <p><strong>Address:</strong> {cryptoWalletAddress}</p>
                      <p><strong>Token:</strong> USDC</p>
                      {amountNum > 0 && <p><strong>Amount:</strong> ${amountNum.toFixed(2)}</p>}
                      {selectedChain !== "polygon" && (
                        <p className="text-accent"><strong>Route:</strong> Escrow → Payment Processor → Your Wallet</p>
                      )}
                      {selectedChain === "polygon" && (
                        <p className="text-primary"><strong>Route:</strong> Escrow → Your Wallet (direct)</p>
                      )}
                    </div>

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

                <div className="p-2 rounded-lg bg-muted/50 text-[9px] text-muted-foreground space-y-0.5">
                  <p><strong>Source:</strong> TrustLock Escrow Custodian Wallet (Polygon)</p>
                  <p><strong>Status:</strong> Verified & linked to your account</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

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
                <div className="flex justify-between"><span className="text-muted-foreground">Network Gas</span><span className="text-muted-foreground">-${fees.gasFee.toFixed(4)}</span></div>
              )}
              {payoutType === "release" && role === "vendor" && (
                <div className="flex justify-between text-primary">
                  <span className="text-muted-foreground">Escrow Fee</span>
                  <span className="font-medium">Pre-paid at checkout ✓</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold text-sm text-foreground">
                  {isAdmin ? "Disbursement Total" : "You Receive"}
                </span>
                <span className="font-bold text-sm text-primary">${fees.netAmount.toFixed(2)}</span>
              </div>
            </div>
            {showFees && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">{FEE_DISCLOSURE}</p>
            )}
          </CardContent>
        </Card>
      )}

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
          onClick={handleProceedToReview}
          disabled={processing}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Review & Submit
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Dual-wallet system: Escrow Wallet → {isAdmin ? "Payment Processor → Recipient" : "Your Account"} · Secured by TrustLock on Polygon</span>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin
                ? `Confirm ${payoutType === "split" ? "Split Payout" : payoutType === "refund" ? "Refund" : "Release"} Authorization`
                : "Confirm Payout Submission"
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin ? (
                <>
                  You are about to authorize a <strong>{payoutType}</strong> for order <strong>{orderNumber}</strong>.
                  {payoutType === "split" && (
                    <> Split: <strong>Vendor {splitVendorPercent}%</strong> · <strong>Buyer {splitBuyerPercent}%</strong>.</>
                  )}
                  {" "}Funds will be transferred from the TrustLock escrow custodian wallet to the designated recipient(s) via their selected payment methods.
                  {" "}<strong>This action is irreversible.</strong>
                </>
              ) : (
                <>
                  Your payout details for order <strong>{orderNumber}</strong> will be submitted.
                  {" "}Funds will be transferred from the TrustLock escrow custodian wallet to your{" "}
                  <strong>{selectedProvider?.name ?? (isCrypto ? `${SUPPORTED_CHAINS.find(c => c.id === selectedChain)?.name} wallet` : "account")}</strong>.
                  {isCrypto && selectedChain === "polygon" && " Funds will travel directly — no intermediary processor."}
                  {isCrypto && selectedChain !== "polygon" && " Funds will travel through our payment processor for cross-chain transfer."}
                  {" "}You will receive a confirmation and funds will be deposited within 24–48 hours.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAndPay}>
              {isAdmin ? "Authorize & Process" : "Yes, Submit Payout"}
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
                  under your account for a minimum retention period of 7 years.
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

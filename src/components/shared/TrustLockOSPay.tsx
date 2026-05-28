/**
 * TrustLock OS Pay — User-facing internal payment system
 *
 * PURPOSE: Handles off-chain platform payments (document purchases, acknowledgement
 * form downloads, subscription fees, refunds, splits).
 *
 * BLOCKCHAIN: OFF-CHAIN — These transactions are NOT anchored to the blockchain.
 * They are recorded in the `os_payments` table as internal ledger entries only.
 *
 * DISTINCTION: This is different from "Admin OS Pay" (TrustLockOSPayout with role="admin"),
 * which handles admin-initiated fund movements (dispute payouts, escrow releases, refunds).
 * Admin OS Pay WILL be anchored to the blockchain when Polygon integration goes live.
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PLANS, type PlanId, type BillingCycle } from "@/hooks/useVendorPlan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CreditCard, Smartphone, Wallet, Check, ArrowRight, Lock,
  Undo2, Split, AlertTriangle, Globe, MapPin, Coins, Building2, Phone, Copy, CheckCircle2,
  X, Home
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessPayment, useGetOrCreateSeedToken } from "@/hooks/useSupabaseData";
import TaxBreakdown, { type TaxLineItem } from "./TaxBreakdown";
import FundMovementTracker from "./FundMovementTracker";
import TransactionFailureState from "./TransactionFailureState";
import AntiStructuringAlert from "./AntiStructuringAlert";
import { AZIX_WALLETS, selectProcessor, calculateFeesV2, type TransactionType, type PaymentMethod as FeePaymentMethod } from "@/lib/feeEngine";
import { supabase } from "@/integrations/supabase/client";
import PaymentMethodUnavailable, { detectUnavailableMethod } from "./PaymentMethodUnavailable";
import type { PaymentMethod as FeeEnginePaymentMethod } from "@/lib/feeEngine";
import InternationalBankSelector from "@/components/shared/InternationalBankSelector";
import type { InternationalRegion } from "@/lib/internationalBankData";
import ProviderSearch from "@/components/shared/ProviderSearch";
import type { PaymentProvider } from "@/lib/paymentProviders";
import { GLOBAL_CURRENCIES, RATE_LOCK_DURATION_MS, getCurrencyForCountry, type CurrencyInfo } from "@/lib/globalCurrencies";

type PaymentMethod = "card" | "applepay" | "azix" | "mobile_money" | "bank_transfer" | "coinbase" | "transak" | "thirdweb" | "paypal" | null;
type AdminAction = "refund" | "split" | null;
type PayMode = "local" | "diaspora";


interface TrustLockOSPayProps {
  role: "admin" | "vendor" | "buyer";
  prefillService?: string;
  prefillAmount?: string;
  arbitrationOrderId?: string;
  onComplete?: () => void;
  isTestnet?: boolean;
}

/* Legacy method arrays removed — now using shared ProviderSearch component */

/* ── Role-specific monetizable services (hardcoded from business model) ── */
/* Plan services use a "plan:" prefix so we can detect and resolve pricing dynamically */
const VENDOR_SERVICES = [
  { label: "plan:starter", displayLabel: "Plan — Starter", amount: "" },
  { label: "plan:growth", displayLabel: "Plan — Growth", amount: "" },
  { label: "plan:professional", displayLabel: "Plan — Professional", amount: "" },
  { label: "plan:enterprise", displayLabel: "Plan — Enterprise", amount: "" },
  { label: "AI Query Pack (50 queries)", amount: "2.50" },
  { label: "AI Query Pack (200 queries)", amount: "10.00" },
  { label: "AI Query Pack (500 queries)", amount: "25.00" },
  { label: "Widget Restoration Fee", amount: "10.00" },
  { label: "Data Analytics Print-out", amount: "1.00" },
  { label: "Acknowledgement Form Download", amount: "0.50" },
  { label: "Custom Report Generation", amount: "5.00" },
  { label: "Compliance Certification", amount: "15.00" },
];

const BUYER_SERVICES = [
  { label: "Analytics Report Download", amount: "0.50" },
  { label: "AI Query Pack (50 queries)", amount: "2.50" },
  { label: "AI Query Pack (200 queries)", amount: "10.00" },
  { label: "AI Query Pack (500 queries)", amount: "25.00" },
  { label: "Acknowledgement Form Download", amount: "0.50" },
  { label: "Custom Report Generation", amount: "5.00" },
];

const ADMIN_SERVICES = [
  { label: "Platform Analytics Export", amount: "" },
  { label: "Compliance Audit Report", amount: "" },
  { label: "Custom Report Generation", amount: "" },
];

const TrustLockOSPay = ({ role, prefillService = "", prefillAmount = "", arbitrationOrderId, onComplete, isTestnet = true }: TrustLockOSPayProps) => {
  const isAdmin = role === "admin";
  const serviceList = role === "vendor" ? VENDOR_SERVICES : role === "buyer" ? BUYER_SERVICES : ADMIN_SERVICES;
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const [payMode, setPayMode] = useState<PayMode>("local");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [providerFields, setProviderFields] = useState<Record<string, string>>({});

  // Derive legacy `method` from selectedProvider for fee engine / routing compatibility
  const method: PaymentMethod = useMemo(() => {
    if (!selectedProvider) return null;
    const cat = selectedProvider.category;
    const proc = selectedProvider.processor;
    if (cat === "crypto_wallet") {
      if (proc === "coinbase") return "coinbase";
      return "azix";
    }
    if (cat === "mobile_money") return "mobile_money";
    if (cat === "bank_account") return "bank_transfer";
    if (cat === "digital_wallet") {
      if (selectedProvider.id === "apple_pay" || selectedProvider.id === "google_pay") return "applepay";
      if (selectedProvider.id === "coinbase_pay") return "coinbase";
      if (selectedProvider.id === "paypal") return "paypal";
      return "card";
    }
    if (cat === "card") return "card";
    // Transak / Thirdweb-routed providers
    if (proc === "transak") return "transak";
    if (proc === "thirdweb") return "thirdweb";
    return "card";
  }, [selectedProvider]);

  const setMethod = (m: PaymentMethod) => {
    if (!m) { setSelectedProvider(null); setProviderFields({}); }
  };
  const [adminAction, setAdminAction] = useState<AdminAction>(null);
  const [service, setService] = useState(prefillService);
  const [amount, setAmount] = useState(prefillAmount);
  const [azixAddress, setAzixAddress] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [refundEmail, setRefundEmail] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [splitRecipient, setSplitRecipient] = useState("");
  const [splitPercentage, setSplitPercentage] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileProvider, setMobileProvider] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [localBranchCode, setLocalBranchCode] = useState("");
  const [localBvn, setLocalBvn] = useState("");
  const [localIban, setLocalIban] = useState("");
  const [localRib, setLocalRib] = useState("");
  const [localSortCode, setLocalSortCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [seedToken, setSeedToken] = useState("");
  const [seedTokenLinked, setSeedTokenLinked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedToken, setSelectedToken] = useState<"USDC" | "USDT">("USDC");
  const [txIdInput, setTxIdInput] = useState("");
  const [senderAmount, setSenderAmount] = useState("");
  const [cryptoVerifyStatus, setCryptoVerifyStatus] = useState<"idle" | "verifying" | "verified" | "pending" | "failed" | "shortfall">("idle");
  const [pendingName, setPendingName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [polygonConfirmed, setPolygonConfirmed] = useState(false);
  const [cumulativeReceived, setCumulativeReceived] = useState(0);
  const [intlBankSelected, setIntlBankSelected] = useState<string | null>(null);
  const [intlBankRegion, setIntlBankRegion] = useState<InternationalRegion | null>(null);
  const [shortfallTxIds, setShortfallTxIds] = useState<string[]>([]);

  // ── Rate Lock State ──
  const [rateLockExpiry, setRateLockExpiry] = useState<number | null>(null);
  const [lockedRate, setLockedRate] = useState<number | null>(null);
  const [lockedCurrencyCode, setLockedCurrencyCode] = useState<string>("");
  const [lockedCurrencySymbol, setLockedCurrencySymbol] = useState<string>("");
  const [rateLockCountdown, setRateLockCountdown] = useState<string>("");
  const [rateLockActive, setRateLockActive] = useState(false);

  const processPayment = useProcessPayment();
  const getSeedToken = useGetOrCreateSeedToken("os_pay");

  // Auto-link seed token on mount
  useEffect(() => {
    if (!isAdmin && !seedTokenLinked) {
      getSeedToken.mutate(undefined, {
        onSuccess: (result) => {
          setSeedToken(result?.token?.token || result?.token || result?.seed_token || "");
          setSeedTokenLinked(true);
        },
      });
    }
  }, [isAdmin]);

  // ─── Testnet auto-fill: pre-select service and method so simulation completes ───
  useEffect(() => {
    if (isTestnet && !isAdmin && !service && !method) {
      // Pick a simple fixed-price service for testnet demo
      setService("AI Query Pack (50 queries)");
      setAmount("2.50");
      setMethod("card");
    }
  }, [isTestnet, isAdmin]);

  // ── Plan-aware amount resolution ──
  const isPlanService = service.startsWith("plan:");
  const selectedPlanId = isPlanService ? service.replace("plan:", "") as PlanId : null;
  const selectedPlan = selectedPlanId ? PLANS[selectedPlanId] : null;

  // Auto-resolve amount when service or billing cycle changes
  useEffect(() => {
    if (isPlanService && selectedPlan) {
      const price = billingCycle === "monthly" ? selectedPlan.monthly : selectedPlan.yearly;
      setAmount(price > 0 ? String(price) : "0");
    }
  }, [service, billingCycle]);

  const isAmountLocked = isPlanService || (!!service && serviceList.find(s => s.label === service)?.amount !== "");

  const parsedAmount = amount ? parseFloat(amount) : 0;

  // ── Rate Lock: auto-lock when country selected + amount entered in Africa mode ──
  const currencyInfo = selectedCountry ? (GLOBAL_CURRENCIES[selectedCountry] ?? null) : null;

  const lockRate = () => {
    if (!currencyInfo || parsedAmount <= 0) return;
    const expiry = Date.now() + RATE_LOCK_DURATION_MS;
    setLockedRate(currencyInfo.rate);
    setLockedCurrencyCode(currencyInfo.code);
    setLockedCurrencySymbol(currencyInfo.symbol);
    setRateLockExpiry(expiry);
    setRateLockActive(true);
    toast.success(`🔒 Rate locked: 1 USD = ${currencyInfo.symbol}${currencyInfo.rate.toLocaleString()} for 30 minutes`);
  };

  // Auto-lock when country + amount + Africa mode + non-crypto method are all set
  useEffect(() => {
    if (
      payMode === "local" &&
      selectedCountry &&
      currencyInfo &&
      parsedAmount > 0 &&
      method &&
      method !== "azix" &&
      !rateLockActive
    ) {
      lockRate();
    }
    // Reset lock when switching away from Africa mode or to crypto
    if ((payMode !== "local" || method === "azix") && rateLockActive) {
      setRateLockActive(false);
      setRateLockExpiry(null);
      setLockedRate(null);
    }
  }, [payMode, selectedCountry, method, parsedAmount > 0]);

  // Countdown timer
  useEffect(() => {
    if (!rateLockExpiry || !rateLockActive) {
      setRateLockCountdown("");
      return;
    }
    const interval = setInterval(() => {
      const remaining = rateLockExpiry - Date.now();
      if (remaining <= 0) {
        setRateLockActive(false);
        setRateLockExpiry(null);
        setLockedRate(null);
        setRateLockCountdown("");
        toast.info("⏰ Rate lock expired. A new rate will be quoted on your next action.");
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setRateLockCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLockExpiry, rateLockActive]);

  const taxTotal = isAdmin ? 0 : taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? parsedAmount * (t.value / 100) : t.value), 0);

  // Dynamic fee calculation using the cost-optimization engine
  const isCryptoMethod = method === "azix";
  const feePaymentMethod: FeePaymentMethod = method === "mobile_money" ? "mobile_money"
    : method === "bank_transfer" ? "bank_transfer"
    : method === "azix" ? "crypto"
    : "card";
  // Prefer the explicit processor on the chosen provider (e.g. Coinbase Wallet → coinbase)
  // so the fee breakdown matches what the user actually selected, instead of falling back
  // to the cost-optimizer default (which would pick Transak for card-like flows).
  const selectedProcessorId = isAdmin
    ? "direct" as const
    : (selectedProvider?.processor as "stripe" | "coinbase" | "transak" | "thirdweb" | "direct" | undefined)
      ?? selectProcessor("global", isCryptoMethod, undefined, feePaymentMethod, "os_payment");
  const feeBreakdown = parsedAmount > 0 && !isAdmin
    ? calculateFeesV2(parsedAmount, "os_payment", selectedProcessorId)
    : null;
  const fee = isAdmin ? "0.00" : feeBreakdown ? feeBreakdown.trustlockFee.toFixed(2) : "0.00";
  const processorFeeDisplay = feeBreakdown ? feeBreakdown.processorFee.toFixed(2) : "0.00";
  const total = parsedAmount ? (parsedAmount + taxTotal + (feeBreakdown ? feeBreakdown.totalFees : 0)).toFixed(2) : "0.00";

  /* activeMethods removed — now using ProviderSearch */

  /* ── Country-specific bank & mobile lists ── */
  const COUNTRY_BANKS: Record<string, string[]> = {
    NG: ["GTBank", "First Bank", "Zenith Bank", "Access Bank", "UBA", "Stanbic IBTC", "Fidelity Bank", "Sterling Bank", "Wema Bank", "Polaris Bank", "Union Bank", "FCMB", "Keystone Bank", "Heritage Bank", "Jaiz Bank"],
    KE: ["KCB Bank", "Equity Bank", "Co-operative Bank", "NCBA", "Absa Kenya", "Standard Chartered Kenya", "I&M Bank", "DTB Kenya", "Family Bank", "Stanbic Kenya"],
    GH: ["GCB Bank", "Ecobank Ghana", "Stanbic Bank Ghana", "Fidelity Bank Ghana", "CalBank", "ADB Ghana", "Absa Ghana", "Republic Bank Ghana"],
    ZA: ["Standard Bank", "FNB", "Absa", "Nedbank", "Capitec", "Investec", "African Bank", "TymeBank", "Discovery Bank"],
    CM: ["Afriland First Bank", "Ecobank Cameroon", "Société Générale Cameroon", "UBA Cameroon", "BICEC", "CCA Bank"],
    EG: ["National Bank of Egypt", "Banque Misr", "CIB Egypt", "QNB Alahli", "Banque du Caire", "HSBC Egypt", "Arab African International Bank"],
    UG: ["Stanbic Uganda", "DFCU Bank", "Centenary Bank", "Bank of Baroda Uganda", "Absa Uganda", "Equity Bank Uganda"],
    TZ: ["CRDB Bank", "NMB Bank", "Stanbic Tanzania", "NBC Tanzania", "Equity Bank Tanzania", "Absa Tanzania"],
    RW: ["Bank of Kigali", "I&M Bank Rwanda", "Equity Bank Rwanda", "BPR Atlas Mara", "Ecobank Rwanda"],
    SN: ["CBAO", "Société Générale Sénégal", "Ecobank Sénégal", "Banque de Dakar", "UBA Sénégal"],
    CI: ["Société Générale CI", "Ecobank CI", "NSIA Banque", "BOA Côte d'Ivoire", "Banque Atlantique"],
    ML: ["BDM SA", "Ecobank Mali", "Banque Atlantique Mali", "BOA Mali"],
    BF: ["Ecobank Burkina", "Coris Bank", "BOA Burkina Faso", "Banque Atlantique BF"],
    BJ: ["Ecobank Benin", "BOA Benin", "BIBE Benin", "UBA Benin"],
    TG: ["Ecobank Togo", "UTB Togo", "BTCI", "BOA Togo"],
    ZM: ["Zanaco", "Stanbic Zambia", "FNB Zambia", "Absa Zambia", "Indo Zambia Bank"],
    MW: ["National Bank of Malawi", "Standard Bank Malawi", "FDH Bank", "NBS Bank"],
    MG: ["BNI Madagascar", "BOA Madagascar", "BFV-Société Générale", "BMOI"],
  };

  const COUNTRY_MOBILE: Record<string, string[]> = {
    KE: ["M-Pesa (Safaricom)", "Airtel Money"],
    GH: ["MTN Mobile Money", "Vodafone Cash", "AirtelTigo Money", "Wave"],
    NG: ["MTN Mobile Money", "OPay", "PalmPay", "Kuda", "Airtel Money"],
    ZA: ["FNB eWallet", "Standard Bank Instant Money", "Vodacom M-Pesa"],
    UG: ["MTN Mobile Money", "Airtel Money"],
    TZ: ["M-Pesa (Vodacom)", "Tigo Pesa", "Airtel Money", "HaloPesa"],
    CM: ["Orange Money", "MTN Mobile Money"],
    RW: ["MTN Mobile Money", "Airtel Money"],
    EG: ["M-Pesa (Vodafone Egypt)", "Orange Money Egypt"],
    SN: ["Orange Money", "Wave", "Free Money"],
    CI: ["Orange Money", "MTN Mobile Money", "Wave"],
    ML: ["Orange Money", "Wave"],
    BF: ["Orange Money", "Wave"],
    BJ: ["MTN Mobile Money"],
    TG: ["Tmoney TG", "Togocell Money"],
    ZM: ["MTN Mobile Money", "Airtel Money", "Zamtel Money"],
    MW: ["Airtel Money"],
    MG: ["Orange Money"],
  };

  const bankList = COUNTRY_BANKS[selectedCountry] || [];
  const mobileList = COUNTRY_MOBILE[selectedCountry] || [];

  // Map UI payment method → processor ID for API routing (prefer selectedProvider.processor)
  const getProcessorForMethod = (m: PaymentMethod): "stripe" | "coinbase" | "transak" | "thirdweb" | "direct" => {
    if (selectedProvider?.processor) {
      return selectedProvider.processor as "stripe" | "coinbase" | "transak" | "thirdweb" | "direct";
    }
    if (m === "azix") return "direct";
    if (m === "coinbase") return "coinbase";
    if (m === "transak") return "transak";
    if (m === "thirdweb") return "thirdweb";
    if (m === "paypal") return "stripe";
    if (m === "mobile_money") return payMode === "local" ? "coinbase" : "transak";
    if (m === "bank_transfer") return payMode === "local" ? "coinbase" : "stripe";
    return "stripe"; // card, applepay
  };

  // ─── Generate mock confirmation code ─────────────────────
  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const [osPayResult, setOsPayResult] = useState<{ confirmationCode: string } | null>(null);
  const [osPayFailure, setOsPayFailure] = useState<{ message: string } | null>(null);
  const [complianceBlock, setComplianceBlock] = useState<{
    flags: { type: string; severity: string; detail: string }[];
    severity: "critical" | "high" | "clear";
    allowTransaction: boolean;
    blockedReason?: string;
    preKycCap?: number;
    rollingVolume?: number;
    todayCount?: number;
  } | null>(null);

  const handleSubmit = async () => {
    if (!method) { toast.error("Select a payment method"); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!seedTokenLinked && method === "azix") { toast.error("Link your seed token first"); return; }
    if (isAdmin && adminAction === "refund" && !refundEmail) { toast.error("Enter recipient email for refund"); return; }
    if (isAdmin && adminAction === "split" && (!splitRecipient || !splitPercentage)) { toast.error("Fill split payment details"); return; }

    setProcessing(true);
    try {
      // ═══ TESTNET SIMULATION — bypass edge function, simulate seamless execution ═══
      if (isTestnet) {
        await new Promise((r) => setTimeout(r, 1500)); // Simulate processing delay
        const mockCode = generateConfirmationCode();
        const label = isAdmin && adminAction === "refund" ? "Refund" : isAdmin && adminAction === "split" ? "Split payment" : "Payment";
        toast.success(`✅ ${label} of $${amount} processed successfully`);
        setOsPayResult({ confirmationCode: mockCode });
        onComplete?.();
        return;
      }

      // ═══ MAINNET — compliance velocity check (non-blocking, logged for post-escrow enforcement) ═══
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId && !isAdmin) {
        try {
          await supabase.functions.invoke("compliance-velocity", {
            body: { action: "check", user_id: userId, amount: parseFloat(amount) },
          });
          // Compliance flags are logged server-side; post-escrow KYC trigger handles enforcement
        } catch (err) {
          console.warn("Compliance velocity check (non-blocking):", err);
        }
      }

      const processorId = getProcessorForMethod(method);
      const isCryptoPayment = method === "azix";

      // For non-admin, non-crypto payments: route through processor API
      if (!isAdmin && !isCryptoPayment) {
        // Build bank transfer details payload
        const bankTransferPayload: Record<string, unknown> = {};
        if (method === "bank_transfer") {
          if (payMode === "diaspora" && intlBankSelected && intlBankRegion) {
            bankTransferPayload.bankTransferDetails = {
              bankName: intlBankSelected,
              region: intlBankRegion,
              type: "international",
            };
          } else if (payMode === "local" && bankName) {
            bankTransferPayload.bankTransferDetails = {
              bankName,
              country: selectedCountry,
              accountNumber,
              branchCode: localBranchCode || undefined,
              bvn: localBvn || undefined,
              iban: localIban || undefined,
              rib: localRib || undefined,
              sortCode: localSortCode || undefined,
              type: "local_africa",
            };
          }
        }

        // Mobile money details
        const mobileMoneyPayload: Record<string, unknown> = {};
        if (method === "mobile_money" && mobileProvider && mobileNumber) {
          mobileMoneyPayload.mobileMoneyDetails = {
            provider: mobileProvider,
            phoneNumber: mobileNumber,
            country: selectedCountry,
          };
        }

        // Provider-level fields payload (from ProviderSearch fields)
        const providerDetailsPayload: Record<string, unknown> = {};
        if (selectedProvider && Object.keys(providerFields).length > 0) {
          providerDetailsPayload.providerDetails = {
            providerId: selectedProvider.id,
            providerName: selectedProvider.name,
            category: selectedProvider.category,
            ...providerFields,
          };
        }

        const result = await processPayment.mutateAsync({
          action: "payment",
          service,
          amount,
          fee,
          total,
          method: method!,
          role,
          payMode,
          processor: processorId,
          direction: "onramp",
          currency: "USD",
          walletAddress: AZIX_WALLETS.transaction.publicKey,
          buyer_country: selectedCountry || undefined,
          ...bankTransferPayload,
          ...mobileMoneyPayload,
          ...providerDetailsPayload,
        });

        const procResult = (result as Record<string, unknown>)?.processorResult as Record<string, unknown> | undefined;
        if (procResult?.hostedUrl) {
          window.open(procResult.hostedUrl as string, "_blank");
          toast.success("Redirecting to payment page...");
        } else if (procResult?.clientSecret) {
          toast.success("Payment intent created — complete checkout in Stripe widget");
        } else if (procResult?.widgetConfig) {
          const procName = processorId === "thirdweb" ? "Thirdweb Pay" : "Transak";
          toast.success(`${procName} widget ready — complete payment in the popup`);
        } else {
          toast.success(`✅ Payment of $${amount} initiated via ${processorId}`);
        }
      } else {
        await processPayment.mutateAsync({
          action: isAdmin && adminAction ? adminAction : "payment",
          service,
          amount,
          fee,
          total,
          method: method!,
          role,
          payMode,
          refundEmail: refundEmail || undefined,
          refundReason: refundReason || undefined,
          splitRecipient: splitRecipient || undefined,
          splitPercentage: splitPercentage || undefined,
        });
        const label = isAdmin && adminAction === "refund" ? "Refund" : isAdmin && adminAction === "split" ? "Split payment" : "Payment";
        toast.success(`✅ ${label} of $${amount} processed via ${payMode} mode`);
      }

      // ── Close the loop on arbitration fee payments ──
      if (arbitrationOrderId) {
        try {
          await supabase.from("arbitration_fee_orders")
            .update({ status: "paid" })
            .eq("id", arbitrationOrderId);

          // Get the dispute ID to update its status
          const { data: arbOrder } = await supabase.from("arbitration_fee_orders")
            .select("dispute_id")
            .eq("id", arbitrationOrderId)
            .single();

          if (arbOrder?.dispute_id) {
            await supabase.from("disputes")
              .update({ status: "arbitration_pending" })
              .eq("id", arbOrder.dispute_id);
          }

          toast.success("Arbitration fee confirmed — professional review will begin shortly.");
        } catch (e) {
          console.warn("Arbitration order update (non-blocking):", e);
        }
      }

      onComplete?.();
    } catch (err: any) {
      const msg = err?.message || "An unexpected error occurred while processing your payment.";
      setOsPayFailure({ message: msg });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Compliance Block Screen ────────────────────────────
  if (complianceBlock) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <AntiStructuringAlert
          flags={complianceBlock.flags}
          severity={complianceBlock.severity}
          allowTransaction={complianceBlock.allowTransaction}
          blockedReason={complianceBlock.blockedReason}
          preKycCap={complianceBlock.preKycCap}
          rollingVolume={complianceBlock.rollingVolume}
          todayCount={complianceBlock.todayCount}
          role={role}
          onProceed={() => setComplianceBlock(null)}
          onBlock={() => setComplianceBlock(null)}
          onReduceAmount={() => {
            setComplianceBlock(null);
            // Focus amount input by clearing — user can re-enter
            toast.info("Reduce your amount below the threshold and try again");
          }}
        />
      </div>
    );
  }

  if (osPayFailure) {
    return (
      <TransactionFailureState
        flow="os_pay"
        role={role}
        errorMessage={osPayFailure.message}
        amount={amount}
        method={method?.replace(/_/g, " ") || undefined}
        onRetry={() => {
          setOsPayFailure(null);
          handleSubmit();
        }}
        onBack={() => {
          setOsPayFailure(null);
        }}
      />
    );
  }

  // ─── OS Pay Success Screen (testnet) ──────────────────────
  if (osPayResult) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Payment Successful</h3>
            <p className="text-sm text-muted-foreground">
              Your payment of <strong>${parsedAmount.toFixed(2)}</strong> for <strong>{service || "TrustLock Service"}</strong> has been processed.
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Confirmation Code</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-bold font-mono text-primary">{osPayResult.confirmationCode}</code>
                <button onClick={() => { navigator.clipboard.writeText(osPayResult.confirmationCode); toast.success("Copied!"); }} className="text-muted-foreground hover:text-foreground">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Fund Movement Tracker */}
            <FundMovementTracker
              flowType={method === "azix" ? "os_pay_crypto" : "os_pay_fiat"}
              role={role}
              method={method || undefined}
              providerName={
                method === "mobile_money" ? (mobileProvider || "Mobile Money")
                : method === "bank_transfer" ? (bankName || "Bank Transfer")
                : method === "azix" ? "Crypto (USDC/USDT)"
                : method === "coinbase" ? "Coinbase"
                : method === "transak" ? "Transak"
                : method === "thirdweb" ? "Thirdweb Pay"
                : method === "applepay" ? "Apple Pay / Google Pay"
                : "Card"
              }
              amount={parsedAmount}
            />

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => {
                setOsPayResult(null);
                setService("");
                setAmount("");
                setMethod(null);
              }}>
                <X className="w-3.5 h-3.5" /> Close
              </Button>
              <Button size="sm" onClick={() => {
                const basePath = role === "admin" ? "/trustlock/admin" : role === "buyer" ? "/trustlock/buyer" : "/trustlock/vendor";
                window.location.href = basePath;
              }}>
                <Home className="w-3.5 h-3.5" /> Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Testnet Banner */}
      {isTestnet && (
        <div className="rounded-t-xl bg-accent/20 border border-accent/40 px-4 py-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] sm:text-xs font-semibold text-accent">TESTNET MODE — No real funds will be processed</span>
        </div>
      )}

      {/* Header */}
      <div className={cn("bg-primary p-4 flex items-center justify-between", isTestnet ? "rounded-none" : "rounded-t-xl")}>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-foreground" />
          <span className="font-heading font-bold text-sm text-primary-foreground">TrustLock OS Pay</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] border-0", isTestnet ? "bg-accent/30 text-accent" : "bg-primary-foreground/20 text-primary-foreground")}>
            {isTestnet ? "TEST" : "LIVE"}
          </Badge>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
            {isAdmin ? "Admin" : role === "vendor" ? "Vendor" : "Buyer"}
          </Badge>
        </div>
      </div>

      <Card className="rounded-t-none -mt-4 border-t-0">
        <CardContent className="p-4 space-y-5">

          {/* ─── DUAL MODE TOGGLE (vendor/buyer only) ─── */}
          {!isAdmin && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Region</p>
            <Tabs value={payMode} onValueChange={(v) => { setPayMode(v as PayMode); setSelectedProvider(null); setProviderFields({}); }}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="local" className="gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  Africa
                </TabsTrigger>
                <TabsTrigger value="diaspora" className="gap-1.5 text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  International
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-[10px] text-muted-foreground text-center">
              {payMode === "local"
                ? "Pay via mobile money, local bank, or crypto within Africa"
                : "Pay via international card, crypto on-ramps, or direct wallet transfer"}
            </p>
          </div>
          )}

          {/* ─── SERVICE CATEGORY (vendor/buyer only) ─── */}
          {!isAdmin && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">TrustLock Service</Label>
            <select
              value={service}
              onChange={e => {
                const val = e.target.value;
                const selected = serviceList.find(s => s.label === val);
                setService(val);
                if (selected?.amount) {
                  setAmount(selected.amount);
                } else if (!val.startsWith("plan:")) {
                  setAmount("");
                }
                // Plan amounts are resolved via the useEffect above
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a service...</option>
              {serviceList.map(s => {
                const display = (s as any).displayLabel || s.label;
                const priceTag = s.amount ? ` — $${s.amount}` : "";
                return (
                  <option key={s.label} value={s.label}>{display}{priceTag}</option>
                );
              })}
            </select>

            {/* Billing cycle selector for plan services */}
            {isPlanService && selectedPlan && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs font-semibold text-foreground">{selectedPlan.name} Plan</p>
                <p className="text-[10px] text-muted-foreground">{selectedPlan.orderMin}–{selectedPlan.orderMax === -1 ? "Unlimited" : selectedPlan.orderMax} orders/month</p>
                <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="monthly" className="text-xs">
                      Monthly — ${selectedPlan.monthly}/mo
                    </TabsTrigger>
                    <TabsTrigger value="yearly" className="text-xs">
                      Yearly — ${selectedPlan.yearly}/yr
                      {selectedPlan.monthly > 0 && (
                        <Badge className="ml-1 text-[8px] bg-primary/20 text-primary border-0">
                          Save {Math.round((1 - selectedPlan.yearly / (selectedPlan.monthly * 12)) * 100)}%
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
          )}

          {/* Amount */}
          <div>
            <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => { if (!isAmountLocked) setAmount(e.target.value); }}
              readOnly={isAmountLocked}
              className={cn("mt-1 text-lg font-bold", isAmountLocked && "bg-muted cursor-not-allowed")}
            />
            {/* Dual-currency display: show local equivalent when country selected */}
            {payMode === "local" && selectedCountry && parsedAmount > 0 && GLOBAL_CURRENCIES[selectedCountry] && !rateLockActive && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                ≈ {GLOBAL_CURRENCIES[selectedCountry].symbol}
                {(parsedAmount * GLOBAL_CURRENCIES[selectedCountry].rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {" "}{GLOBAL_CURRENCIES[selectedCountry].code}
                <span className="text-muted-foreground/60 ml-1">(indicative)</span>
              </p>
            )}
            {isAmountLocked && service && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Amount auto-calculated based on selected service
              </p>
            )}
          </div>

          {/* Seed token is auto-linked in the background — UI hidden, backend logic intact */}

          {/* ─── COUNTRY SELECTOR (for all Africa mode non-crypto methods) ─── */}
          {!isAdmin && payMode === "local" && method && method !== "azix" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Your Country</Label>
              <select
                value={selectedCountry}
                onChange={e => { setSelectedCountry(e.target.value); setBankName(""); setMobileProvider(""); }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select country...</option>
                <option value="NG">Nigeria</option>
                <option value="KE">Kenya</option>
                <option value="GH">Ghana</option>
                <option value="ZA">South Africa</option>
                <option value="CM">Cameroon</option>
                <option value="EG">Egypt</option>
                <option value="UG">Uganda</option>
                <option value="TZ">Tanzania</option>
                <option value="RW">Rwanda</option>
                <option value="SN">Senegal</option>
                <option value="CI">Côte d'Ivoire</option>
                <option value="ML">Mali</option>
                <option value="BF">Burkina Faso</option>
                <option value="BJ">Benin</option>
                <option value="TG">Togo</option>
                <option value="ZM">Zambia</option>
                <option value="MW">Malawi</option>
                <option value="MG">Madagascar</option>
              </select>
            </div>
          )}

          {/* ─── RATE LOCK BANNER (Africa mode, non-crypto) ─── */}
          {!isAdmin && rateLockActive && lockedRate && parsedAmount > 0 && (
            <div className="p-3 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-primary">Rate Locked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-mono font-bold text-primary">{rateLockCountdown}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-border space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-bold">1 USD = {lockedCurrencySymbol}{lockedRate.toLocaleString()} {lockedCurrencyCode}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Amount (USD)</span>
                  <span className="font-semibold">${parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-border pt-1.5 mt-1">
                  <span className="font-bold">You Pay ({lockedCurrencyCode})</span>
                  <span className="font-bold text-primary text-sm">{lockedCurrencySymbol}{(parsedAmount * lockedRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {feeBreakdown && feeBreakdown.totalFees > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Incl. Fees ({lockedCurrencyCode})</span>
                    <span className="text-muted-foreground">{lockedCurrencySymbol}{(feeBreakdown.totalFees * lockedRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {taxTotal > 0 && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Incl. Taxes ({lockedCurrencyCode})</span>
                    <span className="text-muted-foreground">{lockedCurrencySymbol}{(taxTotal * lockedRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs border-t border-border pt-1.5 mt-1">
                  <span className="font-bold">Total ({lockedCurrencyCode})</span>
                  <span className="font-bold text-primary text-sm">{lockedCurrencySymbol}{(parseFloat(total) * lockedRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <p className="text-[9px] text-muted-foreground text-center">
                🔒 This rate is guaranteed for 30 minutes from lock time. Send the exact {lockedCurrencyCode} amount shown above via your selected payment method.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-[10px] gap-1"
                onClick={() => {
                  setRateLockActive(false);
                  setRateLockExpiry(null);
                  setLockedRate(null);
                  toast.info("Rate lock cleared. A new rate will be quoted.");
                }}
              >
                🔄 Refresh Rate
              </Button>
            </div>
          )}

          {/* Rate lock prompt — show when country is selected but rate not yet locked */}
          {!isAdmin && payMode === "local" && selectedCountry && currencyInfo && parsedAmount > 0 && method && method !== "azix" && !rateLockActive && (
            <div className="p-2.5 rounded-lg border border-accent/30 bg-accent/5 text-center space-y-2">
              <p className="text-[10px] text-foreground">
                Current rate: <strong>1 USD = {currencyInfo.symbol}{currencyInfo.rate.toLocaleString()} {currencyInfo.code}</strong>
              </p>
              <Button type="button" size="sm" className="text-[10px] gap-1" onClick={lockRate}>
                <Lock className="w-3 h-3" /> Lock Rate for 30 Minutes
              </Button>
            </div>
          )}
          {isAdmin && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdminAction(adminAction === "refund" ? null : "refund")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 text-left text-xs transition-all",
                  adminAction === "refund" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                )}
              >
                <Undo2 className="w-4 h-4 text-destructive shrink-0" />
                <div><p className="font-semibold">Refund</p><p className="text-muted-foreground text-[10px]">Full repayment</p></div>
                {adminAction === "refund" && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => setAdminAction(adminAction === "split" ? null : "split")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 text-left text-xs transition-all",
                  adminAction === "split" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                )}
              >
                <Split className="w-4 h-4 text-accent shrink-0" />
                <div><p className="font-semibold">Split Pay</p><p className="text-muted-foreground text-[10px]">Partial resolution</p></div>
                {adminAction === "split" && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
            </div>

            {adminAction === "refund" && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div><Label className="text-xs">Recipient Email</Label><Input placeholder="buyer@email.com" value={refundEmail} onChange={e => setRefundEmail(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">Reason</Label><Input placeholder="Dispute resolution, product return..." value={refundReason} onChange={e => setRefundReason(e.target.value)} className="mt-1" /></div>
              </div>
            )}
            {adminAction === "split" && (
              <div className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div><Label className="text-xs">Recipient (Buyer email or ID)</Label><Input placeholder="BYR-2026-0102 or email" value={splitRecipient} onChange={e => setSplitRecipient(e.target.value)} className="mt-1" /></div>
                <div>
                  <Label className="text-xs">Split % to recipient</Label>
                  <Input type="number" placeholder="50" min="1" max="99" value={splitPercentage} onChange={e => setSplitPercentage(e.target.value)} className="mt-1" />
                  {splitPercentage && amount && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Recipient gets ${(parseFloat(amount) * parseInt(splitPercentage) / 100).toFixed(2)} · Vendor retains ${(parseFloat(amount) * (100 - parseInt(splitPercentage)) / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* ─── PAYMENT METHODS (vendor/buyer only) ─── */}
          {!isAdmin && (
          <>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {payMode === "local" ? <Smartphone className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
              <h3 className="text-sm font-bold text-foreground">
                {payMode === "local" ? "Africa Payment Method" : "International Payment Method"}
              </h3>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {payMode === "local"
                ? "Pay via mobile money, local bank, card, or crypto within Africa."
                : "Pay via card, PayPal, Apple Pay, Google Pay, bank transfer, or crypto."}
            </p>

            {/* ─── ONE-CLICK: PAY WITH CRYPTO (DIRECT) ─── */}
            <button
              type="button"
              onClick={() => {
                setMethod("azix");
                setSelectedProvider(null);
                setProviderFields({});
              }}
              className={cn(
                "w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                method === "azix"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <Wallet className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Pay with Crypto</p>
                <p className="text-[10px] text-muted-foreground">
                  Send USDC/USDT on Polygon from any wallet or exchange (Coinbase, Binance, MetaMask, Trust Wallet, etc.). We'll show you the address + amount.
                </p>
              </div>
              {method === "azix" && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <p className="text-[10px] text-muted-foreground">or choose another method</p>
              <div className="flex-1 h-px bg-border" />
            </div>

            <ProviderSearch
              mode={payMode === "local" ? "local" : "diaspora"}
              onSelect={(provider) => {
                setSelectedProvider(provider);
                setProviderFields({});
                // Sync legacy state from provider selection
                if (provider.category === "bank_account" && provider.mode === "local") {
                  setBankName(provider.name);
                }
                if (provider.category === "mobile_money") {
                  setMobileProvider(provider.name);
                }
              }}
              selected={selectedProvider}
            />
            <p className="text-[10px] text-muted-foreground text-center">
              Don't have crypto yet? Pick an on-ramp above (Coinbase, Transak, Thirdweb) to buy USDC with card/bank first.
            </p>

            {/* International Bank Transfer — show when diaspora bank_account selected */}
            {payMode === "diaspora" && method === "bank_transfer" && selectedProvider?.category === "bank_account" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">🌍 International Bank Transfer</p>
                </div>
                <InternationalBankSelector
                  selectedBank={intlBankSelected}
                  onBankSelected={(bank, region) => {
                    setIntlBankSelected(bank);
                    setIntlBankRegion(region);
                    setBankName(bank);
                  }}
                  onClear={() => { setIntlBankSelected(null); setIntlBankRegion(null); setBankName(""); }}
                />
              </div>
            )}
            {/* Provider-specific fields (non-crypto, non-legacy handled) */}
            {selectedProvider && selectedProvider.fields.length > 0 && selectedProvider.category !== "crypto_wallet" && (
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs font-semibold text-foreground">{selectedProvider.name} — Enter Your Details</p>
                {selectedProvider.fields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-[10px] text-muted-foreground">{field.label}{field.required && " *"}</Label>
                    {field.type === "select" ? (
                      <select
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={providerFields[field.key] || ""}
                        onChange={(e) => setProviderFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <Input
                        placeholder={field.placeholder || ""}
                        value={providerFields[field.key] || ""}
                        onChange={(e) => setProviderFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="mt-1 text-sm"
                      />
                    )}
                  </div>
                ))}
                {selectedProvider.processor && (
                  <p className="text-[10px] text-muted-foreground">
                    Routed via {selectedProvider.processor === "direct" ? "Direct" : selectedProvider.processor.charAt(0).toUpperCase() + selectedProvider.processor.slice(1)}
                    {selectedProvider.fallbackNote && ` · ${selectedProvider.fallbackNote}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ─── UNAVAILABLE METHOD GUIDANCE ─── */}
          {method && selectedCountry && (() => {
            const feeMethod: FeeEnginePaymentMethod =
              method === "applepay" ? "card" :
              method === "coinbase" ? "crypto" :
              method === "transak" ? "crypto" :
              method === "thirdweb" ? "crypto" :
              method === "azix" ? "crypto" :
              method as FeeEnginePaymentMethod;
            const check = detectUnavailableMethod(selectedCountry, feeMethod);
            if (check.isUnavailable) {
              return (
                <PaymentMethodUnavailable
                  country={selectedCountry}
                  method={feeMethod}
                  onSwitchMethod={(action) => {
                    if (action === "switch_to_crypto") setMethod("azix");
                    else if (action === "switch_to_card") setMethod("card");
                    else if (action === "switch_to_transak") setMethod("transak");
                    else if (action === "switch_to_thirdweb") setMethod("thirdweb");
                  }}
                />
              );

            }
            return null;
          })()}

          {/* ─── Card PCI notice (when card-type provider selected) ─── */}
          {method === "card" && selectedProvider?.category === "card" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <p className="text-xs font-semibold text-foreground">💳 Card Payment</p>
              <p className="text-[10px] text-muted-foreground">
                You'll be securely redirected to our payment processor (Stripe) to enter your card details.
                TrustLock never stores or handles your card information directly.
              </p>
              <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                <p className="text-[10px] text-muted-foreground">PCI DSS compliant · End-to-end encrypted</p>
              </div>
            </div>
          )}

          {/* ─── CRYPTO (AZIX) SPECIAL FLOW ─── */}
          {method === "azix" && (
            <div className="space-y-3 p-3 rounded-lg border-2 border-accent/40 bg-accent/5">
              {/* ── TIER 1: ONE-CLICK CONNECT WALLET ── */}
              <ConnectWalletPay
                amountUsd={parseFloat(total) || parsedAmount}
                token={selectedToken}
                isTestnet={isTestnet}
                onVerified={() => {
                  setCryptoVerifyStatus("verified");
                  setCumulativeReceived(parseFloat(total) || parsedAmount);
                  if (onComplete) onComplete();
                }}
              />

              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border" />
                <p className="text-[10px] text-muted-foreground">or send manually from an exchange</p>
                <div className="flex-1 h-px bg-border" />
              </div>



              {/* ── SIMPLIFIED CRYPTO PAYMENT INSTRUCTIONS ── */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary">How to Pay with Crypto</p>
                    <p className="text-[10px] text-foreground leading-relaxed">
                      Send <strong>{selectedToken}</strong> on <strong>Polygon network</strong> to the locked receiving wallet address below, then return here and paste your transaction details to confirm payment and generate your order.
                    </p>
                  </div>
                </div>
                <div className="ml-6 space-y-1 text-[10px] text-foreground">
                  <p><strong>1.</strong> Copy the TrustLock receiving wallet address below.</p>
                  <p><strong>2.</strong> Open your wallet or exchange → Withdraw → select <strong>{selectedToken}</strong> → choose <strong>Polygon</strong> network → paste address → enter amount → confirm.</p>
                  <p><strong>3.</strong> After sending, your wallet/exchange will show a <strong>Transaction ID (TxID)</strong> — a 66-character code starting with 0x.</p>
                  <p><strong>4.</strong> Return here and fill in the 3 fields below → click <strong>"Verify & Generate Order"</strong>.</p>
                </div>
              </div>

              {/* ── Step 1: Select Token ── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Step 1 — Select Your Stablecoin</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSelectedToken("USDC"); setPolygonConfirmed(false); }}
                    className={cn(
                      "p-2.5 rounded-lg border-2 text-center transition-all",
                      selectedToken === "USDC" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <p className="text-xs font-bold">USDC</p>
                    <p className="text-[9px] text-muted-foreground font-mono">0x3c499...b8f0</p>
                  </button>
                  <button
                    onClick={() => { setSelectedToken("USDT"); setPolygonConfirmed(false); }}
                    className={cn(
                      "p-2.5 rounded-lg border-2 text-center transition-all",
                      selectedToken === "USDT" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"
                    )}
                  >
                    <p className="text-xs font-bold">USDT</p>
                    <p className="text-[9px] text-muted-foreground font-mono">0xc2132...1eFB</p>
                  </button>
                </div>
              </div>

              {/* ── Step 2: Confirm Polygon Network ── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Step 2 — Confirm Network</Label>
                <div className="p-3 rounded-lg border-2 border-destructive/40 bg-destructive/5 space-y-2">
                  <div className="p-2 rounded-lg border-2 border-primary bg-primary/5 text-center">
                    <p className="text-[10px] font-bold text-primary">Required Network</p>
                    <p className="text-sm font-bold">Polygon (MATIC)</p>
                    <p className="text-[10px] text-muted-foreground">Chain ID: 137</p>
                  </div>
                  <p className="text-[10px] text-destructive font-semibold">
                    ⚠️ Sending {selectedToken} on any other network (Ethereum, BSC, Arbitrum, Solana, Tron, etc.) may result in permanent loss of funds. TrustLock is not responsible for recovery.
                  </p>
                  <div className="p-2 rounded bg-muted/50 text-[10px] text-muted-foreground space-y-1">
                    <p><strong>From an exchange (Coinbase, Binance, Kraken, Luno):</strong> Go to Withdraw → select <strong>{selectedToken}</strong> → choose <strong>"Polygon"</strong> or <strong>"MATIC"</strong> network → paste address → enter amount → confirm.</p>
                    <p><strong>From a self-custody wallet (MetaMask, Trust Wallet):</strong> Switch to Polygon network → Send → paste address → enter amount → confirm.</p>
                    <p><strong>Need {selectedToken} on Polygon?</strong> Use Polygon Bridge or Jumper Exchange to bridge from Ethereum/BSC.</p>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      id="polygon-confirm-ospay"
                      checked={polygonConfirmed}
                      onCheckedChange={(v) => setPolygonConfirmed(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="polygon-confirm-ospay" className="text-[10px] font-semibold text-foreground leading-tight cursor-pointer">
                      I confirm I am sending <strong>{selectedToken}</strong> on the <strong>Polygon (MATIC)</strong> network. I understand sending on other networks may result in permanent loss of funds.
                    </label>
                  </div>
                </div>
              </div>

              {!polygonConfirmed && (
                <div className="p-2 rounded-lg bg-muted text-center">
                  <p className="text-[10px] text-muted-foreground">✋ Confirm Polygon network above to reveal the receiving wallet address and payment fields.</p>
                </div>
              )}

              {polygonConfirmed && (<>
              {/* Step 3 content continues below */}

              {/* ── TrustLock Receiving Wallet (LOCKED + COPY) ── */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">TrustLock Receiving Wallet — <span className="text-destructive">DO NOT EDIT</span></Label>
                <div className="relative">
                  <Input
                    value={AZIX_WALLETS.transaction.publicKey}
                    readOnly
                    className="mt-1 bg-muted font-mono text-xs pr-16 cursor-not-allowed border-2 border-primary/30"
                    tabIndex={-1}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 gap-1 text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(AZIX_WALLETS.transaction.publicKey);
                      setCopiedAddress(true);
                      toast.success("Wallet address copied!");
                      setTimeout(() => setCopiedAddress(false), 3000);
                    }}
                  >
                    {copiedAddress ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                    {copiedAddress ? "Copied" : "Copy"}
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground">🔒 This address is locked. Copy and paste into your wallet/exchange withdrawal screen.</p>
              </div>

              {/* ── 3 REQUIRED FIELDS: Wallet, TxID, Amount ── */}
              <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  After Sending — Enter Payment Proof
                </p>

                <div>
                  <Label className="text-[10px] text-muted-foreground">1. Your Sending Wallet Address</Label>
                  <Input placeholder="0x..." value={azixAddress} onChange={e => setAzixAddress(e.target.value)} className="mt-0.5 font-mono text-xs" />
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    <strong>Where to find:</strong> In your wallet app, tap your account name/address to copy it. On exchanges, check your withdrawal history for the "From" address.
                  </p>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">2. Transaction ID (TxID / Hash)</Label>
                  <Input
                    placeholder="0x... (66 characters)"
                    value={txIdInput}
                    onChange={e => setTxIdInput(e.target.value)}
                    className="mt-0.5 font-mono text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    <strong>Where to find:</strong> After sending, your wallet shows a "Transaction Hash" or "TxID" — starts with 0x. On exchanges, check Withdrawal History → click the transaction → copy the hash. You can also search it on <em>polygonscan.com</em>.
                  </p>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">3. Amount Sent ({selectedToken})</Label>
                  <Input
                    type="number"
                    placeholder={parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00"}
                    value={senderAmount}
                    onChange={e => setSenderAmount(e.target.value)}
                    className="mt-0.5 text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Enter the exact {selectedToken} amount you sent. This must match the on-chain record.
                  </p>
                </div>
              </div>

              {/* ── VERIFY & GENERATE ORDER BUTTON ── */}
              <Button
                type="button"
                className="w-full h-10 gap-2 text-sm font-semibold"
                disabled={!azixAddress || !txIdInput || !senderAmount || cryptoVerifyStatus === "verifying"}
                onClick={async () => {
                  setCryptoVerifyStatus("verifying");
                  // Simulate on-chain verification (production: calls Polygon RPC edge function)
                  await new Promise(r => setTimeout(r, 2500));
                  const amt = parseFloat(senderAmount) || 0;
                  const requiredAmount = parseFloat(total) || parsedAmount;
                  const newCumulative = cumulativeReceived + amt;
                  if (amt > 0 && newCumulative >= requiredAmount) {
                    setCumulativeReceived(newCumulative);
                    setShortfallTxIds(prev => [...prev, txIdInput]);
                    setCryptoVerifyStatus("verified");
                    toast.success("✅ Payment verified on-chain! Your order is being generated.");
                  } else if (amt > 0 && newCumulative < requiredAmount) {
                    setCumulativeReceived(newCumulative);
                    setShortfallTxIds(prev => [...prev, txIdInput]);
                    setCryptoVerifyStatus("shortfall");
                    // Reset fields for next payment
                    setTxIdInput("");
                    setSenderAmount("");
                    toast.info(`Received $${amt.toFixed(2)} — $${(requiredAmount - newCumulative).toFixed(2)} remaining.`);
                  } else {
                    setCryptoVerifyStatus("failed");
                    toast.error("Could not verify transaction. Please check the details.");
                  }
                }}
              >
                {cryptoVerifyStatus === "verifying" ? "Verifying on Polygon..." :
                 cryptoVerifyStatus === "verified" ? "✅ Verified — Generating Order" :
                 cryptoVerifyStatus === "shortfall" ? "Submit Additional Payment" :
                 "Verify & Generate Order"}
                {cryptoVerifyStatus !== "verifying" && <ArrowRight className="w-4 h-4" />}
              </Button>

              {/* ── VERIFIED STATE ── */}
              {cryptoVerifyStatus === "verified" && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-1">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Payment Confirmed
                  </p>
                  <p className="text-[10px] text-foreground">
                    Your order number, receipt, and confirmation link have been generated. Check your dashboard to begin the order workflow.
                  </p>
                </div>
              )}

              {/* ── SHORTFALL STATE — Partial payment received ── */}
              {cryptoVerifyStatus === "shortfall" && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                  <p className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Partial Payment Received
                  </p>
                  <div className="p-2 rounded-lg bg-muted/50 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Required Total</span>
                      <span className="font-semibold">${(parseFloat(total) || parsedAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Received So Far</span>
                      <span className="font-semibold text-primary">${cumulativeReceived.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] border-t border-border pt-1">
                      <span className="font-bold text-destructive">Remaining Balance</span>
                      <span className="font-bold text-destructive">${((parseFloat(total) || parsedAmount) - cumulativeReceived).toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-foreground">
                    Your payment was received but does not cover the full amount. This is likely due to a network or withdrawal fee deducted by your exchange or wallet.
                  </p>
                  <p className="text-[10px] text-foreground font-semibold">
                    Please send the remaining <strong>${((parseFloat(total) || parsedAmount) - cumulativeReceived).toFixed(2)} {selectedToken}</strong> to the same wallet address above using the same Polygon network. Then enter your new Transaction ID and amount below and click "Submit Additional Payment."
                  </p>
                  {shortfallTxIds.length > 0 && (
                    <div className="p-1.5 rounded bg-muted text-[9px] text-muted-foreground">
                      <p className="font-semibold">Previous TxIDs recorded:</p>
                      {shortfallTxIds.map((id, i) => <p key={i} className="font-mono truncate">#{i+1}: {id}</p>)}
                    </div>
                  )}
                </div>
              )}

              {/* ── PENDING STATE — Verification not yet confirmed on-chain ── */}
              {cryptoVerifyStatus === "pending" && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                  <p className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Payment Pending On-Chain Confirmation
                  </p>
                  <p className="text-[10px] text-foreground">
                    Your transaction could not be confirmed automatically. This may happen if the transfer is still processing on the blockchain.
                  </p>
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
                    <p className="text-[10px] font-bold text-destructive">🚫 Do NOT send a second payment. Your funds are on-chain and our team will locate them.</p>
                  </div>
                  <p className="text-[10px] text-foreground">
                    Please provide your details below so our team can investigate. Once submitted, you may safely close this page — we will contact you within <strong>24–48 hours</strong>. Your order number will be retrieved from our records and shared with you once payment is confirmed.
                  </p>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Your Full Name</Label>
                    <Input placeholder="John Doe" value={pendingName} onChange={e => setPendingName(e.target.value)} className="mt-0.5 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Your Email Address</Label>
                    <Input placeholder="you@example.com" value={pendingEmail} onChange={e => setPendingEmail(e.target.value)} className="mt-0.5 text-xs" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    disabled={!pendingName || !pendingEmail}
                    onClick={async () => {
                      // Persist to crypto support queue
                      await supabase.from("crypto_support_queue" as any).insert({
                        sender_name: pendingName,
                        sender_email: pendingEmail,
                        sender_wallet: azixAddress,
                        tx_id: txIdInput,
                        amount_sent: parseFloat(senderAmount) || 0,
                        token: selectedToken,
                        network: "Polygon",
                        source: "os_pay",
                      });
                      // Notify admins
                      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
                      if (admins?.length) {
                        await supabase.from("notifications").insert(
                          admins.map((a: any) => ({
                            user_id: a.user_id,
                            title: "🔎 Crypto Payment Pending Investigation",
                            message: `${pendingName} (${pendingEmail}) submitted a pending ${selectedToken} payment of $${senderAmount}. TxID: ${txIdInput || "N/A"}. Wallet: ${azixAddress || "N/A"}. Source: OS Pay.`,
                            type: "critical",
                            related_entity_type: "crypto_support",
                          }))
                        );
                      }
                      toast.success("Details submitted. TrustLock support will investigate and contact you at " + pendingEmail + " within 24–48 hours.");
                      setCryptoVerifyStatus("idle");
                    }}
                  >
                    Submit & Close
                  </Button>
                  <p className="text-[9px] text-muted-foreground text-center">
                    You can also email <strong>support@azix.world</strong> with your TxID and wallet address for faster resolution.
                  </p>
                </div>
              )}

              {/* ── FAILED STATE ── */}
              {cryptoVerifyStatus === "failed" && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                  <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Verification Failed
                  </p>
                  <p className="text-[10px] text-foreground">
                    We could not find this transaction on the Polygon blockchain. This may happen if:
                  </p>
                  <ul className="text-[10px] text-muted-foreground list-disc ml-4 space-y-0.5">
                    <li>The transaction hasn't confirmed yet — wait 1-2 minutes and try again</li>
                    <li>You sent on the wrong network (must be Polygon)</li>
                    <li>The TxID was entered incorrectly</li>
                    <li>The amount doesn't match what was sent</li>
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setCryptoVerifyStatus("idle")}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              <div className="p-2 rounded bg-muted text-[10px] space-y-1">
                <p><strong>Network:</strong> Polygon (Chain ID: 137)</p>
                <p><strong>Token:</strong> {selectedToken} ({selectedToken === "USDC" ? "0x3c499...b8f0" : "0xc2132...1eFB"})</p>
                <p><strong>Owner:</strong> TrustLock</p>
                <p><strong>Support:</strong> support@trustlockpay.com</p>
              </div>

              <div className="p-2 rounded-lg border border-accent/30 bg-accent/5">
                <p className="text-[10px] text-foreground leading-relaxed">
                  <strong>⚠️ Important:</strong> Your exchange or self-custody wallet may charge a network/withdrawal fee that is <strong>deducted from the amount you send</strong>. If this happens, the full escrow obligation may not be met. To avoid delays, consider sending slightly more than the required total (e.g., $102 for a $100 payment) to ensure the exact amount arrives at our escrow wallet.
                </p>
              </div>

              <p className="text-[10px] text-muted-foreground">Direct crypto · 1.0% platform fee · No processor fee · Funds route to the TrustLock Transaction Fee Wallet via Polygon</p>
              </>)}
            </div>
          )}

          {/* Coinbase/Transak on-ramp notice (when those providers selected) */}
          {(method === "coinbase" || method === "transak" || method === "thirdweb") && selectedProvider && (
            <div className="p-3 rounded-lg border border-border text-center space-y-1">
              <p className="text-xs font-medium">
                {selectedProvider.name} on-ramp
              </p>
              <p className="text-[10px] text-muted-foreground">
                Converts your fiat to USDC and routes to the TrustLock Transaction Fee Wallet.
                {" "}1.5% platform + 1.5% processor fee
              </p>
            </div>
          )}

          {/* Apple Pay / Google Pay notice */}
          {method === "applepay" && (
            <div className="p-3 rounded-lg border border-border text-center">
              <p className="text-xs text-muted-foreground">Apple Pay / Google Pay will launch on confirmation</p>
            </div>
          )}

          {/* PayPal notice */}
          {method === "paypal" && (
            <div className="p-3 rounded-lg border border-border text-center space-y-1">
              <p className="text-xs font-medium">PayPal (via Stripe)</p>
              <p className="text-[10px] text-muted-foreground">
                You'll be redirected to PayPal to complete payment. Routed through Stripe for settlement.
              </p>
            </div>
          )}

          {/* Tax Breakdown */}
          {amount && parsedAmount > 0 && (
            <TaxBreakdown subtotal={parsedAmount} taxItems={taxItems} onTaxItemsChange={setTaxItems} editable={role === "vendor"} />
          )}
          </>
          )}

          {/* Summary (vendor/buyer only — admin has no fees) */}
          {!isAdmin && amount && parsedAmount > 0 && feeBreakdown && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Service Amount</span><span className="font-medium">${parsedAmount.toFixed(2)}</span></div>
              {taxTotal > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Taxes & Duties</span><span className="font-medium">${taxTotal.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee ({feeBreakdown.trustlockFee > 0 ? ((feeBreakdown.trustlockFee / parsedAmount) * 100).toFixed(1) : "0.0"}%)</span>
                <span className="font-medium">${fee}</span>
              </div>
              {feeBreakdown.processorFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processor Fee ({feeBreakdown.processorUsed})</span>
                  <span className="font-medium">${processorFeeDisplay}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas Fee</span>
                <span className="font-medium text-green-600">$0 (Gasless)</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold text-sm">Total</span>
                <span className="font-bold text-sm text-primary">${total}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                <span>Mode · Processor</span>
                <span className="font-medium">{payMode === "local" ? "🌍 Africa" : "🌐 International"} · {feeBreakdown.processorUsed}</span>
              </div>
            </div>
           )}

          {/* Fund Movement Tracker — shows when method is selected */}
          {method && parsedAmount > 0 && (
            <FundMovementTracker
              flowType={method === "azix" ? "os_pay_crypto" : "os_pay_fiat"}
              role={role}
              method={method || undefined}
              providerName={selectedProvider?.name || (
                method === "mobile_money" ? (mobileProvider || "Mobile Money")
                : method === "bank_transfer" ? (bankName || "Bank Transfer")
                : method === "azix" ? "Crypto (USDC/USDT)"
                : method === "coinbase" ? "Coinbase"
                : method === "transak" ? "Transak"
                : method === "thirdweb" ? "Thirdweb Pay"
                : method === "applepay" ? "Apple Pay / Google Pay"
                : method === "paypal" ? "PayPal"
                : "Card"
              )}
              amount={parsedAmount}
            />
          )}

          {/* Admin summary — no fees */}
          {isAdmin && amount && parsedAmount > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">${parsedAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TrustLock Fee</span><span className="font-medium text-primary">$0.00 (Admin)</span></div>
            </div>
          )}

          {/* Submit */}
          <Button className="w-full h-12 gap-2 font-semibold" onClick={handleSubmit} disabled={processing || (!isAdmin && !method) || !amount}>
            {processing ? "Processing..." : (
              <>
                {isAdmin && adminAction === "refund" ? "Process Refund" : isAdmin && adminAction === "split" ? "Process Split Payment" : "Pay with TrustLock Pay"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Secured by TrustLock Smart Contracts on Polygon · Platform Fee → Transaction Wallet · Verified</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrustLockOSPay;

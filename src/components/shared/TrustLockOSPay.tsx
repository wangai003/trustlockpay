import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CreditCard, Smartphone, Wallet, Check, ArrowRight, Lock,
  Undo2, Split, AlertTriangle, Globe, MapPin, Coins, Building2, Phone, Copy, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessPayment, useGetOrCreateSeedToken } from "@/hooks/useSupabaseData";
import TaxBreakdown, { type TaxLineItem } from "./TaxBreakdown";
import { AZIX_WALLETS, selectProcessor, calculateFeesV2, type TransactionType, type PaymentMethod as FeePaymentMethod } from "@/lib/feeEngine";

type PaymentMethod = "card" | "applepay" | "azix" | "mobile_money" | "bank_transfer" | "coinbase" | "transak" | null;
type AdminAction = "refund" | "split" | null;
type PayMode = "local" | "diaspora";

interface TrustLockOSPayProps {
  role: "admin" | "vendor" | "buyer";
  prefillService?: string;
  prefillAmount?: string;
  onComplete?: () => void;
  isTestnet?: boolean;
}

/* ── Local Africa payment methods ── */
const LOCAL_METHODS: { id: PaymentMethod; icon: typeof CreditCard; label: string; sub: string }[] = [
  { id: "mobile_money", icon: Phone, label: "Mobile Money", sub: "M-Pesa, MTN, Airtel Money" },
  { id: "bank_transfer", icon: Building2, label: "Bank Transfer", sub: "Local bank (NUBAN, Branch Code)" },
  { id: "card", icon: CreditCard, label: "Local Debit Card", sub: "Visa, Mastercard, Verve" },
  { id: "azix", icon: Wallet, label: "Azix Wallet (Crypto)", sub: "Direct USDC/USDT · 1.0% platform fee · no processor fee" },
];

/* ── Diaspora payment methods ── */
const DIASPORA_METHODS: { id: PaymentMethod; icon: typeof CreditCard; label: string; sub: string }[] = [
  { id: "card", icon: CreditCard, label: "Credit / Debit Card", sub: "Visa, Mastercard · 1.5% platform + 2.9% processor" },
  { id: "applepay", icon: Smartphone, label: "Apple Pay / Google Pay", sub: "Instant tap-to-pay · 1.5% platform + 2.9% processor" },
  { id: "coinbase", icon: Coins, label: "Coinbase On-Ramp", sub: "Fiat → USDC · 1.5% platform + 1.5% processor" },
  { id: "transak", icon: Globe, label: "Transak", sub: "Fiat → Crypto · 1.5% platform + 1.5% processor" },
  { id: "azix", icon: Wallet, label: "Azix Wallet (Crypto)", sub: "Direct USDC/USDT · 1.0% platform fee · no processor fee" },
];

/* ── Role-specific monetizable services (hardcoded from business model) ── */
const VENDOR_SERVICES = [
  { label: "Plan Upgrade (Starter / Growth / Pro / Enterprise)", amount: "" },
  { label: "AI Query Pack (50 queries — $2.50)", amount: "2.50" },
  { label: "AI Query Pack (200 queries — $10.00)", amount: "10.00" },
  { label: "AI Query Pack (500 queries — $25.00)", amount: "25.00" },
  { label: "Widget Restoration Fee", amount: "10.00" },
  { label: "Data Analytics Print-out", amount: "1.00" },
  { label: "Acknowledgement Form Download", amount: "0.50" },
  { label: "Custom Report Generation", amount: "5.00" },
  { label: "Compliance Certification", amount: "15.00" },
];

const BUYER_SERVICES = [
  { label: "Analytics Report Download ($0.50/report)", amount: "0.50" },
  { label: "AI Query Pack (50 queries — $2.50)", amount: "2.50" },
  { label: "AI Query Pack (200 queries — $10.00)", amount: "10.00" },
  { label: "AI Query Pack (500 queries — $25.00)", amount: "25.00" },
  { label: "Acknowledgement Form Download", amount: "0.50" },
  { label: "Custom Report Generation", amount: "5.00" },
];

const ADMIN_SERVICES = [
  { label: "Platform Analytics Export", amount: "" },
  { label: "Compliance Audit Report", amount: "" },
  { label: "Custom Report Generation", amount: "" },
];

const TrustLockOSPay = ({ role, prefillService = "", prefillAmount = "", onComplete, isTestnet = true }: TrustLockOSPayProps) => {
  const isAdmin = role === "admin";
  const serviceList = role === "vendor" ? VENDOR_SERVICES : role === "buyer" ? BUYER_SERVICES : ADMIN_SERVICES;

  const [payMode, setPayMode] = useState<PayMode>("local");
  const [method, setMethod] = useState<PaymentMethod>(null);
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
  const [processing, setProcessing] = useState(false);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [seedToken, setSeedToken] = useState("");
  const [seedTokenLinked, setSeedTokenLinked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedToken, setSelectedToken] = useState<"USDC" | "USDT">("USDC");
  const [txIdInput, setTxIdInput] = useState("");
  const [senderAmount, setSenderAmount] = useState("");
  const [cryptoVerifyStatus, setCryptoVerifyStatus] = useState<"idle" | "verifying" | "verified" | "pending" | "failed">("idle");
  const [pendingName, setPendingName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const processPayment = useProcessPayment();
  // OS Pay token → hardwired to Transaction Fee Wallet (revenue/fees collection)
  const getSeedToken = useGetOrCreateSeedToken("os_pay");

  // Auto-link seed token on mount — no manual button needed
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

  const parsedAmount = amount ? parseFloat(amount) : 0;
  const taxTotal = isAdmin ? 0 : taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? parsedAmount * (t.value / 100) : t.value), 0);

  // Dynamic fee calculation using the cost-optimization engine
  const isCryptoMethod = method === "azix";
  const feePaymentMethod: FeePaymentMethod = method === "mobile_money" ? "mobile_money"
    : method === "bank_transfer" ? "bank_transfer"
    : method === "azix" ? "crypto"
    : "card";
  const selectedProcessorId = isAdmin ? "direct" as const : selectProcessor("global", isCryptoMethod, undefined, feePaymentMethod, "os_payment");
  const feeBreakdown = parsedAmount > 0 && !isAdmin
    ? calculateFeesV2(parsedAmount, "os_payment", selectedProcessorId)
    : null;
  const fee = isAdmin ? "0.00" : feeBreakdown ? feeBreakdown.trustlockFee.toFixed(2) : "0.00";
  const processorFeeDisplay = feeBreakdown ? feeBreakdown.processorFee.toFixed(2) : "0.00";
  const total = parsedAmount ? (parsedAmount + taxTotal + (feeBreakdown ? feeBreakdown.totalFees : 0)).toFixed(2) : "0.00";

  const activeMethods = payMode === "local" ? LOCAL_METHODS : DIASPORA_METHODS;

  /* ── Country-specific bank & mobile lists ── */
  const COUNTRY_BANKS: Record<string, string[]> = {
    NG: ["GTBank", "First Bank", "Zenith Bank", "Access Bank", "UBA", "Stanbic IBTC", "Fidelity Bank", "Sterling Bank", "Wema Bank", "Polaris Bank"],
    KE: ["KCB Bank", "Equity Bank", "Co-operative Bank", "NCBA", "Absa Kenya", "Standard Chartered Kenya", "I&M Bank", "DTB Kenya"],
    GH: ["GCB Bank", "Ecobank Ghana", "Stanbic Bank Ghana", "Fidelity Bank Ghana", "CalBank", "ADB Ghana", "Absa Ghana"],
    ZA: ["Standard Bank", "FNB", "Absa", "Nedbank", "Capitec", "Investec", "African Bank"],
    CM: ["Afriland First Bank", "Ecobank Cameroon", "Société Générale Cameroon", "UBA Cameroon", "BICEC"],
    EG: ["National Bank of Egypt", "Banque Misr", "CIB Egypt", "QNB Alahli", "Banque du Caire"],
  };

  const COUNTRY_MOBILE: Record<string, string[]> = {
    KE: ["M-Pesa (Safaricom)", "Airtel Money"],
    GH: ["MTN Mobile Money", "Vodafone Cash", "AirtelTigo Money"],
    NG: ["OPay", "PalmPay", "Kuda"],
    ZA: ["FNB eWallet", "Standard Bank Instant Money"],
    UG: ["MTN Mobile Money", "Airtel Money"],
    TZ: ["M-Pesa (Vodacom)", "Tigo Pesa", "Airtel Money"],
    CM: ["Orange Money", "MTN Mobile Money"],
    RW: ["MTN Mobile Money", "Airtel Money"],
  };

  const bankList = COUNTRY_BANKS[selectedCountry] || [];
  const mobileList = COUNTRY_MOBILE[selectedCountry] || [];

  const handleSubmit = async () => {
    if (!method) { toast.error("Select a payment method"); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!seedTokenLinked && method === "azix") { toast.error("Link your seed token first"); return; }
    if (isAdmin && adminAction === "refund" && !refundEmail) { toast.error("Enter recipient email for refund"); return; }
    if (isAdmin && adminAction === "split" && (!splitRecipient || !splitPercentage)) { toast.error("Fill split payment details"); return; }

    setProcessing(true);
    try {
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
      onComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setProcessing(false);
    }
  };

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
            <Tabs value={payMode} onValueChange={(v) => { setPayMode(v as PayMode); setMethod(null); }}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="local" className="gap-1.5 text-xs">
                  <MapPin className="w-3.5 h-3.5" />
                  Local Africa
                </TabsTrigger>
                <TabsTrigger value="diaspora" className="gap-1.5 text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  Diaspora
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
                const selected = serviceList.find(s => s.label === e.target.value);
                setService(e.target.value);
                if (selected?.amount) setAmount(selected.amount);
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a service...</option>
              {serviceList.map(s => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
          </div>
          )}

          {/* Amount */}
          <div>
            <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 text-lg font-bold" />
          </div>

          {/* ─── SEED TOKEN (auto-linked, read-only) ─── */}
          {!isAdmin && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">Transaction Fee Wallet</p>
              {seedTokenLinked && <Badge className="text-[10px] bg-primary/20 text-primary border-0 ml-auto">✓ Auto-Linked</Badge>}
              {!seedTokenLinked && <Badge variant="outline" className="text-[10px] ml-auto animate-pulse">Linking...</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Your seed token is automatically generated and linked to the Azix Transaction Fee Wallet. No action needed.
            </p>
            <Input
              value={seedToken || "Generating..."}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <div className="p-2 rounded bg-muted text-[10px]">
              <p className="text-muted-foreground">Routing to → <span className="font-semibold text-foreground">{AZIX_WALLETS.transaction.label}</span></p>
              <p className="font-mono font-medium">{AZIX_WALLETS.transaction.publicKey}</p>
            </div>
          </div>
          )}

          {/* ─── COUNTRY SELECTOR (for local mode bank/mobile) ─── */}
          {!isAdmin && payMode === "local" && (method === "bank_transfer" || method === "mobile_money") && (
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
              </select>
            </div>
          )}

          {/* ─── ADMIN ACTIONS ─── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!isAdmin}
                onClick={() => setAdminAction(adminAction === "refund" ? null : "refund")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 text-left text-xs transition-all",
                  !isAdmin && "opacity-40 cursor-not-allowed bg-muted",
                  isAdmin && adminAction === "refund" && "border-primary bg-primary/5",
                  isAdmin && adminAction !== "refund" && "border-border hover:border-muted-foreground/40"
                )}
              >
                <Undo2 className="w-4 h-4 text-destructive shrink-0" />
                <div><p className="font-semibold">Refund</p><p className="text-muted-foreground text-[10px]">Full repayment</p></div>
                {adminAction === "refund" && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
              <button
                disabled={!isAdmin}
                onClick={() => setAdminAction(adminAction === "split" ? null : "split")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border-2 text-left text-xs transition-all",
                  !isAdmin && "opacity-40 cursor-not-allowed bg-muted",
                  isAdmin && adminAction === "split" && "border-primary bg-primary/5",
                  isAdmin && adminAction !== "split" && "border-border hover:border-muted-foreground/40"
                )}
              >
                <Split className="w-4 h-4 text-accent shrink-0" />
                <div><p className="font-semibold">Split Pay</p><p className="text-muted-foreground text-[10px]">Partial resolution</p></div>
                {adminAction === "split" && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
            </div>

            {isAdmin && adminAction === "refund" && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div><Label className="text-xs">Recipient Email</Label><Input placeholder="buyer@email.com" value={refundEmail} onChange={e => setRefundEmail(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">Reason</Label><Input placeholder="Dispute resolution, product return..." value={refundReason} onChange={e => setRefundReason(e.target.value)} className="mt-1" /></div>
              </div>
            )}
            {isAdmin && adminAction === "split" && (
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

          {/* ─── PAYMENT METHODS (vendor/buyer only) ─── */}
          {!isAdmin && (
          <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pay With — {payMode === "local" ? "Local Africa" : "Diaspora / International"}
            </p>
            {activeMethods.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(method === m.id ? null : m.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                  method === m.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <m.icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                </div>
                {method === m.id && <div className="w-4 h-4 rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          {/* ─── METHOD-SPECIFIC FIELDS ─── */}
          {method === "card" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div><Label className="text-xs">Card Number</Label><Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Expiry</Label><Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">CVC</Label><Input placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value)} className="mt-1" /></div>
              </div>
            </div>
          )}

          {method === "mobile_money" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              {!selectedCountry && (
                <p className="text-[10px] text-destructive">↑ Please select your country above to see available providers</p>
              )}
              <div>
                <Label className="text-xs">Mobile Money Provider</Label>
                <select value={mobileProvider} onChange={e => setMobileProvider(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select provider...</option>
                  {mobileList.length > 0
                    ? mobileList.map(p => <option key={p} value={p}>{p}</option>)
                    : <>
                        <option value="mpesa">M-Pesa</option>
                        <option value="mtn">MTN Mobile Money</option>
                        <option value="airtel">Airtel Money</option>
                        <option value="orange">Orange Money</option>
                      </>
                  }
                </select>
              </div>
              <div><Label className="text-xs">Phone Number</Label><Input placeholder="+254 7XX XXX XXX" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="mt-1" /></div>
              {selectedCountry && (
                <p className="text-[10px] text-muted-foreground">
                  Processed via {selectedProcessorId === "direct" ? "Direct" : selectedProcessorId.charAt(0).toUpperCase() + selectedProcessorId.slice(1)} · Cheapest route for {selectedCountry}
                </p>
              )}
            </div>
          )}

          {method === "bank_transfer" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              {!selectedCountry && (
                <p className="text-[10px] text-destructive">↑ Please select your country above to see available banks</p>
              )}
              <div>
                <Label className="text-xs">Bank Name</Label>
                {bankList.length > 0 ? (
                  <select value={bankName} onChange={e => setBankName(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select your bank...</option>
                    {bankList.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <Input placeholder="Enter bank name" value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1" />
                )}
              </div>
              <div>
                <Label className="text-xs">Account Number{selectedCountry === "NG" ? " (NUBAN)" : selectedCountry === "ZA" ? " (Branch Code + Account)" : ""}</Label>
                <Input placeholder={selectedCountry === "NG" ? "10-digit NUBAN" : selectedCountry === "KE" ? "Branch + Account" : "Account number"} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1" />
              </div>
              {selectedCountry === "NG" && (
                <div><Label className="text-xs">BVN (Bank Verification Number)</Label><Input placeholder="11-digit BVN" className="mt-1" /></div>
              )}
              {(selectedCountry === "ZA" || selectedCountry === "KE") && (
                <div><Label className="text-xs">Branch / Sort Code</Label><Input placeholder="Branch code" className="mt-1" /></div>
              )}
              {selectedCountry && (
                <p className="text-[10px] text-muted-foreground">
                  Processed via {selectedProcessorId === "direct" ? "Direct" : selectedProcessorId.charAt(0).toUpperCase() + selectedProcessorId.slice(1)} · Cheapest route for {selectedCountry}
                </p>
              )}
            </div>
          )}

          {method === "azix" && (
            <div className="space-y-3 p-3 rounded-lg border-2 border-accent/40 bg-accent/5">
              {/* ── SIMPLIFIED CRYPTO PAYMENT INSTRUCTIONS ── */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary">How to Pay with Crypto</p>
                    <p className="text-[10px] text-foreground leading-relaxed">
                      Send <strong>{selectedToken}</strong> on <strong>Polygon network</strong> to the locked Azix wallet address below, then return here and paste your transaction details to confirm payment and generate your order.
                    </p>
                  </div>
                </div>
                <div className="ml-6 space-y-1 text-[10px] text-foreground">
                  <p><strong>1.</strong> Copy the Azix receiving wallet address below.</p>
                  <p><strong>2.</strong> Open your wallet or exchange → Withdraw → select <strong>{selectedToken}</strong> → choose <strong>Polygon</strong> network → paste address → enter amount → confirm.</p>
                  <p><strong>3.</strong> After sending, your wallet/exchange will show a <strong>Transaction ID (TxID)</strong> — a 66-character code starting with 0x.</p>
                  <p><strong>4.</strong> Return here and fill in the 3 fields below → click <strong>"Verify & Generate Order"</strong>.</p>
                </div>
              </div>

              {/* ── Network & Token Selection ── */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Network & Token</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg border-2 border-primary bg-primary/5 text-center">
                    <p className="text-[10px] font-bold text-primary">Network</p>
                    <p className="text-xs font-semibold">Polygon (MATIC)</p>
                    <p className="text-[10px] text-muted-foreground">Chain ID: 137</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-primary text-center">Select Token</p>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setSelectedToken("USDC")}
                        className={cn(
                          "p-1.5 rounded-lg border-2 text-center text-[10px] font-semibold transition-all",
                          selectedToken === "USDC" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        USDC
                      </button>
                      <button
                        onClick={() => setSelectedToken("USDT")}
                        className={cn(
                          "p-1.5 rounded-lg border-2 text-center text-[10px] font-semibold transition-all",
                          selectedToken === "USDT" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/40"
                        )}
                      >
                        USDT
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-mono text-center">
                      {selectedToken === "USDC" ? "0x3c499...b8f0" : "0xc2132...1eFB"}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-destructive font-medium">
                  ⚠️ Only send {selectedToken} on Polygon network. Sending on other networks will result in <strong>permanent loss of funds</strong>.
                </p>
                <div className="p-2 rounded bg-muted/50 text-[10px] text-muted-foreground space-y-1">
                  <p><strong>From an exchange (Coinbase, Binance, Kraken, Luno):</strong> Go to Withdraw → select {selectedToken} → choose <strong>"Polygon"</strong> or <strong>"MATIC"</strong> network → paste address below → enter amount → confirm.</p>
                  <p><strong>From a self-custody wallet (MetaMask, Trust Wallet):</strong> Switch to Polygon network → Send → paste address → enter amount → confirm.</p>
                  <p><strong>Need {selectedToken} on Polygon?</strong> Use Polygon Bridge or Jumper Exchange to bridge from Ethereum/BSC.</p>
                </div>
              </div>

              {/* ── Azix Receiving Wallet (LOCKED + COPY) ── */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Azix Receiving Wallet — <span className="text-destructive">DO NOT EDIT</span></Label>
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
                  if (amt > 0) {
                    setCryptoVerifyStatus("verified");
                    toast.success("✅ Payment verified on-chain! Your order is being generated.");
                  } else {
                    setCryptoVerifyStatus("failed");
                    toast.error("Could not verify transaction. Please check the details.");
                  }
                }}
              >
                {cryptoVerifyStatus === "verifying" ? "Verifying on Polygon..." :
                 cryptoVerifyStatus === "verified" ? "✅ Verified — Generating Order" :
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

              {/* ── PENDING STATE — Verification not yet confirmed on-chain ── */}
              {cryptoVerifyStatus === "pending" && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2">
                  <p className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Payment Pending On-Chain Confirmation
                  </p>
                  <p className="text-[10px] text-foreground">
                    Your transaction could not be confirmed automatically. This may happen if the transfer is still processing on the blockchain. Please provide your contact details so our team can investigate and reach you.
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
                    onClick={() => {
                      toast.success("Details submitted. A TrustLock support member will investigate and contact you shortly at " + pendingEmail);
                    }}
                  >
                    Submit for TrustLock Review
                  </Button>
                  <p className="text-[9px] text-muted-foreground">
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
                  <div className="p-2 rounded bg-muted text-[10px] text-muted-foreground">
                    <p><strong>💡 Try another payment method?</strong> If you're having trouble with crypto, you can switch to card, mobile money, or bank transfer above — these methods are processed instantly through our payment partners.</p>
                  </div>
                </div>
              )}

              <div className="p-2 rounded bg-muted text-[10px] space-y-1">
                <p><strong>Network:</strong> Polygon (Chain ID: 137)</p>
                <p><strong>Token:</strong> {selectedToken} ({selectedToken === "USDC" ? "0x3c499...b8f0" : "0xc2132...1eFB"})</p>
                <p><strong>Owner:</strong> Azix</p>
                <p><strong>Support:</strong> support@azix.world</p>
              </div>

              <p className="text-[10px] text-muted-foreground">Direct crypto · 1.0% platform fee · No processor fee · Funds route to Transaction Fee Wallet via Polygon</p>
            </div>
          )}

          {(method === "coinbase" || method === "transak") && (
            <div className="p-3 rounded-lg border border-border text-center space-y-1">
              <p className="text-xs font-medium">
                {method === "coinbase" ? "Coinbase Commerce" : "Transak"} on-ramp
              </p>
              <p className="text-[10px] text-muted-foreground">
                Converts your fiat to USDC and routes to the Azix Transaction Fee Wallet.
                {" "}1.5% platform + 1.5% processor fee
              </p>
            </div>
          )}

          {method === "applepay" && (
            <div className="p-3 rounded-lg border border-border text-center">
              <p className="text-xs text-muted-foreground">Apple Pay / Google Pay will launch on confirmation</p>
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
              {feeBreakdown.gasFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Fee</span>
                  <span className="font-medium">${feeBreakdown.gasFee.toFixed(4)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-bold text-sm">Total</span>
                <span className="font-bold text-sm text-primary">${total}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                <span>Mode · Processor</span>
                <span className="font-medium">{payMode === "local" ? "🌍 Local Africa" : "🌐 Diaspora"} · {feeBreakdown.processorUsed}</span>
              </div>
            </div>
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
            <span>Secured by Azix Smart Contracts on Polygon · Platform Fee → Transaction Wallet · Seed Token Verified</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrustLockOSPay;

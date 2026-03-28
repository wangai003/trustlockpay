import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, CreditCard, Smartphone, Wallet, Check, ArrowRight, Lock,
  Undo2, Split, AlertTriangle, Globe, MapPin, Coins, Building2, Phone
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
  { id: "azix", icon: Wallet, label: "Azix Wallet (Crypto)", sub: "Direct USDC · 1.0% platform fee · no processor fee" },
];

/* ── Diaspora payment methods ── */
const DIASPORA_METHODS: { id: PaymentMethod; icon: typeof CreditCard; label: string; sub: string }[] = [
  { id: "card", icon: CreditCard, label: "Credit / Debit Card", sub: "Visa, Mastercard · 1.5% platform + 2.9% processor" },
  { id: "applepay", icon: Smartphone, label: "Apple Pay / Google Pay", sub: "Instant tap-to-pay · 1.5% platform + 2.9% processor" },
  { id: "coinbase", icon: Coins, label: "Coinbase On-Ramp", sub: "Fiat → USDC · 1.5% platform + 1.5% processor" },
  { id: "transak", icon: Globe, label: "Transak", sub: "Fiat → Crypto · 1.5% platform + 1.5% processor" },
  { id: "azix", icon: Wallet, label: "Azix Wallet (Crypto)", sub: "Direct USDC · 1.0% platform fee · no processor fee" },
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

  const processPayment = useProcessPayment();
  const getSeedToken = useGetOrCreateSeedToken();

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

          {/* ─── SEED TOKEN + WALLET LINK (vendor/buyer only) ─── */}
          {!isAdmin && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold">Transaction Fee Wallet Link</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Platform service payments route to the Azix Transaction Fee Wallet. This is separate from the Escrow Wallet used for payouts.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Pay seed token (auto-generated)"
                value={seedToken}
                readOnly
                className="font-mono text-xs bg-muted flex-1"
              />
              <Button
                size="sm"
                variant={seedTokenLinked ? "outline" : "default"}
                onClick={handleLinkSeedToken}
                disabled={seedTokenLinked || getSeedToken.isPending}
                className="shrink-0 text-xs"
              >
                {getSeedToken.isPending ? "Linking..." : seedTokenLinked ? "✓ Linked" : "Link Token"}
              </Button>
            </div>
            {seedTokenLinked && (
              <div className="text-[10px]">
                <div className="p-2 rounded bg-muted">
                  <p className="text-muted-foreground">Routing to → Azix Transaction Fee Wallet</p>
                  <p className="font-mono font-medium">{AZIX_WALLETS.transaction.publicKey}</p>
                  <p className="text-muted-foreground mt-1">{AZIX_WALLETS.transaction.purpose}</p>
                </div>
              </div>
            )}
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
              <div>
                <Label className="text-xs">Mobile Money Provider</Label>
                <select value={mobileProvider} onChange={e => setMobileProvider(e.target.value)} className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select provider...</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="mtn">MTN Mobile Money</option>
                  <option value="airtel">Airtel Money</option>
                  <option value="orange">Orange Money</option>
                  <option value="vodafone">Vodafone Cash</option>
                </select>
              </div>
              <div><Label className="text-xs">Phone Number</Label><Input placeholder="+254 7XX XXX XXX" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="mt-1" /></div>
            </div>
          )}

          {method === "bank_transfer" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div><Label className="text-xs">Bank Name</Label><Input placeholder="e.g. GTBank, KCB, Standard Bank" value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1" /></div>
              <div><Label className="text-xs">Account Number</Label><Input placeholder="Account / NUBAN number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1" /></div>
            </div>
          )}

          {method === "azix" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Azix Transaction Fee Wallet (auto-filled)</Label>
                <Input value={AZIX_WALLETS.transaction.publicKey} disabled className="mt-1 bg-muted font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs">Your Azix Wallet Address</Label>
                <Input placeholder="0x..." value={azixAddress} onChange={e => setAzixAddress(e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
              <p className="text-[10px] text-muted-foreground">Direct crypto · 1.0% platform fee · No processor fee · Funds route to Transaction Fee Wallet</p>
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

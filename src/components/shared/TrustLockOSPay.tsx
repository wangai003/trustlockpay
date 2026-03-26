import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CreditCard, Smartphone, Wallet, Check, ArrowRight, Lock, Undo2, Split } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProcessPayment } from "@/hooks/useSupabaseData";
import TaxBreakdown, { type TaxLineItem } from "./TaxBreakdown";

const TRUSTLOCK_WALLET = "0x7A3b...F92d";

type PaymentMethod = "card" | "applepay" | "azix" | null;
type AdminAction = "refund" | "split" | null;

interface TrustLockOSPayProps {
  role: "admin" | "vendor" | "buyer";
  prefillService?: string;
  prefillAmount?: string;
  onComplete?: () => void;
}

const TrustLockOSPay = ({ role, prefillService = "", prefillAmount = "", onComplete }: TrustLockOSPayProps) => {
  const isAdmin = role === "admin";

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
  const [processing, setProcessing] = useState(false);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const processPayment = useProcessPayment();

  const parsedAmount = amount ? parseFloat(amount) : 0;
  const taxTotal = taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? parsedAmount * (t.value / 100) : t.value), 0);
  const fee = parsedAmount ? (parsedAmount * 0.015).toFixed(2) : "0.00";
  const total = parsedAmount ? (parsedAmount + taxTotal + parseFloat(fee)).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!method) { toast.error("Select a payment method"); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }
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
        refundEmail: refundEmail || undefined,
        refundReason: refundReason || undefined,
        splitRecipient: splitRecipient || undefined,
        splitPercentage: splitPercentage || undefined,
      });
      const label = isAdmin && adminAction === "refund" ? "Refund" : isAdmin && adminAction === "split" ? "Split payment" : "Payment";
      toast.success(`✅ ${label} of $${amount} processed successfully`);
      onComplete?.();
    } catch {
      // error handled by hook
    } finally {
      setProcessing(false);
    }
  };

  const methods: { id: PaymentMethod; icon: typeof CreditCard; label: string; sub: string }[] = [
    { id: "card", icon: CreditCard, label: "Credit / Debit Card", sub: "Visa, Mastercard" },
    { id: "applepay", icon: Smartphone, label: "Apple Pay / Google Pay", sub: "Instant" },
    { id: "azix", icon: Wallet, label: "Azix Wallet", sub: "Pay with USDC balance" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="rounded-t-xl bg-primary p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-foreground" />
          <span className="font-heading font-bold text-sm text-primary-foreground">TrustLock OS Pay</span>
        </div>
        <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
          {isAdmin ? "Admin Access" : "Secure Payment"}
        </Badge>
      </div>

      <Card className="rounded-t-none -mt-4 border-t-0">
        <CardContent className="p-4 space-y-5">
          {/* Service & Amount */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Service / Item</Label>
              <Input placeholder="e.g. Starter Plan, Analytics Report" value={service} onChange={e => setService(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Amount (USD)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 text-lg font-bold" />
            </div>
          </div>

          {/* Admin-only: Refund & Split */}
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
                <div>
                  <p className="font-semibold">Refund</p>
                  <p className="text-muted-foreground text-[10px]">Full repayment</p>
                </div>
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
                <div>
                  <p className="font-semibold">Split Pay</p>
                  <p className="text-muted-foreground text-[10px]">Partial resolution</p>
                </div>
                {adminAction === "split" && <Check className="w-3 h-3 text-primary ml-auto" />}
              </button>
            </div>

            {/* Refund fields */}
            {isAdmin && adminAction === "refund" && (
              <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div>
                  <Label className="text-xs">Recipient Email</Label>
                  <Input placeholder="buyer@email.com" value={refundEmail} onChange={e => setRefundEmail(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Reason</Label>
                  <Input placeholder="Dispute resolution, product return..." value={refundReason} onChange={e => setRefundReason(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}

            {/* Split fields */}
            {isAdmin && adminAction === "split" && (
              <div className="space-y-2 p-3 rounded-lg bg-accent/5 border border-accent/20">
                <div>
                  <Label className="text-xs">Recipient (Buyer email or ID)</Label>
                  <Input placeholder="BYR-2026-0102 or email" value={splitRecipient} onChange={e => setSplitRecipient(e.target.value)} className="mt-1" />
                </div>
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

          {/* Payment methods */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay With</p>
            {methods.map(m => (
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

          {/* Method-specific fields */}
          {method === "card" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div>
                <Label className="text-xs">Card Number</Label>
                <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Expiry</Label><Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">CVC</Label><Input placeholder="123" value={cardCvc} onChange={e => setCardCvc(e.target.value)} className="mt-1" /></div>
              </div>
            </div>
          )}

          {method === "azix" && (
            <div className="space-y-2 p-3 rounded-lg border border-border">
              <div>
                <Label className="text-xs text-muted-foreground">TrustLock Azix Wallet (auto-filled)</Label>
                <Input value={TRUSTLOCK_WALLET} disabled className="mt-1 bg-muted font-mono text-xs" />
              </div>
              <div>
                <Label className="text-xs">Your Azix Wallet Address (optional)</Label>
                <Input placeholder="0x..." value={azixAddress} onChange={e => setAzixAddress(e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
            </div>
          )}

          {method === "applepay" && (
            <div className="p-3 rounded-lg border border-border text-center">
              <p className="text-xs text-muted-foreground">Apple Pay / Google Pay will launch on confirmation</p>
            </div>
          )}

          {/* Tax Breakdown */}
          {amount && parsedAmount > 0 && (
            <TaxBreakdown
              subtotal={parsedAmount}
              taxItems={taxItems}
              onTaxItemsChange={setTaxItems}
              editable={role === "vendor" || role === "admin"}
            />
          )}

          {/* Summary */}
          {amount && parsedAmount > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Escrow Amount</span><span className="font-medium">${parsedAmount.toFixed(2)}</span></div>
              {taxTotal > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Taxes & Duties</span><span className="font-medium">${taxTotal.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">TrustLock Pay Fee (1.5%)</span><span className="font-medium">${fee}</span></div>
              <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="font-bold text-sm">Total</span><span className="font-bold text-sm text-primary">${total}</span></div>
            </div>
          )}

          {/* Submit */}
          <Button className="w-full h-12 gap-2 font-semibold" onClick={handleSubmit} disabled={processing || !method || !amount}>
            {processing ? "Processing..." : (
              <>
                {isAdmin && adminAction === "refund" ? "Process Refund" : isAdmin && adminAction === "split" ? "Process Split Payment" : "Pay with TrustLock Pay"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Secured by Azix Smart Contracts on Polygon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrustLockOSPay;

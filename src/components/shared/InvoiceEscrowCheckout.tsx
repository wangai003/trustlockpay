/**
 * InvoiceEscrowCheckout — buyer→vendor escrow checkout for standalone invoice links,
 * embeddable widget, and public checkout flows.
 *
 * DISTINCT FROM TrustLockOSPay (which is for paying TrustLock itself for OS-internal
 * services like document downloads, AI query packs, subscription plans).
 *
 * This component:
 *   • Renders an invoice summary header (vendor name, line items, grand total) — NO service dropdown
 *   • Locks the amount from props — buyer cannot edit it
 *   • Routes funds to TrustLock intake wallet → escrow (1% fee baked in, extracted at release)
 *   • Anchors `invoice` proof on Polygon via verify-crypto-payment / process-payment pipelines
 */
import { useState, useEffect, useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, CheckCircle2, Copy, FileText, ExternalLink, Wallet, MapPin, Globe,
} from "lucide-react";
import { toast } from "sonner";
import ProviderSearch from "@/components/shared/ProviderSearch";
import ConnectWalletPay from "@/components/shared/ConnectWalletPay";
import TaxBreakdown, { type TaxLineItem } from "@/components/shared/TaxBreakdown";
import FundMovementTracker from "@/components/shared/FundMovementTracker";
import { useProcessPayment } from "@/hooks/useSupabaseData";
import { AZIX_WALLETS, calculateFeesV2, type TransactionType } from "@/lib/feeEngine";
import type { PaymentProvider } from "@/lib/paymentProviders";
import { explorerTxUrl } from "@/lib/polygonExplorer";

type PayMode = "local" | "diaspora";
type PayRail = "fiat" | "crypto";

interface InvoiceLineItem {
  description?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  total?: number;
}

interface InvoiceEscrowCheckoutProps {
  vendorName: string;
  invoiceTitle: string;
  lineItems?: InvoiceLineItem[];
  subtotal: number;
  taxItems?: TaxLineItem[];
  taxTotal: number;
  grandTotal: number;
  currency?: string;
  industry?: string;
  vendorId?: string;
  linkId?: string;
  isTestnet?: boolean;
  onComplete?: () => void;
}

const InvoiceEscrowCheckout = ({
  vendorName,
  invoiceTitle,
  lineItems = [],
  subtotal,
  taxItems = [],
  taxTotal,
  grandTotal,
  currency = "USD",
  industry,
  vendorId,
  linkId,
  isTestnet = false,
  onComplete,
}: InvoiceEscrowCheckoutProps) => {
  const [payRail, setPayRail] = useState<PayRail>("fiat");
  const [payMode, setPayMode] = useState<PayMode>("diaspora");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [token, setToken] = useState<"USDC" | "USDT">("USDC");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<{ confirmationCode: string; txHash?: string } | null>(null);

  const processPayment = useProcessPayment();

  // ── Fee preview (transparent to buyer) ──
  const feeMethod = payRail === "crypto"
    ? "crypto" as const
    : selectedProvider?.category === "mobile_money" ? "mobile_money" as const
    : selectedProvider?.category === "bank_account" ? "bank_transfer" as const
    : "card" as const;
  const txType: TransactionType = payRail === "crypto" ? "checkout_crypto" : "checkout_fiat";
  const processorId = (selectedProvider?.processor as "stripe" | "coinbase" | "transak" | "thirdweb" | "direct" | undefined)
    ?? (payRail === "crypto" ? "direct" : "stripe");
  const feeBreakdown = grandTotal > 0 ? calculateFeesV2(grandTotal, txType, processorId) : null;

  const generateConfirmationCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  const validateGuestFields = () => {
    if (!buyerName.trim()) { toast.error("Enter your full name"); return false; }
    if (!buyerEmail.trim() || !/^\S+@\S+\.\S+$/.test(buyerEmail)) {
      toast.error("Enter a valid email"); return false;
    }
    return true;
  };

  // ─── Fiat path (card / bank / mobile money) ───
  const handleFiatPay = async () => {
    if (!selectedProvider) { toast.error("Select a payment provider"); return; }
    if (!validateGuestFields()) return;

    setProcessing(true);
    try {
      if (isTestnet) {
        await new Promise((r) => setTimeout(r, 1500));
        const code = generateConfirmationCode();
        setSuccess({ confirmationCode: code });
        toast.success(`✅ Escrow lock of $${grandTotal.toFixed(2)} confirmed`);
        onComplete?.();
        return;
      }

      // Mainnet: route through process-payment with checkout context.
      // The backend creates the escrow transaction, anchors the invoice, and
      // routes funds via wallet-routing-bridge.
      const result = await processPayment.mutateAsync({
        action: "payment",
        service: invoiceTitle,
        amount: String(grandTotal),
        fee: feeBreakdown ? feeBreakdown.trustlockFee.toFixed(2) : "0",
        total: String(grandTotal),
        method: feeMethod === "crypto" ? "azix" : feeMethod === "mobile_money" ? "mobile_money"
          : feeMethod === "bank_transfer" ? "bank_transfer" : "card",
        role: "buyer",
        payMode,
        processor: processorId,
        direction: "onramp",
        currency,
        walletAddress: AZIX_WALLETS.transaction.publicKey,
        // Invoice context — backend treats as escrow checkout
        transactionType: txType,
        invoiceContext: {
          vendor_name: vendorName,
          vendor_id: vendorId,
          link_id: linkId,
          industry,
          invoice_title: invoiceTitle,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
        },
        providerDetails: {
          providerId: selectedProvider.id,
          providerName: selectedProvider.name,
          category: selectedProvider.category,
        },
      } as unknown as Parameters<typeof processPayment.mutateAsync>[0]);

      const procResult = (result as Record<string, unknown>)?.processorResult as Record<string, unknown> | undefined;
      if (procResult?.hostedUrl) {
        window.open(procResult.hostedUrl as string, "_blank");
        toast.success("Redirecting to payment page…");
      } else if (procResult?.widgetConfig) {
        toast.success("Payment widget ready — complete the popup");
      } else {
        const code = generateConfirmationCode();
        setSuccess({ confirmationCode: code });
        toast.success(`✅ Escrow lock initiated`);
      }
      onComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  // ─── Crypto path (ConnectWalletPay handles tx → verify-crypto-payment) ───
  const handleCryptoVerified = (txHash: string) => {
    const code = generateConfirmationCode();
    setSuccess({ confirmationCode: code, txHash });
    onComplete?.();
  };

  // ─── SUCCESS SCREEN ───
  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Funds Locked in Escrow</h3>
            <p className="text-sm text-muted-foreground">
              Your payment of <strong>${grandTotal.toFixed(2)} {currency}</strong> to{" "}
              <strong>{vendorName}</strong> is now held in escrow and will be released to the
              vendor upon delivery confirmation.
            </p>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Confirmation Code</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-bold font-mono text-primary">{success.confirmationCode}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(success.confirmationCode); toast.success("Copied!"); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy confirmation code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {success.txHash && (
                <a
                  href={explorerTxUrl(success.txHash, isTestnet ? "amoy" : "polygon")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-2"
                >
                  View on PolygonScan <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <FundMovementTracker
              flowType="checkout_escrow"
              role="buyer"
              method={payRail === "crypto" ? "azix" : selectedProvider?.category || "card"}
              providerName={payRail === "crypto" ? `Crypto (${token})` : (selectedProvider?.name || "Card")}
              amount={grandTotal}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── MAIN CHECKOUT ───
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Invoice header */}
      <Card className="border-2 border-primary/20 overflow-hidden">
        <div className="bg-primary p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-foreground">
            <Shield className="w-5 h-5" />
            <div>
              <h2 className="text-base font-bold">Escrow Checkout</h2>
              <p className="text-[11px] opacity-80">Funds released only after delivery</p>
            </div>
          </div>
          <Badge className={isTestnet
            ? "bg-accent/30 text-accent border-0 text-[10px]"
            : "bg-primary-foreground/20 text-primary-foreground border-0 text-[10px]"}>
            {isTestnet ? "TEST" : "LIVE"}
          </Badge>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Paying</p>
              <p className="text-sm font-bold text-foreground truncate">{vendorName}</p>
              <p className="text-xs text-muted-foreground truncate">{invoiceTitle}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Amount</p>
              <p className="text-2xl font-bold text-primary">${grandTotal.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">{currency}</p>
            </div>
          </div>

          {lineItems.length > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                <FileText className="w-3 h-3" /> Line Items
              </p>
              {lineItems.slice(0, 5).map((item, i) => {
                const desc = item.description || item.name || `Item ${i + 1}`;
                const qty = item.quantity ?? 1;
                const unit = item.unitPrice ?? item.unit_price ?? 0;
                const itemTotal = item.total ?? qty * unit;
                return (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-foreground truncate flex-1">{desc}{qty > 1 ? ` × ${qty}` : ""}</span>
                    <span className="text-muted-foreground tabular-nums shrink-0 ml-2">${itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
              {lineItems.length > 5 && (
                <p className="text-[10px] text-muted-foreground italic">+ {lineItems.length - 5} more items</p>
              )}
            </div>
          )}

          <div className="border-t border-border pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">${subtotal.toFixed(2)}</span></div>
            {taxTotal > 0 && <div className="flex justify-between text-muted-foreground"><span>Taxes & Duties</span><span className="tabular-nums">${taxTotal.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border"><span>Grand Total</span><span className="tabular-nums">${grandTotal.toFixed(2)}</span></div>
          </div>

          {taxItems.length > 0 && <TaxBreakdown subtotal={subtotal} taxItems={taxItems} onTaxItemsChange={() => {}} editable={false} compact />}
        </CardContent>
      </Card>

      {/* Buyer info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your Details</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="buyer-name" className="text-xs">Full Name *</Label>
              <Input id="buyer-name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="buyer-email" className="text-xs">Email *</Label>
              <Input id="buyer-email" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment rail tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Tabs value={payRail} onValueChange={(v) => setPayRail(v as PayRail)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="fiat" className="text-xs"><Wallet className="w-3.5 h-3.5 mr-1.5" /> Card / Bank / Mobile</TabsTrigger>
              <TabsTrigger value="crypto" className="text-xs"><Shield className="w-3.5 h-3.5 mr-1.5" /> Pay with Crypto</TabsTrigger>
            </TabsList>
          </Tabs>

          {payRail === "fiat" && (
            <>
              <Tabs value={payMode} onValueChange={(v) => setPayMode(v as PayMode)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="local" className="text-xs"><MapPin className="w-3.5 h-3.5 mr-1.5" /> Africa</TabsTrigger>
                  <TabsTrigger value="diaspora" className="text-xs"><Globe className="w-3.5 h-3.5 mr-1.5" /> International</TabsTrigger>
                </TabsList>
              </Tabs>
              <ProviderSearch mode={payMode} onSelect={setSelectedProvider} selected={selectedProvider} />

              {feeBreakdown && grandTotal > 0 && (
                <div className="text-[10px] text-muted-foreground bg-muted/40 rounded p-2 space-y-0.5">
                  <div className="flex justify-between"><span>Processor fee</span><span>${feeBreakdown.processorFee.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>TrustLock fee (0.5%)</span><span>${feeBreakdown.trustlockFee.toFixed(2)}</span></div>
                </div>
              )}

              <Button
                className="w-full h-11 text-sm font-semibold gap-2"
                onClick={handleFiatPay}
                disabled={processing || !selectedProvider || grandTotal <= 0}
              >
                <Lock className="w-4 h-4" />
                {processing ? "Locking funds…" : `Lock $${grandTotal.toFixed(2)} in Escrow`}
              </Button>
            </>
          )}

          {payRail === "crypto" && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Token:</Label>
                <Tabs value={token} onValueChange={(v) => setToken(v as "USDC" | "USDT")}>
                  <TabsList>
                    <TabsTrigger value="USDC" className="text-xs">USDC</TabsTrigger>
                    <TabsTrigger value="USDT" className="text-xs">USDT</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {!buyerName.trim() || !buyerEmail.trim() ? (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200">
                  Enter your name and email above before connecting your wallet.
                </div>
              ) : (
                <ConnectWalletPay
                  amountUsd={grandTotal}
                  token={token}
                  isTestnet={isTestnet}
                  sessionId={linkId}
                  onVerified={handleCryptoVerified}
                />
              )}
            </>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            <Lock className="w-2.5 h-2.5 inline mr-1" />
            Funds held in TrustLock escrow · 1% escrow service fee extracted at release · Anchored on Polygon
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceEscrowCheckout;

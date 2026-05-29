/**
 * CryptoPaymentTiers — three-tier crypto payment selector for Checkout.
 *
 * Tier 1: Connect Wallet (one-click) — MetaMask, Coinbase, WalletConnect via Reown AppKit
 * Tier 2: Card → Crypto On-Ramp — Transak / Thirdweb Pay (buyer uses a card, USDC lands in escrow)
 * Tier 3: Manual Address Copy — buyer sends USDC from any exchange/wallet; we verify by tx hash
 *
 * All three settle to the SAME TrustLock intake wallet on Polygon.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, CreditCard, Copy, CheckCircle2, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ConnectWalletPay from "@/components/shared/ConnectWalletPay";
import { AZIX_WALLETS } from "@/lib/feeEngine";
import { cn } from "@/lib/utils";

type Tier = "wallet" | "onramp" | "manual";

interface Props {
  amountUsd: number;
  token: "USDC" | "USDT";
  isTestnet: boolean;
  transactionId?: string;
  sessionId?: string;
  buyerEmail?: string;
  onVerified: (txHash: string, verifiedAmount: number) => void;
}

// Detect placeholder wallet — real Polygon addresses are 0x + 40 hex chars
const isPlaceholderAddress = (addr: string) => !/^0x[a-fA-F0-9]{40}$/.test(addr);

const TIERS: Array<{ id: Tier; title: string; subtitle: string; icon: typeof Wallet; chip: string; chipClass: string }> = [
  {
    id: "wallet",
    title: "Connect Wallet",
    subtitle: "One-click pay from MetaMask, Coinbase, Trust, Rainbow, Ledger, or any WalletConnect-compatible wallet.",
    icon: Wallet,
    chip: "Fastest",
    chipClass: "border-emerald-500/40 text-emerald-500",
  },
  {
    id: "onramp",
    title: "Pay by Card → Crypto",
    subtitle: "Use a Visa/Mastercard — Transak converts to USDC and sends to escrow. No wallet required.",
    icon: CreditCard,
    chip: "No wallet needed",
    chipClass: "border-blue-500/40 text-blue-500",
  },
  {
    id: "manual",
    title: "Send from Any Exchange",
    subtitle: "Copy our deposit address and send USDC from Binance, Coinbase, Kraken, or any wallet. We auto-verify by tx hash.",
    icon: Copy,
    chip: "Universal",
    chipClass: "border-purple-500/40 text-purple-500",
  },
];

const CryptoPaymentTiers = ({ amountUsd, token, isTestnet, transactionId, sessionId, buyerEmail, onVerified }: Props) => {
  const [tier, setTier] = useState<Tier>("wallet");
  const [copied, setCopied] = useState<"addr" | "amt" | null>(null);
  const [manualTxHash, setManualTxHash] = useState("");
  const [verifyingManual, setVerifyingManual] = useState(false);

  const intakeAddress = AZIX_WALLETS.transaction.publicKey;
  const addressIsPlaceholder = isPlaceholderAddress(intakeAddress);

  const copy = (text: string, key: "addr" | "amt") => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(key === "addr" ? "Address copied" : "Amount copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const verifyManualTx = async () => {
    if (!manualTxHash.trim() || manualTxHash.trim().length < 60) {
      toast.error("Enter a valid transaction hash (0x… 66 chars)");
      return;
    }
    setVerifyingManual(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-crypto-payment", {
        body: {
          txHash: manualTxHash.trim(),
          expectedAmount: amountUsd,
          transactionId,
          sessionId,
          isTestnet,
          network: isTestnet ? "amoy" : "polygon",
        },
      });
      if (error) throw error;
      if ((data as any)?.verification === "confirmed") {
        toast.success("✅ Payment verified — order generating.");
        onVerified(manualTxHash.trim(), (data as any)?.transfer?.amount || amountUsd);
      } else if ((data as any)?.verification === "partial") {
        toast.warning(`Partial payment received. Shortfall: $${(data as any).shortfall}`);
      } else {
        toast.info((data as any)?.message || "Routed to support for review.");
      }
    } catch (e: any) {
      toast.error(`Verification failed: ${e.message || "unknown"}`);
    } finally {
      setVerifyingManual(false);
    }
  };

  // Build Transak URL (sandbox vs production)
  const transakUrl = (() => {
    const base = isTestnet
      ? "https://global-stg.transak.com"
      : "https://global.transak.com";
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_TRANSAK_API_KEY || "demo-key",
      defaultCryptoCurrency: token,
      cryptoCurrencyCode: token,
      network: "polygon",
      fiatAmount: amountUsd.toFixed(2),
      defaultFiatCurrency: "USD",
      walletAddress: addressIsPlaceholder ? "" : intakeAddress,
      disableWalletAddressForm: addressIsPlaceholder ? "false" : "true",
      partnerOrderId: sessionId || transactionId || "",
      email: buyerEmail || "",
      productsAvailed: "BUY",
    });
    return `${base}?${params.toString()}`;
  })();

  return (
    <div className="space-y-3">
      {/* Tier picker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TIERS.map((t) => {
          const active = tier === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTier(t.id)}
              className={cn(
                "text-left p-3 rounded-lg border-2 transition-all",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <Icon className={cn("w-4 h-4 mt-0.5", active ? "text-primary" : "text-muted-foreground")} />
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", t.chipClass)}>
                  {t.chip}
                </Badge>
              </div>
              <p className="text-xs font-bold text-foreground">{t.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{t.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Global placeholder warning */}
      {addressIsPlaceholder && (
        <div className="p-3 rounded-lg border-2 border-destructive/40 bg-destructive/10 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-[11px] text-destructive">
            <p className="font-bold mb-0.5">Crypto intake wallet not configured</p>
            <p className="leading-relaxed">
              The deposit address in <code className="font-mono">src/lib/feeEngine.ts</code> is a placeholder
              (<code className="font-mono">{intakeAddress}</code>). Replace <code className="font-mono">AZIX_WALLETS.transaction.publicKey</code> with the real Polygon address before going live.
            </p>
          </div>
        </div>
      )}

      {/* Active tier panel */}
      <Card>
        <CardContent className="p-4">
          {tier === "wallet" && (
            <ConnectWalletPay
              amountUsd={amountUsd}
              token={token}
              isTestnet={isTestnet}
              transactionId={transactionId}
              sessionId={sessionId}
              onVerified={onVerified}
            />
          )}

          {tier === "onramp" && (
            <div className="space-y-3">
              <div className="p-3 rounded bg-muted/40 border border-border space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Pay</span><span className="font-bold">${amountUsd.toFixed(2)} USD</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Receive into escrow</span><span className="font-bold">~{amountUsd.toFixed(2)} {token} (Polygon)</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">On-ramp fee</span><span>~1.5% (charged by Transak)</span></div>
              </div>
              <Button
                type="button"
                className="w-full h-11 gap-2"
                disabled={addressIsPlaceholder || amountUsd <= 0}
                onClick={() => window.open(transakUrl, "transak", "width=480,height=720")}
              >
                <CreditCard className="w-4 h-4" />
                Open Transak Checkout
                <ExternalLink className="w-3 h-3" />
              </Button>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Transak supports Visa/Mastercard in 150+ countries plus Apple Pay, SEPA, UPI, and PIX. Funds settle directly to TrustLock's Polygon escrow wallet — you do not need a crypto wallet of your own. After payment completes, paste the Polygon tx hash below to anchor the receipt to your order.
              </p>
              <div className="pt-2 border-t border-border space-y-2">
                <Label className="text-[10px] text-muted-foreground">Once Transak confirms, paste your tx hash:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="0x… (66 chars)"
                    value={manualTxHash}
                    onChange={(e) => setManualTxHash(e.target.value)}
                    className="font-mono text-[11px]"
                  />
                  <Button type="button" size="sm" onClick={verifyManualTx} disabled={verifyingManual}>
                    {verifyingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {tier === "manual" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Send exactly this amount</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${amountUsd.toFixed(6)} ${token}`}
                    className="font-mono text-sm font-bold bg-muted/40"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(amountUsd.toFixed(6), "amt")}>
                    {copied === "amt" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">To this Polygon address ({token})</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={intakeAddress}
                    className="font-mono text-[10px] bg-muted/40 break-all"
                  />
                  <Button type="button" size="sm" variant="outline" disabled={addressIsPlaceholder} onClick={() => copy(intakeAddress, "addr")}>
                    {copied === "addr" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold">⚠️ Network: Polygon (MATIC) — not Ethereum mainnet, not BSC.</p>
                <p>Sending on the wrong network = funds lost. Most exchanges (Binance, Coinbase, Kraken) let you pick "Polygon" when withdrawing USDC.</p>
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <Label className="text-[10px] font-semibold text-foreground">Paste your transaction hash to verify:</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="0x… (66 chars)"
                    value={manualTxHash}
                    onChange={(e) => setManualTxHash(e.target.value)}
                    className="font-mono text-[11px]"
                  />
                  <Button type="button" size="sm" onClick={verifyManualTx} disabled={verifyingManual || addressIsPlaceholder}>
                    {verifyingManual ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  We check Polygon for a confirmed USDC transfer of ${amountUsd.toFixed(2)} to the address above. Shortfalls are flagged automatically.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CryptoPaymentTiers;

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, ChevronRight, Lock, Info, AlertTriangle, Copy, CheckCircle2, MapPin, Globe } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProviderSearch from "@/components/shared/ProviderSearch";
import { type PaymentProvider, PRIVACY_DISCLAIMER } from "@/lib/paymentProviders";
import { FEE_DISCLOSURE_SHORT, AZIX_WALLETS, calculateFeesV2, selectProcessor, type TransactionType } from "@/lib/feeEngine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TaxBreakdown, { type TaxLineItem } from "@/components/shared/TaxBreakdown";
import { supabase } from "@/integrations/supabase/client";

type PayMode = "local" | "diaspora";

const AFRICAN_CURRENCIES: Record<string, { code: string; name: string; symbol: string; rate: number }> = {
  NG: { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 1580.00 },
  KE: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 153.50 },
  GH: { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", rate: 15.80 },
  ZA: { code: "ZAR", name: "South African Rand", symbol: "R", rate: 18.25 },
  CM: { code: "XAF", name: "CFA Franc (CEMAC)", symbol: "FCFA", rate: 610.00 },
  EG: { code: "EGP", name: "Egyptian Pound", symbol: "E£", rate: 50.85 },
  UG: { code: "UGX", name: "Ugandan Shilling", symbol: "USh", rate: 3780.00 },
  TZ: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rate: 2650.00 },
  RW: { code: "RWF", name: "Rwandan Franc", symbol: "FRw", rate: 1350.00 },
};

const TrustLockDualCheckout = () => {
  const [payMode, setPayMode] = useState<PayMode>("diaspora");
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [providerFields, setProviderFields] = useState<Record<string, string>>({});
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [taxItems, setTaxItems] = useState<TaxLineItem[]>([]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [checkoutToken, setCheckoutToken] = useState<"USDC" | "USDT">("USDC");
  const [checkoutTxId, setCheckoutTxId] = useState("");
  const [checkoutSenderWallet, setCheckoutSenderWallet] = useState("");
  const [checkoutSenderAmount, setCheckoutSenderAmount] = useState("");
  const [cryptoVerifyStatus, setCryptoVerifyStatus] = useState<"idle" | "verifying" | "verified" | "pending" | "failed" | "shortfall">("idle");
  const [pendingName, setPendingName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [polygonConfirmed, setPolygonConfirmed] = useState(false);
  const [cumulativeReceived, setCumulativeReceived] = useState(0);
  const [shortfallTxIds, setShortfallTxIds] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");

  const sampleAmountUsd = 292.50;
  const currencyInfo = selectedCountry ? AFRICAN_CURRENCIES[selectedCountry] : null;
  const localAmount = currencyInfo ? sampleAmountUsd * currencyInfo.rate : 450000;

  const isCrypto = selectedProvider?.category === "crypto_wallet";

  // Use V2 fee engine like OS Pay
  const feePaymentMethod = isCrypto ? "crypto" as const : selectedProvider?.category === "mobile_money" ? "mobile_money" as const : selectedProvider?.category === "bank_account" ? "bank_transfer" as const : "card" as const;
  const selectedProcessorId = selectProcessor("global", isCrypto, undefined, feePaymentMethod, "checkout_fiat");
  const feeBreakdown = calculateFeesV2(sampleAmountUsd, "checkout_fiat" as TransactionType, selectedProcessorId);
  const taxTotal = taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? sampleAmountUsd * (t.value / 100) : t.value), 0);

  const handleModeSwitch = (newMode: string) => {
    setPayMode(newMode as PayMode);
    setSelectedProvider(null);
    setProviderFields({});
    setSelectedCountry("");
  };

  const handleFieldChange = (key: string, value: string) => {
    setProviderFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section id="demo" className="py-20 lg:py-28 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Two Modes, One Widget
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            TrustLock Pay auto-detects the buyer's location and shows the right experience — crypto-savvy diaspora or familiar local checkout.
          </p>
        </motion.div>

        <motion.div
          key={payMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-10 max-w-xl mx-auto"
        >
          {/* ── Header (matches OS Pay) ── */}
          <div className="bg-primary p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-foreground" />
              <span className="font-heading font-bold text-sm text-primary-foreground">TrustLock Pay</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">DEMO</Badge>
              <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
                {payMode === "diaspora" ? "Escrow Protected" : "Protected Payment"}
              </Badge>
            </div>
          </div>

          <Card className="rounded-t-none -mt-0 border-t-0 overflow-hidden border-2 border-primary/20 shadow-xl">
            <CardContent className="p-4 space-y-5">

              {/* ── Dual Mode Toggle (Tabs — matches OS Pay) ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Region</p>
                <Tabs value={payMode} onValueChange={handleModeSwitch}>
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

              {/* Product info */}
              <div className="text-center pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Paying vendor</p>
                <p className="font-heading font-bold text-foreground">Kofi's Construction Supplies</p>
                <p className="text-xs text-muted-foreground mt-1">Order #TL-2026-4821</p>
              </div>

              {/* Amount display */}
              <div className="text-center py-3">
                {payMode === "diaspora" ? (
                  <>
                    <p className="text-2xl font-bold text-foreground">${sampleAmountUsd.toFixed(2)}</p>
                    <p className="text-sm text-primary font-semibold mt-1">≈ {sampleAmountUsd.toFixed(2)} USDC</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Secured in blockchain escrow</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">
                      {currencyInfo ? `${currencyInfo.symbol}${localAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${sampleAmountUsd.toFixed(2)}`}
                    </p>
                    {currencyInfo && (
                      <p className="text-sm text-primary font-semibold mt-1">≈ ${sampleAmountUsd.toFixed(2)} USD</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Protected until delivery</p>
                  </>
                )}
              </div>

              {/* ── Country Selector (Africa mode — matches OS Pay) ── */}
              {payMode === "local" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Your Country</Label>
                  <select
                    value={selectedCountry}
                    onChange={e => setSelectedCountry(e.target.value)}
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

              {/* Payment method selection with search (identical to OS Pay) */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {selectedProvider ? "Selected payment method" : "Choose payment method"}
                </p>

                <ProviderSearch
                  mode={payMode === "local" ? "local" : "diaspora"}
                  onSelect={setSelectedProvider}
                  selected={selectedProvider}
                />

                {/* Provider-specific fields (same renderer as OS Pay) */}
                {selectedProvider && selectedProvider.fields.length > 0 && (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
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
              </div>

              {/* Crypto Verification (identical to OS Pay crypto flow) */}
              {isCrypto && selectedProvider && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-primary">How to Pay with Crypto</p>
                        <p className="text-[9px] text-foreground leading-relaxed">
                          Send <strong>{checkoutToken}</strong> on <strong>Polygon</strong> to the receiving wallet below, then paste your transaction details to verify payment and generate your order.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Token Selector */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">Step 1 — Select Stablecoin:</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setCheckoutToken("USDC"); setPolygonConfirmed(false); }} className={`px-2 py-1 rounded text-[10px] font-semibold border ${checkoutToken === "USDC" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>USDC</button>
                      <button onClick={() => { setCheckoutToken("USDT"); setPolygonConfirmed(false); }} className={`px-2 py-1 rounded text-[10px] font-semibold border ${checkoutToken === "USDT" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>USDT</button>
                      <span className="text-[9px] text-muted-foreground">on Polygon (Chain ID: 137)</span>
                    </div>
                  </div>

                  {/* Step 2: Polygon Confirmation Gate */}
                  <div className="p-2 rounded-lg border-2 border-destructive/30 bg-destructive/5 space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground">Step 2 — Confirm Network</p>
                    <p className="text-[9px] text-destructive font-medium">⚠️ Sending {checkoutToken} on any other network (Ethereum, BSC, Arbitrum, Solana, etc.) may result in permanent loss. TrustLock is not responsible for recovery.</p>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="polygon-confirm-checkout"
                        checked={polygonConfirmed}
                        onCheckedChange={(v) => setPolygonConfirmed(v === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="polygon-confirm-checkout" className="text-[9px] font-semibold text-foreground leading-tight cursor-pointer">
                        I confirm I am sending <strong>{checkoutToken}</strong> on the <strong>Polygon (MATIC)</strong> network.
                      </label>
                    </div>
                  </div>

                  {!polygonConfirmed && (
                    <div className="p-1.5 rounded bg-muted text-center">
                      <p className="text-[9px] text-muted-foreground">✋ Confirm Polygon network above to reveal the wallet address.</p>
                    </div>
                  )}

                  {polygonConfirmed && (<>
                  {/* Locked Receiving Wallet + Copy */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold">Step 3 — Send to Receiving Wallet <span className="text-destructive">(Locked)</span></p>
                    <div className="relative">
                      <Input value={AZIX_WALLETS.transaction.publicKey} readOnly className="bg-muted font-mono text-[10px] pr-16 cursor-not-allowed border-2 border-primary/30" tabIndex={-1} />
                      <Button type="button" size="sm" variant="outline" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2 gap-1 text-[9px]"
                        onClick={() => { navigator.clipboard.writeText(AZIX_WALLETS.transaction.publicKey); setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 3000); }}>
                        {copiedAddress ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                        {copiedAddress ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Copy and paste into your wallet or exchange withdrawal screen.</p>
                  </div>

                  {/* 3 Required Fields */}
                  <div className="space-y-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-primary" /> After Sending — Enter Proof
                    </p>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">1. Your Sending Wallet Address</Label>
                      <Input placeholder="0x..." value={checkoutSenderWallet} onChange={e => setCheckoutSenderWallet(e.target.value)} className="mt-0.5 font-mono text-[10px]" />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">2. Transaction ID (TxID)</Label>
                      <Input placeholder="0x... (66 chars)" value={checkoutTxId} onChange={e => setCheckoutTxId(e.target.value)} className="mt-0.5 font-mono text-[10px]" />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">3. Amount Sent ({checkoutToken})</Label>
                      <Input type="number" placeholder={sampleAmountUsd.toFixed(2)} value={checkoutSenderAmount} onChange={e => setCheckoutSenderAmount(e.target.value)} className="mt-0.5 text-[10px]" />
                    </div>
                  </div>

                  {/* Verify Button */}
                  <Button type="button" className="w-full h-8 text-[10px] font-semibold gap-1"
                    disabled={!checkoutSenderWallet || !checkoutTxId || !checkoutSenderAmount || cryptoVerifyStatus === "verifying"}
                    onClick={async () => {
                      setCryptoVerifyStatus("verifying");
                      await new Promise(r => setTimeout(r, 2500));
                      const amt = parseFloat(checkoutSenderAmount) || 0;
                      const newCumulative = cumulativeReceived + amt;
                      if (amt > 0 && newCumulative >= sampleAmountUsd) {
                        setCumulativeReceived(newCumulative);
                        setShortfallTxIds(prev => [...prev, checkoutTxId]);
                        setCryptoVerifyStatus("verified");
                      } else if (amt > 0 && newCumulative < sampleAmountUsd) {
                        setCumulativeReceived(newCumulative);
                        setShortfallTxIds(prev => [...prev, checkoutTxId]);
                        setCryptoVerifyStatus("shortfall");
                        setCheckoutTxId("");
                        setCheckoutSenderAmount("");
                        toast.info(`Received $${amt.toFixed(2)} — $${(sampleAmountUsd - newCumulative).toFixed(2)} remaining.`);
                      } else {
                        setCryptoVerifyStatus("failed");
                      }
                    }}>
                    {cryptoVerifyStatus === "verifying" ? "Verifying on Polygon..." :
                     cryptoVerifyStatus === "shortfall" ? "Submit Additional Payment" :
                     "Verify & Generate Order"}
                  </Button>

                  {/* Status States */}
                  {cryptoVerifyStatus === "verified" && (
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-[10px] font-bold text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Payment Confirmed — Order Generated</p>
                      <p className="text-[9px] text-foreground">Check your dashboard for order number, receipt, and workflow.</p>
                    </div>
                  )}
                  {cryptoVerifyStatus === "shortfall" && (
                    <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 space-y-1.5">
                      <p className="text-[10px] font-bold text-accent flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Partial Payment Received</p>
                      <div className="p-1.5 rounded bg-muted/50 space-y-0.5 text-[9px]">
                        <div className="flex justify-between"><span className="text-muted-foreground">Required</span><span className="font-semibold">${sampleAmountUsd.toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span className="font-semibold text-primary">${cumulativeReceived.toFixed(2)}</span></div>
                        <div className="flex justify-between border-t border-border pt-0.5"><span className="font-bold text-destructive">Remaining</span><span className="font-bold text-destructive">${(sampleAmountUsd - cumulativeReceived).toFixed(2)}</span></div>
                      </div>
                      <p className="text-[9px] text-foreground">
                        Send the remaining <strong>${(sampleAmountUsd - cumulativeReceived).toFixed(2)} {checkoutToken}</strong> to the same wallet above via Polygon, then enter your new TxID and amount below.
                      </p>
                      {shortfallTxIds.length > 0 && (
                        <div className="p-1 rounded bg-muted text-[8px] text-muted-foreground">
                          <p className="font-semibold">Previous TxIDs:</p>
                          {shortfallTxIds.map((id, i) => <p key={i} className="font-mono truncate">#{i+1}: {id}</p>)}
                        </div>
                      )}
                    </div>
                  )}
                  {cryptoVerifyStatus === "pending" && (
                    <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 space-y-1.5">
                      <p className="text-[10px] font-bold text-accent flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pending On-Chain Confirmation</p>
                      <p className="text-[9px] text-foreground">
                        Your transaction could not be confirmed automatically. This may happen if the transfer is still processing on the blockchain.
                      </p>
                      <div className="p-1.5 rounded bg-destructive/10 border border-destructive/20">
                        <p className="text-[9px] font-bold text-destructive">🚫 Do NOT send a second payment. Your funds are on-chain and our team will locate them.</p>
                      </div>
                      <p className="text-[9px] text-foreground">
                        Please provide your details below so our team can investigate.
                      </p>
                      <Input placeholder="Full Name" value={pendingName} onChange={e => setPendingName(e.target.value)} className="text-[10px]" />
                      <Input placeholder="Email Address" value={pendingEmail} onChange={e => setPendingEmail(e.target.value)} className="text-[10px]" />
                      <Button type="button" variant="outline" size="sm" className="w-full text-[9px] h-6" disabled={!pendingName || !pendingEmail}
                        onClick={async () => {
                          await supabase.from("crypto_support_queue" as any).insert({
                            sender_name: pendingName,
                            sender_email: pendingEmail,
                            sender_wallet: checkoutSenderWallet,
                            tx_id: checkoutTxId,
                            amount_sent: parseFloat(checkoutSenderAmount) || 0,
                            token: checkoutToken,
                            network: "Polygon",
                            source: "checkout",
                          });
                          setCryptoVerifyStatus("idle");
                          toast("Details submitted. TrustLock support will investigate and contact you within 24–48 hours.");
                        }}>
                        Submit & Close
                      </Button>
                    </div>
                  )}
                  {cryptoVerifyStatus === "failed" && (
                    <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1">
                      <p className="text-[10px] font-bold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Verification Failed</p>
                      <p className="text-[9px] text-foreground">Transaction not found. Wait 1-2 min and retry, or check that you used Polygon network.</p>
                      <Button type="button" variant="outline" size="sm" className="w-full text-[9px] h-6" onClick={() => setCryptoVerifyStatus("idle")}>Try Again</Button>
                    </div>
                  )}

                  <div className="p-1.5 rounded bg-muted text-[9px] font-mono space-y-0.5">
                    <p><strong>Network:</strong> Polygon (Chain ID: 137)</p>
                    <p><strong>Token:</strong> {checkoutToken} ({checkoutToken === "USDC" ? "0x3c499...b8f0" : "0xc2132...1eFB"})</p>
                    <p><strong>Owner:</strong> Azix</p>
                    <p><strong>Support:</strong> support@azix.world</p>
                  </div>

                  <div className="p-1.5 rounded-lg border border-accent/30 bg-accent/5">
                    <p className="text-[9px] text-foreground leading-relaxed">
                      <strong>⚠️ Important:</strong> Your exchange or self-custody wallet may charge a network/withdrawal fee that is <strong>deducted from the amount you send</strong>. Consider sending slightly more than required.
                    </p>
                  </div>
                  </>)}
                </div>
              )}

              {/* Tax breakdown */}
              <TaxBreakdown
                subtotal={sampleAmountUsd}
                taxItems={taxItems}
                onTaxItemsChange={setTaxItems}
                editable={false}
                compact
                currencySymbol="$"
              />

              {/* Fee breakdown (V2 engine — matches OS Pay) */}
              <div className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {payMode === "diaspora" ? "Escrow Amount" : "Payment Amount"}
                  </span>
                  <span className="text-foreground font-semibold">
                    ${sampleAmountUsd.toFixed(2)}
                  </span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxes & Duties</span>
                    <span className="text-muted-foreground">${taxTotal.toFixed(2)}</span>
                  </div>
                )}
                {feeBreakdown && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">TrustLock Fee</span>
                      <span className="text-muted-foreground">${feeBreakdown.trustlockFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        Processor Fee
                        <button onClick={() => setShowFees(!showFees)}>
                          <Info className="w-3 h-3" />
                        </button>
                      </span>
                      <span className="text-muted-foreground">${feeBreakdown.processorFee.toFixed(2)}</span>
                    </div>
                    {feeBreakdown.escrowFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Escrow Fee</span>
                        <span className="text-muted-foreground">${feeBreakdown.escrowFee.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">
                    ${(sampleAmountUsd + taxTotal + (feeBreakdown?.totalFees || 0)).toFixed(2)}
                  </span>
                </div>
                {payMode === "local" && currencyInfo && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Equivalent ({currencyInfo.code})</span>
                    <span>{currencyInfo.symbol}{((sampleAmountUsd + taxTotal + (feeBreakdown?.totalFees || 0)) * currencyInfo.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {showFees && (
                  <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed border-t border-border pt-1">{FEE_DISCLOSURE_SHORT}</p>
                )}
              </div>

              <Button variant="hero" className="w-full gap-2" disabled={!selectedProvider}>
                {payMode === "diaspora" ? "Pay with TrustLock Pay" : "Pay Securely"}
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Privacy disclaimer */}
              <div className="space-y-1">
                <button onClick={() => setShowPrivacy(!showPrivacy)} className="flex items-center justify-center gap-1 w-full text-[10px] text-muted-foreground hover:text-foreground">
                  <AlertTriangle className="w-3 h-3" />
                  <span>We do not save your payment details. {showPrivacy ? "" : "Tap for details."}</span>
                </button>
                {showPrivacy && (
                  <p className="text-[9px] text-muted-foreground leading-relaxed text-center px-2">{PRIVACY_DISCLAIMER}</p>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                <Lock className="w-3 h-3 inline -mt-0.5 mr-1" />
                {payMode === "diaspora"
                  ? "Secured by Azix Smart Contracts on Polygon"
                  : "Your money is safe until you confirm your order arrived"}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* What's happening behind the scenes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <p className="text-center text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
            Behind the scenes (both modes)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            {[
              "Fiat Payment", "→", "Converted to USDC", "→", "Locked in Escrow", "→", "Delivery Confirmed", "→", "Vendor Paid Out",
            ].map((step, i) => (
              <span key={i} className={step === "→" ? "text-primary font-bold" : "bg-muted px-2.5 py-1.5 rounded-md font-medium"}>
                {step}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockDualCheckout;

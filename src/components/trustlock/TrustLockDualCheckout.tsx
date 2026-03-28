import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard, Smartphone, Building2, Globe, ChevronRight, Lock, Info, AlertTriangle, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProviderSearch from "@/components/shared/ProviderSearch";
import { type PaymentProvider, calculateFees, PRIVACY_DISCLAIMER, getFeeRange } from "@/lib/paymentProviders";
import { FEE_DISCLOSURE_SHORT, AZIX_WALLETS } from "@/lib/feeEngine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TaxBreakdown, { type TaxLineItem } from "@/components/shared/TaxBreakdown";

const TrustLockDualCheckout = () => {
  const [mode, setMode] = useState<"diaspora" | "local">("diaspora");
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
  const [checkoutPin, setCheckoutPin] = useState("");
  const [checkoutTestVerified, setCheckoutTestVerified] = useState(false);

  const sampleAmount = mode === "diaspora" ? 292.50 : 450000;
  const isCrypto = selectedProvider?.category === "crypto_wallet";
  const feeType = isCrypto ? "crypto_to_crypto" : "fiat_to_crypto";
  const taxTotal = taxItems.reduce((sum, t) => sum + (t.type === "percentage" ? sampleAmount * (t.value / 100) : t.value), 0);
  const fees = calculateFees(sampleAmount, feeType);

  const handleModeSwitch = (newMode: "diaspora" | "local") => {
    setMode(newMode);
    setSelectedProvider(null);
    setProviderFields({});
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

        {/* Mode Toggle */}
        <div className="flex items-center justify-center mt-10 gap-4">
          <button
            onClick={() => handleModeSwitch("diaspora")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mode === "diaspora"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Diaspora Mode
          </button>
          <button
            onClick={() => handleModeSwitch("local")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              mode === "local"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Local Mode
          </button>
        </div>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-10 max-w-md mx-auto"
        >
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
            {/* Widget header */}
            <div className="bg-primary px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-foreground" />
                <span className="text-sm font-bold text-primary-foreground">TrustLock Pay</span>
              </div>
              <span className="text-xs text-primary-foreground/70">
                {mode === "diaspora" ? "Escrow Protected" : "Protected Payment"}
              </span>
            </div>

            <div className="p-5 space-y-4 bg-background">
              {/* Product info */}
              <div className="text-center pb-3 border-b border-border">
                <p className="text-xs text-muted-foreground">Paying vendor</p>
                <p className="font-heading font-bold text-foreground">Kofi's Construction Supplies</p>
                <p className="text-xs text-muted-foreground mt-1">Order #TL-2026-4821</p>
              </div>

              {/* Amount display */}
              <div className="text-center py-3">
                {mode === "diaspora" ? (
                  <>
                    <p className="text-2xl font-bold text-foreground">₦450,000</p>
                    <p className="text-sm text-primary font-semibold mt-1">≈ $292.50 USDC</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Secured in blockchain escrow</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">₦450,000</p>
                    <p className="text-sm text-muted-foreground mt-1">Protected until delivery</p>
                  </>
                )}
              </div>

              {/* Payment method selection with search */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {selectedProvider ? "Selected payment method" : "Choose payment method"}
                </p>

                <ProviderSearch
                  mode={mode}
                  onSelect={setSelectedProvider}
                  selected={selectedProvider}
                />

                {/* Provider-specific fields */}
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

              {/* Crypto Verification Protocol + Copy + TxID */}
              {isCrypto && selectedProvider && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-destructive">⚠️ Crypto Verification Required</p>
                        <p className="text-[9px] text-foreground leading-relaxed">
                          Before sending any large payment, you must first send a <strong>$1.00 {checkoutToken} test transaction</strong> on <strong>Polygon network</strong> to the Azix receiving wallet. Contact <strong>support@azix.world</strong> with your sending address and TxID, then wait for confirmation before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Token Selector */}
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold text-muted-foreground">Token:</p>
                    <button
                      onClick={() => setCheckoutToken("USDC")}
                      className={`px-2 py-1 rounded text-[10px] font-semibold border ${checkoutToken === "USDC" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                    >USDC</button>
                    <button
                      onClick={() => setCheckoutToken("USDT")}
                      className={`px-2 py-1 rounded text-[10px] font-semibold border ${checkoutToken === "USDT" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                    >USDT</button>
                    <span className="text-[9px] text-muted-foreground">on Polygon (Chain ID: 137)</span>
                  </div>

                  {/* Locked Receiving Wallet + Copy */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold">Azix Receiving Wallet <span className="text-destructive">(Locked)</span></p>
                    <div className="relative">
                      <Input
                        value={AZIX_WALLETS.transaction.publicKey}
                        readOnly
                        className="bg-muted font-mono text-[10px] pr-16 cursor-not-allowed border-2 border-primary/30"
                        tabIndex={-1}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2 gap-1 text-[9px]"
                        onClick={() => {
                          navigator.clipboard.writeText(AZIX_WALLETS.transaction.publicKey);
                          setCopiedAddress(true);
                          setTimeout(() => setCopiedAddress(false), 3000);
                        }}
                      >
                        {copiedAddress ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                        {copiedAddress ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Copy this address and paste it into your wallet or exchange withdrawal screen.</p>
                  </div>

                  {/* Sender Wallet */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Your Sending Wallet Address</Label>
                    <Input placeholder="0x..." value={checkoutSenderWallet} onChange={e => setCheckoutSenderWallet(e.target.value)} className="mt-1 font-mono text-[10px]" />
                  </div>

                  {/* TxID + Amount Verification */}
                  <div className="space-y-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
                    <p className="text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-primary" /> After Sending — Paste Proof
                    </p>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Transaction ID (TxID)</Label>
                      <Input placeholder="0x... (66 chars)" value={checkoutTxId} onChange={e => setCheckoutTxId(e.target.value)} className="mt-0.5 font-mono text-[10px]" />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Amount Sent ({checkoutToken})</Label>
                      <Input type="number" placeholder="1.00" value={checkoutSenderAmount} onChange={e => setCheckoutSenderAmount(e.target.value)} className="mt-0.5 text-[10px]" />
                    </div>
                  </div>

                  <div className="p-1.5 rounded bg-muted text-[9px] font-mono space-y-0.5">
                    <p><strong>Network:</strong> Polygon (Chain ID: 137)</p>
                    <p><strong>Token:</strong> {checkoutToken} ({checkoutToken === "USDC" ? "0x3c499...b8f0" : "0xc2132...1eFB"})</p>
                    <p><strong>Owner:</strong> Azix</p>
                    <p><strong>Support:</strong> support@azix.world</p>
                  </div>

                  {/* PIN + Bypass */}
                  <div className="space-y-1.5 p-2 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <p className="text-[10px] font-semibold">4-Digit Security PIN</p>
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="Create or enter PIN"
                      value={checkoutPin}
                      onChange={e => setCheckoutPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="text-center text-sm tracking-[0.5em] font-mono"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button type="button" variant="outline" size="sm" className="text-[9px] h-7"
                        disabled={checkoutPin.length !== 4 || !checkoutTxId || !checkoutSenderAmount}
                      >
                        Submit Test ($1)
                      </Button>
                      <Button type="button" size="sm" className="text-[9px] h-7"
                        disabled={checkoutPin.length !== 4 || !checkoutTestVerified}
                      >
                        Bypass → Pay
                      </Button>
                    </div>
                    {!checkoutTestVerified && (
                      <p className="text-[8px] text-destructive">Complete one verified test before using Bypass.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tax breakdown */}
              <TaxBreakdown
                subtotal={sampleAmount}
                taxItems={taxItems}
                onTaxItemsChange={setTaxItems}
                editable={false}
                compact
                currencySymbol={mode === "diaspora" ? "$" : "₦"}
              />

              {/* Fee breakdown */}
              <div className="bg-muted/50 rounded-lg px-3 py-2.5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {mode === "diaspora" ? "Escrow Amount" : "Payment Amount"}
                  </span>
                  <span className="text-foreground font-semibold">
                    {mode === "diaspora" ? "$292.50" : "₦450,000"}
                  </span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxes & Duties</span>
                    <span className="text-muted-foreground">
                      {mode === "diaspora" ? `$${taxTotal.toFixed(2)}` : `₦${taxTotal.toFixed(0)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    TrustLock Pay Fee ({isCrypto ? "1.5% – 2.5%" : getFeeRange()})
                    <button onClick={() => setShowFees(!showFees)}>
                      <Info className="w-3 h-3" />
                    </button>
                  </span>
                  <span className="text-muted-foreground">
                    {mode === "diaspora" ? `$${fees.total.toFixed(2)}` : `₦${(fees.total * 1538).toFixed(0)}`}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">
                    {mode === "diaspora" ? `$${(sampleAmount + taxTotal + fees.total).toFixed(2)}` : `₦${((sampleAmount + taxTotal + fees.total * 1538)).toFixed(0)}`}
                  </span>
                </div>
                {showFees && (
                  <p className="text-[9px] text-muted-foreground mt-1 leading-relaxed border-t border-border pt-1">{FEE_DISCLOSURE_SHORT}</p>
                )}
              </div>

              <Button variant="hero" className="w-full gap-2" disabled={!selectedProvider}>
                {mode === "diaspora" ? "Pay with TrustLock Pay" : "Pay Securely"}
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
                {mode === "diaspora"
                  ? "Secured by Azix Smart Contracts on Polygon"
                  : "Your money is safe until you confirm your order arrived"}
              </p>
            </div>
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
              "Fiat Payment",
              "→",
              "Converted to USDC",
              "→",
              "Locked in Escrow",
              "→",
              "Delivery Confirmed",
              "→",
              "Vendor Paid Out",
            ].map((step, i) => (
              <span
                key={i}
                className={
                  step === "→"
                    ? "text-primary font-bold"
                    : "bg-muted px-2.5 py-1.5 rounded-md font-medium"
                }
              >
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

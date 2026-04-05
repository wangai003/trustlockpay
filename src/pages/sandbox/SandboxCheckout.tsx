import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CreditCard, Wallet, Copy, Check, ArrowLeft, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SANDBOX_INDUSTRIES, createSandboxOrder, SandboxLiveOrder } from "./sandboxIndustryData";
import { toast } from "sonner";

type Step = "details" | "payment" | "processing" | "confirmation";

const SandboxCheckout = () => {
  const { industry } = useParams<{ industry: string }>();
  const navigate = useNavigate();
  const config = SANDBOX_INDUSTRIES.find(i => i.key === industry);

  const [step, setStep] = useState<Step>("details");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [order, setOrder] = useState<SandboxLiveOrder | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Industry not found</p>
        <Link to="/sandbox/store"><Button className="ml-2">Back</Button></Link>
      </div>
    );
  }

  const subtotal = config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const fee = Math.round(subtotal * 0.015 * 100) / 100;

  const handleProceedToPayment = () => {
    if (!buyerName.trim() || !buyerEmail.trim()) return;
    setStep("payment");
  };

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      const newOrder = createSandboxOrder(config, buyerName.trim(), buyerEmail.trim(), paymentMethod === "card" ? "Card (Visa ****4242)" : paymentMethod === "usdc" ? "USDC (Polygon)" : "USDT (Polygon)");
      setOrder(newOrder);
      setStep("confirmation");
    }, 2500);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">TrustLock Checkout</span>
          </div>
          <Badge variant="outline" className="text-[10px]">🧪 Sandbox</Badge>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 text-[11px]">
          {["Details", "Payment", "Confirmation"].map((s, i) => {
            const stepIdx = step === "details" ? 0 : step === "payment" || step === "processing" ? 1 : 2;
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i <= stepIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span className={i <= stepIdx ? "text-foreground font-medium" : "text-muted-foreground"}>{s}</span>
                {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === "details" && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Buyer Details — {config.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">Vendor: {config.vendorName}</p>
                    {config.items.map((item, idx) => (
                      <p key={idx} className="text-[11px] text-muted-foreground">{item.qty} {item.unit} — {item.name} — ${(item.qty * item.unitPrice).toLocaleString()}</p>
                    ))}
                    <Separator className="my-2" />
                    <p className="text-sm font-bold">Total: ${(subtotal + fee).toLocaleString()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Jane Mensah" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/sandbox/store/${config.key}`}>
                      <Button variant="outline" size="sm"><ArrowLeft className="w-3 h-3 mr-1" />Back</Button>
                    </Link>
                    <Button onClick={handleProceedToPayment} disabled={!buyerName.trim() || !buyerEmail.trim()} className="flex-1">
                      Continue to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: "card", label: "Card", icon: CreditCard, sub: "Visa / Mastercard" },
                      { key: "usdc", label: "USDC", icon: Wallet, sub: "Polygon Network" },
                      { key: "usdt", label: "USDT", icon: Wallet, sub: "Polygon Network" },
                    ].map(pm => (
                      <button
                        key={pm.key}
                        onClick={() => setPaymentMethod(pm.key)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${paymentMethod === pm.key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                      >
                        <pm.icon className={`w-5 h-5 ${paymentMethod === pm.key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-medium">{pm.label}</span>
                        <span className="text-[9px] text-muted-foreground">{pm.sub}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Escrow Fee (1.5%)</span><span>${fee.toLocaleString()}</span></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold"><span>Total</span><span>${(subtotal + fee).toLocaleString()}</span></div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep("details")} size="sm">Back</Button>
                    <Button onClick={handlePay} className="flex-1">
                      Pay ${(subtotal + fee).toLocaleString()} — Simulated
                    </Button>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    🧪 No real payment will be charged. This is a sandbox simulation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground">Processing Payment…</p>
              <p className="text-xs text-muted-foreground mt-1">Locking funds in escrow</p>
            </motion.div>
          )}

          {step === "confirmation" && order && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-foreground">Payment Successful!</h2>
                    <p className="text-sm text-muted-foreground">Funds are now locked in escrow</p>
                  </div>

                  <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Order Number</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm">{order.orderNumber}</span>
                        <button onClick={() => copyText(order.orderNumber, "Order #")} className="p-1 hover:bg-muted rounded">
                          {copied === "Order #" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Confirmation Code</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm">{order.confirmationCode}</span>
                        <button onClick={() => copyText(order.confirmationCode, "Code")} className="p-1 hover:bg-muted rounded">
                          {copied === "Code" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{order.industryLabel}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{order.vendorName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{order.paymentMethod}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">${order.total.toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">📋 What Happens Next?</p>
                    <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Copy your <strong>Order Number</strong> above</li>
                      <li>Go to <strong>Sandbox Login</strong> and enter as <strong>Buyer</strong></li>
                      <li>Open the <strong>Orders</strong> tab and enter your Order Number to claim it</li>
                      <li>Track milestones and release funds when satisfied</li>
                      <li>The <strong>Vendor</strong> login shows all orders for fulfillment</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Link to="/sandbox/store" className="flex-1">
                      <Button variant="outline" className="w-full">Browse More Industries</Button>
                    </Link>
                    <Link to="/sandbox/login" className="flex-1">
                      <Button className="w-full">Go to Sandbox Dashboard →</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SandboxCheckout;

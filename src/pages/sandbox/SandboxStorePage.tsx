import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ArrowLeft, CheckCircle, FileText, ShoppingCart, CreditCard,
  Wallet, Plus, Minus, Globe, Phone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SANDBOX_INDUSTRIES, type SandboxLineItem } from "./sandboxIndustryData";
import { SandboxCountdown } from "./SandboxCountdown";

type PageView = "browse" | "cart" | "dummy_checkout";

/** TrustLock Pay logo button */
const TrustLockPayLogo = ({ selected, onClick }: { selected: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${selected ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}
  >
    <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
      <Shield className="w-4 h-4 text-primary-foreground" />
    </div>
    <span className="text-xs font-semibold text-foreground">TrustLock Pay</span>
    <span className="text-[9px] text-muted-foreground">Escrow Protected</span>
  </button>
);

const SandboxStorePage = () => {
  const { industry } = useParams<{ industry: string }>();
  const navigate = useNavigate();
  const config = SANDBOX_INDUSTRIES.find(i => i.key === industry);

  const [view, setView] = useState<PageView>("browse");
  const [cart, setCart] = useState<{ item: SandboxLineItem; qty: number }[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Industry not found</p>
          <Link to="/sandbox/store"><Button variant="outline">Back to Store</Button></Link>
        </div>
      </div>
    );
  }

  // Initialize cart from config items if empty
  const initCart = () => {
    if (cart.length === 0) {
      setCart(config.items.map(item => ({ item, qty: item.qty })));
    }
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.qty * c.item.unitPrice, 0);

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const addToCart = (item: SandboxLineItem) => {
    const existing = cart.findIndex(c => c.item.name === item.name);
    if (existing >= 0) {
      updateQty(existing, 1);
    } else {
      setCart(prev => [...prev, { item, qty: item.qty }]);
    }
  };

  const handleProceedToCheckout = () => {
    if (cart.length === 0) {
      initCart();
    }
    setView("cart");
  };

  const handleDummyCheckout = () => {
    setView("dummy_checkout");
    setSelectedPayment(null);
  };

  const handleSelectPayment = (method: string) => {
    setSelectedPayment(method);
    if (method === "trustlock") {
      // Route to TrustLock checkout flow
      setTimeout(() => navigate(`/sandbox/checkout/${config.key}`), 600);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Vendor site header */}
      <header className={`bg-gradient-to-r ${config.color} text-white`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h1 className="font-bold text-sm">{config.vendorName}</h1>
              <p className="text-[10px] opacity-80">{config.vendorTagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white border-white/30 text-[10px]">Sandbox Demo</Badge>
            {cart.length > 0 && view === "browse" && (
              <button onClick={handleProceedToCheckout} className="relative">
                <ShoppingCart className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-primary text-[9px] font-bold flex items-center justify-center">
                  {cart.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Vendor origin badge */}
      <div className="max-w-4xl mx-auto px-4 pt-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Globe className="w-3 h-3" />
          <span>Vendor Location: <strong className="text-foreground">Lagos, Nigeria 🇳🇬</strong></span>
          <span className="mx-1">·</span>
          <span>Trade Scope: <strong className="text-foreground">International</strong></span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <Link to="/sandbox/store" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3 h-3" /> Back to Marketplace
        </Link>

        <AnimatePresence mode="wait">
          {/* ─── BROWSE VIEW ─── */}
          {view === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Product listing */}
                <div className="md:col-span-2 space-y-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Products & Services — {config.label}
                  </h2>

                  <div className="space-y-3">
                    {config.items.map((item, idx) => {
                      const inCart = cart.find(c => c.item.name === item.name);
                      return (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ${item.unitPrice.toLocaleString()} / {item.unit}
                                  {item.qty > 1 && ` · Default: ${item.qty} ${item.unit}`}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold">${(item.qty * item.unitPrice).toLocaleString()}</p>
                                {inCart ? (
                                  <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 mt-1">In Cart</Badge>
                                ) : (
                                  <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={() => addToCart(item)}>
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Milestones preview */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Escrow Milestone Schedule</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {config.milestones.map((m, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{m.title}</p>
                              {m.documentGate && <p className="text-[10px] text-muted-foreground">📄 Requires: {m.documentGate}</p>}
                            </div>
                            <Badge variant="outline" className="text-[10px]">{m.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documents */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Required Documents</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1.5">
                        {config.documents.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            <span className="flex-1">{d.name}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {d.owner === "vendor" ? "(V) Vendor" : d.owner === "buyer" ? "(B) Buyer" : "(V/B) Either"}
                            </Badge>
                            {d.required && <Badge className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">Required</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar — CTA */}
                <div className="space-y-4">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 text-center space-y-3">
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto">
                        <Shield className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">Escrow-Protected Payment</p>
                      <p className="text-[10px] text-muted-foreground">Your funds are held securely until all milestones are completed and you confirm delivery.</p>
                      <Button className="w-full" onClick={handleProceedToCheckout}>
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Proceed to Checkout
                      </Button>
                      <p className="text-[9px] text-muted-foreground">Powered by TrustLock Pay™</p>
                    </CardContent>
                  </Card>
                  <SandboxCountdown />
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── CART VIEW ─── */}
          {view === "cart" && (
            <motion.div key="cart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Your Cart — {config.vendorName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(cart.length === 0 ? config.items.map(item => ({ item, qty: item.qty })) : cart).map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.item.name}</p>
                        <p className="text-xs text-muted-foreground">${c.item.unitPrice.toLocaleString()} / {c.item.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="w-6 h-6" onClick={() => updateQty(idx, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-mono w-6 text-center">{c.qty}</span>
                        <Button variant="outline" size="icon" className="w-6 h-6" onClick={() => updateQty(idx, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-20 text-right">${(c.qty * c.item.unitPrice).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}

                  <Separator />
                  <div className="flex justify-between text-base font-bold">
                    <span>Subtotal</span>
                    <span>${(cartSubtotal || config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{config.invoiceNote}</p>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setView("browse")}>
                      <ArrowLeft className="w-3 h-3 mr-1" /> Continue Shopping
                    </Button>
                    <Button className="flex-1" onClick={handleDummyCheckout}>
                      Checkout →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── DUMMY CHECKOUT (payment method selection) ─── */}
          {view === "dummy_checkout" && (
            <motion.div key="dummy_checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Select Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span>{config.vendorName} — {config.label}</span></div>
                    <div className="flex justify-between font-bold"><span>Total</span><span>${(cartSubtotal || config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)).toLocaleString()}</span></div>
                  </div>

                  <p className="text-xs text-muted-foreground">Choose how you'd like to pay:</p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Visa / Mastercard */}
                    <button
                      onClick={() => handleSelectPayment("card")}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all ${selectedPayment === "card" ? "border-muted-foreground bg-muted/30" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      <CreditCard className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs font-medium">Visa / Mastercard</span>
                      <span className="text-[9px] text-muted-foreground">Credit or Debit</span>
                    </button>

                    {/* PayPal */}
                    <button
                      onClick={() => handleSelectPayment("paypal")}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all ${selectedPayment === "paypal" ? "border-muted-foreground bg-muted/30" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      <Wallet className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs font-medium">PayPal</span>
                      <span className="text-[9px] text-muted-foreground">Pay with balance</span>
                    </button>

                    {/* M-Pesa */}
                    <button
                      onClick={() => handleSelectPayment("mpesa")}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all ${selectedPayment === "mpesa" ? "border-muted-foreground bg-muted/30" : "border-border hover:border-muted-foreground/30"}`}
                    >
                      <Phone className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs font-medium">M-Pesa</span>
                      <span className="text-[9px] text-muted-foreground">Mobile Money</span>
                    </button>

                    {/* TrustLock Pay — the only one that works */}
                    <TrustLockPayLogo
                      selected={selectedPayment === "trustlock"}
                      onClick={() => handleSelectPayment("trustlock")}
                    />
                  </div>

                  {/* If a non-TrustLock method is selected, show unavailable message */}
                  {selectedPayment && selectedPayment !== "trustlock" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/50 rounded-lg p-4 text-center space-y-2 border border-border">
                      <p className="text-sm font-semibold text-foreground">⚠️ Unavailable in Sandbox</p>
                      <p className="text-xs text-muted-foreground">
                        This payment method is not available in the demo environment. 
                        Select <strong>TrustLock Pay</strong> to experience the full escrow-protected checkout.
                      </p>
                      <Button size="sm" onClick={() => handleSelectPayment("trustlock")} className="mt-1">
                        <Shield className="w-3 h-3 mr-1" /> Pay with TrustLock
                      </Button>
                    </motion.div>
                  )}

                  {selectedPayment === "trustlock" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 rounded-lg p-4 text-center space-y-2 border border-primary/20">
                      <Shield className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-semibold text-primary">Redirecting to TrustLock Pay…</p>
                      <p className="text-[10px] text-muted-foreground">Escrow-protected checkout with milestone tracking</p>
                    </motion.div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setView("cart")}>
                      <ArrowLeft className="w-3 h-3 mr-1" /> Back to Cart
                    </Button>
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

export default SandboxStorePage;

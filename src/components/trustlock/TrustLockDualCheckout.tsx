import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, CreditCard, Smartphone, Building2, Globe, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TrustLockDualCheckout = () => {
  const [mode, setMode] = useState<"diaspora" | "local">("diaspora");

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
            onClick={() => setMode("diaspora")}
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
            onClick={() => setMode("local")}
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

              {/* Payment methods */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {mode === "diaspora" ? "Pay with" : "Choose payment method"}
                </p>

                {mode === "diaspora" ? (
                  <>
                    <PaymentOption icon={<CreditCard className="w-4 h-4" />} label="Credit / Debit Card" detail="Visa, Mastercard" selected />
                    <PaymentOption icon={<Smartphone className="w-4 h-4" />} label="Apple Pay / Google Pay" detail="Instant" />
                    <PaymentOption icon={<Shield className="w-4 h-4" />} label="Azix Wallet" detail="Pay with USDC balance" />
                  </>
                ) : (
                  <>
                    <PaymentOption icon={<CreditCard className="w-4 h-4" />} label="Bank Card" detail="Debit / Credit card" selected />
                    <PaymentOption icon={<Building2 className="w-4 h-4" />} label="Bank Transfer" detail="Direct from your bank" />
                    <PaymentOption icon={<Smartphone className="w-4 h-4" />} label="Mobile Money" detail="M-Pesa, MTN MoMo, Airtel Money" />
                    <PaymentOption icon={<span className="text-xs font-bold">*</span>} label="USSD" detail="Dial to pay — no internet needed" />
                  </>
                )}
              </div>

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
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">TrustLock Fee (1.5%)</span>
                  <span className="text-muted-foreground">
                    {mode === "diaspora" ? "$4.39" : "₦6,750"}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-border">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">
                    {mode === "diaspora" ? "$296.89" : "₦456,750"}
                  </span>
                </div>
              </div>

              <Button variant="hero" className="w-full gap-2">
                {mode === "diaspora" ? "Pay with TrustLock" : "Pay Securely"}
                <ChevronRight className="w-4 h-4" />
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                <Shield className="w-3 h-3 inline -mt-0.5 mr-1" />
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

const PaymentOption = ({
  icon,
  label,
  detail,
  selected = false,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  selected?: boolean;
}) => (
  <div
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
      selected
        ? "border-primary bg-primary/5"
        : "border-border hover:border-primary/40"
    }`}
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
    {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
  </div>
);

export default TrustLockDualCheckout;

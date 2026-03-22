import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, CreditCard, Lock, Truck, CheckCircle, ArrowRight, RotateCcw } from "lucide-react";

const steps = [
  {
    id: 1,
    icon: CreditCard,
    title: "Buyer Initiates Payment",
    desc: "The buyer selects TrustLock Pay at checkout and pays $200 for goods from a verified African vendor.",
    detail: "Payment processed via Coinbase/Stripe/Transak. Buyer can use card, mobile wallet, or crypto.",
    status: "Payment Submitted",
    amount: "$200.00",
  },
  {
    id: 2,
    icon: Lock,
    title: "Funds Locked in Escrow",
    desc: "The $200 is instantly locked in an Azix smart contract on Polygon. Neither party can access it.",
    detail: "Smart contract address: 0x7a3f...e9b2. Funds secured with cryptographic escrow. Vendor notified.",
    status: "Funds Secured",
    amount: "$200.00",
  },
  {
    id: 3,
    icon: Truck,
    title: "Vendor Delivers Goods",
    desc: "The vendor ships the order and provides tracking information. Buyer monitors delivery progress.",
    detail: "Tracking ID: AZ-2024-0847. Estimated delivery: 5-7 business days. Real-time status updates.",
    status: "In Transit",
    amount: "$200.00",
  },
  {
    id: 4,
    icon: CheckCircle,
    title: "Payment Released",
    desc: "Buyer confirms satisfaction. Funds automatically released to vendor in their local currency.",
    detail: "Vendor receives ₦308,000 (NGN) via off-ramp. Transaction complete. Both parties rated.",
    status: "Completed ✓",
    amount: "$200.00",
  },
];

const TrustLockBuyerFlow = () => {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    if (activeStep < steps.length - 1) setActiveStep(activeStep + 1);
  };

  const handleReset = () => setActiveStep(0);

  return (
    <section id="demo" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Shield className="w-4 h-4 text-accent" />
            Interactive Demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            See TrustLock in Action
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Walk through a real escrow payment flow step by step.
          </p>
        </motion.div>

        <div className="mt-14 max-w-4xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-10">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => setActiveStep(i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shrink-0 ${
                    i <= activeStep
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < activeStep ? <CheckCircle className="w-5 h-5" /> : step.id}
                </button>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                    i < activeStep ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Active step card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row gap-8">
                    <div className="flex-1">
                      <div className="w-14 h-14 rounded-xl bg-green-light flex items-center justify-center">
                        {(() => {
                          const Icon = steps[activeStep].icon;
                          return <Icon className="w-7 h-7 text-primary" />;
                        })()}
                      </div>
                      <h3 className="mt-4 font-heading font-bold text-2xl text-foreground">
                        {steps[activeStep].title}
                      </h3>
                      <p className="mt-3 text-muted-foreground leading-relaxed">
                        {steps[activeStep].desc}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground bg-muted rounded-lg p-3">
                        {steps[activeStep].detail}
                      </p>
                    </div>

                    {/* Status panel */}
                    <div className="lg:w-64 shrink-0">
                      <div className="bg-green-light rounded-xl p-5 space-y-3">
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                          Transaction Status
                        </div>
                        <div className="text-sm font-bold text-primary">
                          {steps[activeStep].status}
                        </div>
                        <div className="border-t border-primary/10 pt-3">
                          <div className="text-xs text-muted-foreground">Escrow Amount</div>
                          <div className="text-2xl font-bold text-foreground">{steps[activeStep].amount}</div>
                        </div>
                        <div className="border-t border-primary/10 pt-3">
                          <div className="text-xs text-muted-foreground">Step {activeStep + 1} of {steps.length}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className={activeStep === 0 ? "invisible" : ""}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" /> Reset
                    </Button>
                    <Button
                      variant="hero"
                      onClick={activeStep < steps.length - 1 ? handleNext : handleReset}
                      className="gap-2"
                    >
                      {activeStep < steps.length - 1 ? (
                        <>Next Step <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <>Restart Demo <RotateCcw className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default TrustLockBuyerFlow;

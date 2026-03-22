import { motion } from "framer-motion";
import { Shield, Lock, CreditCard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TrustLockWidget = () => {
  return (
    <section className="py-20 lg:py-28 bg-muted/50">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            TrustLock Pay — Checkout Widget
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            This is how TrustLock Pay appears on a vendor's website — a trusted escrow checkout overlay.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-14 max-w-5xl mx-auto"
        >
          {/* Mock vendor website */}
          <Card className="overflow-hidden border-2 border-border shadow-xl">
            {/* Browser chrome */}
            <div className="bg-muted px-4 py-3 border-b border-border flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/40" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-primary/40" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-md px-3 py-1 text-xs text-muted-foreground font-mono">
                  https://vendor-shop.africa/checkout
                </div>
              </div>
            </div>

            {/* Mock page content */}
            <div className="bg-background p-6 lg:p-10">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: vendor order summary */}
                <div className="space-y-4">
                  <h3 className="font-heading font-bold text-xl text-foreground">Order Summary</h3>
                  <div className="space-y-3">
                    {[
                      { name: "Premium Shea Butter (5kg)", price: "$45.00" },
                      { name: "Handwoven Kente Cloth", price: "$120.00" },
                      { name: "Organic Cocoa Beans (2kg)", price: "$35.00" },
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between py-2 border-b border-border">
                        <span className="text-sm text-foreground">{item.name}</span>
                        <span className="text-sm font-semibold text-foreground">{item.price}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-heading font-bold text-foreground">Total</span>
                      <span className="font-heading font-bold text-lg text-primary">$200.00</span>
                    </div>
                  </div>
                </div>

                {/* Right: TrustLock widget */}
                <div className="border-2 border-primary/20 rounded-xl bg-green-light/50 p-6 relative">
                  <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    TrustLock Pay Protected
                  </div>

                  <div className="mt-2 space-y-4">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="mt-2 font-heading font-bold text-foreground">Secure Escrow Payment</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Funds held securely until you confirm delivery
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-background rounded-lg px-3 py-2.5 border border-border flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Card ending •••• 4242</span>
                      </div>

                      <div className="bg-background rounded-lg px-3 py-2.5 border border-border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Escrow Amount</span>
                          <span className="font-bold text-primary">$200.00</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">TrustLock Pay Fee (1.5%)</span>
                          <span className="text-xs text-muted-foreground">$3.00</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="hero" className="w-full gap-2">
                      Pay with TrustLock Pay
                      <ChevronRight className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      Secured by Azix Smart Contracts on Polygon
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockWidget;

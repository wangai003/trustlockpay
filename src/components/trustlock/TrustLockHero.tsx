import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Globe } from "lucide-react";

const TrustLockHero = () => {
  const navigate = useNavigate();
  return (
    <section className="pt-28 pb-20 lg:pt-36 lg:pb-28 bg-gradient-to-b from-green-light to-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
            <Shield className="w-4 h-4" />
            Escrow Payment Gateway for Africa
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            TrustLock
            <span className="block text-primary mt-2">OS v1.0</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The first blockchain-secured escrow operating system built for African commerce.
            Embed trust directly into any vendor website — powered by Azix's smart contract infrastructure
            and the TrustLock Pay checkout experience.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="text-base px-8">
              Start Free Integration
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8">
              View Documentation
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { icon: Shield, label: "Smart Contract Escrow" },
              { icon: Zap, label: "Instant Settlement" },
              { icon: Globe, label: "Multi-Currency" },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockHero;

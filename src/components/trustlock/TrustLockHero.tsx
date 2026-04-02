import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Globe, Code } from "lucide-react";
import PortalPicker from "@/components/shared/PortalPicker";

const TrustLockHero = () => {
  const navigate = useNavigate();
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <section className="pt-28 pb-20 lg:pt-36 lg:pb-28 bg-gradient-to-b from-green-light to-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-foreground leading-tight">
              TrustLock Pay
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The first blockchain-secured escrow operating system built for African commerce.
              Embed trust directly into any vendor website — powered by Azix's smart contract infrastructure
              and the TrustLock Pay checkout experience.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" className="text-base px-8" onClick={() => setPortalOpen(true)}>
                Start Free Integration
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8" onClick={() => navigate("/trustlock")}>
                View Documentation
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {[
                { icon: Shield, label: "Smart Contract Escrow" },
                { icon: Zap, label: "Instant Settlement" },
                { icon: Globe, label: "Multi-Currency" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode="signup" />
    </>
  );
};

export default TrustLockHero;

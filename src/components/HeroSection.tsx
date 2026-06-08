import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, CheckCircle, Globe, Shield, FileCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalPicker from "@/components/shared/PortalPicker";
import GlowOrb from "@/components/landing/GlowOrb";

const HeroSection = () => {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-[hsl(160,20%,6%)]">
        {/* Glow orbs */}
        <GlowOrb color="primary" size={600} top="-200px" left="-200px" delay={0} />
        <GlowOrb color="accent" size={400} top="100px" right="-100px" delay={1.5} />
        <GlowOrb color="emerald" size={500} bottom="-200px" left="40%" delay={0.8} />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(152,52%,40%) 1px, transparent 1px), linear-gradient(90deg, hsl(152,52%,40%) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">Blockchain-Secured Escrow Infrastructure</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight"
            >
              <span className="text-[hsl(0,0%,95%)]">The Escrow OS for</span>
              <br />
              <motion.span
                className="bg-gradient-to-r from-primary via-[hsl(152,52%,50%)] to-accent bg-clip-text text-transparent bg-[length:200%_auto]"
                animate={{ backgroundPosition: ["0% center", "100% center", "0% center"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                Global Trade
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="mt-6 text-lg lg:text-xl text-[hsl(160,5%,60%)] max-w-2xl mx-auto leading-relaxed"
            >
              Replace Letters of Credit with milestone-based smart contract escrow — securing cross-border transactions from Purchase Order to final delivery.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 text-sm text-[hsl(160,10%,72%)] max-w-xl mx-auto"
            >
              Built for importers, exporters, and SMEs trading across any corridor.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_30px_hsl(152,52%,24%/0.3)] hover:shadow-[0_0_50px_hsl(152,52%,24%/0.5)] transition-all duration-300"
                  onClick={() => setPortalOpen(true)}
                >
                  Start Free <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="rounded-full px-8 border-2 border-[hsl(160,15%,18%)] text-[hsl(0,0%,95%)] bg-transparent hover:bg-[hsl(160,15%,15%)] hover:border-primary/30 transition-all duration-300"
                  asChild
                >
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </motion.div>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-[hsl(160,10%,72%)]"
            >
              {[
                { icon: Shield, label: "Blockchain-verified" },
                { icon: FileCheck, label: "Document-gated milestones" },
                { icon: Globe, label: "Multi-currency settlement" },
              ].map((badge, i) => (
                <motion.span
                  key={badge.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <badge.icon className="w-4 h-4 text-primary" /> {badge.label}
                </motion.span>
              ))}
            </motion.div>

            {/* Animated escrow flow visual */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="mt-16 max-w-lg mx-auto"
            >
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(160,15%,15%)] border border-[hsl(160,15%,22%)]"
                >
                  <Globe className="w-4 h-4 text-[hsl(160,5%,60%)]" />
                  <span className="text-sm font-medium text-[hsl(0,0%,95%)]">Buyer</span>
                </motion.div>

                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-8 h-[2px] bg-gradient-to-r from-primary/50 to-primary"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 0px hsl(152,52%,40%/0)", "0 0 20px hsl(152,52%,40%/0.4)", "0 0 0px hsl(152,52%,40%/0)"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center"
                  >
                    <Lock className="w-4 h-4 text-primary" />
                  </motion.div>
                  <motion.div
                    animate={{ x: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="w-8 h-[2px] bg-gradient-to-r from-primary to-accent/50"
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(160,15%,15%)] border border-[hsl(160,15%,22%)]"
                >
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-[hsl(0,0%,95%)]">Vendor</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-5 h-5 text-[hsl(160,5%,30%)]" />
        </motion.div>
      </section>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode="signup" />
    </>
  );
};

export default HeroSection;

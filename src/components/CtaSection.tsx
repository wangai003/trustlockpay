import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield, BadgeCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalPicker from "@/components/shared/PortalPicker";
import GlowOrb from "@/components/landing/GlowOrb";

const CtaSection = () => {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <section className="relative py-20 lg:py-28 bg-[hsl(160,20%,6%)] overflow-hidden">
        <GlowOrb color="primary" size={600} top="-200px" left="30%" delay={0} />
        <GlowOrb color="accent" size={300} bottom="-100px" right="20%" delay={1} />

        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">
              The Future of Cross-Border Trade Starts Here
            </h2>

            <div className="mt-8 flex flex-wrap justify-center gap-6 text-[hsl(160,5%,60%)] text-sm">
              <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Smart contract escrow</span>
              <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-primary" /> Document-verified milestones</span>
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Blockchain-anchored proofs</span>
            </div>

            <div className="mt-8">
              <Button
                size="lg"
                className="rounded-full px-10 text-base bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-[0_0_30px_hsl(43,80%,48%/0.3)]"
                onClick={() => setPortalOpen(true)}
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode="signup" />
    </>
  );
};

export default CtaSection;

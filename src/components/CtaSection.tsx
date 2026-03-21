import { motion } from "framer-motion";
import { ArrowRight, Shield, BadgeCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const CtaSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-primary">
      <div className="container mx-auto px-4 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            The Future of Diaspora Commerce Starts Here
          </h2>

          <div className="mt-8 flex flex-wrap justify-center gap-6 text-primary-foreground/80 text-sm">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Secure payments</span>
            <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> Verified vendors</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Protected transactions</span>
          </div>

          <div className="mt-8">
            <Button variant="gold" size="lg" className="rounded-full px-10 text-base">
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CtaSection;

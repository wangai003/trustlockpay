import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";

const TrustLockCta = () => {
  return (
    <section className="py-20 lg:py-28 bg-primary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <Shield className="w-12 h-12 text-primary-foreground/80 mx-auto mb-4" />
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            Ready to Earn Your Customers' Trust?
          </h2>
          <p className="mt-4 text-primary-foreground/70 text-lg">
            Join hundreds of African vendors using TrustLock to secure international payments and grow their business.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="gold" size="lg" className="text-base px-8 gap-2">
              Start Free <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Talk to Sales
            </Button>
          </div>
          <p className="mt-6 text-xs text-primary-foreground/50">
            No setup fees · 1-2.5% per transaction · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustLockCta;

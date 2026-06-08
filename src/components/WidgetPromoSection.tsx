import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code, Shield, ArrowRight } from "lucide-react";

const WidgetPromoSection = () => {
  return (
    <section className="relative py-16 lg:py-20 bg-[hsl(160,20%,6%)] border-t border-[hsl(160,15%,14%)]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center space-y-4"
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            <Shield className="w-7 h-7 text-primary" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(0,0%,95%)]">
            Add Escrow to Any Website in Minutes
          </h2>
          <p className="text-[hsl(160,5%,60%)] text-sm sm:text-base max-w-lg mx-auto">
            Embed the TrustLock Pay widget on your Shopify, WordPress, Wix, or custom site. Give your customers buyer protection with one line of code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/test-widget">
                <Button size="lg" className="gap-2 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_25px_hsl(152,52%,24%/0.3)]">
                  <Code className="w-4 h-4" /> Try the Widget Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link to="/trustlock">
                <Button size="lg" className="gap-2 px-8 rounded-full border-2 border-[hsl(160,15%,18%)] text-[hsl(0,0%,95%)] bg-transparent hover:bg-[hsl(160,15%,15%)]">
                  Learn About TrustLock Pay
                </Button>
              </Link>
            </motion.div>
          </div>

          <p className="text-xs text-[hsl(160,10%,72%)] pt-2">
            Works on Shopify · WordPress · WooCommerce · Wix · Squarespace · Any HTML site
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WidgetPromoSection;

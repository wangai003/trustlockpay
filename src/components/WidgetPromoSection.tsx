import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code, Shield, ArrowRight } from "lucide-react";

const WidgetPromoSection = () => {
  return (
    <section className="py-16 lg:py-20 bg-gradient-to-b from-background to-primary/5 border-t border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center space-y-4"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Are You a Vendor? Add Escrow to Your Website
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            Embed the TrustLock Pay widget on your Shopify, WordPress, Wix, or custom site. Give your customers buyer protection in one line of code — no account required to test.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/test-widget">
              <Button variant="hero" size="lg" className="gap-2 px-8">
                <Code className="w-4 h-4" /> Try the Widget Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/trustlock">
              <Button variant="hero-outline" size="lg" className="gap-2 px-8">
                Learn About TrustLock Pay
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Works on Shopify · WordPress · WooCommerce · Wix · Squarespace · Any HTML site
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WidgetPromoSection;

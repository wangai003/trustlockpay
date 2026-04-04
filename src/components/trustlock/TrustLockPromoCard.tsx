import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Code, ArrowRight, CheckCircle } from "lucide-react";
import promoImage from "@/assets/trustlock-widget-promo.png";

const bullets = [
  "Free Sandbox Mode — No Payment Required",
  "Works on Shopify · WordPress · Wix · Any Site",
  "Buyer Protection Badge Builds Instant Trust",
  "Remove Anytime — Zero Commitment",
];

const TrustLockPromoCard = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section className="py-16 lg:py-24 bg-[hsl(220,20%,10%)]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left – text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">
                Beta Testers Wanted
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Add Escrow to Your Store{" "}
              <span className="text-primary">In 60 Seconds</span>
            </h2>

            <p className="text-[hsl(220,10%,65%)] text-base lg:text-lg max-w-lg leading-relaxed">
              A plug-and-play checkout widget that adds blockchain-secured buyer
              protection to any e-commerce platform. Test it free in sandbox
              mode — no account required.
            </p>

            <ul className="space-y-3 pt-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-[hsl(220,10%,80%)] text-sm sm:text-base">{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-4">
              <Link to="/test-widget">
                <Button variant="hero" size="lg" className="gap-2 px-8">
                  <Code className="w-4 h-4" /> Try the Widget Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right – promo image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <img
              src={promoImage}
              alt="TrustLock Pay widget promo — add escrow to your store in 60 seconds"
              className="w-full max-w-md lg:max-w-lg rounded-2xl shadow-2xl shadow-primary/10"
              loading="lazy"
              width={1080}
              height={1080}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
});

TrustLockPromoCard.displayName = "TrustLockPromoCard";

export default TrustLockPromoCard;

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code, Shield, CheckCircle, Zap, ArrowRight } from "lucide-react";

const TrustLockTestWidget = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section className="py-16 lg:py-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Code className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Test the Widget on Your Site
          </h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            See TrustLock escrow in action — paste one line of code on your website and watch the checkout shield appear. No signups, no cost, sandbox mode only.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {[
            { icon: Code, title: "Copy One Script Tag", desc: "Get your personalized embed code in seconds" },
            { icon: Shield, title: "Shield Button Appears", desc: "A floating TrustLock button shows on your site" },
            { icon: CheckCircle, title: "Test the Full Flow", desc: "Simulate an escrow payment — no real money moves" },
          ].map((item) => (
            <div key={item.title} className="bg-background rounded-xl border border-border p-4 text-center space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link to="/test-widget">
            <Button variant="hero" size="lg" className="text-base px-8 gap-2">
              <Zap className="w-4 h-4" /> Get Your Widget Code <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">30-second install · Works on Shopify, WordPress, Wix & more</p>
        </motion.div>
      </div>
    </section>
  );
});

TrustLockTestWidget.displayName = "TrustLockTestWidget";

export default TrustLockTestWidget;

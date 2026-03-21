import { motion } from "framer-motion";
import { Shield, RefreshCw, Globe, Banknote, Scale, Code } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Blockchain Escrow",
    desc: "Funds are locked in Polygon smart contracts until both parties confirm satisfaction. No middlemen, no risk.",
  },
  {
    icon: RefreshCw,
    title: "Automated Release",
    desc: "Funds release automatically once delivery is confirmed by the buyer. Dispute? Our resolution team steps in.",
  },
  {
    icon: Globe,
    title: "Multi-Currency Support",
    desc: "Accept payments in USD, EUR, GBP and settle in local African currencies via Coinbase, Stripe & Transak.",
  },
  {
    icon: Banknote,
    title: "Vendor Off-Ramp",
    desc: "Vendors cash out in their local currency — Naira, Cedi, Shilling, Rand — through our liquidity partners.",
  },
  {
    icon: Scale,
    title: "Dispute Resolution",
    desc: "Built-in investigation system for fraud, discrepancy, and dishonesty using strict procedures and evidence review.",
  },
  {
    icon: Code,
    title: "Easy Integration",
    desc: "Drop-in widget for any website. Works alongside existing Visa, Mastercard, and PayPal payment gateways.",
  },
];

const TrustLockFeatures = () => {
  return (
    <section id="features" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Why Vendors Choose TrustLock
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Build instant trust with international customers through transparent, secure escrow payments.
          </p>
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="h-full border-border hover:border-primary/30 transition-colors group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-green-light flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-heading font-bold text-lg text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustLockFeatures;

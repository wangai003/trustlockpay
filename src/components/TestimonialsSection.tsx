import { motion } from "framer-motion";
import { Shield, Lock, Globe, Zap } from "lucide-react";

const promises = [
  {
    icon: Shield,
    title: "Buyer & Vendor Protection",
    text: "Every transaction is held in escrow with milestone-based release. Buyers don't pay until conditions are met; vendors see guaranteed funds before shipping.",
  },
  {
    icon: Lock,
    title: "Blockchain-Verified Proofs",
    text: "Every escrow event — from payment lock to document upload to final release — is anchored on-chain, creating an immutable audit trail for both parties and regulators.",
  },
  {
    icon: Globe,
    title: "Any Corridor, Any Currency",
    text: "Whether it's Dallas to Lagos, London to Shenzhen, or Dubai to Nairobi — TrustLock handles multi-currency settlement, compliance, and off-ramp in local currency.",
  },
  {
    icon: Zap,
    title: "LC Alternative for SMEs",
    text: "Traditional Letters of Credit require bank relationships and large collateral. TrustLock provides the same escrow guarantee at 1.5% — accessible to any business.",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-secondary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Why Buyers & Vendors Choose TrustLock
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Trust isn't claimed — it's engineered into every layer of the platform.
          </p>
        </motion.div>

        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {promises.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-background rounded-xl p-8 border border-border shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

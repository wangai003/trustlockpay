import { motion } from "framer-motion";
import { Check } from "lucide-react";

const methods = [
  { name: "Bank Wire", cost: "5% – 10%", highlight: false },
  { name: "Remittance Services", cost: "6% – 9%", highlight: false },
  { name: "Online Payment Platforms", cost: "3% – 7%", highlight: false },
  { name: "Legal Escrow Services", cost: "5% – 12%", highlight: false },
  { name: "Azix Escrow", cost: "1% – 2.5%", highlight: true },
];

const FeeComparisonSection = () => {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Lower Fees. More Money Delivered.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Stop losing your hard-earned money to exorbitant international transfer fees.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-xl mx-auto"
        >
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-2 px-6 py-3 bg-muted">
              <span className="text-sm font-semibold text-foreground">Payment Method</span>
              <span className="text-sm font-semibold text-foreground text-right">Typical Cost</span>
            </div>
            {methods.map((m) => (
              <div
                key={m.name}
                className={`grid grid-cols-2 px-6 py-4 border-t border-border ${
                  m.highlight ? "bg-primary/5" : ""
                }`}
              >
                <span className={`text-sm flex items-center gap-2 ${m.highlight ? "font-bold text-primary" : "text-foreground"}`}>
                  {m.highlight && <Check className="w-4 h-4 text-primary" />}
                  {m.name}
                </span>
                <span className={`text-sm text-right ${m.highlight ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {m.cost}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeeComparisonSection;

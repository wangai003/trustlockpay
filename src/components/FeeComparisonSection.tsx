import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { useState } from "react";
import { ALL_IN_RANGES, BUYER_FEE_LINES } from "@/lib/feeEngine";

const methods = [
  { name: "Letter of Credit (LC)", cost: "2% – 8% + bank fees", highlight: false },
  { name: "Bank Wire (no escrow)", cost: "3% – 10%", highlight: false },
  { name: "Remittance Services", cost: "6% – 9%", highlight: false },
  { name: "Legal Escrow Services", cost: "5% – 12%", highlight: false },
  { name: "TrustLock Escrow", cost: `${ALL_IN_RANGES.cryptoDirect.range} – ${ALL_IN_RANGES.fiat.range.split(" – ")[1]}`, highlight: true },
];

const rowVariant = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0 },
};

const FeeComparisonSection = () => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-[hsl(160,20%,6%)] overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">Lower Fees. Stronger Guarantees.</h2>
          <p className="mt-4 text-[hsl(160,5%,60%)] text-lg">
            Why pay bank LC fees when you can get the same escrow protection at a fraction of the cost?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-xl mx-auto"
        >
          <div className="rounded-xl border border-[hsl(160,15%,16%)] overflow-hidden bg-[hsl(160,15%,10%)]">
            <div className="grid grid-cols-2 px-6 py-3 bg-[hsl(160,15%,12%)]">
              <span className="text-sm font-semibold text-[hsl(0,0%,95%)]">Payment Method</span>
              <span className="text-sm font-semibold text-[hsl(0,0%,95%)] text-right">All-in Cost</span>
            </div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ staggerChildren: 0.07 }}
            >
              {methods.map((m) => (
                <motion.div
                  key={m.name}
                  variants={rowVariant}
                  whileHover={m.highlight ? { backgroundColor: "hsl(152, 52%, 24%, 0.12)" } : { backgroundColor: "hsl(160, 15%, 12%)" }}
                  className={`grid grid-cols-2 px-6 py-4 border-t border-[hsl(160,15%,16%)] transition-colors ${m.highlight ? "bg-primary/5" : ""}`}
                >
                  <span className={`text-sm flex items-center gap-2 ${m.highlight ? "font-bold text-primary" : "text-[hsl(0,0%,90%)]"}`}>
                    {m.highlight && <Check className="w-4 h-4 text-primary" />}
                    {m.name}
                  </span>
                  <span className={`text-sm text-right ${m.highlight ? "font-bold text-primary" : "text-[hsl(160,5%,50%)]"}`}>
                    {m.cost}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="inline-flex items-center gap-1.5 text-sm text-[hsl(160,10%,72%)] hover:text-[hsl(0,0%,90%)] transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              {showBreakdown ? "Hide fee breakdown" : "See how our fees break down"}
            </button>
          </div>

          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 rounded-lg border border-[hsl(160,15%,16%)] bg-[hsl(160,15%,10%)] p-4 space-y-4 text-xs"
            >
              <p className="text-sm text-[hsl(160,10%,72%)] text-center font-medium uppercase tracking-wide">
                What buyers see at checkout
              </p>
              <div className="p-3 rounded-lg bg-[hsl(160,20%,8%)] border border-[hsl(160,15%,16%)] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[hsl(0,0%,95%)]">{BUYER_FEE_LINES.transactionFee.label}</span>
                  <span className="font-semibold text-[hsl(0,0%,95%)]">{BUYER_FEE_LINES.transactionFee.range}</span>
                </div>
                <p className="text-sm text-[hsl(160,10%,72%)]">{BUYER_FEE_LINES.transactionFee.description}</p>
                <p className="text-sm text-[hsl(160,10%,72%)] italic">Includes: {BUYER_FEE_LINES.transactionFee.includes}</p>
              </div>
              <div className="p-3 rounded-lg bg-[hsl(160,20%,8%)] border border-[hsl(160,15%,16%)] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[hsl(0,0%,95%)]">{BUYER_FEE_LINES.taxesAndDuties.label}</span>
                  <span className="font-semibold text-[hsl(0,0%,95%)]">{BUYER_FEE_LINES.taxesAndDuties.range}</span>
                </div>
                <p className="text-sm text-[hsl(160,10%,72%)]">{BUYER_FEE_LINES.taxesAndDuties.description}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">{BUYER_FEE_LINES.escrowServiceFee.label}</span>
                  <span className="font-semibold text-primary">{BUYER_FEE_LINES.escrowServiceFee.display}</span>
                </div>
                <p className="text-sm text-[hsl(160,10%,72%)]">{BUYER_FEE_LINES.escrowServiceFee.description}</p>
              </div>
              <div className="border-t border-[hsl(160,15%,16%)] pt-3 space-y-1.5">
                <p className="text-[hsl(160,10%,72%)]"><strong className="text-[hsl(0,0%,95%)]">Crypto Direct:</strong> {ALL_IN_RANGES.cryptoDirect.range}</p>
                <p className="text-[hsl(160,10%,72%)]"><strong className="text-[hsl(0,0%,95%)]">Fiat Payment:</strong> {ALL_IN_RANGES.fiat.range}</p>
                <p className="text-[hsl(160,10%,72%)]"><strong className="text-[hsl(0,0%,95%)]">Refunds:</strong> {ALL_IN_RANGES.refund.range}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default FeeComparisonSection;

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { useState } from "react";
import { ALL_IN_RANGES, FEE_CATEGORIES } from "@/lib/feeEngine";

const methods = [
  { name: "Bank Wire", cost: "5% – 10%", highlight: false },
  { name: "Remittance Services", cost: "6% – 9%", highlight: false },
  { name: "Online Payment Platforms", cost: "3% – 7%", highlight: false },
  { name: "Legal Escrow Services", cost: "5% – 12%", highlight: false },
  { name: "Azix Escrow", cost: `${ALL_IN_RANGES.cryptoDirect.range.split(" – ")[0]} – ${ALL_IN_RANGES.fiat.range.split(" – ")[1]}`, highlight: true },
];

const FeeComparisonSection = () => {
  const [showBreakdown, setShowBreakdown] = useState(false);

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
              <span className="text-sm font-semibold text-foreground text-right">All-in Cost</span>
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

          {/* Fee breakdown toggle */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              {showBreakdown ? "Hide fee breakdown" : "See how our fees break down"}
            </button>
          </div>

          {showBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{FEE_CATEGORIES.platform.label}</span>
                <span className="text-right font-medium">{FEE_CATEGORIES.platform.range}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{FEE_CATEGORIES.processor.label}</span>
                <span className="text-right font-medium">{FEE_CATEGORIES.processor.range}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Escrow Service Fee (at release)</span>
                <span className="text-right font-medium">1.0% of vendor principal</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{FEE_CATEGORIES.escrowService.label} (at release)</span>
                <span className="text-right font-medium">{FEE_CATEGORIES.escrowService.display}</span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">{FEE_CATEGORIES.gasModel.label}</span>
                <span className="text-right font-medium">{FEE_CATEGORIES.gasModel.userCost} (Gasless)</span>
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Crypto Direct:</strong> {ALL_IN_RANGES.cryptoDirect.range} (no processor fee)
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Fiat Payment:</strong> {ALL_IN_RANGES.fiat.range} (includes processor)
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Refunds:</strong> {ALL_IN_RANGES.refund.range} — escrow fees waived
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default FeeComparisonSection;

import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { useState } from "react";
import { ALL_IN_RANGES, BUYER_FEE_LINES } from "@/lib/feeEngine";

const methods = [
  { name: "Bank Wire", cost: "5% – 10%", highlight: false },
  { name: "Remittance Services", cost: "6% – 9%", highlight: false },
  { name: "Online Payment Platforms", cost: "3% – 7%", highlight: false },
  { name: "Legal Escrow Services", cost: "5% – 12%", highlight: false },
  { name: "Azix Escrow", cost: `${ALL_IN_RANGES.cryptoDirect.range} – ${ALL_IN_RANGES.fiat.range.split(" – ")[1]}`, highlight: true },
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
              className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-4 text-xs"
            >
              <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-wide">
                What buyers see at checkout
              </p>

              {/* Line 1: Transaction Fee */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{BUYER_FEE_LINES.transactionFee.label}</span>
                  <span className="font-semibold text-foreground">{BUYER_FEE_LINES.transactionFee.range}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{BUYER_FEE_LINES.transactionFee.description}</p>
                <p className="text-[10px] text-muted-foreground italic">Includes: {BUYER_FEE_LINES.transactionFee.includes}</p>
              </div>

              {/* Line 2: Taxes & Duties */}
              <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{BUYER_FEE_LINES.taxesAndDuties.label}</span>
                  <span className="font-semibold text-foreground">{BUYER_FEE_LINES.taxesAndDuties.range}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{BUYER_FEE_LINES.taxesAndDuties.description}</p>
              </div>

              {/* Line 3: Escrow Service Fee */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-primary">{BUYER_FEE_LINES.escrowServiceFee.label}</span>
                  <span className="font-semibold text-primary">{BUYER_FEE_LINES.escrowServiceFee.display}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{BUYER_FEE_LINES.escrowServiceFee.description}</p>
              </div>

              {/* All-in ranges */}
              <div className="border-t border-border pt-3 space-y-1.5">
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Crypto Direct:</strong> {ALL_IN_RANGES.cryptoDirect.range} (no processor fee)
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Fiat Payment:</strong> {ALL_IN_RANGES.fiat.range} (includes processor)
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Refunds:</strong> {ALL_IN_RANGES.refund.range}
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

import { motion } from "framer-motion";
import { Shield, Landmark, Package, ShoppingCart } from "lucide-react";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";

const parties = [
  {
    icon: Landmark,
    title: "The Financier",
    subtitle: "Has the capital, but no visibility.",
    pain: "Won't lend without performance proof",
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
  },
  {
    icon: Package,
    title: "The Vendor",
    subtitle: "Has the product, but not the funding.",
    pain: "Can't access capital without collateral",
    color: "text-[hsl(40,70%,45%)]",
    border: "border-[hsl(40,70%,45%)]/30",
    bg: "bg-[hsl(40,70%,45%)]/5",
  },
  {
    icon: ShoppingCart,
    title: "The Buyer",
    subtitle: "Has the money, but no guarantee.",
    pain: "Won't pay without delivery assurance",
    color: "text-primary",
    border: "border-primary/30",
    bg: "bg-primary/5",
  },
];

const TrilemmaSection = () => {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Subtle grid bg */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)/0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 md:mb-16"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <img src={trustlockLogo} alt="" className="h-7 w-7 object-contain" />
            <span className="text-xs sm:text-[11px] tracking-[0.2em] uppercase text-primary/80 font-semibold">
              The $1.7 Trillion Question
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            The Trilemma{" "}
            <span className="text-primary">Factor</span>
          </h2>

          <p className="mt-3 text-base sm:text-lg text-foreground/70 italic max-w-lg">
            A deadlock disguised as a funding gap.
          </p>
        </motion.div>

        {/* Three party cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-10 md:mb-14">
          {parties.map((party, i) => (
            <motion.div
              key={party.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`relative rounded-xl border ${party.border} ${party.bg} p-5 sm:p-6 group`}
            >
              {/* Icon */}
              <div className={`mb-3 ${party.color}`}>
                <party.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>

              <h3 className="text-base font-bold text-foreground tracking-wide uppercase mb-1">
                {party.title}
              </h3>
              <p className="text-sm text-foreground/70 italic mb-4">
                {party.subtitle}
              </p>

              {/* Pain point */}
              <div className="flex items-start gap-2 pt-3 border-t border-border/40">
                <span className="text-destructive text-sm mt-0.5">✕</span>
                <p className="text-sm text-foreground/80 leading-snug">
                  {party.pain}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Central insight */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="rounded-xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6 md:p-8"
        >
          <p className="text-xs sm:text-[11px] tracking-[0.15em] uppercase text-primary font-semibold mb-3">
            The Core Insight
          </p>
          <p className="text-base sm:text-lg text-foreground leading-relaxed max-w-2xl">
            Each party's fear creates the other's problem. The financier won't lend because the
            vendor can't prove performance. The vendor can't perform because the financier won't
            lend. The buyer won't pay because neither side can guarantee the outcome.
          </p>
          <p className="mt-3 text-sm sm:text-base text-foreground/70">
            It's not a money problem — it's a{" "}
            <span className="text-primary font-semibold">trust infrastructure</span> problem.
          </p>

          {/* Resolution pillars */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/30">
            {[
              { num: "01", label: "Locked Escrow", desc: "Funds as collateral" },
              { num: "02", label: "Milestone Gates", desc: "Performance verified" },
              { num: "03", label: "14-Block Chain", desc: "Forensic audit trail" },
            ].map((p) => (
              <div key={p.num} className="text-center">
                <span className="text-xl sm:text-2xl font-bold text-primary">{p.num}</span>
                <p className="text-sm font-semibold text-foreground mt-1">{p.label}</p>
                <p className="text-xs sm:text-sm text-foreground/65 mt-0.5">{p.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrilemmaSection;

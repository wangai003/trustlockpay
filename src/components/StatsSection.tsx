import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Target, Globe, Shield, TrendingDown, Building2 } from "lucide-react";

const stats = [
  { value: 50, suffix: "+", label: "Trade Corridors Supported", icon: Globe },
  { value: 1.5, suffix: "%", label: "All-In Escrow Fee", icon: TrendingDown, decimals: 1 },
  { value: 100, suffix: "%", label: "Blockchain-Verified Proofs", icon: Shield },
  { value: 25, suffix: "+", label: "Industry Document Gates", icon: Target },
  { value: null, display: "∞", label: "SMEs Welcome", icon: Building2 },
];

const AnimatedCounter = ({ value, suffix, decimals = 0, display }: { value: number | null; suffix?: string; decimals?: number; display?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || value === null) return;
    const duration = 1500;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <span ref={ref} className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
      {display || `${decimals > 0 ? count.toFixed(decimals) : Math.floor(count)}${suffix || ""}`}
    </span>
  );
};

const StatsSection = () => {
  return (
    <section className="relative py-16 lg:py-20 bg-[hsl(160,20%,8%)] border-y border-[hsl(160,15%,14%)]">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">
            Built for Global Cross-Border Commerce
          </h2>
          <p className="mt-3 text-[hsl(160,5%,50%)] text-lg">
            A trade finance escrow platform designed for importers, exporters, and SMEs worldwide.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center group"
            >
              <motion.div
                whileHover={{ scale: 1.08 }}
                className="inline-flex flex-col items-center gap-2"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors group-hover:shadow-[0_0_15px_hsl(152,52%,24%/0.2)]">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <AnimatedCounter value={stat.value ?? null} suffix={stat.suffix} decimals={stat.decimals} display={stat.display} />
                <p className="text-sm text-[hsl(160,5%,50%)] mt-1">{stat.label}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

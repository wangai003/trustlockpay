import { motion } from "framer-motion";
import { Target, Globe, Shield, TrendingDown, Building2 } from "lucide-react";

const stats = [
  { value: "50+", label: "Trade Corridors Supported", icon: Globe },
  { value: "1.5%", label: "All-In Escrow Fee", icon: TrendingDown },
  { value: "100%", label: "Blockchain-Verified Proofs", icon: Shield },
  { value: "25+", label: "Industry Document Gates", icon: Target },
  { value: "∞", label: "SMEs Welcome", icon: Building2 },
];

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
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center group"
            >
              <div className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {stat.value}
              </div>
              <p className="text-sm text-[hsl(160,5%,50%)] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

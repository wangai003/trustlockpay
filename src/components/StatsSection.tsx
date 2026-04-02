import { motion } from "framer-motion";
import { Target, Globe, Shield, TrendingDown, Users } from "lucide-react";

const stats = [
  { value: "54", label: "African Markets Targeted", icon: Globe },
  { value: "1.5%", label: "All-In Escrow Fee", icon: TrendingDown },
  { value: "100%", label: "Blockchain-Verified Proofs", icon: Shield },
  { value: "15+", label: "Industries Supported", icon: Target },
  { value: "∞", label: "Vendors Welcome", icon: Users },
];

const StatsSection = () => {
  return (
    <section className="py-16 lg:py-20 bg-primary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
            Built for Global African Commerce
          </h2>
          <p className="mt-3 text-primary-foreground/70 text-lg">
            A platform designed from the ground up to serve diaspora buyers and African vendors.
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
              className="text-center"
            >
              <div className="text-3xl lg:text-4xl font-extrabold text-accent">{stat.value}</div>
              <p className="text-sm text-primary-foreground/70 mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

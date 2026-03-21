import { motion } from "framer-motion";

const stats = [
  { value: "8,500+", label: "Registered Users" },
  { value: "420+", label: "Verified Vendors" },
  { value: "$3.2M+", label: "Escrow Transactions" },
  { value: "12", label: "Countries Connected" },
  { value: "85%", label: "Reduction in Risk" },
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
            Trusted by a Growing Global Community
          </h2>
          <p className="mt-3 text-primary-foreground/70 text-lg">
            People trust platforms with visible numbers and proven success records.
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

import { motion } from "framer-motion";
import { HardHat, MapPinned, Plane, Package } from "lucide-react";

const risks = [
  { icon: HardHat, title: "Contractor Fraud", desc: "Unfinished construction projects" },
  { icon: MapPinned, title: "Land Fraud", desc: "Duplicate land sales and disputes" },
  { icon: Plane, title: "Travel Scams", desc: "Fake or unreliable tour operators" },
  { icon: Package, title: "Delivery Issues", desc: "Goods never arriving or substituted" },
];

const stats = [
  { value: "$98B+", label: "in remittances to Africa annually" },
  { value: "8%–10%", label: "Average cross-border payment fees" },
  { value: "#1 Risk", label: "Diaspora property transaction fraud" },
];

const RiskSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-secondary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            The Risk of Doing Business From Abroad
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Every year millions of people in the diaspora send money home to build houses, buy land, invest in businesses, book travel experiences, or support family. But doing business from thousands of miles away often comes with serious risks.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {risks.map((risk, i) => (
            <motion.div
              key={risk.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-background rounded-xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                <risk.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">{risk.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{risk.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="text-3xl lg:text-4xl font-extrabold text-primary">{stat.value}</div>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RiskSection;

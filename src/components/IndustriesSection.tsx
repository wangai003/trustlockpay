import { motion } from "framer-motion";
import { Building2, Home, Sprout, Plane, ShoppingBag } from "lucide-react";

const industries = [
  {
    icon: Building2,
    title: "Construction",
    desc: "Secure milestone payments for contractors and building projects.",
    stat: "Diaspora housing investment exceeds $10B annually",
  },
  {
    icon: Home,
    title: "Real Estate",
    desc: "Protect land deposits and property purchases with escrow.",
    stat: "Property fraud is the most common risk for diaspora investors.",
  },
  {
    icon: Sprout,
    title: "Agriculture",
    desc: "Safely purchase agricultural products from verified farmers.",
    stat: "Agriculture contributes over 30% of Africa's GDP",
  },
  {
    icon: Plane,
    title: "Tourism",
    desc: "Book tours and travel experiences with payment protection.",
    stat: "Africa receives over 70M international visitors annually",
  },
  {
    icon: ShoppingBag,
    title: "Retail",
    desc: "Purchase groceries, supplies, and goods for family back home.",
    stat: "Remittances to Africa exceed $98 billion each year",
  },
];

const IndustriesSection = () => {
  return (
    <section id="industries" className="py-20 lg:py-28 bg-secondary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Industries We Support</h2>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-background rounded-xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-green-light flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <ind.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">{ind.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{ind.desc}</p>
              <p className="text-xs text-accent font-medium mt-3">{ind.stat}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;

import { motion } from "framer-motion";
import { AlertTriangle, FileWarning, Globe, Landmark } from "lucide-react";
import GlowOrb from "@/components/landing/GlowOrb";

const risks = [
  { icon: AlertTriangle, title: "Non-Delivery Risk", desc: "Goods paid for but never shipped — or substituted on arrival" },
  { icon: FileWarning, title: "Document Fraud", desc: "Forged Bills of Lading, inspection certs, or invoices" },
  { icon: Globe, title: "Jurisdictional Gaps", desc: "No legal recourse when buyer and vendor are in different countries" },
  { icon: Landmark, title: "LC Inaccessibility", desc: "Banks reject SMEs — Letters of Credit require large collateral and credit history" },
];

const stats = [
  { value: "$18T+", label: "Annual global trade volume" },
  { value: "40%", label: "of SMEs denied trade finance" },
  { value: "$1.7T", label: "Global trade finance gap" },
];

const RiskSection = () => {
  return (
    <section className="relative py-20 lg:py-28 bg-[hsl(160,20%,8%)] overflow-hidden">
      <GlowOrb color="accent" size={350} top="50%" right="-100px" delay={1} />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">
            Cross-Border Trade Is Broken
          </h2>
          <p className="mt-4 text-[hsl(160,5%,60%)] text-lg leading-relaxed">
            Whether you're importing machinery from China, exporting cocoa from Ghana, or purchasing real estate across borders — the same problems persist.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {risks.map((risk, i) => (
            <motion.div
              key={risk.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-6 bg-[hsl(160,15%,10%)] border border-[hsl(160,15%,16%)] hover:border-destructive/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4 group-hover:bg-destructive/20 transition-colors">
                <risk.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="font-heading font-semibold text-[hsl(0,0%,95%)]">{risk.title}</h3>
              <p className="text-sm text-[hsl(160,5%,50%)] mt-1">{risk.desc}</p>
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
              <p className="text-sm text-[hsl(160,5%,50%)] mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RiskSection;

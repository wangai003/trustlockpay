import { motion } from "framer-motion";
import { Building2, Home, Sprout, Cpu, ShoppingBag, Gem } from "lucide-react";
import GlowOrb from "@/components/landing/GlowOrb";

const industries = [
  { icon: Building2, title: "Construction & Infrastructure", desc: "Milestone-based payments for contractors, verified with inspection certs and progress photos.", stat: "Supports 7-stage document gates" },
  { icon: Home, title: "Real Estate", desc: "Protect deposits, title transfers, and property purchases with escrow and legal document gates.", stat: "Survey, title search, and deed verification" },
  { icon: Sprout, title: "Agriculture & Commodities", desc: "SGS certificates, phytosanitary permits, and Bill of Lading gates for bulk commodity trade.", stat: "End-to-end traceability from farm to port" },
  { icon: Cpu, title: "Technology & Equipment", desc: "Secure hardware imports with customs clearance docs, warranty certs, and delivery confirmation.", stat: "Serial number verification supported" },
  { icon: Gem, title: "Mining & Precious Metals", desc: "Assayer reports, chain-of-custody certs, and export permits — all gated per milestone.", stat: "Multi-page assay report upload support" },
  { icon: ShoppingBag, title: "Retail & E-Commerce", desc: "Lightweight escrow for product orders with shipping confirmation and delivery proof.", stat: "Drop-in widget for any vendor website" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 25, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
};

const IndustriesSection = () => {
  return (
    <section id="industries" className="relative py-20 lg:py-28 bg-[hsl(160,20%,8%)] overflow-hidden">
      <GlowOrb color="emerald" size={400} bottom="-100px" left="10%" delay={0.5} />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">Industries We Support</h2>
          <p className="mt-3 text-[hsl(160,5%,60%)] text-lg">
            Every industry has different document requirements. TrustLock enforces them automatically.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {industries.map((ind) => (
            <motion.div
              key={ind.title}
              variants={item}
              whileHover={{ y: -6, borderColor: "hsl(152, 52%, 30%)" }}
              className="rounded-xl p-6 bg-[hsl(160,15%,10%)] border border-[hsl(160,15%,16%)] hover:shadow-[0_0_30px_hsl(152,52%,24%/0.12)] transition-all duration-300 group cursor-default"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 3 }}
                className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
              >
                <ind.icon className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="font-heading font-bold text-lg text-[hsl(0,0%,95%)]">{ind.title}</h3>
              <p className="text-sm text-[hsl(160,5%,50%)] mt-2">{ind.desc}</p>
              <p className="text-xs text-accent font-medium mt-3">{ind.stat}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default IndustriesSection;

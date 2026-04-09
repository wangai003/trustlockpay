import { motion } from "framer-motion";
import { FileText, Lock, ClipboardCheck, CheckCircle } from "lucide-react";
import GlowOrb from "@/components/landing/GlowOrb";

const steps = [
  { num: "01", icon: FileText, title: "Create a Trade Order", desc: "Define milestones, upload proforma invoices, and set document requirements for your industry." },
  { num: "02", icon: Lock, title: "Funds Locked in Escrow", desc: "Buyer funds are held in a blockchain-secured smart contract. Vendor sees guaranteed funds." },
  { num: "03", icon: ClipboardCheck, title: "Document-Gated Fulfillment", desc: "Each milestone requires verified documents — AI scans for expiry, forgery, and completeness." },
  { num: "04", icon: CheckCircle, title: "Verified Release", desc: "Both parties digitally sign off. Funds release automatically or disputes trigger arbitration." },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="relative py-20 lg:py-28 bg-[hsl(160,20%,6%)] overflow-hidden">
      <GlowOrb color="primary" size={500} top="-100px" right="20%" delay={0.5} />

      {/* Vertical line connector */}
      <div className="absolute left-1/2 top-[200px] bottom-[100px] w-[1px] bg-gradient-to-b from-transparent via-primary/20 to-transparent hidden lg:block" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[hsl(0,0%,95%)]">How It Works</h2>
          <p className="mt-4 text-[hsl(160,5%,60%)] text-lg">Four stages. Full transparency. Zero guesswork.</p>
        </motion.div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center group"
            >
              <div className="text-6xl font-extrabold text-primary/10 group-hover:text-primary/25 transition-colors duration-500">
                {step.num}
              </div>
              <div className="mt-4 w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto group-hover:border-primary/40 group-hover:shadow-[0_0_20px_hsl(152,52%,24%/0.2)] transition-all duration-500">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="mt-4 font-heading font-bold text-lg text-[hsl(0,0%,95%)]">{step.title}</h3>
              <p className="mt-2 text-sm text-[hsl(160,5%,50%)] leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

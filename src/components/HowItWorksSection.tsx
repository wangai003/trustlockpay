import { motion } from "framer-motion";
import { FileText, Lock, ClipboardCheck, CheckCircle } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: FileText,
    title: "Create a Trade Order",
    desc: "Define milestones, upload proforma invoices, and set document requirements for your industry — from SGS certs to Bills of Lading.",
  },
  {
    num: "02",
    icon: Lock,
    title: "Funds Locked in Escrow",
    desc: "Buyer funds are held in a blockchain-secured smart contract. The vendor can see the funds but can't access them until conditions are met.",
  },
  {
    num: "03",
    icon: ClipboardCheck,
    title: "Document-Gated Fulfillment",
    desc: "Each milestone requires verified documents — AI scans for expiry, forgery, and page completeness before the gate unlocks.",
  },
  {
    num: "04",
    icon: CheckCircle,
    title: "Verified Release",
    desc: "Both parties digitally sign off at each stage. Funds release automatically upon final approval — or disputes trigger arbitration.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How TrustLock Escrow Works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Four stages. Full transparency. Zero guesswork.
          </p>
        </motion.div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center group"
            >
              <div className="text-6xl font-extrabold text-primary/10 group-hover:text-primary/20 transition-colors">
                {step.num}
              </div>
              <div className="mt-4 w-14 h-14 rounded-xl bg-green-light flex items-center justify-center mx-auto">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="mt-4 font-heading font-bold text-lg text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

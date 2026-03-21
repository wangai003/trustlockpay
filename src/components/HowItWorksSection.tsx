import { motion } from "framer-motion";
import { Search, Lock, Truck, CheckCircle } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Search,
    title: "Enter Vendor Wallet",
    desc: "Browse trusted businesses across construction, agriculture, tourism, retail, and real estate on our marketplace.",
  },
  {
    num: "02",
    icon: Lock,
    title: "Secure Payment",
    desc: "Funds are safely locked in our cryptographic escrow smart contracts instantly.",
  },
  {
    num: "03",
    icon: Truck,
    title: "Service Delivery",
    desc: "The verified vendor receives notification and completes work or delivers goods.",
  },
  {
    num: "04",
    icon: CheckCircle,
    title: "Payment Released",
    desc: "Funds are released to the vendor only after you confirm satisfaction.",
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
            How Azix Escrow Works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Four simple steps to absolute peace of mind.
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

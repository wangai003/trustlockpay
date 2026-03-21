import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    initials: "DO",
    name: "Daniel O.",
    location: "Dallas, USA (Diaspora User)",
    text: "I wanted to hire a contractor in Nairobi but I was nervous about sending money without protection. With Azix escrow, the payment stayed secure until the work was confirmed. That level of protection gives me real peace of mind.",
  },
  {
    initials: "MN",
    name: "Mary N.",
    location: "Nairobi, Kenya (Vendor Partner)",
    text: "Escrow protection helps international clients trust our business. Customers feel more comfortable placing orders when they know their payment is secured until delivery.",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-secondary">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Trusted by Diaspora Buyers and African Businesses
          </h2>
        </motion.div>

        <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-background rounded-xl p-8 border border-border shadow-sm"
            >
              <Quote className="w-8 h-8 text-accent mb-4" />
              <p className="text-foreground leading-relaxed">{t.text}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-bold">{t.initials}</span>
                </div>
                <div>
                  <div className="font-heading font-semibold text-sm text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.location}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

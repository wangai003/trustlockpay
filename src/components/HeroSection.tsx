import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PortalPicker from "@/components/shared/PortalPicker";
import heroImage from "@/assets/hero-craftsman.jpg";

const HeroSection = () => {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-background overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                <span className="text-foreground">Securely Do Business</span>
                <br />
                <span className="text-accent">Back Home</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-lg leading-relaxed">
                Azix protects diaspora transactions with escrow payments, verified vendors, and low-cost global transfers.
              </p>
              <p className="mt-2 text-base text-muted-foreground max-w-lg">
                Send money, hire contractors, invest in property, or support family businesses with confidence.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Button variant="hero" size="lg" className="rounded-full px-8" onClick={() => setPortalOpen(true)}>
                  Get Started <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
                <Button variant="hero-outline" size="lg" className="rounded-full px-8" asChild>
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
            </motion.div>

            {/* Right - Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroImage}
                  alt="African artisan working in workshop"
                  className="w-full h-[400px] lg:h-[480px] object-cover"
                  loading="eager"
                />

                {/* Escrow badge overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/90 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-3 shadow-lg">
                  <Lock className="w-5 h-5 text-primary" />
                  <div className="w-16 h-1 bg-muted rounded-full relative overflow-hidden">
                    <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>

                {/* Location badges */}
                <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 text-sm shadow-md">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Dallas, USA</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 text-sm shadow-md">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="font-medium text-foreground">Nairobi, KE</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode="signup" />
    </>
  );
};

export default HeroSection;

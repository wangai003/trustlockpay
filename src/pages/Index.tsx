import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import RiskSection from "@/components/RiskSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import StatsSection from "@/components/StatsSection";
import IndustriesSection from "@/components/IndustriesSection";
import FeeComparisonSection from "@/components/FeeComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import WidgetPromoSection from "@/components/WidgetPromoSection";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/landing/AnimatedBackground";
import TrilemmaSection from "@/components/TrilemmaSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-[hsl(160,20%,6%)]">
      <AnimatedBackground />
      <Navbar />
      <HeroSection />
      <TrilemmaSection />
      <RiskSection />
      <HowItWorksSection />
      <StatsSection />
      <IndustriesSection />
      <FeeComparisonSection />
      <TestimonialsSection />
      <WidgetPromoSection />
      <CtaSection />
      <Footer />
    </div>
  );
};

export default Index;

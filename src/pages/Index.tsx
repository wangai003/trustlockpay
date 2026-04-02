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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
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

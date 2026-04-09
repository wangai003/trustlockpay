import { Button } from "@/components/ui/button";
import { Shield, Store, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";
import TrustLockHero from "@/components/trustlock/TrustLockHero";
import TrustLockFeatures from "@/components/trustlock/TrustLockFeatures";
import TrustLockDualCheckout from "@/components/trustlock/TrustLockDualCheckout";
import TrustLockWidget from "@/components/trustlock/TrustLockWidget";
import TrustLockBuyerFlow from "@/components/trustlock/TrustLockBuyerFlow";
import TrustLockDashboard from "@/components/trustlock/TrustLockDashboard";
import TrustLockIntegration from "@/components/trustlock/TrustLockIntegration";
import TrustLockCta from "@/components/trustlock/TrustLockCta";
import TrustLockPromoCard from "@/components/trustlock/TrustLockPromoCard";
import TrustLockTestWidget from "@/components/trustlock/TrustLockTestWidget";
import Footer from "@/components/Footer";

const TrustLock = () => {
  return (
    <div className="min-h-screen bg-[hsl(160,20%,6%)]">
      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(160,20%,6%)]/80 backdrop-blur-lg border-b border-[hsl(160,15%,15%)]">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={trustlockLogo} alt="TrustLock Pay logo" className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-contain" />
            <span className="font-heading font-bold text-base sm:text-lg text-[hsl(0,0%,95%)]">TrustLock</span>
          </Link>
          <div className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Features</a>
            <a href="#demo" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Live Demo</a>
            <a href="#dashboard" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Dashboard</a>
            <a href="#integrate" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Integrate</a>
            <Link to="/test-widget" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Test Widget</Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/trustlock/admin/login">
              <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-3 border-[hsl(160,15%,20%)] text-[hsl(0,0%,85%)] hover:bg-[hsl(160,15%,15%)] hover:text-[hsl(0,0%,95%)]">
                <Shield className="w-3.5 h-3.5 shrink-0" /> Admin
              </Button>
            </Link>
            <Link to="/trustlock/vendor/login">
              <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-3 border-[hsl(160,15%,20%)] text-[hsl(0,0%,85%)] hover:bg-[hsl(160,15%,15%)] hover:text-[hsl(0,0%,95%)]">
                <Store className="w-3.5 h-3.5 shrink-0" /> Vendor
              </Button>
            </Link>
            <Link to="/trustlock/buyer/login">
              <Button variant="outline" size="sm" className="gap-1 text-[10px] sm:text-xs px-1.5 sm:px-3 border-[hsl(160,15%,20%)] text-[hsl(0,0%,85%)] hover:bg-[hsl(160,15%,15%)] hover:text-[hsl(0,0%,95%)]">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" /> Buyer
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <TrustLockHero />
      <TrustLockFeatures />
      <TrustLockDualCheckout />
      <TrustLockWidget />
      <TrustLockBuyerFlow />
      <TrustLockDashboard />
      <TrustLockIntegration />
      <TrustLockTestWidget />
      <TrustLockPromoCard />
      <TrustLockCta />
      <Footer />
    </div>
  );
};

export default TrustLock;

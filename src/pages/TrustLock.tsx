import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Store, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import TrustLockHero from "@/components/trustlock/TrustLockHero";
import TrustLockFeatures from "@/components/trustlock/TrustLockFeatures";
import TrustLockDualCheckout from "@/components/trustlock/TrustLockDualCheckout";
import TrustLockWidget from "@/components/trustlock/TrustLockWidget";
import TrustLockBuyerFlow from "@/components/trustlock/TrustLockBuyerFlow";
import TrustLockDashboard from "@/components/trustlock/TrustLockDashboard";
import TrustLockIntegration from "@/components/trustlock/TrustLockIntegration";
import TrustLockCta from "@/components/trustlock/TrustLockCta";
import Footer from "@/components/Footer";

const TrustLock = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-sm">TL</span>
              </div>
              <span className="font-heading font-bold text-base sm:text-lg text-foreground">TrustLock</span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Live Demo</a>
            <a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
            <a href="#integrate" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integrate</a>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/trustlock/admin/login">
              <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3">
                <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Admin
              </Button>
            </Link>
            <Link to="/trustlock/vendor/login">
              <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3">
                <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Vendor
              </Button>
            </Link>
            <Link to="/trustlock/buyer/login">
              <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3">
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Buyer
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
      <TrustLockCta />
      <Footer />
    </div>
  );
};

export default TrustLock;

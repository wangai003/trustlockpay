import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import PortalPicker from "@/components/shared/PortalPicker";
import TLId from "@/components/shared/TLId";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [portalMode, setPortalMode] = useState<"login" | "signup">("login");
  const [portalOpen, setPortalOpen] = useState(false);

  const openPortal = (mode: "login" | "signup") => {
    setPortalMode(mode);
    setPortalOpen(true);
    setIsOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(160,20%,6%)/80] backdrop-blur-xl border-b border-[hsl(160,15%,14%)]">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <TLId code="TL-S-NAV-LOGO" inline>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-lg">A</span>
              </div>
              <span className="font-heading font-bold text-xl text-[hsl(0,0%,95%)]">Azix</span>
            </a>
          </TLId>

          <div className="hidden md:flex items-center gap-8">
            <TLId code="TL-S-NAV-HOW" inline>
              <a href="#how-it-works" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">How It Works</a>
            </TLId>
            <TLId code="TL-S-NAV-INDUSTRIES" inline>
              <a href="#industries" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Industries</a>
            </TLId>
            <TLId code="TL-S-NAV-PRICING" inline>
              <a href="#pricing" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Pricing</a>
            </TLId>
            <TLId code="TL-S-NAV-TESTIMONIALS" inline>
              <a href="#testimonials" className="text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)] transition-colors">Testimonials</a>
            </TLId>
            <TLId code="TL-S-NAV-TRUSTLOCK" inline>
              <Link to="/trustlock" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">TrustLock</Link>
            </TLId>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <TLId code="TL-S-NAV-BTN-LOGIN" inline>
              <Button variant="ghost" size="sm" className="text-[hsl(160,5%,60%)] hover:text-[hsl(0,0%,95%)] hover:bg-[hsl(160,15%,15%)]" onClick={() => openPortal("login")}>Log In</Button>
            </TLId>
            <TLId code="TL-S-NAV-BTN-SIGNUP" inline>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(152,52%,24%/0.3)]" onClick={() => openPortal("signup")}>Get Started</Button>
            </TLId>
          </div>

          <TLId code="TL-S-NAV-BTN-MENU" inline>
            <button className="md:hidden text-[hsl(0,0%,95%)]" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </TLId>
        </div>

        {isOpen && (
          <div className="md:hidden bg-[hsl(160,20%,8%)] border-b border-[hsl(160,15%,14%)] px-4 py-4 space-y-3">
            <a href="#how-it-works" className="block text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)]">How It Works</a>
            <a href="#industries" className="block text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)]">Industries</a>
            <a href="#pricing" className="block text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)]">Pricing</a>
            <a href="#testimonials" className="block text-sm text-[hsl(160,5%,50%)] hover:text-[hsl(0,0%,95%)]">Testimonials</a>
            <Link to="/trustlock" className="block text-sm font-semibold text-primary hover:text-primary/80">TrustLock →</Link>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" className="flex-1 text-[hsl(160,5%,60%)]" onClick={() => openPortal("login")}>Log In</Button>
              <Button size="sm" className="flex-1 bg-primary text-primary-foreground" onClick={() => openPortal("signup")}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode={portalMode} />
    </>
  );
};

export default Navbar;

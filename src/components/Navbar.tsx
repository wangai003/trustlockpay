import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import PortalPicker from "@/components/shared/PortalPicker";

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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-lg">A</span>
            </div>
            <span className="font-heading font-bold text-xl text-foreground">Azix</span>
          </a>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <Link to="/trustlock" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">TrustLock</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => openPortal("login")}>Log In</Button>
            <Button variant="hero" size="sm" onClick={() => openPortal("signup")}>Get Started</Button>
          </div>

          {/* Mobile */}
          <button className="md:hidden" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden bg-background border-b border-border px-4 py-4 space-y-3">
            <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground">How It Works</a>
            <a href="#industries" className="block text-sm text-muted-foreground hover:text-foreground">Industries</a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground">Pricing</a>
            <a href="#testimonials" className="block text-sm text-muted-foreground hover:text-foreground">Testimonials</a>
            <Link to="/trustlock" className="block text-sm font-semibold text-primary hover:text-primary/80">TrustLock →</Link>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => openPortal("login")}>Log In</Button>
              <Button variant="hero" size="sm" className="flex-1" onClick={() => openPortal("signup")}>Get Started</Button>
            </div>
          </div>
        )}
      </nav>
      <PortalPicker open={portalOpen} onOpenChange={setPortalOpen} mode={portalMode} />
    </>
  );
};

export default Navbar;

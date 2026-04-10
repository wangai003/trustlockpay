import { forwardRef } from "react";
import { Link } from "react-router-dom";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";

const legalLinks = [
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "Cookie Policy", to: "/cookie-policy" },
  { label: "Data Rights", to: "/data-rights" },
  { label: "Dispute Policy", to: "/dispute-policy" },
];

const Footer = forwardRef<HTMLElement>((_, ref) => {
  return (
    <footer ref={ref} className="py-10 bg-[hsl(160,20%,4%)] border-t border-[hsl(160,15%,12%)]">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={trustlockLogo} alt="TrustLock Pay logo" className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-contain" />
            <span className="font-heading font-bold text-base text-[hsl(0,0%,85%)]">TrustLock</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-[hsl(160,5%,45%)] hover:text-[hsl(160,50%,50%)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <p className="text-sm text-[hsl(160,5%,35%)]">
            © {new Date().getFullYear()} TrustLock. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

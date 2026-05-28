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
      <div className="container mx-auto px-4 lg:px-8 space-y-8">
        {/* Identity / trust block */}
        <div className="grid gap-6 md:grid-cols-3 text-sm text-[hsl(160,5%,55%)]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src={trustlockLogo} alt="TrustLock Pay logo" className="w-10 h-10 rounded-md object-contain" />
              <span className="font-heading font-bold text-base text-[hsl(0,0%,90%)]">TrustLock</span>
            </div>
            <p className="text-xs leading-relaxed">
              Escrow operating system for global cross-border trade. Milestone-based smart-contract settlement
              built as a regulated alternative to Letters of Credit. We never ask buyers or vendors to share
              passwords, seed phrases, or private keys outside their own authenticated dashboard.
            </p>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-[hsl(0,0%,85%)]">Company</p>
            <p>TrustLock</p>
            <p>Global · Headquartered remotely</p>
            <p>Operating worldwide</p>
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-[hsl(0,0%,85%)]">Contact</p>
            <p>
              Support: <a href="mailto:support@trustlockpay.com" className="hover:text-[hsl(160,50%,50%)]">support@trustlockpay.com</a>
            </p>
            <p>
              Compliance: <a href="mailto:compliance@trustlockpay.com" className="hover:text-[hsl(160,50%,50%)]">compliance@trustlockpay.com</a>
            </p>
            <p>
              Abuse / security: <a href="mailto:security@trustlockpay.com" className="hover:text-[hsl(160,50%,50%)]">security@trustlockpay.com</a>
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[hsl(160,15%,10%)]">
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
          <p className="text-xs text-[hsl(160,5%,35%)]">
            © {new Date().getFullYear()} TrustLock. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

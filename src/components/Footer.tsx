import { forwardRef } from "react";
import { Link } from "react-router-dom";
import azixLogo from "@/assets/azix-logo.png";

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
            <img src={azixLogo} alt="Azix logo" className="w-8 h-8 rounded-md object-contain" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {legalLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs text-[hsl(160,5%,40%)] hover:text-[hsl(160,5%,70%)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-sm text-[hsl(160,5%,35%)]">
            © {new Date().getFullYear()} Azix. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;

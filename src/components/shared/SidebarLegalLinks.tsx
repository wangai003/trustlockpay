import { Link } from "react-router-dom";
import { Shield, Cookie, FileText, Scale } from "lucide-react";

const links = [
  { label: "Privacy Policy", to: "/privacy-policy", icon: Shield },
  { label: "Cookie Policy", to: "/cookie-policy", icon: Cookie },
  { label: "Data Rights", to: "/data-rights", icon: FileText },
  { label: "Dispute Policy", to: "/dispute-policy", icon: Scale },
];

const SidebarLegalLinks = () => (
  <div className="px-3 py-2 border-t border-sidebar-border">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 px-1">Legal</p>
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          className="text-[11px] text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {l.label}
        </Link>
      ))}
    </div>
  </div>
);

export default SidebarLegalLinks;

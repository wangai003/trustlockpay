import { Link } from "react-router-dom";

const links = [
  { label: "Privacy", to: "/privacy-policy" },
  { label: "Cookies", to: "/cookie-policy" },
  { label: "Data Rights", to: "/data-rights" },
  { label: "Disputes", to: "/dispute-policy" },
];

const InlineLegalLinks = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-4">
    {links.map((l) => (
      <Link
        key={l.to}
        to={l.to}
        className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
      >
        {l.label}
      </Link>
    ))}
  </div>
);

export default InlineLegalLinks;

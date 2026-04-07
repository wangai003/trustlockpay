/**
 * Embedded searchable arbitrator directory — filterable by region and industry focus.
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, MapPin, Briefcase } from "lucide-react";

export interface ArbitratorDirectoryEntry {
  name: string;
  region: string;
  url: string;
  focus: string;
  industries: string[];
  jurisdictions: string[];
  feeRange?: string;
}

const DIRECTORY: ArbitratorDirectoryEntry[] = [
  {
    name: "ICC International Court of Arbitration",
    region: "Global",
    url: "https://iccwbo.org/dispute-resolution/",
    focus: "Cross-border commercial disputes, large-scale trade",
    industries: ["ecommerce", "construction", "energy", "manufacturing", "logistics", "mining", "real_estate", "pharmaceuticals", "aviation"],
    jurisdictions: ["Global", "Europe", "Americas", "Asia", "Africa"],
    feeRange: "$5,000–$50,000+",
  },
  {
    name: "LCIA (London Court of International Arbitration)",
    region: "UK / Europe",
    url: "https://www.lcia.org/",
    focus: "Financial services, energy, construction",
    industries: ["energy", "construction", "insurance", "legal_services", "real_estate", "manufacturing"],
    jurisdictions: ["UK", "Europe", "Global"],
    feeRange: "$3,000–$30,000+",
  },
  {
    name: "SIAC (Singapore International Arbitration Centre)",
    region: "Asia-Pacific",
    url: "https://www.siac.org.sg/",
    focus: "Technology, manufacturing, cross-border trade",
    industries: ["ecommerce", "telecommunications", "manufacturing", "logistics", "textiles", "marine_fisheries"],
    jurisdictions: ["Asia-Pacific", "Singapore", "Global"],
    feeRange: "$3,000–$25,000+",
  },
  {
    name: "KIAC (Kigali International Arbitration Centre)",
    region: "East Africa",
    url: "https://kiac.org.rw/",
    focus: "AfCFTA, regional trade, agriculture",
    industries: ["agriculture", "logistics", "construction", "mining", "renewable_energy", "water_sanitation"],
    jurisdictions: ["Africa", "East Africa", "Rwanda"],
    feeRange: "$1,500–$10,000+",
  },
  {
    name: "Lagos RCICA",
    region: "West Africa",
    url: "https://rcica.org.ng/",
    focus: "Agriculture, commodities, oil & gas",
    industries: ["agriculture", "energy", "mining", "food_beverage", "logistics", "waste_management"],
    jurisdictions: ["Africa", "West Africa", "Nigeria"],
    feeRange: "$2,000–$15,000+",
  },
  {
    name: "Cairo CRCICA",
    region: "North / East Africa",
    url: "https://crcica.org/",
    focus: "Construction, energy, infrastructure",
    industries: ["construction", "energy", "real_estate", "water_sanitation", "renewable_energy"],
    jurisdictions: ["Africa", "North Africa", "Middle East", "Egypt"],
    feeRange: "$2,000–$15,000+",
  },
  {
    name: "AAA / ICDR (American Arbitration Association)",
    region: "USA / International",
    url: "https://www.adr.org/",
    focus: "E-commerce, services, technology",
    industries: ["ecommerce", "freelance", "telecommunications", "media_entertainment", "legal_services", "insurance"],
    jurisdictions: ["USA", "Americas", "Global"],
    feeRange: "$3,000–$35,000+",
  },
  {
    name: "HKIAC (Hong Kong International Arbitration Centre)",
    region: "Asia-Pacific",
    url: "https://www.hkiac.org/",
    focus: "Finance, trade, technology",
    industries: ["ecommerce", "manufacturing", "logistics", "telecommunications", "insurance"],
    jurisdictions: ["Asia-Pacific", "Hong Kong", "China", "Global"],
    feeRange: "$4,000–$30,000+",
  },
  {
    name: "DIAC (Dubai International Arbitration Centre)",
    region: "Middle East",
    url: "https://www.diac.ae/",
    focus: "Real estate, construction, energy",
    industries: ["real_estate", "construction", "energy", "logistics", "aviation"],
    jurisdictions: ["Middle East", "UAE", "Global"],
    feeRange: "$3,000–$25,000+",
  },
];

const ALL_REGIONS = [...new Set(DIRECTORY.flatMap(d => d.jurisdictions))].sort();

interface Props {
  onSelectInstitution?: (name: string) => void;
}

const ArbitratorDirectory = ({ onSelectInstitution }: Props) => {
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return DIRECTORY.filter(d => {
      const q = query.toLowerCase();
      const matchesQuery = !q ||
        d.name.toLowerCase().includes(q) ||
        d.focus.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.industries.some(i => i.toLowerCase().includes(q));
      const matchesRegion = !regionFilter || d.jurisdictions.includes(regionFilter);
      return matchesQuery && matchesRegion;
    });
  }, [query, regionFilter]);

  return (
    <div className="space-y-3 p-3 rounded-lg border bg-background">
      <div>
        <p className="text-xs font-semibold">Arbitrator Directory</p>
        <p className="text-[10px] text-muted-foreground">
          Search by name, region, or industry. Click "Use" to auto-fill your proposal.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, region, industry..."
          className="h-8 text-xs pl-8"
        />
      </div>

      {/* Region filters */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setRegionFilter(null)}
          className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
            !regionFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {["Global", "Africa", "Asia-Pacific", "Europe", "Americas", "Middle East"].map(r => (
          <button
            key={r}
            onClick={() => setRegionFilter(regionFilter === r ? null : r)}
            className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
              regionFilter === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-56 overflow-y-auto space-y-1.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No institutions found</p>
        ) : (
          filtered.map(d => (
            <div
              key={d.name}
              className="p-2.5 rounded-md border hover:bg-muted/50 transition-colors space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{d.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {d.region}
                    </span>
                    {d.feeRange && (
                      <span className="text-[10px] text-muted-foreground">
                        Filing: {d.feeRange}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onSelectInstitution && (
                    <button
                      onClick={() => onSelectInstitution(d.name)}
                      className="px-2 py-1 rounded text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Use
                    </button>
                  )}
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </a>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Briefcase className="w-2.5 h-2.5 shrink-0" /> {d.focus}
              </p>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-muted-foreground">
        Filing fees and arbitrator compensation are separate from TrustLock's case management fee and are paid directly to the chosen institution.
      </p>
    </div>
  );
};

export default ArbitratorDirectory;

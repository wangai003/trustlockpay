import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, Store, MessageSquare, Building2, MapPin, Briefcase, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface SandboxSession {
  name: string;
  email: string;
  role: "vendor" | "buyer";
  createdAt: string;
  expiresAt: string;
}

interface MockUser {
  id: string;
  full_name: string;
  company_name: string;
  entity_type: string;
  location: string;
  industry: string;
  corridor: string;
  tl_id: string;
}

const MOCK_VENDORS: MockUser[] = [
  { id: "v1", full_name: "Kwame Asante", company_name: "GoldCoast Exports Ltd", entity_type: "company", location: "Accra, Ghana", industry: "Agriculture & Commodities", corridor: "West Africa → EU", tl_id: "TL-V-8A3F" },
  { id: "v2", full_name: "Amina Bello", company_name: "Lagos Textiles Co.", entity_type: "company", location: "Lagos, Nigeria", industry: "Textiles & Apparel", corridor: "West Africa → US", tl_id: "TL-V-2B7C" },
  { id: "v3", full_name: "Jean-Pierre Mbeki", company_name: "CamerTech Solutions", entity_type: "company", location: "Douala, Cameroon", industry: "Technology & SaaS", corridor: "Central Africa → EU", tl_id: "TL-V-9D1E" },
  { id: "v4", full_name: "Fatima Hassan", company_name: "Nairobi Fresh Produce", entity_type: "sole_proprietor", location: "Nairobi, Kenya", industry: "Agriculture & Commodities", corridor: "East Africa → Middle East", tl_id: "TL-V-4F6A" },
  { id: "v5", full_name: "Chen Wei", company_name: "Shenzhen Parts Direct", entity_type: "company", location: "Shenzhen, China", industry: "Manufacturing & Industrial", corridor: "Asia → Africa", tl_id: "TL-V-7G2H" },
  { id: "v6", full_name: "Sarah Johnson", company_name: "Brooklyn Craft Supplies", entity_type: "sole_proprietor", location: "New York, USA", industry: "Retail & E-commerce", corridor: "US → Africa", tl_id: "TL-V-1K5M" },
  { id: "v7", full_name: "Oluwaseun Adeyemi", company_name: "AdeConstruct Nigeria", entity_type: "company", location: "Abuja, Nigeria", industry: "Construction & Real Estate", corridor: "West Africa → Asia", tl_id: "TL-V-3N8P" },
  { id: "v8", full_name: "Priya Sharma", company_name: "Mumbai Spice Traders", entity_type: "company", location: "Mumbai, India", industry: "Agriculture & Commodities", corridor: "South Asia → Africa", tl_id: "TL-V-6Q4R" },
];

const MOCK_BUYERS: MockUser[] = [
  { id: "b1", full_name: "James Okonkwo", company_name: "Okonkwo Imports LLC", entity_type: "company", location: "Chicago, USA", industry: "Retail & E-commerce", corridor: "US → West Africa", tl_id: "TL-B-5T9W" },
  { id: "b2", full_name: "Marie Dupont", company_name: "Paris Procurement Group", entity_type: "company", location: "Paris, France", industry: "Manufacturing & Industrial", corridor: "EU → Africa", tl_id: "TL-B-8X2Y" },
  { id: "b3", full_name: "David Mensah", company_name: "Accra Distribution Hub", entity_type: "company", location: "Accra, Ghana", industry: "Logistics & Supply Chain", corridor: "Intra-Africa", tl_id: "TL-B-1A7Z" },
  { id: "b4", full_name: "Aisha Mohammed", company_name: "", entity_type: "individual", location: "Dubai, UAE", industry: "Real Estate & Investment", corridor: "Middle East → Africa", tl_id: "TL-B-4C3D" },
  { id: "b5", full_name: "Michael Chen", company_name: "Pacific Trade Corp", entity_type: "company", location: "Singapore", industry: "Technology & SaaS", corridor: "Asia → Africa", tl_id: "TL-B-6E8F" },
  { id: "b6", full_name: "Grace Wanjiku", company_name: "Wanjiku Agri Buyers", entity_type: "sole_proprietor", location: "Nairobi, Kenya", industry: "Agriculture & Commodities", corridor: "East Africa → EU", tl_id: "TL-B-9H1J" },
  { id: "b7", full_name: "Ricardo Santos", company_name: "São Paulo Metals Inc.", entity_type: "company", location: "São Paulo, Brazil", industry: "Mining & Minerals", corridor: "South America → Africa", tl_id: "TL-B-2L5N" },
  { id: "b8", full_name: "Emily Thompson", company_name: "London Green Imports", entity_type: "company", location: "London, UK", industry: "Energy & Sustainability", corridor: "EU → East Africa", tl_id: "TL-B-7P0Q" },
];

const entityLabel: Record<string, string> = {
  individual: "Individual",
  company: "Company",
  sole_proprietor: "Sole Proprietor",
};

const SandboxLookup = () => {
  const session = useOutletContext<SandboxSession>();
  const isVendor = session.role === "vendor";
  const targetLabel = isVendor ? "Buyer" : "Vendor";
  const mockData = isVendor ? MOCK_BUYERS : MOCK_VENDORS;

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  const industries = useMemo(() => {
    const set = new Set(mockData.map((u) => u.industry));
    return Array.from(set).sort();
  }, [mockData]);

  const filtered = useMemo(() => {
    let list = [...mockData];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((u) =>
        [u.full_name, u.company_name, u.tl_id, u.location].join(" ").toLowerCase().includes(q)
      );
    }
    if (entityFilter) list = list.filter((u) => u.entity_type === entityFilter);
    if (industryFilter) list = list.filter((u) => u.industry === industryFilter);
    return list;
  }, [mockData, search, entityFilter, industryFilter]);

  const handleMessage = (name: string) => {
    toast.info(`Sandbox demo: messaging ${name} would open the Messages panel`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">{targetLabel} Lookup</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          {isVendor ? <Users className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          <span>Browse and connect with {targetLabel.toLowerCase()}s on the TrustLock network</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Input
            placeholder={`Search ${targetLabel.toLowerCase()}s by name, company, TL-ID…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-3"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={industryFilter} onValueChange={(v) => setIndustryFilter(v === "__all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
              <SelectValue placeholder="Industry / Sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Industries</SelectItem>
              {industries.map((ind) => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} {targetLabel.toLowerCase()}{filtered.length !== 1 ? "s" : ""} found</p>

      {/* User cards — same layout as real dashboards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {isVendor ? <Users className="w-10 h-10 mx-auto mb-3 opacity-40" /> : <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />}
          <p className="font-medium">No {targetLabel.toLowerCase()}s match your filters</p>
          <p className="text-xs mt-1">Try broadening your search or clearing some filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const displayName = u.company_name || u.full_name;
            const initials = displayName.slice(0, 2).toUpperCase();
            return (
              <Card key={u.id} className="hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_15px_hsl(var(--primary)/0.06)]">
                <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[140px] sm:max-w-none">{displayName}</span>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                        {entityLabel[u.entity_type] || u.entity_type}
                      </Badge>
                    </div>

                    {u.full_name && u.company_name && (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{u.full_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-none">{u.location}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[80px] sm:max-w-none">{u.industry}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="w-3 h-3 shrink-0" />
                        {u.tl_id}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5 h-8 px-2.5 sm:px-3"
                    onClick={() => handleMessage(u.full_name)}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">Message</span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SandboxLookup;

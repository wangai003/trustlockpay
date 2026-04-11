import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Landmark, Globe, Shield, Star, ExternalLink } from "lucide-react";
import VendorHeader from "@/components/vendor/VendorHeader";
import RecommendedMatches from "@/components/shared/RecommendedMatches";
import { useRecommendedMatches } from "@/hooks/useRecommendedMatches";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INDUSTRY_LABELS } from "@/lib/industryList";

const INSTITUTION_TYPES: Record<string, string> = {
  bank: "Bank",
  microfinance: "Microfinance",
  dfi: "Development Finance",
  private_lender: "Private Lender",
  cooperative: "Cooperative",
};

const TIER_LABELS: Record<number, string> = {
  1: "Micro-Lender",
  2: "Standard",
  3: "Institutional",
  4: "DFI / Sovereign",
};

const PAGE_SIZE = 20;

const VendorLenderLookup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: lenders, isLoading } = useQuery({
    queryKey: ["lender-lookup", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lender_profiles")
        .select("*")
        .eq("is_verified", true)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filtered = useMemo(() => {
    if (!lenders) return [];
    let list = [...lenders];
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((l) =>
        [l.institution_name, l.bio, ...(l.operating_regions || []), ...(l.sector_focus || [])]
          .filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      list = list.filter((l) => l.institution_type === typeFilter);
    }
    return list;
  }, [lenders, search, typeFilter]);

  const paginated = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div>
      <VendorHeader title="Lender Lookup" />
      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Landmark className="w-4 h-4" />
          <span>Browse verified lenders on the TrustLock network</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Search by name, region, sector..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            className="flex-1"
          />
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === "all" ? "" : v); setVisibleCount(PAGE_SIZE); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(INSTITUTION_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Landmark className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{search || typeFilter ? "No lenders match your filters" : "No verified lenders yet"}</p>
            <p className="text-xs mt-1">Verified lenders will appear here once they complete KYB</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filtered.length} lender{filtered.length !== 1 ? "s" : ""} found</p>
            {paginated.map((l) => (
              <Card key={l.id} className="hover:border-primary/40 transition-all duration-200">
                <CardContent className="p-3 sm:p-4 flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={l.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {l.institution_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{l.institution_name}</span>
                      {l.is_verified && (
                        <Badge variant="default" className="text-[9px] gap-0.5">
                          <Shield className="w-2.5 h-2.5" /> Verified
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[9px]">
                        {INSTITUTION_TYPES[l.institution_type] || l.institution_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] gap-0.5">
                        <Star className="w-2.5 h-2.5" /> Tier {l.lender_tier} — {TIER_LABELS[l.lender_tier] || "Unknown"}
                      </Badge>
                    </div>
                    {l.bio && <p className="text-xs text-muted-foreground line-clamp-2">{l.bio}</p>}
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      {l.operating_regions?.length ? (
                        <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> {l.operating_regions.slice(0, 3).join(", ")}{l.operating_regions.length > 3 ? ` +${l.operating_regions.length - 3}` : ""}</span>
                      ) : null}
                      {l.sector_focus?.length ? (
                        <span>Sectors: {l.sector_focus.slice(0, 3).map(s => INDUSTRY_LABELS[s] || s).join(", ")}{l.sector_focus.length > 3 ? ` +${l.sector_focus.length - 3}` : ""}</span>
                      ) : null}
                      {l.facility_limit ? (
                        <span>Facility: up to ${(l.facility_limit / 1000).toFixed(0)}K</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      {l.website_url && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                          <a href={l.website_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> Website
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs"
                        onClick={() => navigate(`/trustlock/vendor/request-financing?lender=${l.user_id}`)}>
                        Request Financing
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs"
                        onClick={() => navigate(`/trustlock/vendor/messages?to=${l.user_id}`)}>
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hasMore && (
              <div className="flex justify-center pt-3">
                <Button variant="outline" size="sm" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  Show more ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorLenderLookup;

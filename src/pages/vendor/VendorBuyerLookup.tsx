import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import VendorHeader from "@/components/vendor/VendorHeader";
import UserLookupFilters, { LookupFilters, EMPTY_FILTERS } from "@/components/shared/UserLookupFilters";
import UserLookupCard, { LookupUser } from "@/components/shared/UserLookupCard";
import RecommendedMatches from "@/components/shared/RecommendedMatches";
import { useRecommendedMatches } from "@/hooks/useRecommendedMatches";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 20;

const VendorBuyerLookup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<LookupFilters>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { data: recommendedBuyers, isLoading: recLoading } = useRecommendedMatches("buyer");

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["buyer-lookup", user?.id],
    queryFn: async () => {
      // Get all buyer role user IDs
      const { data: buyerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "buyer");

      if (!buyerRoles?.length) return [];

      // Get vendor role user IDs to exclude dual-role users who are also vendors
      const { data: vendorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendor");

      const vendorIdSet = new Set((vendorRoles || []).map((r) => r.user_id));

      // Exclude: self AND any user who also holds a vendor role
      const buyerOnlyIds = buyerRoles
        .map((r) => r.user_id)
        .filter((id) => id !== user?.id && !vendorIdSet.has(id));

      // Also include dual-role users who are NOT the current user
      // Actually: we want pure buyers only — users who have buyer role but NOT vendor role
      // This prevents a vendor from finding themselves as a buyer
      if (!buyerOnlyIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, entity_type, location, onboarding_industry, corridor, avatar_url")
        .in("id", buyerOnlyIds)
        .eq("status", "active");

      return (profiles || []) as LookupUser[];
    },
    enabled: !!user?.id,
  });

  const hasAnyFilters = !!(filters.search || filters.country || filters.corridor || filters.industry || filters.entityType || filters.advancedQuery);

  const filtered = useMemo(() => {
    if (!buyers) return [];
    let list = [...buyers];
    const q = filters.search.toLowerCase();
    const adv = filters.advancedQuery.toLowerCase();

    if (q) {
      list = list.filter((u) => {
        const haystack = [u.full_name, u.company_name, u.tl_id, u.id].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    if (filters.country) {
      list = list.filter((u) => u.location?.toLowerCase().includes(filters.country.toLowerCase()));
    }
    if (filters.industry) {
      list = list.filter((u) => u.onboarding_industry === filters.industry);
    }
    if (filters.entityType) {
      list = list.filter((u) => u.entity_type === filters.entityType);
    }
    if (filters.corridor) {
      list = list.filter((u) => u.corridor === filters.corridor);
    }
    if (adv) {
      list = list.filter((u) => {
        const haystack = [u.full_name, u.company_name, u.location, u.onboarding_industry, u.corridor].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(adv);
      });
    }
    return list;
  }, [buyers, filters]);

  // Reset pagination when filters change
  const paginatedResults = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleMessage = (targetUserId: string) => {
    navigate(`/trustlock/vendor/messages?to=${targetUserId}`);
  };

  const handleFilterChange = (newFilters: LookupFilters) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div>
      <VendorHeader title="Buyer Lookup" />
      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Browse and connect with buyers on the TrustLock network</span>
        </div>

        <RecommendedMatches
          matches={recommendedBuyers || []}
          isLoading={recLoading}
          onMessage={handleMessage}
          label="Recommended Buyers"
        />

        <UserLookupFilters filters={filters} onChange={handleFilterChange} targetRole="buyer" />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {hasAnyFilters ? (
              <>
                <p className="font-medium">No buyers match your filters</p>
                <p className="text-xs mt-1">Try broadening your search or clearing some filters</p>
              </>
            ) : (
              <>
                <p className="font-medium">No buyers on the network yet</p>
                <p className="text-xs mt-1">Buyers will appear here once they join and complete their profile</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filtered.length} buyer{filtered.length !== 1 ? "s" : ""} found</p>
            {paginatedResults.map((u) => (
              <UserLookupCard key={u.id} user={u} onMessage={handleMessage} />
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

export default VendorBuyerLookup;

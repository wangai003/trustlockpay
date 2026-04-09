import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import UserLookupFilters, { LookupFilters, EMPTY_FILTERS } from "@/components/shared/UserLookupFilters";
import UserLookupCard, { LookupUser } from "@/components/shared/UserLookupCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 20;

const BuyerVendorLookup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<LookupFilters>(EMPTY_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendor-lookup", user?.id],
    queryFn: async () => {
      // Get all vendor role user IDs
      const { data: vendorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendor");

      if (!vendorRoles?.length) return [];

      // Get buyer role user IDs to exclude dual-role users who are also buyers
      const { data: buyerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "buyer");

      const buyerIdSet = new Set((buyerRoles || []).map((r) => r.user_id));

      // Only show pure vendors (not dual-role users who also hold buyer role)
      const vendorOnlyIds = vendorRoles
        .map((r) => r.user_id)
        .filter((id) => id !== user?.id && !buyerIdSet.has(id));

      if (!vendorOnlyIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, entity_type, location, onboarding_industry, corridor, avatar_url")
        .in("id", vendorOnlyIds)
        .eq("status", "active");

      return (profiles || []) as LookupUser[];
    },
    enabled: !!user?.id,
  });

  const hasAnyFilters = !!(filters.search || filters.country || filters.corridor || filters.industry || filters.entityType || filters.advancedQuery);

  const filtered = useMemo(() => {
    if (!vendors) return [];
    let list = [...vendors];
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
  }, [vendors, filters]);

  const paginatedResults = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const handleMessage = (targetUserId: string) => {
    navigate(`/trustlock/buyer/messages?to=${targetUserId}`);
  };

  const handleFilterChange = (newFilters: LookupFilters) => {
    setFilters(newFilters);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div>
      <BuyerHeader title="Vendor Lookup" />
      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="w-4 h-4" />
          <span>Browse and connect with vendors on the TrustLock network</span>
        </div>

        <UserLookupFilters filters={filters} onChange={handleFilterChange} targetRole="vendor" />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-3 opacity-40" />
            {hasAnyFilters ? (
              <>
                <p className="font-medium">No vendors match your filters</p>
                <p className="text-xs mt-1">Try broadening your search or clearing some filters</p>
              </>
            ) : (
              <>
                <p className="font-medium">No vendors on the network yet</p>
                <p className="text-xs mt-1">Vendors will appear here once they join and complete their profile</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filtered.length} vendor{filtered.length !== 1 ? "s" : ""} found</p>
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

export default BuyerVendorLookup;

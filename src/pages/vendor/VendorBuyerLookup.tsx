import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import VendorHeader from "@/components/vendor/VendorHeader";
import UserLookupFilters, { LookupFilters, EMPTY_FILTERS } from "@/components/shared/UserLookupFilters";
import UserLookupCard, { LookupUser } from "@/components/shared/UserLookupCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const VendorBuyerLookup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<LookupFilters>(EMPTY_FILTERS);

  const { data: buyers, isLoading } = useQuery({
    queryKey: ["buyer-lookup", user?.id],
    queryFn: async () => {
      // Get all user IDs with the buyer role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "buyer");

      if (!roles?.length) return [];

      const buyerIds = roles
        .map((r) => r.user_id)
        .filter((id) => id !== user?.id); // exclude self

      if (!buyerIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, entity_type, location, onboarding_industry, corridor, avatar_url")
        .in("id", buyerIds)
        .eq("status", "active");

      return (profiles || []) as LookupUser[];
    },
    enabled: !!user?.id,
  });

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

  const handleMessage = (targetUserId: string) => {
    navigate(`/trustlock/vendor/messages?to=${targetUserId}`);
  };

  return (
    <div>
      <VendorHeader title="Buyer Lookup" />
      <div className="p-3 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Browse and connect with buyers on the TrustLock network</span>
        </div>

        <UserLookupFilters filters={filters} onChange={setFilters} targetRole="buyer" />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No buyers found</p>
            <p className="text-xs mt-1">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{filtered.length} buyer{filtered.length !== 1 ? "s" : ""} found</p>
            {filtered.map((u) => (
              <UserLookupCard key={u.id} user={u} onMessage={handleMessage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorBuyerLookup;

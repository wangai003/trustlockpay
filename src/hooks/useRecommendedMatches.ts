import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MatchedUser {
  user_id: string;
  full_name: string;
  company_name: string | null;
  entity_type: string | null;
  location: string | null;
  onboarding_industry: string | null;
  corridor: string | null;
  avatar_url: string | null;
  match_score: number;
  match_breakdown: {
    industry: number;
    corridor: number;
    location: number;
    history: number;
    entity: number;
  };
}

export function useRecommendedMatches(targetRole: "vendor" | "buyer" | "lender", limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recommended-matches", user?.id, targetRole, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_matches", {
        _user_id: user!.id,
        _target_role: targetRole,
        _limit: limit,
      });

      if (error) {
        console.error("Match error:", error);
        return [];
      }

      return (data || []) as MatchedUser[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}

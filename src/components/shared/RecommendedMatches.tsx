import { Sparkles, MapPin, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { INDUSTRY_LABELS } from "@/lib/industryList";
import { MatchedUser } from "@/hooks/useRecommendedMatches";

interface RecommendedMatchesProps {
  matches: MatchedUser[];
  isLoading: boolean;
  onMessage: (userId: string) => void;
  label?: string;
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-muted-foreground bg-muted border-border";
}

const RecommendedMatches = ({ matches, isLoading, onMessage, label = "Recommended for You" }: RecommendedMatchesProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-52 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!matches.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {matches.map((m) => (
          <Card key={m.user_id} className="shrink-0 w-52 hover:border-primary/40 transition-all duration-200">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                    {(m.full_name || m.company_name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {m.company_name || m.full_name || "Unknown"}
                  </p>
                  {m.full_name && m.company_name && (
                    <p className="text-[10px] text-muted-foreground truncate">{m.full_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`text-[10px] border ${getScoreColor(m.match_score)}`}>
                  {m.match_score}% match
                </Badge>
                {m.onboarding_industry && (
                  <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">
                    {INDUSTRY_LABELS[m.onboarding_industry] || m.onboarding_industry}
                  </span>
                )}
              </div>

              {m.location && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 shrink-0" /> {m.location}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[10px] gap-1"
                onClick={() => onMessage(m.user_id)}
              >
                <MessageCircle className="w-3 h-3" /> Message
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecommendedMatches;

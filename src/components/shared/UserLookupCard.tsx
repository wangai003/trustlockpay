import { MessageSquare, Building2, MapPin, Briefcase, Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { INDUSTRY_LABELS } from "@/lib/industryList";

export interface LookupUser {
  id: string;
  full_name: string | null;
  company_name: string | null;
  entity_type: string;
  location: string | null;
  onboarding_industry: string | null;
  corridor: string | null;
  avatar_url: string | null;
  tl_id?: string | null;
}

interface Props {
  user: LookupUser;
  onMessage: (userId: string) => void;
}

const entityLabel: Record<string, string> = {
  individual: "Individual",
  company: "Company",
  sole_proprietor: "Sole Proprietor",
};

const UserLookupCard = ({ user, onMessage }: Props) => {
  const displayName = user.company_name || user.full_name || "Unknown User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const industry = user.onboarding_industry ? INDUSTRY_LABELS[user.onboarding_industry] || user.onboarding_industry : null;

  return (
    <Card className="hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_15px_hsl(152,52%,24%/0.06)]">
      <CardContent className="p-3 sm:p-4 flex items-start gap-3">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[140px] sm:max-w-none">{displayName}</span>
            <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
              {entityLabel[user.entity_type] || user.entity_type}
            </Badge>
          </div>

          {user.full_name && user.company_name && (
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <Building2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{user.full_name}</span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-[10px] sm:text-xs text-muted-foreground">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">{user.location}</span>
              </span>
            )}
            {industry && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">{industry}</span>
              </span>
            )}
            {user.tl_id && (
              <span className="flex items-center gap-1 font-mono">
                <Hash className="w-3 h-3 shrink-0" />
                {user.tl_id}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5 h-8 px-2.5 sm:px-3"
          onClick={() => onMessage(user.id)}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Message</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserLookupCard;

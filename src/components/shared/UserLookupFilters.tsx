import { useState } from "react";
import { Search, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ALL_INDUSTRIES } from "@/lib/industryList";
import { TRADE_BLOCS } from "@/lib/tradeBlocs";

export interface LookupFilters {
  search: string;
  country: string;
  corridor: string;
  industry: string;
  entityType: string;
  advancedQuery: string;
}

const EMPTY_FILTERS: LookupFilters = {
  search: "",
  country: "",
  corridor: "",
  industry: "",
  entityType: "",
  advancedQuery: "",
};

const COUNTRIES = [
  "Nigeria", "Kenya", "South Africa", "Ghana", "Tanzania", "Uganda", "Rwanda",
  "Ethiopia", "Cameroon", "Senegal", "Côte d'Ivoire", "Egypt", "Morocco",
  "United States", "United Kingdom", "Canada", "Germany", "France", "Netherlands",
  "India", "China", "Japan", "Brazil", "Australia", "UAE", "Saudi Arabia",
  "Singapore", "Turkey", "Indonesia", "Mexico",
];

interface Props {
  filters: LookupFilters;
  onChange: (filters: LookupFilters) => void;
  targetRole: "vendor" | "buyer";
}

const UserLookupFilters = ({ filters, onChange, targetRole }: Props) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const set = (key: keyof LookupFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const activeCount = [filters.country, filters.corridor, filters.industry, filters.entityType, filters.advancedQuery].filter(Boolean).length;

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <div className="space-y-3">
      {/* Primary search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${targetRole}s by name, company, TL-ID…`}
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Mobile filter toggle */}
      <div className="flex items-center gap-2 sm:hidden">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 gap-1.5 text-xs"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-[9px] px-1.5 ml-1">{activeCount}</Badge>
          )}
          {showFilters ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-destructive shrink-0" onClick={clearAll}>
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Filter row — hidden on mobile unless toggled */}
      <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap`}>
        <Select value={filters.country} onValueChange={(v) => set("country", v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Countries</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.corridor} onValueChange={(v) => set("corridor", v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs">
            <SelectValue placeholder="Trade Corridor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Corridors</SelectItem>
            {TRADE_BLOCS.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.shortName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.industry} onValueChange={(v) => set("industry", v === "__all" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
            <SelectValue placeholder="Industry / Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Industries</SelectItem>
            {ALL_INDUSTRIES.map((ind) => (
              <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.entityType} onValueChange={(v) => set("entityType", v === "__all" ? "" : v)}>
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

        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1 text-xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="w-3.5 h-3.5" />
            Advanced
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>

          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs text-destructive" onClick={clearAll}>
              <X className="w-3 h-3" />
              Clear ({activeCount})
            </Button>
          )}
        </div>

        {/* Mobile advanced toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-xs sm:hidden"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="w-3.5 h-3.5" />
          Advanced Search
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* Active filter badges */}
      {activeCount > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {filters.country && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              {filters.country}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => set("country", "")} />
            </Badge>
          )}
          {filters.corridor && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              {TRADE_BLOCS.find(b => b.id === filters.corridor)?.shortName || filters.corridor}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => set("corridor", "")} />
            </Badge>
          )}
          {filters.industry && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              {ALL_INDUSTRIES.find(i => i.value === filters.industry)?.label || filters.industry}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => set("industry", "")} />
            </Badge>
          )}
          {filters.entityType && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              {filters.entityType}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => set("entityType", "")} />
            </Badge>
          )}
        </div>
      )}

      {/* Advanced search */}
      {showAdvanced && (
        <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-2">
          <p className="text-xs text-muted-foreground">
            Describe what you're looking for — e.g. "cocoa exporter in Ghana" or "construction firm with milestone experience"
          </p>
          <Input
            placeholder="Type keywords or a description…"
            value={filters.advancedQuery}
            onChange={(e) => set("advancedQuery", e.target.value)}
          />
        </div>
      )}
    </div>
  );
};

export { EMPTY_FILTERS };
export default UserLookupFilters;

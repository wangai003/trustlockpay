import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  searchProviders,
  getProviderCategories,
  CATEGORY_LABELS,
  type PaymentProvider,
  type PaymentCategory,
} from "@/lib/paymentProviders";

interface ProviderSearchProps {
  mode: "diaspora" | "local";
  onSelect: (provider: PaymentProvider) => void;
  selected?: PaymentProvider | null;
}

const ProviderSearch = ({ mode, onSelect, selected }: ProviderSearchProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PaymentCategory | undefined>();

  const categories = useMemo(() => getProviderCategories(mode), [mode]);
  const results = useMemo(() => searchProviders(query, mode, activeCategory), [query, mode, activeCategory]);

  if (selected) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary bg-primary/5">
        <div>
          <p className="text-sm font-semibold text-foreground">{selected.name}</p>
          <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[selected.category]}</p>
        </div>
        <button onClick={() => onSelect(null as unknown as PaymentProvider)} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Find your payment provider..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(undefined)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
            !activeCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-1">
        {results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No providers found</p>
        ) : (
          results.map((provider) => (
            <button
              key={provider.id}
              onClick={() => onSelect(provider)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{provider.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORY_LABELS[provider.category]}
                  {provider.countries?.length ? ` · ${provider.countries.slice(0, 3).join(", ")}${provider.countries.length > 3 ? "..." : ""}` : ""}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default ProviderSearch;

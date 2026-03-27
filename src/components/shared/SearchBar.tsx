import { Search } from "lucide-react";

interface SearchBarProps {
  onOpen: () => void;
}

const SearchBar = ({ onOpen }: SearchBarProps) => (
  <button
    onClick={onOpen}
    className="flex items-center gap-2 h-8 sm:h-9 px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors cursor-text min-w-[140px] sm:min-w-[220px] max-w-[320px]"
  >
    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    <span className="text-xs text-muted-foreground truncate">Search TrustLock…</span>
    <kbd className="hidden sm:inline-flex ml-auto text-[9px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono">
      ⌘K
    </kbd>
  </button>
);

export default SearchBar;

import { Search } from "lucide-react";

interface SearchBarProps {
  onOpen: () => void;
}

const SearchBar = ({ onOpen }: SearchBarProps) => (
  <button
    onClick={onOpen}
    className="flex items-center justify-center sm:justify-start gap-2 h-10 w-10 sm:h-9 sm:w-auto sm:min-w-[220px] sm:max-w-[320px] sm:px-3 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors cursor-text shrink-0"
    aria-label="Search TrustLock"
  >
    <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-muted-foreground shrink-0" />
    <span className="hidden sm:inline text-xs text-muted-foreground truncate">Search TrustLock…</span>
    <kbd className="hidden sm:inline-flex ml-auto text-[9px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5 font-mono">
      ⌘K
    </kbd>
  </button>
);

export default SearchBar;

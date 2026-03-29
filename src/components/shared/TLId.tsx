import { useState, useCallback, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Check } from "lucide-react";
import { lookupTLId } from "@/lib/tlIdRegistry";

interface TLIdProps {
  /** The unique TL-ID code for this element */
  code: string;
  /** The wrapped child element(s) */
  children: ReactNode;
  /** Optional: render as inline-block instead of block */
  inline?: boolean;
}

/**
 * TLId — Wraps any interactive element with a hover/tap tooltip showing its unique identifier.
 * 
 * Usage:
 *   <TLId code="TL-V-TXN-BTN-SHIP">
 *     <Button>Ship Order</Button>
 *   </TLId>
 * 
 * On hover/long-press, the user sees the TL-ID code and can copy it for support reporting.
 */
const TLId = ({ code, children, inline }: TLIdProps) => {
  const [copied, setCopied] = useState(false);
  const entry = lookupTLId(code);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: no clipboard access
    }
  }, [code]);

  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={inline ? "inline-block" : "contents"} data-tlid={code}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] p-2 space-y-1 bg-popover border border-border shadow-lg"
          onClick={handleCopy}
        >
          <div className="flex items-center gap-1.5">
            <code className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              {code}
            </code>
            <button
              onClick={handleCopy}
              className="p-0.5 rounded hover:bg-muted transition-colors"
              aria-label="Copy identifier"
            >
              {copied ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          </div>
          {entry && (
            <p className="text-[9px] text-muted-foreground leading-tight">
              {entry.label} — {entry.description}
            </p>
          )}
          <p className="text-[8px] text-muted-foreground/60 italic">
            Tap copy icon to report this item to support
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TLId;

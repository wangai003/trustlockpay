import { useMemo } from "react";
import { getCurrencyForCountry, toLocalCurrency, type CurrencyInfo } from "@/lib/globalCurrencies";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DualCurrencyPriceProps {
  /** Amount in USD */
  amount: number;
  /** ISO country code of the party whose local currency to show */
  countryCode?: string;
  /** Override currency code directly (e.g. from vendor_sites.display_currency) */
  currencyCode?: string;
  /** Show as primary (large) or inline (small) */
  variant?: "primary" | "inline" | "compact";
  /** Show rate tooltip */
  showRate?: boolean;
  /** Label prefix (e.g. "Total Due") */
  label?: string;
  className?: string;
}

/**
 * Displays a price in USD with the local currency equivalent.
 * If the local currency IS USD, only shows the USD amount.
 */
const DualCurrencyPrice = ({
  amount,
  countryCode,
  currencyCode,
  variant = "inline",
  showRate = true,
  label,
  className = "",
}: DualCurrencyPriceProps) => {
  const { currency, localFormatted, isUsd } = useMemo(() => {
    const cc = countryCode || "US";
    const currency = getCurrencyForCountry(cc);
    const isUsd = currency.code === "USD";
    const local = toLocalCurrency(amount, cc);
    return { currency, localFormatted: local.formatted, isUsd };
  }, [amount, countryCode]);

  const usdFormatted = `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isUsd) {
    if (variant === "primary") {
      return (
        <div className={className}>
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          <span className="font-bold text-sm">{usdFormatted}</span>
        </div>
      );
    }
    return <span className={`font-medium ${className}`}>{usdFormatted}</span>;
  }

  if (variant === "primary") {
    return (
      <div className={`space-y-0.5 ${className}`}>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-sm text-foreground">{usdFormatted}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 text-primary border-primary/30 cursor-help">
                  ≈ {localFormatted} {currency.code}
                </Badge>
              </TooltipTrigger>
              {showRate && (
                <TooltipContent>
                  <p className="text-[10px]">1 USD = {currency.symbol}{currency.rate.toLocaleString()} {currency.code}</p>
                  <p className="text-[9px] text-muted-foreground">Rate is indicative • Escrow settles in USD</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span className={`text-xs ${className}`}>
        {usdFormatted}{" "}
        <span className="text-muted-foreground text-[9px]">({localFormatted})</span>
      </span>
    );
  }

  // inline
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`font-medium cursor-help ${className}`}>
            {usdFormatted}{" "}
            <span className="text-[9px] text-primary">≈{localFormatted}</span>
          </span>
        </TooltipTrigger>
        {showRate && (
          <TooltipContent>
            <p className="text-[10px]">1 USD = {currency.symbol}{currency.rate.toLocaleString()} {currency.code}</p>
            <p className="text-[9px] text-muted-foreground">Escrow holds in USD • Local amount is approximate</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default DualCurrencyPrice;

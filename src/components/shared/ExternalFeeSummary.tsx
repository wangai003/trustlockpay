import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Receipt, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ExternalFeeSummaryProps {
  transactionId: string;
  escrowAmount: number;
  escrowCurrency?: string;
  isTestnet?: boolean;
}

/**
 * Inline summary showing total external fees alongside escrow amount.
 * Supports multi-currency normalization. Renders nothing if no external fees exist.
 */
const ExternalFeeSummary = ({ transactionId, escrowAmount, escrowCurrency = "USD", isTestnet = false }: ExternalFeeSummaryProps) => {
  const [totalExternal, setTotalExternal] = useState<number>(0);
  const [normalizedTotal, setNormalizedTotal] = useState<number>(0);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isTestnet) return;
    const load = async () => {
      const { data } = await supabase
        .from("external_fee_entries")
        .select("amount, currency, normalized_amount, base_currency")
        .eq("transaction_id", transactionId);
      if (data && data.length > 0) {
        setTotalExternal(data.reduce((s, d) => s + Number(d.amount), 0));
        setNormalizedTotal(data.reduce((s, d) => s + (Number(d.normalized_amount) || Number(d.amount)), 0));
        setCurrencies([...new Set(data.map(d => d.currency))]);
        setCount(data.length);
      }
    };
    load();
  }, [transactionId, isTestnet]);

  if (count === 0) return null;

  const isMultiCurrency = currencies.length > 1;
  const totalCost = escrowAmount + normalizedTotal;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className="text-[8px] gap-1">
        <Receipt className="w-2.5 h-2.5" />
        +{isMultiCurrency ? `${escrowCurrency} ≈${normalizedTotal.toLocaleString()}` : `${currencies[0]} ${totalExternal.toLocaleString()}`} external ({count})
      </Badge>
      {isMultiCurrency && (
        <Badge variant="outline" className="text-[7px] gap-0.5">
          <ArrowRightLeft className="w-2 h-2" />
          {currencies.join(", ")}
        </Badge>
      )}
      <span className="text-[9px] text-muted-foreground">
        Total: {escrowCurrency} {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
};

export default ExternalFeeSummary;

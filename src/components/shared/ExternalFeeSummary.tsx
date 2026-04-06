import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ExternalFeeSummaryProps {
  transactionId: string;
  escrowAmount: number;
  isTestnet?: boolean;
}

/**
 * Inline summary showing total external fees alongside escrow amount.
 * Renders nothing if no external fees exist.
 */
const ExternalFeeSummary = ({ transactionId, escrowAmount, isTestnet = false }: ExternalFeeSummaryProps) => {
  const [totalExternal, setTotalExternal] = useState<number>(0);
  const [currency, setCurrency] = useState("USD");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isTestnet) return;
    const load = async () => {
      const { data } = await supabase
        .from("external_fee_entries")
        .select("amount, currency")
        .eq("transaction_id", transactionId);
      if (data && data.length > 0) {
        setTotalExternal(data.reduce((s, d) => s + Number(d.amount), 0));
        setCurrency(data[0].currency);
        setCount(data.length);
      }
    };
    load();
  }, [transactionId, isTestnet]);

  if (count === 0) return null;

  const totalCost = escrowAmount + totalExternal;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className="text-[8px] gap-1">
        <Receipt className="w-2.5 h-2.5" />
        +{currency} {totalExternal.toLocaleString()} external ({count})
      </Badge>
      <span className="text-[9px] text-muted-foreground">
        Total: ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
};

export default ExternalFeeSummary;

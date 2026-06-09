import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import CancellationPanel from "@/components/shared/CancellationPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BuyerCancelOrder = () => {
  const [params] = useSearchParams();
  const initialId = params.get("orderId") || "";
  const [orderId, setOrderId] = useState(initialId);
  const [loaded, setLoaded] = useState<null | {
    id: string; amount: number; remaining: number;
    completedMilestones: { name: string; amount: number; released: boolean }[];
  }>(null);

  const lookup = async () => {
    if (!orderId.trim()) return;
    const { data: tx, error } = await supabase
      .from("transactions")
      .select("id, amount")
      .eq("id", orderId.trim())
      .maybeSingle();
    if (error || !tx) { toast.error("Order not found"); return; }
    const { data: ms } = await supabase
      .from("transaction_milestones")
      .select("name, amount, status")
      .eq("transaction_id", tx.id);
    const completed = (ms || []).map((m: any) => ({
      name: m.name || "Milestone",
      amount: Number(m.amount) || 0,
      released: m.status === "released" || m.status === "completed",
    }));
    const releasedSum = completed.filter(c => c.released).reduce((s, m) => s + m.amount, 0);
    setLoaded({
      id: tx.id,
      amount: Number(tx.amount) || 0,
      remaining: Math.max(0, (Number(tx.amount) || 0) - releasedSum),
      completedMilestones: completed,
    });
  };

  return (
    <div>
      <BuyerHeader title="Cancel Order" />
      <div className="p-3 sm:p-6 space-y-4 max-w-3xl mx-auto">
        <Card>
          <CardHeader><CardTitle className="text-base">Order Lookup</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cancelling an order with funded escrow requires reason, terms acknowledgement, and a high-value confirmation step.
            </p>
            <div className="flex gap-2">
              <Input placeholder="Order ID" value={orderId} onChange={(e) => setOrderId(e.target.value)} className="text-xs" />
              <Button size="sm" onClick={lookup}><Search className="w-3.5 h-3.5 mr-1" /> Load</Button>
            </div>
          </CardContent>
        </Card>

        {loaded && (
          <CancellationPanel
            orderId={loaded.id}
            orderAmount={loaded.amount}
            remainingAmount={loaded.remaining}
            completedMilestones={loaded.completedMilestones}
            role="buyer"
          />
        )}
      </div>
    </div>
  );
};

export default BuyerCancelOrder;

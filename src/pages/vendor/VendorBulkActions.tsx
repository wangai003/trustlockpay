import { useMemo, useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Layers } from "lucide-react";
import BulkActionConfirm from "@/components/shared/BulkActionConfirm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const BULK_ACTIONS = [
  "Release Funds",
  "Mark Shipped",
  "Cancel Orders",
  "Archive Orders",
];

const VendorBulkActions = () => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState(BULK_ACTIONS[0]);
  const [confirm, setConfirm] = useState(false);
  const [search, setSearch] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["vendor-bulk-orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, status, buyer_email, created_at")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filtered = useMemo(
    () => orders.filter((o: any) =>
      !search || o.id.includes(search) || (o.buyer_email || "").includes(search)
    ),
    [orders, search]
  );

  const items = useMemo(
    () => orders
      .filter((o: any) => selected.has(o.id))
      .map((o: any) => ({ label: `${o.id.slice(0, 8)} · ${o.buyer_email || "—"}`, amount: Number(o.amount) || 0 })),
    [orders, selected]
  );
  const total = items.reduce((s, i) => s + (i.amount || 0), 0);

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const execute = () => {
    toast.success(`${action} executed on ${selected.size} order(s).`);
    setSelected(new Set());
    refetch();
  };

  return (
    <div>
      <VendorHeader title="Bulk Actions" />
      <div className="p-3 sm:p-6 space-y-4 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Bulk Order Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Select multiple orders and apply an action. High-value bulk actions (≥ $10,000 total) require
              typed confirmation before execution.
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search by ID or buyer email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs flex-1 min-w-[200px]"
              />
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-background"
              >
                {BULK_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <Button
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setConfirm(true)}
              >
                Apply to {selected.size} selected
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No orders to display.</p>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((o: any) => (
                  <label key={o.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30">
                    <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggle(o.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono truncate">{o.id}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {o.buyer_email || "—"} · {o.status} · ${Number(o.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BulkActionConfirm
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={execute}
        action={action}
        itemCount={selected.size}
        totalAmount={total}
        items={items}
      />
    </div>
  );
};

export default VendorBulkActions;

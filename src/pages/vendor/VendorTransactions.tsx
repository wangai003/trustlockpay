import { useState } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Eye, Clock, CheckCircle, AlertTriangle, Download, Package, Truck } from "lucide-react";

type TxStatus = "all" | "locked" | "shipped" | "released" | "disputed";

const mockTx = [
  { id: "TL-2026-0891", buyer: "James O.", amount: 200, status: "locked" as const, date: "Mar 18, 2026", item: "Kente Cloth Set", tracking: null },
  { id: "TL-2026-0896", buyer: "Emmanuel K.", amount: 350, status: "shipped" as const, date: "Mar 21, 2026", item: "Traditional Beads", tracking: "GH2026XYZ" },
  { id: "TL-2026-0892", buyer: "Adaeze N.", amount: 4500, status: "released" as const, date: "Mar 20, 2026", item: "Bulk Textiles", tracking: "NG2026ABC" },
  { id: "TL-2026-0889", buyer: "Grace A.", amount: 120, status: "released" as const, date: "Mar 17, 2026", item: "Handwoven Basket", tracking: "GH2026QRS" },
  { id: "TL-2026-0894", buyer: "Amara D.", amount: 680, status: "disputed" as const, date: "Mar 15, 2026", item: "Custom Fabric", tracking: "GH2026DEF" },
];

const statusConfig = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const VendorTransactions = () => {
  const [filter, setFilter] = useState<TxStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = mockTx
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.buyer.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  return (
    <div>
      <VendorHeader title="Transactions" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "locked", "shipped", "released", "disputed"] as TxStatus[]).map((s) => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize">
                {s === "all" ? "All" : statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button variant="outline" size="sm"><Download className="w-3 h-3 mr-1" /> Export</Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id))} /></th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Item</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Tracking</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => {
                    const cfg = statusConfig[tx.status];
                    return (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="p-4"><Checkbox checked={selected.includes(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} /></td>
                        <td className="p-4 font-mono text-xs">{tx.id}</td>
                        <td className="p-4">{tx.buyer}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{tx.item}</td>
                        <td className="p-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">{tx.tracking || "—"}</td>
                        <td className="p-4 text-right font-semibold">${tx.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {tx.status === "locked" && <Button variant="outline" size="sm" className="text-xs">Add Tracking</Button>}
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorTransactions;

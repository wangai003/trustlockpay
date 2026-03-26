import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Eye, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useTransactions, useFlagForReview } from "@/hooks/useSupabaseData";
import MilestoneProgress from "@/components/shared/MilestoneProgress";

type TxStatus = "all" | "locked" | "released" | "disputed" | "cancelled";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const AdminTransactions = () => {
  const [filter, setFilter] = useState<TxStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: rawTransactions = [] } = useTransactions();
  const flagForReview = useFlagForReview();

  const allTx = rawTransactions.map(tx => ({
    id: tx.tx_id,
    buyer: `${tx.buyer_name || "Unknown"} (${tx.buyer_location || "—"})`,
    vendor: `${tx.vendor_name || "Unknown"} (${tx.vendor_location || "—"})`,
    amount: Number(tx.amount),
    status: tx.status as "locked" | "released" | "disputed" | "cancelled",
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: tx.type || "product",
    industry: tx.industry || "—",
  }));

  const filtered = allTx
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.buyer.toLowerCase().includes(search.toLowerCase()) || t.vendor.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id));

  const handleFlag = async () => {
    await flagForReview.mutateAsync(selected);
    setSelected([]);
  };

  return (
    <div>
      <AdminHeader title="Transactions" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by ID, buyer, or vendor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "locked", "released", "disputed", "cancelled"] as TxStatus[]).map((s) => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize">
                {s === "all" ? "All" : statusConfig[s]?.label || s}
              </Button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button variant="outline" size="sm"><Download className="w-3 h-3 mr-1" /> Export</Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={handleFlag}>Flag for Review</Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-4 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">ID</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden lg:table-cell">Vendor</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden md:table-cell">Type</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden xl:table-cell">Industry</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground">Amount</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => {
                    const cfg = statusConfig[tx.status] || statusConfig.locked;
                    return (
                      <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4"><Checkbox checked={selected.includes(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} /></td>
                        <td className="p-4 font-mono text-xs">{tx.id}</td>
                        <td className="p-4">{tx.buyer}</td>
                        <td className="p-4 hidden lg:table-cell text-muted-foreground">{tx.vendor}</td>
                        <td className="p-4 hidden md:table-cell"><Badge variant="secondary" className="text-xs capitalize">{tx.type}</Badge></td>
                        <td className="p-4 hidden xl:table-cell text-muted-foreground">{tx.industry}</td>
                        <td className="p-4 text-right font-semibold">${tx.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground text-xs">{tx.date}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                              {expandedRow === tx.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === tx.id && (
                        <tr>
                          <td colSpan={10} className="px-4 pb-4 bg-muted/10">
                            <MilestoneProgress industry={tx.industry} status={tx.status} />
                          </td>
                        </tr>
                      )}
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

export default AdminTransactions;

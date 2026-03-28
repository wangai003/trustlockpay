import React, { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Download, Eye, Clock, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Truck, PackageCheck, FileText } from "lucide-react";
import { useTransactions, useFlagForReview } from "@/hooks/useSupabaseData";
import MilestoneProgress from "@/components/shared/MilestoneProgress";
import MilestoneTimeline from "@/components/shared/MilestoneTimeline";
import TransactionDocuments from "@/components/shared/TransactionDocuments";
import MilestoneWorkOrderPanel from "@/components/shared/MilestoneWorkOrderPanel";
import { isMilestoneIndustry } from "@/components/shared/PreOrderSignatoryContract";

type TxStatus = "all" | "locked" | "shipped" | "delivered" | "released" | "disputed" | "cancelled";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  delivered: { label: "Delivered", color: "bg-accent text-accent-foreground", icon: PackageCheck },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const industryLabels: Record<string, string> = {
  ecommerce: "E-Commerce",
  real_estate: "Real Estate",
  mining: "Mining",
  agriculture: "Agriculture",
  freelance: "Freelance",
  automotive: "Automotive",
  construction: "Construction",
  tourism: "Tourism",
  logistics: "Logistics",
  education: "Education",
  project_management: "Project Mgmt",
};

const AdminTransactions = () => {
  const [filter, setFilter] = useState<TxStatus>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: rawTransactions = [] } = useTransactions();
  const flagForReview = useFlagForReview();

  const allTx = rawTransactions.map((tx) => ({
    dbId: tx.id,
    id: tx.tx_id,
    buyer: tx.buyer_name || "Unknown",
    buyerLocation: tx.buyer_location || "—",
    vendor: tx.vendor_name || "Unknown",
    vendorLocation: tx.vendor_location || "—",
    amount: Number(tx.amount),
    status: tx.status as string,
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    type: tx.type || "product",
    industry: tx.industry || null,
    item: tx.item || "—",
    tracking: tx.tracking || null,
  }));

  const industries = [...new Set(allTx.map(t => t.industry).filter(Boolean))];

  const filtered = allTx
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => industryFilter === "all" || t.industry === industryFilter)
    .filter((t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer.toLowerCase().includes(search.toLowerCase()) ||
      t.vendor.toLowerCase().includes(search.toLowerCase()) ||
      t.item.toLowerCase().includes(search.toLowerCase())
    );

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by ID, buyer, vendor, or item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map(ind => (
                  <SelectItem key={ind!} value={ind!}>{industryLabels[ind!] || ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["all", "locked", "shipped", "delivered", "released", "disputed", "cancelled"] as TxStatus[]).map((s) => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize text-xs">
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
                    <th className="p-3 sm:p-4 w-10"><Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs">ID</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Buyer</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden lg:table-cell">Vendor</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden md:table-cell">Item</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden xl:table-cell">Industry</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden lg:table-cell">Tracking</th>
                    <th className="text-right p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Amount</th>
                    <th className="text-center p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Status</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden sm:table-cell">Date</th>
                    <th className="text-center p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground text-sm">
                        No transactions match your filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((tx) => {
                    const cfg = statusConfig[tx.status] || statusConfig.locked;
                    return (
                      <React.Fragment key={tx.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3 sm:p-4"><Checkbox checked={selected.includes(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} /></td>
                          <td className="p-3 sm:p-4 font-mono text-xs">{tx.id}</td>
                          <td className="p-3 sm:p-4">
                            <div>
                              <p className="text-xs font-medium">{tx.buyer}</p>
                              <p className="text-[10px] text-muted-foreground hidden sm:block">{tx.buyerLocation}</p>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 hidden lg:table-cell">
                            <div>
                              <p className="text-xs font-medium">{tx.vendor}</p>
                              <p className="text-[10px] text-muted-foreground">{tx.vendorLocation}</p>
                            </div>
                          </td>
                          <td className="p-3 sm:p-4 hidden md:table-cell text-muted-foreground text-xs">{tx.item}</td>
                          <td className="p-3 sm:p-4 hidden xl:table-cell">
                            {tx.industry ? (
                              <Badge variant="outline" className="text-[10px] capitalize">{industryLabels[tx.industry] || tx.industry}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 sm:p-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">{tx.tracking || "—"}</td>
                          <td className="p-3 sm:p-4 text-right font-semibold text-xs">${tx.amount.toLocaleString()}</td>
                          <td className="p-3 sm:p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${cfg.color}`}>
                              <cfg.icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 hidden sm:table-cell text-muted-foreground text-xs">{tx.date}</td>
                          <td className="p-3 sm:p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                                {expandedRow === tx.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {expandedRow === tx.id && (
                          <tr>
                            <td colSpan={11} className="px-4 pb-4 bg-muted/10">
                              <div className="space-y-3 pt-2">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Industry</p>
                                    <p className="font-medium capitalize">{industryLabels[tx.industry || ""] || tx.industry || "General"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{tx.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Buyer Location</p>
                                    <p className="font-medium">{tx.buyerLocation}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Vendor Location</p>
                                    <p className="font-medium">{tx.vendorLocation}</p>
                                  </div>
                                </div>
                                <MilestoneTimeline industry={tx.industry} status={tx.status} />
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View list format</summary>
                                  <MilestoneProgress industry={tx.industry} status={tx.status} />
                                </details>
                                {isMilestoneIndustry(tx.industry) && (
                                  <MilestoneWorkOrderPanel
                                    role="buyer"
                                    txId={tx.id}
                                    transactionId={tx.dbId}
                                    industry={tx.industry}
                                  />
                                )}
                                <div className="pt-2 border-t border-border">
                                  <TransactionDocuments
                                    tx={{
                                      txId: tx.id,
                                      vendorName: tx.vendor,
                                      buyerName: tx.buyer,
                                      item: tx.item,
                                      amount: tx.amount,
                                      date: tx.date,
                                      status: tx.status,
                                      tracking: tx.tracking || undefined,
                                      industry: tx.industry || undefined,
                                    }}
                                    compact
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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

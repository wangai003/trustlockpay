import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Eye, Clock, CheckCircle, AlertTriangle, Download, Truck, Lock,
  ArrowUpCircle, XCircle, ChevronDown, ChevronUp, PackageCheck, FileText, Send
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { getVendorPlanState, getRequiredPlanForOrders, PLANS, PLAN_ORDER, getOrderRangeLabel } from "@/hooks/useVendorPlan";
import { useTransactions, useRejectOrders, useAddTracking } from "@/hooks/useSupabaseData";
import MilestoneProgress from "@/components/shared/MilestoneProgress";
import MilestoneTimeline from "@/components/shared/MilestoneTimeline";

type TxStatus = "all" | "locked" | "shipped" | "released" | "disputed";

const statusConfig = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
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

const VendorTransactions = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TxStatus>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);

  const { data: rawTransactions = [] } = useTransactions();
  const rejectOrders = useRejectOrders();
  const addTracking = useAddTracking();

  const planState = getVendorPlanState();
  const orderMax = planState.orderMax;
  const isUnlimited = orderMax === -1;

  const allTx = rawTransactions.map((tx, i) => ({
    id: tx.tx_id,
    buyer: tx.buyer_name || "Unknown",
    amount: Number(tx.amount),
    status: tx.status as "locked" | "shipped" | "released" | "disputed",
    date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    item: tx.item || "—",
    tracking: tx.tracking || null,
    order: tx.order_number ?? (i + 1),
    industry: tx.industry || null,
    type: tx.type || "product",
    buyerLocation: tx.buyer_location || "—",
    vendorLocation: tx.vendor_location || "—",
  }));

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get unique industries from data
  const industries = [...new Set(allTx.map(t => t.industry).filter(Boolean))];

  const filtered = allTx
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => industryFilter === "all" || t.industry === industryFilter)
    .filter((t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.buyer.toLowerCase().includes(search.toLowerCase()) || t.item.toLowerCase().includes(search.toLowerCase()));

  const isGrayedOut = (orderNum: number) => !isUnlimited && orderNum > orderMax;
  const grayedCount = filtered.filter(t => isGrayedOut(t.order)).length;
  const requiredPlan = grayedCount > 0 ? getRequiredPlanForOrders(allTx.length) : null;

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleRejectSelected = async () => {
    try {
      await rejectOrders.mutateAsync(selected);
    } catch { /* handled by hook */ }
    setSelected([]);
    setRejectDialog(false);
  };

  const handleAddTracking = async (txId: string) => {
    const tracking = prompt("Enter tracking number:");
    if (tracking) {
      await addTracking.mutateAsync({ txId, tracking });
    }
  };

  const handleMarkShipped = (txId: string) => {
    toast.success(`Order ${txId} marked as shipped`);
  };

  const handleUploadDoc = (txId: string) => {
    toast.info(`Document upload for ${txId} — coming soon`);
  };

  return (
    <div>
      <VendorHeader title="Work Order Log" />
      <div className="p-3 sm:p-6 space-y-4">
        {grayedCount > 0 && (
          <div className="p-3 rounded-lg border border-accent/30 bg-accent/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold">
                {grayedCount} order{grayedCount !== 1 ? "s" : ""} exceed your {PLANS[planState.currentPlan].name} plan range ({getOrderRangeLabel(PLANS[planState.currentPlan])} orders/mo)
              </p>
              <p className="text-[10px] text-muted-foreground">
                Upgrade to <strong>{requiredPlan ? PLANS[requiredPlan].name : "a higher plan"}</strong> to process them, or reject orders you don't want.
              </p>
            </div>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setUpgradeDialog(true)}>
              <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by ID, buyer, or item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
            {(["all", "locked", "shipped", "released", "disputed"] as TxStatus[]).map((s) => (
              <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="capitalize text-xs">
                {s === "all" ? "All" : statusConfig[s].label}
              </Button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button variant="outline" size="sm"><Download className="w-3 h-3 mr-1" /> Export</Button>
            <Button variant="destructive" size="sm" onClick={() => setRejectDialog(true)}>
              <XCircle className="w-3 h-3 mr-1" /> Reject Selected
            </Button>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="p-3 sm:p-4 w-10">
                      <Checkbox
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id))}
                      />
                    </th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Order ID</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Buyer</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden md:table-cell">Item</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden lg:table-cell">Industry</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden xl:table-cell">Type</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden lg:table-cell">Tracking</th>
                    <th className="text-left p-3 sm:p-4 font-semibold text-muted-foreground text-xs hidden xl:table-cell">Date</th>
                    <th className="text-right p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Amount</th>
                    <th className="text-center p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Status</th>
                    <th className="text-center p-3 sm:p-4 font-semibold text-muted-foreground text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-muted-foreground text-sm">
                        No orders match your filters. Try adjusting the search or industry filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((tx) => {
                    const cfg = statusConfig[tx.status] || statusConfig.locked;
                    const grayed = isGrayedOut(tx.order);

                    return (
                      <React.Fragment key={tx.id}>
                      <tr
                        className={`border-b border-border last:border-0 transition-colors ${
                          grayed ? "opacity-40 bg-muted/10" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="p-3 sm:p-4">
                          <Checkbox checked={selected.includes(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} />
                        </td>
                        <td className="p-3 sm:p-4 font-mono text-xs">{tx.id}</td>
                        <td className="p-3 sm:p-4">
                          <div>
                            <p className="text-xs font-medium">{tx.buyer}</p>
                            <p className="text-[10px] text-muted-foreground hidden sm:block">{tx.buyerLocation}</p>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 hidden md:table-cell text-muted-foreground text-xs">{tx.item}</td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          {tx.industry ? (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {industryLabels[tx.industry] || tx.industry}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell">
                          <Badge variant="secondary" className="text-[10px] capitalize">{tx.type}</Badge>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">{tx.tracking || "—"}</td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell text-xs text-muted-foreground">{tx.date}</td>
                        <td className="p-3 sm:p-4 text-right font-semibold text-xs">${tx.amount.toLocaleString()}</td>
                        <td className="p-3 sm:p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          {grayed && (
                            <Badge variant="outline" className="ml-1 text-[8px] border-accent/30 text-accent">Over Limit</Badge>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {grayed ? (
                              <Button variant="outline" size="sm" className="text-xs text-accent" onClick={() => setUpgradeDialog(true)}>
                                <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
                              </Button>
                            ) : (
                              <>
                                {tx.status === "locked" && (
                                  <>
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleAddTracking(tx.id)} title="Add tracking number">
                                      <Truck className="w-3 h-3 mr-1" /> Track
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleMarkShipped(tx.id)} title="Mark as shipped">
                                      <Send className="w-3 h-3 mr-1" /> Ship
                                    </Button>
                                  </>
                                )}
                                {tx.status === "shipped" && (
                                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleUploadDoc(tx.id)} title="Upload delivery docs">
                                    <FileText className="w-3 h-3 mr-1" /> Docs
                                  </Button>
                                )}
                                {(tx.status === "locked" || tx.status === "shipped") && (
                                  <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleUploadDoc(tx.id)} title="Upload milestone document">
                                    <PackageCheck className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                                  {expandedRow === tx.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === tx.id && (
                        <tr>
                          <td colSpan={11} className="px-4 pb-4 bg-muted/10">
                            <div className="space-y-3 pt-2">
                              {/* Order details summary */}
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
                                  <p className="text-muted-foreground">Date</p>
                                  <p className="font-medium">{tx.date}</p>
                                </div>
                              </div>
                              <MilestoneTimeline industry={tx.industry} status={tx.status} />
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View list format</summary>
                                <MilestoneProgress industry={tx.industry} status={tx.status} />
                              </details>
                            </div>
                          </td>
                        </tr>
                      )}
                      </tbody>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-[10px] text-muted-foreground">
          Showing {filtered.length} orders · Plan range: {isUnlimited ? "Unlimited" : `${PLANS[planState.currentPlan].orderMin}–${orderMax}/month`} ·{" "}
          {grayedCount > 0 ? (
            <span className="text-accent font-medium">{grayedCount} grayed out (upgrade required)</span>
          ) : (
            <span className="text-primary">All orders within range</span>
          )}
        </div>
      </div>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selected.length} Order(s)?</DialogTitle>
            <DialogDescription>
              Rejected orders will be canceled and each buyer will receive an automatic notification. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSelected}>Reject & Notify Buyers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              You have {grayedCount} order{grayedCount !== 1 ? "s" : ""} exceeding your {PLANS[planState.currentPlan].name} plan range ({getOrderRangeLabel(PLANS[planState.currentPlan])} orders/month).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">To process these orders, upgrade to a plan with a higher range:</p>
            {PLAN_ORDER.filter(id => {
              const p = PLANS[id];
              return p.isPaid && (p.orderMax === -1 || p.orderMax > orderMax);
            }).map(id => {
              const p = PLANS[id];
              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{getOrderRangeLabel(p)} orders/mo</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setUpgradeDialog(false); navigate(`/trustlock/vendor/checkout?plan=${id}&billing=yearly`); }}>
                    ${p.yearly}/yr
                  </Button>
                </div>
              );
            })}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Don't want to upgrade? You can also:</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>• <strong>Reject orders</strong> — select grayed-out orders and click "Reject Selected"</li>
                <li>• <strong>Disable TrustLock Pay</strong> — go to Settings to turn off your payment widget entirely</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorTransactions;

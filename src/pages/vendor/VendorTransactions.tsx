import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  ArrowUpCircle, XCircle, ChevronDown, ChevronUp, PackageCheck, FileText, Send, Scale
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { getVendorPlanState, getRequiredPlanForOrders, PLANS, PLAN_ORDER, getOrderRangeLabel } from "@/hooks/useVendorPlan";
import { useTransactions, useRejectOrders, useAddTracking, useMarkDelivered } from "@/hooks/useSupabaseData";
import { useTestnetData } from "@/hooks/useTestnetData";
import { useVendor } from "@/contexts/VendorContext";
import MilestoneProgress from "@/components/shared/MilestoneProgress";
import MilestoneTimeline from "@/components/shared/MilestoneTimeline";
import TransactionDocuments from "@/components/shared/TransactionDocuments";
import IndustryBlueprintCard from "@/components/shared/IndustryBlueprintCard";
import { isMilestoneIndustry } from "@/components/shared/PreOrderSignatoryContract";
import MilestoneWorkOrderPanel from "@/components/shared/MilestoneWorkOrderPanel";
import ExternalFeeSummary from "@/components/shared/ExternalFeeSummary";
import ShipmentConfirmModal from "@/components/shared/ShipmentConfirmModal";
import TLId from "@/components/shared/TLId";
import { dynTLId } from "@/lib/tlIdRegistry";
import OrderStepGuide from "@/components/shared/OrderStepGuide";
import ArbitratorProposalPanel from "@/components/shared/ArbitratorProposalPanel";

type TxStatus = "all" | "locked" | "shipped" | "released" | "disputed";

const statusConfig = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

import { INDUSTRY_LABELS } from "@/lib/industryList";

const industryLabels: Record<string, string> = INDUSTRY_LABELS;

const VendorTransactions = () => {
  const navigate = useNavigate();
  const { isTestnet } = useVendor();
  const [filter, setFilter] = useState<TxStatus>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [shipDialog, setShipDialog] = useState<string | null>(null);

  // Real hooks (mainnet)
  const { data: rawTransactions = [] } = useTransactions();
  const rejectOrdersHook = useRejectOrders();
  const addTrackingHook = useAddTracking();
  const markDeliveredHook = useMarkDelivered();

  // Testnet mock hooks
  const testnet = useTestnetData();

  const planState = getVendorPlanState();
  const orderMax = planState.orderMax;
  const isUnlimited = orderMax === -1;

  const sourceData = isTestnet
    ? testnet.transactions.map((tx, i) => ({
        dbId: tx.id,
        id: tx.tx_id,
        buyer: tx.buyer_name,
        amount: tx.amount,
        status: tx.status as "locked" | "shipped" | "released" | "disputed",
        date: new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        item: tx.item,
        tracking: tx.tracking,
        order: tx.order_number,
        industry: tx.industry,
        type: tx.type,
        buyerLocation: tx.buyer_location,
        vendorLocation: tx.vendor_location,
      }))
    : rawTransactions.map((tx, i) => ({
        dbId: tx.id,
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

  const allTx = sourceData;

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
    if (isTestnet) {
      testnet.rejectOrders(selected);
    } else {
      try { await rejectOrdersHook.mutateAsync(selected); } catch { /* handled */ }
    }
    setSelected([]);
    setRejectDialog(false);
  };

  const handleAddTracking = async (txId: string) => {
    const tracking = prompt("Enter tracking number:");
    if (tracking) {
      if (isTestnet) {
        testnet.addTracking(txId, tracking);
      } else {
        await addTrackingHook.mutateAsync({ txId, tracking });
      }
    }
  };

  const handleMarkShipped = (txId: string) => {
    setShipDialog(txId);
  };

  const handleShipConfirmed = async (tracking: string) => {
    const txId = shipDialog;
    if (!txId) return;
    if (isTestnet) {
      testnet.addTracking(txId, tracking);
    } else {
      await addTrackingHook.mutateAsync({ txId, tracking });
    }
    setShipDialog(null);
  };

  const handleMarkDelivered = async (txId: string) => {
    if (isTestnet) {
      testnet.markDelivered(txId);
    } else {
      await markDeliveredHook.mutateAsync(txId);
    }
  };

  return (
    <div>
      <VendorHeader title="Direct Work Orders" />
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

        {/* Mobile card view */}
        <div className="sm:hidden space-y-3">
          {filtered.length === 0 && (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No orders match your filters.</CardContent></Card>
          )}
          {filtered.map((tx, rowIdx) => {
            const cfg = statusConfig[tx.status] || statusConfig.locked;
            const grayed = isGrayedOut(tx.order);
            return (
              <Card key={tx.id} className={grayed ? "opacity-40" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{tx.id}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${cfg.color}`}>
                      <cfg.icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{tx.buyer}</p>
                      <p className="text-[11px] text-muted-foreground">{tx.item}</p>
                    </div>
                    <span className="text-base font-bold">${tx.amount.toLocaleString()}</span>
                  </div>
                  <ExternalFeeSummary transactionId={tx.dbId} escrowAmount={tx.amount} isTestnet={isTestnet} />
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{tx.date}</span>
                    {tx.industry && (
                      <Badge variant="outline" className="text-[9px] capitalize">{industryLabels[tx.industry] || tx.industry}</Badge>
                    )}
                    <Badge variant="secondary" className="text-[9px] capitalize">{tx.type}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {grayed ? (
                      <Button variant="outline" size="sm" className="text-xs text-accent h-9" onClick={() => setUpgradeDialog(true)}>
                        <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
                      </Button>
                    ) : (
                      <>
                        {tx.status === "locked" && (
                          <>
                            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => handleAddTracking(tx.id)}><Truck className="w-3 h-3 mr-1" /> Track</Button>
                            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => handleMarkShipped(tx.id)}><Send className="w-3 h-3 mr-1" /> Ship</Button>
                          </>
                        )}
                        {tx.status === "shipped" && (
                          <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => handleMarkDelivered(tx.id)}><PackageCheck className="w-3 h-3 mr-1" /> Delivered</Button>
                        )}
                        <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                          <Eye className="w-3 h-3 mr-1" /> Details
                        </Button>
                      </>
                    )}
                  </div>
                  {expandedRow === tx.id && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-muted-foreground">Buyer Location</p><p className="font-medium">{tx.buyerLocation}</p></div>
                        <div><p className="text-muted-foreground">Tracking</p><p className="font-medium font-mono">{tx.tracking || "—"}</p></div>
                      </div>
                      <MilestoneTimeline industry={tx.industry} status={tx.status} transactionId={tx.dbId} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop table view */}
        <Card className="hidden sm:block">
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
                  {filtered.map((tx, rowIdx) => {
                    const cfg = statusConfig[tx.status] || statusConfig.locked;
                    const grayed = isGrayedOut(tx.order);
                    const row = rowIdx + 1;

                    return (
                      <React.Fragment key={tx.id}>
                      <tr
                        className={`border-b border-border last:border-0 transition-colors ${
                          grayed ? "opacity-40 bg-muted/10" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="p-3 sm:p-4">
                          <TLId code={dynTLId("V", "TX", row, "CHK-SELECT")} inline>
                            <Checkbox checked={selected.includes(tx.id)} onCheckedChange={() => toggleSelect(tx.id)} />
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4">
                          <TLId code={dynTLId("V", "TX", row, "LBL-TXID")} inline>
                            <span className="font-mono text-xs">{tx.id}</span>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4">
                          <TLId code={dynTLId("V", "TX", row, "LBL-BUYER")} inline>
                            <div>
                              <p className="text-xs font-medium">{tx.buyer}</p>
                              <p className="text-[10px] text-muted-foreground hidden sm:block">{tx.buyerLocation}</p>
                            </div>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 hidden md:table-cell">
                          <TLId code={dynTLId("V", "TX", row, "LBL-ITEM")} inline>
                            <span className="text-muted-foreground text-xs">{tx.item}</span>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          {tx.industry ? (
                            <TLId code={dynTLId("V", "TX", row, "BDG-INDUSTRY")} inline>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {industryLabels[tx.industry] || tx.industry}
                              </Badge>
                            </TLId>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell">
                          <TLId code={dynTLId("V", "TX", row, "BDG-TYPE")} inline>
                            <Badge variant="secondary" className="text-[10px] capitalize">{tx.type}</Badge>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 hidden lg:table-cell">
                          <TLId code={dynTLId("V", "TX", row, "LBL-TRACKING")} inline>
                            <span className="font-mono text-xs text-muted-foreground">{tx.tracking || "—"}</span>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 hidden xl:table-cell">
                          <TLId code={dynTLId("V", "TX", row, "LBL-DATE")} inline>
                            <span className="text-xs text-muted-foreground">{tx.date}</span>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 text-right">
                          <TLId code={dynTLId("V", "TX", row, "LBL-AMOUNT")} inline>
                            <span className="font-semibold text-xs">${tx.amount.toLocaleString()}</span>
                          </TLId>
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <TLId code={dynTLId("V", "TX", row, "STS")} inline>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${cfg.color}`}>
                              <cfg.icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </TLId>
                          {grayed && (
                            <TLId code={dynTLId("V", "TX", row, "BDG-LIMIT")} inline>
                              <Badge variant="outline" className="ml-1 text-[8px] border-accent/30 text-accent">Over Limit</Badge>
                            </TLId>
                          )}
                        </td>
                        <td className="p-3 sm:p-4 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {grayed ? (
                              <TLId code={dynTLId("V", "TX", row, "BTN-UPGRADE")} inline>
                                <Button variant="outline" size="sm" className="text-xs text-accent" onClick={() => setUpgradeDialog(true)}>
                                  <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
                                </Button>
                              </TLId>
                            ) : (
                              <>
                                {tx.status === "locked" && (
                                  <>
                                    <TLId code={dynTLId("V", "TX", row, "BTN-TRACK")} inline>
                                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleAddTracking(tx.id)} title="Add tracking number">
                                        <Truck className="w-3 h-3 mr-1" /> Track
                                      </Button>
                                    </TLId>
                                    <TLId code={dynTLId("V", "TX", row, "BTN-SHIP")} inline>
                                      <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleMarkShipped(tx.id)} title="Mark as shipped">
                                        <Send className="w-3 h-3 mr-1" /> Ship
                                      </Button>
                                    </TLId>
                                  </>
                                )}
                                {tx.status === "shipped" && (
                                  <TLId code={dynTLId("V", "TX", row, "BTN-DELIVERED")} inline>
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => handleMarkDelivered(tx.id)} title="Mark as delivered">
                                      <PackageCheck className="w-3 h-3 mr-1" /> Delivered
                                    </Button>
                                  </TLId>
                                )}
                                {(tx.status === "locked" || tx.status === "shipped") && (
                                  <TLId code={dynTLId("V", "TX", row, "BTN-WORKORDER")} inline>
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 px-2" onClick={() => setExpandedRow(tx.id)} title="Open work-order panel">
                                      <FileText className="w-3 h-3" />
                                    </Button>
                                  </TLId>
                                )}
                                {tx.status === "disputed" && tx.amount >= 10000 && (
                                  <TLId code={dynTLId("V", "TX", row, "BTN-ARBITRATE")} inline>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-[10px] h-7 px-2 border-accent text-accent-foreground hover:bg-accent/10"
                                      onClick={async () => {
                                        const fee = (tx.amount * 0.02).toFixed(2);
                                         const confirmed = window.confirm(
                                           `Request a professional arbitrator for order ${tx.id}?\n\nEscrow Amount: $${tx.amount.toLocaleString()}\nArbitration Filing & Case Management Fee (2%): $${fee}\n\nThis non-refundable fee covers TrustLock's case management and coordination. The appointed arbitrator's professional fees are separate and determined by their institution after appointment.\n\nProceed to payment?`
                                         );
                                        if (!confirmed) return;
                                        try {
                                          const { data: { user } } = await supabase.auth.getUser();
                                          if (!user) { toast.error("You must be logged in"); return; }

                                          // Find the dispute linked to this transaction
                                          const { data: dispute } = await supabase.from("disputes")
                                            .select("id, dispute_id")
                                            .eq("transaction_id", tx.dbId)
                                            .limit(1)
                                            .maybeSingle();

                                          if (!dispute) { toast.error("No dispute found for this order"); return; }

                                          const { data: arbOrder, error } = await supabase.from("arbitration_fee_orders").insert({
                                            dispute_id: dispute.id,
                                            transaction_id: tx.dbId,
                                            requested_by: user.id,
                                            requester_role: "vendor",
                                            escrow_amount: tx.amount,
                                            arbitration_fee: parseFloat(fee),
                                            tx_id: tx.id,
                                          }).select("id").single();

                                          if (error) { toast.error("Failed to create arbitration request"); return; }

                                          navigate(`/trustlock/vendor/os-pay?service=${encodeURIComponent(`Arbitration Fee — ${tx.id}`)}&amount=${fee}&arbitration_order_id=${arbOrder.id}`);
                                          toast.info("Complete the arbitration fee payment to initiate professional review.");
                                        } catch {
                                          toast.error("Something went wrong. Please try again.");
                                        }
                                      }}
                                      title="Request professional arbitrator"
                                    >
                                      <Scale className="w-3 h-3 mr-1" /> Arbitrate
                                    </Button>
                                  </TLId>
                                )}
                                <TLId code={dynTLId("V", "TX", row, "BTN-VIEW")} inline>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                                </TLId>
                                <TLId code={dynTLId("V", "TX", row, "BTN-EXPAND")} inline>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedRow(expandedRow === tx.id ? null : tx.id)}>
                                    {expandedRow === tx.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </Button>
                                </TLId>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRow === tx.id && (
                        <tr>
                          <td colSpan={11} className="px-4 pb-4 bg-muted/10">
                            <div className="space-y-3 pt-2">
                              <OrderStepGuide status={tx.status} role="vendor" industry={tx.industry} />
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
                              {/* Blueprint now integrated into MilestoneWorkOrderPanel header */}
                              <MilestoneTimeline industry={tx.industry} status={tx.status} transactionId={tx.dbId} />
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View list format</summary>
                                <MilestoneProgress industry={tx.industry} status={tx.status} transactionId={tx.dbId} />
                              </details>
                              {isMilestoneIndustry(tx.industry) && tx.status === "locked" && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                  <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold text-foreground">Milestone Schedule Locked</p>
                                    <p className="text-muted-foreground mt-0.5">
                                      The milestone breakdown for this order was agreed upon during checkout. Manage milestones from the Milestone Agreements section in your CRM, or review the work order below.
                                    </p>
                                  </div>
                                </div>
                              )}
                              <MilestoneWorkOrderPanel
                                role="vendor"
                                txId={tx.id}
                                transactionId={tx.dbId}
                                industry={tx.industry}
                                transactionStatus={tx.status}
                                isTestnet={isTestnet}
                                testnetMilestones={isTestnet ? testnet.getMilestones(tx.dbId) : undefined}
                                onTestnetUpdateStatus={testnet.updateMilestoneStatus}
                                onTestnetSaveNote={testnet.updateMilestoneNote}
                                onTestnetAddDocument={testnet.addMilestoneDocument}
                                onTestnetInviteObserver={testnet.inviteObserver}
                                onTestnetRelease={testnet.releaseMilestonePayment}
                                onTestnetAddGps={testnet.addGpsToMilestone}
                              />
                              <div className="pt-2 border-t border-border mt-2">
                                <TransactionDocuments
                                  tx={{
                                    txId: tx.id,
                                    vendorName: "Your Business",
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
                              {tx.status === "disputed" && (
                                <ArbitratorProposalPanel transactionId={tx.dbId} role="vendor" />
                              )}
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

      {/* Shipment Confirmation Modal */}
      {shipDialog && (() => {
        const tx = allTx.find((t) => t.id === shipDialog);
        return (
          <ShipmentConfirmModal
            open={!!shipDialog}
            onClose={() => setShipDialog(null)}
            onConfirm={handleShipConfirmed}
            txId={tx?.id || shipDialog}
            orderNumber={tx?.order}
            buyerName={tx?.buyer}
            amount={tx?.amount}
            industry={tx?.industry}
            transactionId={tx?.dbId}
          />
        );
      })()}
    </div>
  );
};

export default VendorTransactions;

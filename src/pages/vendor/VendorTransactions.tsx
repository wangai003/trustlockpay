import { useState } from "react";
import { useNavigate } from "react-router-dom";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Eye, Clock, CheckCircle, AlertTriangle, Download, Truck, Lock,
  ArrowUpCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { getVendorPlanState, getRequiredPlanForOrders, PLANS, PLAN_ORDER } from "@/hooks/useVendorPlan";

type TxStatus = "all" | "locked" | "shipped" | "released" | "disputed";

const mockTx = [
  { id: "TL-2026-0891", buyer: "James O.", amount: 200, status: "locked" as const, date: "Mar 18, 2026", item: "Kente Cloth Set", tracking: null, order: 1 },
  { id: "TL-2026-0896", buyer: "Emmanuel K.", amount: 350, status: "shipped" as const, date: "Mar 21, 2026", item: "Traditional Beads", tracking: "GH2026XYZ", order: 2 },
  { id: "TL-2026-0892", buyer: "Adaeze N.", amount: 4500, status: "released" as const, date: "Mar 20, 2026", item: "Bulk Textiles", tracking: "NG2026ABC", order: 3 },
  { id: "TL-2026-0889", buyer: "Grace A.", amount: 120, status: "released" as const, date: "Mar 17, 2026", item: "Handwoven Basket", tracking: "GH2026QRS", order: 4 },
  { id: "TL-2026-0894", buyer: "Amara D.", amount: 680, status: "disputed" as const, date: "Mar 15, 2026", item: "Custom Fabric", tracking: "GH2026DEF", order: 5 },
  { id: "TL-2026-0900", buyer: "Kwame B.", amount: 90, status: "locked" as const, date: "Mar 22, 2026", item: "Beaded Necklace", tracking: null, order: 6 },
  { id: "TL-2026-0901", buyer: "Fatima S.", amount: 250, status: "locked" as const, date: "Mar 22, 2026", item: "Ankara Dress", tracking: null, order: 7 },
  { id: "TL-2026-0902", buyer: "Kofi M.", amount: 175, status: "locked" as const, date: "Mar 22, 2026", item: "Wooden Sculpture", tracking: null, order: 8 },
  { id: "TL-2026-0903", buyer: "Ama T.", amount: 420, status: "locked" as const, date: "Mar 22, 2026", item: "Kente Stole", tracking: null, order: 9 },
  { id: "TL-2026-0904", buyer: "Yaw P.", amount: 310, status: "locked" as const, date: "Mar 22, 2026", item: "Batik Set", tracking: null, order: 10 },
  { id: "TL-2026-0905", buyer: "Esi K.", amount: 540, status: "locked" as const, date: "Mar 22, 2026", item: "Custom Weaving", tracking: null, order: 11 },
  { id: "TL-2026-0906", buyer: "Nana A.", amount: 95, status: "locked" as const, date: "Mar 22, 2026", item: "Shea Butter Set", tracking: null, order: 12 },
  { id: "TL-2026-0907", buyer: "Adjoa W.", amount: 780, status: "locked" as const, date: "Mar 22, 2026", item: "Premium Textile Bundle", tracking: null, order: 13 },
  { id: "TL-2026-0908", buyer: "Mensah R.", amount: 160, status: "locked" as const, date: "Mar 22, 2026", item: "Leather Sandals", tracking: null, order: 14 },
  { id: "TL-2026-0909", buyer: "Akosua F.", amount: 230, status: "locked" as const, date: "Mar 22, 2026", item: "Hand Fan Set", tracking: null, order: 15 },
  { id: "TL-2026-0910", buyer: "Bright O.", amount: 410, status: "locked" as const, date: "Mar 22, 2026", item: "Smock Dress", tracking: null, order: 16 },
  { id: "TL-2026-0911", buyer: "Serwaa L.", amount: 285, status: "locked" as const, date: "Mar 22, 2026", item: "Brass Jewelry", tracking: null, order: 17 },
  { id: "TL-2026-0912", buyer: "Daniel Q.", amount: 600, status: "locked" as const, date: "Mar 22, 2026", item: "Custom Upholstery", tracking: null, order: 18 },
];

const statusConfig = {
  locked: { label: "Funds Locked", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  shipped: { label: "Shipped", color: "bg-primary/15 text-primary", icon: Truck },
  released: { label: "Released", color: "bg-primary/15 text-primary", icon: CheckCircle },
  disputed: { label: "Disputed", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const VendorTransactions = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TxStatus>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);

  const planState = getVendorPlanState();
  const orderLimit = planState.orderLimit;
  const isUnlimited = orderLimit === -1;

  const filtered = mockTx
    .filter((t) => filter === "all" || t.status === filter)
    .filter((t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.buyer.toLowerCase().includes(search.toLowerCase()));

  const isGrayedOut = (orderNum: number) => !isUnlimited && orderNum > orderLimit;
  const grayedCount = filtered.filter(t => isGrayedOut(t.order)).length;
  const requiredPlan = grayedCount > 0 ? getRequiredPlanForOrders(mockTx.length) : null;

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);

  const handleRejectSelected = () => {
    toast.success(`${selected.length} order(s) rejected. Buyers have been notified.`);
    setSelected([]);
    setRejectDialog(false);
  };

  return (
    <div>
      <VendorHeader title="Transactions" />
      <div className="p-6 space-y-4">
        {/* Plan limit banner */}
        {grayedCount > 0 && (
          <div className="p-3 rounded-lg border border-accent/30 bg-accent/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Lock className="w-4 h-4 text-accent shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold">
                {grayedCount} order{grayedCount !== 1 ? "s" : ""} exceed your {PLANS[planState.currentPlan].name} plan limit ({isUnlimited ? "∞" : orderLimit} orders/mo)
              </p>
              <p className="text-[10px] text-muted-foreground">
                Upgrade to <strong>{requiredPlan ? PLANS[requiredPlan].name : "a higher plan"}</strong> to process them, or reject orders you don't want.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setUpgradeDialog(true)}>
                <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
              </Button>
            </div>
          </div>
        )}

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
                    <th className="p-4 w-10">
                      <Checkbox
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((t) => t.id))}
                      />
                    </th>
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
                    const grayed = isGrayedOut(tx.order);

                    return (
                      <tr
                        key={tx.id}
                        className={`border-b border-border last:border-0 transition-colors ${
                          grayed ? "opacity-40 bg-muted/10" : "hover:bg-muted/20"
                        }`}
                      >
                        <td className="p-4">
                          <Checkbox
                            checked={selected.includes(tx.id)}
                            onCheckedChange={() => toggleSelect(tx.id)}
                          />
                        </td>
                        <td className="p-4 font-mono text-xs">{tx.id}</td>
                        <td className="p-4">{tx.buyer}</td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">{tx.item}</td>
                        <td className="p-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">{tx.tracking || "—"}</td>
                        <td className="p-4 text-right font-semibold">${tx.amount.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                            <cfg.icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          {grayed && (
                            <Badge variant="outline" className="ml-1 text-[8px] border-accent/30 text-accent">
                              Over Limit
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {grayed ? (
                              <Button variant="outline" size="sm" className="text-xs text-accent" onClick={() => setUpgradeDialog(true)}>
                                <ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade
                              </Button>
                            ) : (
                              <>
                                {tx.status === "locked" && <Button variant="outline" size="sm" className="text-xs">Add Tracking</Button>}
                                <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                              </>
                            )}
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

        {/* Order limit info */}
        <div className="text-center text-[10px] text-muted-foreground">
          Showing {filtered.length} orders · Plan limit: {isUnlimited ? "Unlimited" : `${orderLimit}/month`} ·{" "}
          {grayedCount > 0 ? (
            <span className="text-accent font-medium">{grayedCount} grayed out (upgrade required)</span>
          ) : (
            <span className="text-primary">All orders within limit</span>
          )}
        </div>
      </div>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selected.length} Order(s)?</DialogTitle>
            <DialogDescription>
              Rejected orders will be canceled and each buyer will receive an automatic notification that the vendor has stopped/rejected their payment. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectSelected}>Reject & Notify Buyers</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Required</DialogTitle>
            <DialogDescription>
              You have {grayedCount} order{grayedCount !== 1 ? "s" : ""} exceeding your {PLANS[planState.currentPlan].name} plan limit of {orderLimit} orders/month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">To process these orders, upgrade to a plan with a higher limit:</p>
            {PLAN_ORDER.filter(id => {
              const p = PLANS[id];
              return p.isPaid && (p.orderLimit === -1 || p.orderLimit > orderLimit);
            }).map(id => {
              const p = PLANS[id];
              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.orderLimit === -1 ? "Unlimited" : `${p.orderLimit} orders/mo`}</p>
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

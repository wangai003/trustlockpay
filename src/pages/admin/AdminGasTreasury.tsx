import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Fuel, Wallet, RefreshCw, Play, AlertTriangle, CheckCircle2,
  TrendingUp, Database, Shield, Zap, DollarSign, Settings2,
  PiggyBank, ArrowDownToLine, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TreasuryStatus {
  queue: { queued: number; anchored: number; failed: number; total: number };
  wallet: {
    configured: boolean;
    address: string | null;
    balanceMatic: number;
    balanceUsd: number;
    lowBalance: boolean;
    gasPriceGwei: number;
  };
  costProjections: {
    next50: CostEstimate;
    next500: CostEstimate;
    next5000: CostEstimate;
  };
  sustainability: {
    revenuePerOrder: number;
    anchorCostPerOrder: number;
    costAsPercentOfRevenue: number;
    proofsPerOrder: number;
    maticPriceUsd: number;
  };
  config: {
    contractAddress: string | null;
    rpcConfigured: boolean;
    walletConfigured: boolean;
    thirdwebConfigured: boolean;
  };
}

interface CostEstimate {
  perRecordMatic: number;
  perRecordUsd: number;
  totalMatic: number;
  totalUsd: number;
}

interface ReserveStatus {
  totalReserves: number;
  totalUsd: number;
  totalMatic: number;
  pendingCount: number;
  pendingUsd: number;
  convertedCount: number;
  convertedMatic: number;
  estimatedAnchors: number;
  recentReserves: any[];
}

const AdminGasTreasury = () => {
  const [status, setStatus] = useState<TreasuryStatus | null>(null);
  const [reserveStatus, setReserveStatus] = useState<ReserveStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [estimateOrders, setEstimateOrders] = useState("1000");
  const [customEstimate, setCustomEstimate] = useState<any>(null);
  const [simAmount, setSimAmount] = useState("500");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, reserveRes] = await Promise.all([
        supabase.functions.invoke("gas-treasury", { body: { action: "status" } }),
        supabase.functions.invoke("gas-treasury", { body: { action: "reserve_status" } }),
      ]);
      if (statusRes.error) throw statusRes.error;
      setStatus(statusRes.data);
      if (!reserveRes.error) setReserveStatus(reserveRes.data);
    } catch (err: any) {
      toast.error("Failed to fetch treasury status");
    }
    setLoading(false);
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("gas-treasury", {
        body: { action: "process_queue", limit: 50 },
      });
      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Processed: ${data.anchored || 0} anchored, ${data.failed || 0} failed`);
        fetchStatus();
      }
    } catch {
      toast.error("Queue processing failed");
    }
    setProcessing(false);
  };

  const runEstimate = async () => {
    const num = parseInt(estimateOrders);
    if (!num || num < 1) return;
    try {
      const { data } = await supabase.functions.invoke("gas-treasury", {
        body: { action: "estimate", numOrders: num },
      });
      setCustomEstimate(data);
    } catch {
      toast.error("Estimate failed");
    }
  };

  const simulateReserve = async () => {
    const amt = parseFloat(simAmount);
    if (!amt || amt <= 0) return;
    try {
      const { data, error } = await supabase.functions.invoke("gas-treasury", {
        body: { action: "reserve", orderAmount: amt },
      });
      if (error) throw error;
      toast.success(`Reserved $${data.summary.reserveUsd} → ${data.summary.reserveMatic} MATIC (covers ~${data.summary.anchorsItCovers} anchors)`);
      fetchStatus();
    } catch {
      toast.error("Reserve simulation failed");
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const q = status?.queue;
  const w = status?.wallet;
  const s = status?.sustainability;
  const c = status?.config;
  const r = reserveStatus;

  return (
    <div>
      <AdminHeader title="Gas Treasury" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fuel className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gas Treasury</h1>
              <p className="text-sm text-muted-foreground">
                Monitor Polygon wallet, anchoring costs, and auto-reserve funding
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Config Status Banner */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">Polygon Configuration:</span>
              <Badge variant={c?.rpcConfigured ? "default" : "secondary"}>
                RPC {c?.rpcConfigured ? "✓" : "✗"}
              </Badge>
              <Badge variant={c?.walletConfigured ? "default" : "secondary"}>
                Wallet {c?.walletConfigured ? "✓" : "✗"}
              </Badge>
              <Badge variant={c?.contractAddress ? "default" : "secondary"}>
                Contract {c?.contractAddress ? "✓" : "✗"}
              </Badge>
              <Badge variant={c?.thirdwebConfigured ? "default" : "secondary"}>
                Thirdweb {c?.thirdwebConfigured ? "✓" : "✗"}
              </Badge>
            </div>
            {!c?.contractAddress && (
              <p className="text-xs text-muted-foreground mt-2">
                Add <code className="text-primary">REGISTRY_CONTRACT_ADDRESS</code>,{" "}
                <code className="text-primary">POLYGON_WALLET_PRIVATE_KEY</code>, and{" "}
                <code className="text-primary">POLYGON_RPC_URL</code> secrets to activate live anchoring.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Row: Wallet + Queue */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">Wallet Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {w?.configured ? `${w.balanceMatic} MATIC` : "Not configured"}
              </p>
              <p className="text-xs text-muted-foreground">
                {w?.configured ? `≈ $${w.balanceUsd} USD` : "Add wallet secret to monitor"}
              </p>
              {w?.lowBalance && (
                <Badge variant="destructive" className="mt-2 gap-1">
                  <AlertTriangle className="w-3 h-3" /> Low Balance
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Database className="w-4 h-4" />
                <span className="text-xs font-medium">Queue</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{q?.queued ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Records awaiting anchoring</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-medium">Anchored</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{q?.anchored ?? "—"}</p>
              <p className="text-xs text-muted-foreground">On-chain on Polygon</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-medium">Gas Price</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {w?.gasPriceGwei ? `${w.gasPriceGwei} gwei` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Current Polygon network</p>
            </CardContent>
          </Card>
        </div>

        {/* Gas Reserve Auto-Fund */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" /> Gas Reserve Auto-Fund
            </CardTitle>
            <CardDescription>
              0.01% of every settled order is earmarked for gas. A single $500 order funds ~50 blockchain anchors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reserve stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="border border-border rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Total Reserved</p>
                <p className="text-xl font-bold text-foreground">${r?.totalUsd ?? "0.00"}</p>
                <p className="text-[10px] text-muted-foreground">{r?.totalMatic ?? 0} MATIC</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Pending Conversion</p>
                </div>
                <p className="text-xl font-bold text-foreground">${r?.pendingUsd ?? "0.00"}</p>
                <p className="text-[10px] text-muted-foreground">{r?.pendingCount ?? 0} entries</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <ArrowDownToLine className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Converted</p>
                </div>
                <p className="text-xl font-bold text-foreground">{r?.convertedMatic ?? 0} MATIC</p>
                <p className="text-[10px] text-muted-foreground">{r?.convertedCount ?? 0} batches</p>
              </div>
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Anchors Funded</p>
                <p className="text-xl font-bold text-primary">{r?.estimatedAnchors?.toLocaleString() ?? "0"}</p>
                <p className="text-[10px] text-muted-foreground">at current gas prices</p>
              </div>
            </div>

            {/* Simulate reserve */}
            <div className="border border-dashed border-border rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Simulate Settlement Reserve</p>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Order Amount ($)</label>
                  <Input
                    type="number"
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    className="w-32"
                    placeholder="500"
                  />
                </div>
                <Button onClick={simulateReserve} variant="outline" size="sm">
                  <PiggyBank className="w-4 h-4 mr-2" />
                  Reserve 0.01%
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                ${simAmount ? (parseFloat(simAmount) * 0.0001).toFixed(4) : "0"} earmarked → ≈{" "}
                {simAmount ? ((parseFloat(simAmount) * 0.0001) / 0.40).toFixed(4) : "0"} MATIC →{" "}
                ~{simAmount ? Math.floor(((parseFloat(simAmount) * 0.0001) / 0.40) / (45000 * 30 / 1e9)) : 0} anchors
              </p>
            </div>

            {/* Recent reserves */}
            {r?.recentReserves && r.recentReserves.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Order</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Reserved</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">MATIC</th>
                      <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.recentReserves.map((entry: any) => (
                      <tr key={entry.id} className="border-b">
                        <td className="p-2">{new Date(entry.created_at).toLocaleDateString()}</td>
                        <td className="p-2 text-right font-mono">${Number(entry.order_amount).toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">${Number(entry.reserve_usd).toFixed(4)}</td>
                        <td className="p-2 text-right font-mono">{Number(entry.reserve_matic).toFixed(4)}</td>
                        <td className="p-2 text-center">
                          <Badge variant={entry.status === "converted" ? "default" : "secondary"} className="text-[10px]">
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue Progress + Batch Processor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5" /> Batch Anchor Processor
            </CardTitle>
            <CardDescription>
              Process queued records in batches of 50 to minimize gas costs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Anchored: {q?.anchored ?? 0}</span>
                <span>Total: {q?.total ?? 0}</span>
              </div>
              <Progress
                value={q?.total ? ((q.anchored / q.total) * 100) : 0}
                className="h-2"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={processQueue} disabled={processing || !q?.queued}>
                <Play className="w-4 h-4 mr-2" />
                {processing ? "Processing..." : `Anchor ${Math.min(q?.queued || 0, 50)} Records`}
              </Button>
              {q?.failed ? (
                <Badge variant="destructive">{q.failed} failed</Badge>
              ) : null}
              <span className="text-xs text-muted-foreground ml-auto">
                {q?.queued === 0 ? "Queue empty ✓" : `${q?.queued} waiting`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Sustainability Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Cost Sustainability
            </CardTitle>
            <CardDescription>
              How anchoring costs compare to TrustLock's 1.5% transaction fee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Revenue per Order</p>
                <p className="text-xl font-bold text-foreground">${s?.revenuePerOrder ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">at $500 avg × 1.5%</p>
              </div>
              <div className="border border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Anchoring Cost per Order</p>
                <p className="text-xl font-bold text-foreground">
                  ${s?.anchorCostPerOrder ? s.anchorCostPerOrder.toFixed(4) : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{s?.proofsPerOrder ?? 5} proofs × gas</p>
              </div>
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Cost as % of Revenue</p>
                <p className="text-xl font-bold text-primary">
                  {s?.costAsPercentOfRevenue ? `${s.costAsPercentOfRevenue.toFixed(3)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Extremely sustainable ✓</p>
              </div>
            </div>

            {/* Cost projections table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Scale</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Records</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cost (MATIC)</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cost (USD)</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Per Record</th>
                  </tr>
                </thead>
                <tbody>
                  {status?.costProjections && Object.entries(status.costProjections).map(([key, est]) => (
                    <tr key={key} className="border-b">
                      <td className="p-3 font-medium">
                        {key === "next50" ? "Small batch (50)" : key === "next500" ? "Monthly (~500)" : "High volume (5,000)"}
                      </td>
                      <td className="p-3 text-right">{key === "next50" ? 50 : key === "next500" ? 500 : 5000}</td>
                      <td className="p-3 text-right font-mono">{est.totalMatic.toFixed(4)}</td>
                      <td className="p-3 text-right font-mono">${est.totalUsd.toFixed(4)}</td>
                      <td className="p-3 text-right font-mono">${est.perRecordUsd.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Custom Cost Estimator */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Cost Estimator
            </CardTitle>
            <CardDescription>Project gas costs for a specific order volume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Number of Orders</label>
                <Input
                  type="number"
                  value={estimateOrders}
                  onChange={(e) => setEstimateOrders(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={runEstimate} variant="outline">Calculate</Button>
            </div>

            {customEstimate && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Total Proofs</p>
                  <p className="text-lg font-bold">{customEstimate.totalRecords}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Gas Cost</p>
                  <p className="text-lg font-bold">${customEstimate.estimate?.totalUsd?.toFixed(2)}</p>
                </div>
                <div className="border rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">MATIC Needed</p>
                  <p className="text-lg font-bold">{customEstimate.maticNeeded}</p>
                </div>
                <div className="border border-primary/30 bg-primary/5 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">% of Revenue</p>
                  <p className="text-lg font-bold text-primary">{customEstimate.costAsPercentOfRevenue}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminGasTreasury;

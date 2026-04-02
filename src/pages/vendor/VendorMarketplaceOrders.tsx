import { useState, useEffect } from "react";
import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Store, ExternalLink, RefreshCw, Package, AlertTriangle, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useVendor } from "@/contexts/VendorContext";
import { useNavigate } from "react-router-dom";

interface MarketplaceOrder {
  id: string;
  tx_id: string;
  amount: number;
  status: string;
  buyer_name: string;
  item: string;
  created_at: string;
  order_type: string;
  platform?: string;
  marketplace_order_id?: string;
}

const VendorMarketplaceOrders = () => {
  const { user } = useAuth();
  const { isTestnet } = useVendor();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [claimedPlatforms, setClaimedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPayoutMethod, setHasPayoutMethod] = useState(true);

  useEffect(() => {
    if (user?.id || isTestnet) fetchData();
  }, [user?.id, isTestnet]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = user?.id;

      if (isTestnet || !userId) {
        // Demo data for testnet
        setOrders([
          { id: "1", tx_id: "TL-MKT-001", amount: 450, status: "locked", buyer_name: "Sarah K.", item: "Wireless Earbuds (x3)", created_at: new Date().toISOString(), order_type: "simple", platform: "Jumia", marketplace_order_id: "JUM-2026-8834" },
          { id: "2", tx_id: "TL-MKT-002", amount: 1200, status: "shipped", buyer_name: "Ahmed O.", item: "Samsung Galaxy A15", created_at: new Date(Date.now() - 86400000).toISOString(), order_type: "simple", platform: "Konga", marketplace_order_id: "KNG-88912" },
          { id: "3", tx_id: "TL-MKT-003", amount: 89, status: "released", buyer_name: "Grace M.", item: "USB-C Hub Adapter", created_at: new Date(Date.now() - 172800000).toISOString(), order_type: "simple", platform: "Jumia", marketplace_order_id: "JUM-2026-7721" },
        ]);
        setClaimedPlatforms(["Jumia", "Konga"]);
        setLoading(false);
        return;
      }

      // Fetch claimed tokens to know platforms
      const { data: tokens } = await supabase
        .from("vendor_claim_tokens")
        .select("platform")
        .eq("claimed_by", userId)
        .eq("status", "claimed");

      const platforms = [...new Set((tokens || []).map(t => t.platform))];
      setClaimedPlatforms(platforms);

      // Fetch marketplace-origin transactions via order_carbon_copies
      const { data: carbonCopies } = await supabase
        .from("order_carbon_copies")
        .select("transaction_id, order_number, amount, status, buyer_name, item, created_at, checkout_details")
        .eq("vendor_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      const marketplaceOrders = (carbonCopies || [])
        .filter(cc => {
          const details = cc.checkout_details as Record<string, unknown> | null;
          return details?.marketplace_source === true;
        })
        .map(cc => {
          const details = cc.checkout_details as Record<string, unknown>;
          return {
            id: cc.transaction_id || cc.order_number || String(Math.random()),
            tx_id: cc.order_number || "—",
            amount: cc.amount || 0,
            status: cc.status || "active",
            buyer_name: cc.buyer_name || "Unknown",
            item: cc.item || "—",
            created_at: cc.created_at,
            order_type: "simple",
            platform: String(details?.marketplace_platform || "Marketplace"),
            marketplace_order_id: String(details?.marketplace_order_id || "—"),
          };
        });

      setOrders(marketplaceOrders);

      // Check if payout method is configured
      const { data: payoutConfigs } = await supabase
        .from("payout_requests")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      setHasPayoutMethod(!!(payoutConfigs?.length));
    } catch (err) {
      console.error("Failed to load marketplace orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === "released") return "default";
    if (s === "locked") return "secondary";
    if (s === "shipped" || s === "delivered") return "outline";
    if (s === "disputed") return "destructive";
    return "outline";
  };

  return (
    <div>
      <VendorHeader title="Marketplace Orders" />
      <div className="p-3 sm:p-6 space-y-4">
        {/* Payout Warning */}
        {!hasPayoutMethod && !isTestnet && (
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-xs">
              <strong>Payout method not configured.</strong> You must set up a payout method before released marketplace funds can be sent to you.{" "}
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/trustlock/vendor/payout")}>
                Configure now →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Platform Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Store className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Connected Platforms:</span>
          {claimedPlatforms.length ? (
            claimedPlatforms.map(p => (
              <Badge key={p} variant="outline" className="text-[10px] gap-1">
                <ExternalLink className="w-3 h-3" /> {p}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground italic">None — claim a marketplace account to get started</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{orders.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                ${orders.filter(o => o.status === "released").reduce((s, o) => s + o.amount, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">Released</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-accent-foreground">
                ${orders.filter(o => o.status === "locked").reduce((s, o) => s + o.amount, 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">In Escrow</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> Marketplace Orders
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 text-xs gap-1">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Store className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">No marketplace orders yet.</p>
                <p className="text-[10px] text-muted-foreground">Orders will appear here when buyers purchase through integrated marketplace platforms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Platform</TableHead>
                      <TableHead className="text-[10px]">Order</TableHead>
                      <TableHead className="text-[10px]">Item</TableHead>
                      <TableHead className="text-[10px]">Buyer</TableHead>
                      <TableHead className="text-[10px] text-right">Amount</TableHead>
                      <TableHead className="text-[10px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/trustlock/vendor/transactions`)}>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">{order.platform}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px]">
                          <div>{order.tx_id}</div>
                          {order.marketplace_order_id !== "—" && (
                            <div className="text-muted-foreground text-[9px]">MKT: {order.marketplace_order_id}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] max-w-[120px] truncate">{order.item}</TableCell>
                        <TableCell className="text-[10px]">{order.buyer_name}</TableCell>
                        <TableCell className="text-[10px] text-right font-medium">${order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(order.status)} className="text-[9px]">{order.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VendorMarketplaceOrders;

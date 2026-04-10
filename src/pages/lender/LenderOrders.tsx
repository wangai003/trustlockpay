import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet, ArrowRight, CheckCircle, Clock, Calendar,
  DollarSign, Percent, ExternalLink, Shield, Anchor
} from "lucide-react";

interface FinancingOrder {
  id: string;
  application_id: string;
  vendor_name: string;
  principal_amount: number;
  interest_rate_percent: number;
  tenure_days: number;
  maturity_date: string;
  status: string;
  expected_repayment_amount: number;
  disbursed_at: string | null;
  disbursement_tx_hash: string | null;
  repaid_at: string | null;
  repayment_amount: number | null;
  transaction_id: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_disbursement: { label: "Pending Disbursement", color: "bg-warning/15 text-warning" },
  disbursed: { label: "Disbursed", color: "bg-primary/15 text-primary" },
  repaid: { label: "Repaid", color: "bg-success/15 text-success" },
  defaulted: { label: "Defaulted", color: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground" },
};

const LenderOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<FinancingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<FinancingOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadOrders();
  }, [user]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("financing_orders")
        .select(`
          *,
          profiles:vendor_id (company_name)
        `)
        .eq("lender_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedOrders: FinancingOrder[] = (data || []).map((o: any) => ({
        id: o.id,
        application_id: o.application_id,
        vendor_name: o.profiles?.company_name || "Unknown",
        principal_amount: o.principal_amount,
        interest_rate_percent: o.interest_rate_percent,
        tenure_days: o.tenure_days,
        maturity_date: o.maturity_date,
        status: o.status,
        expected_repayment_amount: o.expected_repayment_amount,
        disbursed_at: o.disbursed_at,
        disbursement_tx_hash: o.disbursement_tx_hash,
        repaid_at: o.repaid_at,
        repayment_amount: o.repayment_amount,
        transaction_id: o.transaction_id,
        created_at: o.created_at,
      }));

      setOrders(mappedOrders);
    } catch (err) {
      toast.error("Failed to load financing orders");
    }
    setLoading(false);
  };

  const handleDisburse = async (orderId: string) => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/escrow-lending-bridge`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "disburse",
            order_id: orderId,
          }),
        }
      );
      const data = await resp.json();
      if (data.success) {
        toast.success("Funds disbursed successfully");
        setDetailOpen(false);
        loadOrders();
      } else {
        toast.error(data.error || "Disbursement failed");
      }
    } catch {
      toast.error("Failed to process disbursement");
    }
  };

  const activeOrders = orders.filter(o => o.status === "disbursed");
  const pendingOrders = orders.filter(o => o.status === "pending_disbursement");
  const repaidOrders = orders.filter(o => o.status === "repaid");
  const totalPrincipal = orders.reduce((sum, o) => sum + o.principal_amount, 0);
  const totalExpectedReturn = orders.reduce((sum, o) => sum + o.expected_repayment_amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <LenderHeader title="Financing Orders" />

      <div className="p-6 space-y-6">
        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalPrincipal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Principal</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${totalExpectedReturn.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Expected Return</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Disbursement</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{repaidOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Repaid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Orders List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Financing Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No financing orders yet</p>
                  <p className="text-sm mt-1">
                    Approved applications will become financing orders ready for disbursement
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {orders.map((order) => {
                    const status = statusConfig[order.status] || statusConfig.pending_disbursement;
                    const maturityDate = new Date(order.maturity_date);
                    const daysUntilMaturity = Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isMaturingSoon = order.status === "disbursed" && daysUntilMaturity < 30;

                    return (
                      <div
                        key={order.id}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedOrder(order);
                          setDetailOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{order.vendor_name}</h3>
                              <Badge className={`${status.color} text-xs`}>
                                {status.label}
                              </Badge>
                              {isMaturingSoon && (
                                <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {daysUntilMaturity} days to maturity
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Principal</p>
                                <p className="font-semibold">${order.principal_amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Rate</p>
                                <p className="font-semibold">{order.interest_rate_percent}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tenure</p>
                                <p className="font-semibold">{order.tenure_days} days</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Expected Return</p>
                                <p className="font-semibold">${order.expected_repayment_amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Maturity</p>
                                <p className={`font-semibold ${isMaturingSoon ? "text-destructive" : ""}`}>
                                  {maturityDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button variant="ghost" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Financing Order
                  <Badge className={statusConfig[selectedOrder.status]?.color}>
                    {statusConfig[selectedOrder.status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Overview */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="text-xl font-bold">
                        ${selectedOrder.principal_amount.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Interest Rate</p>
                      <p className="text-xl font-bold">{selectedOrder.interest_rate_percent}%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className="text-xl font-bold">
                        ${selectedOrder.expected_repayment_amount.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Order Timeline</h4>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Order Created</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.disbursed_at ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Disbursed</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedOrder.disbursed_at).toLocaleString()}
                        </p>
                        {selectedOrder.disbursement_tx_hash && (
                          <a
                            href={`https://polygonscan.com/tx/${selectedOrder.disbursement_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 mt-1"
                          >
                            <Anchor className="w-3 h-3" />
                            View on blockchain
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground">Awaiting Disbursement</p>
                      </div>
                    </div>
                  )}

                  {selectedOrder.repaid_at ? (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Repaid</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedOrder.repaid_at).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Amount: ${selectedOrder.repayment_amount?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-muted-foreground">Maturity Date</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(selectedOrder.maturity_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedOrder.status === "pending_disbursement" && (
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full"
                      onClick={() => handleDisburse(selectedOrder.id)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Disburse Funds to Escrow
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      This will transfer funds into the escrow system and anchor the transaction on blockchain
                    </p>
                  </div>
                )}

                {selectedOrder.status === "disbursed" && (
                  <div className="pt-4 border-t">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Repayment Status</p>
                      <p className="text-sm text-muted-foreground">
                        Waiting for escrow transaction to complete. Once the buyer releases funds or a payout is processed, repayment will be automatically triggered.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LenderOrders;

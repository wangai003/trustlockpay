import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Package, Clock, AlertTriangle, ShieldCheck, Copy, ExternalLink, LogIn } from "lucide-react";
import { useState } from "react";
import { useTransaction, useConfirmDelivery, useOpenDispute } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

const BuyerConfirmation = () => {
  const { txId } = useParams();
  const { data: rawTx } = useTransaction(txId || "");
  const confirmDelivery = useConfirmDelivery();
  const openDispute = useOpenDispute();
  const [confirmed, setConfirmed] = useState(false);
  const [disputed, setDisputed] = useState(false);

  const tx = rawTx ? {
    id: rawTx.tx_id,
    vendor: rawTx.vendor_name || "Sample Vendor",
    vendorLocation: rawTx.vendor_location || "—",
    buyer: rawTx.buyer_name || "Sample Buyer",
    item: rawTx.item || "Sample Product",
    amount: `$${Number(rawTx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    status: rawTx.status,
    tracking: rawTx.tracking || "—",
    paidDate: new Date(rawTx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    shippedDate: rawTx.shipped_date ? new Date(rawTx.shipped_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    deliveredDate: rawTx.delivered_date ? new Date(rawTx.delivered_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    autoReleaseDate: rawTx.auto_release_date ? new Date(rawTx.auto_release_date).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) : "48 hours after delivery",
  } : {
    id: txId || "TL-XXXX-XXXX",
    vendor: "Loading...",
    vendorLocation: "—",
    buyer: "Loading...",
    item: "Loading...",
    amount: "$0.00",
    status: "delivered",
    tracking: "—",
    paidDate: "—",
    shippedDate: "—",
    deliveredDate: "—",
    autoReleaseDate: "—",
  };

  const handleConfirm = async () => {
    if (rawTx) {
      await confirmDelivery.mutateAsync(rawTx.tx_id);
    }
    setConfirmed(true);
  };

  const handleDispute = async () => {
    if (rawTx) {
      await openDispute.mutateAsync({ txId: rawTx.tx_id });
    }
    setDisputed(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">TrustLock</h1>
            <p className="text-xs text-muted-foreground">Delivery Confirmation</p>
          </div>
        </div>

        {confirmed ? (
          <Card className="border-primary/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-heading text-xl font-bold">Delivery Confirmed!</h2>
              <p className="text-sm text-muted-foreground">
                Funds of <strong>{tx.amount}</strong> will be released to <strong>{tx.vendor}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">Thank you for using TrustLock. You may close this page.</p>
            </CardContent>
          </Card>
        ) : disputed ? (
          <Card className="border-destructive/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="font-heading text-xl font-bold">Dispute Filed</h2>
              <p className="text-sm text-muted-foreground">
                Your dispute for <strong>{tx.id}</strong> has been submitted. Emmanuel AI will review your case.
              </p>
              <p className="text-xs text-muted-foreground">You'll receive updates via email. You may close this page.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="font-heading text-lg font-bold">Confirm Your Delivery</h2>
                <p className="text-sm text-muted-foreground">Review the details below and confirm you received your order.</p>
              </div>

              <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Transaction</span><span className="font-mono font-bold">{tx.id}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vendor</span><span className="font-medium">{tx.vendor}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Item</span><span>{tx.item}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-bold text-lg">{tx.amount}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tracking</span><span className="font-mono text-xs">{tx.tracking}</span></div>
              </div>

              <div className="flex items-center gap-2">
                {[
                  { label: "Paid", date: tx.paidDate, done: true },
                  { label: "Shipped", date: tx.shippedDate, done: tx.shippedDate !== "—" },
                  { label: "Delivered", date: tx.deliveredDate, done: tx.deliveredDate !== "—" },
                  { label: "Release", date: "Awaiting", done: false },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {step.done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className="text-[10px] mt-1">{step.label}</span>
                      <span className="text-[9px] text-muted-foreground">{step.date}</span>
                    </div>
                    {i < 3 && <div className={`h-0.5 flex-1 mt-[-24px] ${step.done ? "bg-primary" : "bg-muted"}`} />}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg p-3 text-sm">
                <Clock className="w-4 h-4 text-accent shrink-0" />
                <span className="text-accent-foreground text-xs">
                  <strong>Auto-release:</strong> If no action is taken, funds will release on <strong>{tx.autoReleaseDate}</strong>
                </span>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 gap-2" onClick={handleConfirm}>
                  <CheckCircle className="w-4 h-4" /> Confirm Delivery
                </Button>
                <Button variant="outline" className="flex-1 gap-2 text-destructive border-destructive/30" onClick={handleDispute}>
                  <AlertTriangle className="w-4 h-4" /> Open Dispute
                </Button>
              </div>

              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" /> Secured by TrustLock Escrow
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

export default BuyerConfirmation;

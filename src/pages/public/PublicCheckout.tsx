import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, ArrowLeft, CheckCircle, Copy, LogIn, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import SanctionsGate from "@/components/shared/SanctionsGate";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";

const PublicCheckout = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"invoice" | "compliance" | "acknowledge" | "contract" | "pay" | "done">("invoice");
  const [invoiceData, setInvoiceData] = useState<{
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  } | null>(null);

  const mockLink = {
    id: linkId || "TL-DEMO",
    vendorName: "TrustLock Vendor",
    title: "Payment Request",
    createdAt: new Date().toISOString(),
  };

  const handleInvoiceProceed = (invoice: {
    items: any[];
    taxItems: TaxLineItem[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  }) => {
    setInvoiceData({
      subtotal: invoice.subtotal,
      taxTotal: invoice.taxTotal,
      grandTotal: invoice.grandTotal,
      note: invoice.note,
    });
    setStep("compliance");
  };

  const handleComplianceClear = useCallback(() => {
    setStep("acknowledge");
  }, []);

  const handleAcknowledgementAccept = useCallback(() => {
    setStep("pay");
  }, []);

  const handleComplianceBlock = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (step === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground">
              Your payment of ${invoiceData?.grandTotal.toFixed(2)} has been locked in escrow.
              You'll receive a confirmation email with your transaction details.
            </p>

            {/* Order reference to copy */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <p className="text-[10px] text-muted-foreground font-semibold">Your Order Reference</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono font-bold text-lg text-foreground">{linkId}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(linkId || ""); toast.success("Copied!"); }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Save this reference — use it to track your order in the Buyer Dashboard
              </p>
            </div>

            {/* Login/Signup CTA */}
            <div className="space-y-2">
              <Link to="/trustlock/buyer/login">
                <Button variant="outline" className="w-full gap-2 text-sm">
                  <LogIn className="w-4 h-4" /> Sign In to Track Order
                </Button>
              </Link>
              <p className="text-[10px] text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/trustlock/buyer/signup" className="text-primary underline">Sign up free</Link>
              </p>
            </div>

            <Badge variant="outline" className="text-xs">
              Transaction ID: {linkId}
            </Badge>
            <p className="text-[10px] text-muted-foreground">
              Funds will be released to the vendor once you confirm delivery or after the 14-day auto-release window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-primary p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-foreground" />
            <span className="font-heading font-bold text-sm text-primary-foreground">TrustLock Pay</span>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
            <Lock className="w-3 h-3 mr-1" /> Escrow Protected
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Steps indicator */}
        <div className="flex items-center gap-2 justify-center flex-wrap">
          {[
            { key: "invoice", label: "Invoice", num: 1 },
            { key: "compliance", label: "Compliance", num: 2 },
            { key: "acknowledge", label: "Acknowledge", num: 3 },
            { key: "pay", label: "Pay", num: 4 },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 text-xs font-semibold ${step === s.key ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.key ? "bg-primary text-primary-foreground" :
                  ["invoice","compliance","acknowledge","pay"].indexOf(s.key) < ["invoice","compliance","acknowledge","pay"].indexOf(step) ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && <div className="w-4 sm:w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Invoice Step */}
        {step === "invoice" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold">{mockLink.title}</h1>
              <p className="text-xs text-muted-foreground">From: {mockLink.vendorName} · Ref: {mockLink.id}</p>
            </div>
            <StandaloneInvoice
              vendorName={mockLink.vendorName}
              onProceed={handleInvoiceProceed}
            />
          </div>
        )}

        {/* Compliance Step */}
        {step === "compliance" && invoiceData && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setStep("invoice")}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Invoice
            </Button>
            <SanctionsGate
              amount={invoiceData.grandTotal}
              onClear={handleComplianceClear}
              onBlock={handleComplianceBlock}
            />
          </div>
        )}

        {/* Acknowledgement Step */}
        {step === "acknowledge" && invoiceData && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setStep("compliance")}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Compliance
            </Button>
            <AcknowledgementForm
              orderAmount={invoiceData.grandTotal}
              vendorName={mockLink.vendorName}
              buyerName="You"
              txId={mockLink.id}
              onAccept={handleAcknowledgementAccept}
              onDecline={() => setStep("invoice")}
            />
          </div>
        )}

        {/* Pay Step */}
        {step === "pay" && invoiceData && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setStep("invoice")}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Invoice
            </Button>
            <TrustLockOSPay
              role="buyer"
              prefillService={mockLink.title}
              prefillAmount={String(invoiceData.grandTotal)}
              onComplete={() => setStep("done")}
            />
          </div>
        )}

        {/* Footer */}
        <div className="text-center space-y-1 pt-4">
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Secured by TrustLock Escrow on Polygon</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Your payment is held in escrow until delivery is confirmed. You can dispute within 14 days.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicCheckout;

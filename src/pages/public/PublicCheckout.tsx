import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, ArrowLeft, CheckCircle, Copy, LogIn, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import TrustLockOSPay from "@/components/shared/TrustLockOSPay";
import SanctionsGate from "@/components/shared/SanctionsGate";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";
import { supabase } from "@/integrations/supabase/client";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";

interface LinkData {
  link_id: string;
  vendor_name: string;
  title: string;
  invoice_items: any[];
  tax_items: TaxLineItem[];
  note: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  industry: string;
}

const PublicCheckout = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "invoice" | "compliance" | "acknowledge" | "contract" | "pay" | "done">("loading");
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [invoiceData, setInvoiceData] = useState<{
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Load link data from DB
  useEffect(() => {
    const loadLink = async () => {
      if (!linkId) {
        setLoadError(true);
        setStep("invoice");
        return;
      }

      const { data, error } = await supabase
        .from("standalone_links")
        .select("*")
        .eq("link_id", linkId)
        .single();

      if (error || !data) {
        // Fallback to demo mode if link not found
        setLinkData(null);
        setStep("invoice");
        return;
      }

      setLinkData({
        link_id: data.link_id,
        vendor_name: data.vendor_name || "Vendor",
        title: data.title,
        invoice_items: (data.invoice_items as any[]) || [],
        tax_items: (data.tax_items as TaxLineItem[]) || [],
        note: data.note || "",
        subtotal: Number(data.subtotal),
        tax_total: Number(data.tax_total),
        grand_total: Number(data.grand_total),
        industry: data.industry || "default",
      });

      // Auto-set invoice data from saved link
      setInvoiceData({
        subtotal: Number(data.subtotal),
        taxTotal: Number(data.tax_total),
        grandTotal: Number(data.grand_total),
        note: data.note || "",
      });

      setStep("invoice");
    };
    loadLink();
  }, [linkId]);

  const vendorName = linkData?.vendor_name || "TrustLock Vendor";
  const linkTitle = linkData?.title || "Payment Request";
  const refId = linkId || "TL-DEMO";

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
    setStep("contract");
  }, []);

  const handleContractSigned = useCallback(() => {
    setStep("pay");
  }, []);

  const handleComplianceBlock = useCallback(() => {
    navigate("/");
  }, [navigate]);

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

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
                <span className="font-mono font-bold text-lg text-foreground">{refId}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(refId); toast.success("Copied!"); }}
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
              Transaction ID: {refId}
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
            { key: "contract", label: "Sign Contract", num: 4 },
            { key: "pay", label: "Pay", num: 5 },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className={`flex items-center gap-1 text-xs font-semibold ${step === s.key ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.key ? "bg-primary text-primary-foreground" :
                  ["invoice","compliance","acknowledge","contract","pay"].indexOf(s.key) < ["invoice","compliance","acknowledge","contract","pay"].indexOf(step) ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 4 && <div className="w-4 sm:w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Invoice Step */}
        {step === "invoice" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold">{linkTitle}</h1>
              <p className="text-xs text-muted-foreground">From: {vendorName} · Ref: {refId}</p>
            </div>

            {linkData ? (
              /* Read-only invoice display for saved links */
              <Card className="overflow-hidden border-2 border-primary/20 shadow-xl max-w-md mx-auto">
                <div className="bg-primary px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary-foreground" />
                    <span className="text-sm font-bold text-primary-foreground">TrustLock Invoice</span>
                  </div>
                  <Badge className="bg-primary-foreground/20 text-primary-foreground text-[10px] border-0">
                    Ref: {refId}
                  </Badge>
                </div>
                <div className="p-5 space-y-4 bg-background">
                  <div className="text-center pb-3 border-b border-border">
                    <p className="text-xs text-muted-foreground">Invoice from</p>
                    <p className="font-heading font-bold text-foreground">{vendorName}</p>
                  </div>

                  {/* Line items */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
                    {linkData.invoice_items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-muted-foreground">Qty: {item.quantity} × ${Number(item.unitPrice).toFixed(2)}</p>
                        </div>
                        <span className="font-semibold">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  {linkData.note && (
                    <div className="p-2.5 rounded-lg bg-muted/30 text-xs">
                      <p className="text-muted-foreground font-semibold mb-1">Vendor Note</p>
                      <p>{linkData.note}</p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${linkData.subtotal.toFixed(2)}</span>
                    </div>
                    {linkData.tax_total > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxes & Duties</span>
                        <span className="font-medium">${linkData.tax_total.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-1 mt-1">
                      <span className="font-bold text-sm">Total</span>
                      <span className="font-bold text-sm text-primary">${linkData.grand_total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2"
                    onClick={() => setStep("compliance")}
                  >
                    Proceed to Checkout <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              /* Editable invoice for demo/fallback */
              <StandaloneInvoice
                vendorName={vendorName}
                onProceed={handleInvoiceProceed}
              />
            )}
          </div>
        )}

        {/* Compliance Step */}
        {step === "compliance" && (invoiceData || linkData) && (
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
              amount={invoiceData?.grandTotal ?? linkData?.grand_total ?? 0}
              onClear={handleComplianceClear}
              onBlock={handleComplianceBlock}
            />
          </div>
        )}

        {/* Acknowledgement Step */}
        {step === "acknowledge" && (invoiceData || linkData) && (
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
              industry={linkData?.industry}
              orderAmount={invoiceData?.grandTotal ?? linkData?.grand_total ?? 0}
              vendorName={vendorName}
              buyerName="You"
              txId={refId}
              onAccept={handleAcknowledgementAccept}
              onDecline={() => setStep("invoice")}
            />
          </div>
        )}

        {/* Contract Step */}
        {step === "contract" && (invoiceData || linkData) && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setStep("acknowledge")}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Acknowledgement
            </Button>
            <PreOrderSignatoryContract
              industry={linkData?.industry}
              orderAmount={invoiceData?.grandTotal ?? linkData?.grand_total ?? 0}
              buyerName="You"
              vendorName={vendorName}
              txId={refId}
              isAutoSigned
              onBothSigned={handleContractSigned}
              onDecline={() => setStep("invoice")}
              role="buyer"
            />
          </div>
        )}

        {/* Pay Step */}
        {step === "pay" && (invoiceData || linkData) && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setStep("contract")}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Contract
            </Button>
            <TrustLockOSPay
              role="buyer"
              prefillService={linkTitle}
              prefillAmount={String(invoiceData?.grandTotal ?? linkData?.grand_total ?? 0)}
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

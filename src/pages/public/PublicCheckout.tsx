import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, ArrowLeft, CheckCircle, Copy, LogIn, ExternalLink, Loader2, Download, Handshake } from "lucide-react";
import TransactionDocuments from "@/components/shared/TransactionDocuments";
import IndustryBlueprintCard, { INDUSTRY_MILESTONES } from "@/components/shared/IndustryBlueprintCard";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import StandaloneInvoice from "@/components/shared/StandaloneInvoice";
import InvoiceEscrowCheckout from "@/components/shared/InvoiceEscrowCheckout";
import SanctionsGate from "@/components/shared/SanctionsGate";
import AcknowledgementForm from "@/components/shared/AcknowledgementForm";
import PreOrderSignatoryContract from "@/components/shared/PreOrderSignatoryContract";
import { supabase } from "@/integrations/supabase/client";
import type { TaxLineItem } from "@/components/shared/TaxBreakdown";
import InlineLegalLinks from "@/components/shared/InlineLegalLinks";
import ReturningBuyerBanner from "@/components/shared/ReturningBuyerBanner";
import { isMilestoneIndustryByKey } from "@/lib/industryList";
import OrderIntentRouter, { type IntentDecision } from "@/components/shared/OrderIntentRouter";
import { useBlockchainAnchor } from "@/hooks/useBlockchainAnchor";

import MilestoneNegotiation, { type MilestoneDraft } from "@/components/shared/MilestoneNegotiation";
import MilestoneNegotiationGantt from "@/components/shared/MilestoneNegotiationGantt";



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
  currency: string;
  incoterms: string;
  delivery_terms: string;
}

const PublicCheckout = () => {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<"loading" | "invoice" | "negotiation" | "compliance" | "acknowledge" | "contract" | "pay" | "done" | "vendor_locked">("loading");
  const { anchor: anchorProof } = useBlockchainAnchor();

  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [invoiceData, setInvoiceData] = useState<{
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    note: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [autoSignResult, setAutoSignResult] = useState<{ auto_signed: boolean; contract_id?: string } | null>(null);
  const [lockedVendorName, setLockedVendorName] = useState("");
  const [buyerRecognized, setBuyerRecognized] = useState(false);
  // Milestone negotiation state
  const [negotiationStatus, setNegotiationStatus] = useState<"drafting" | "proposed" | "agreed">("drafting");
  const [agreedMilestones, setAgreedMilestones] = useState<MilestoneDraft[] | null>(null);

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
        setLinkData(null);
        setStep("invoice");
        return;
      }

      // Check if vendor's subscription is locked/expired
      const vendorId = data.vendor_id;
      if (vendorId) {
        const { data: sub } = await supabase
          .from("vendor_subscriptions")
          .select("status, grace_ends_at")
          .eq("vendor_id", vendorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sub && (sub.status === "expired" || sub.status === "locked")) {
          const graceEnd = sub.grace_ends_at ? new Date(sub.grace_ends_at) : null;
          const now = new Date();
          if (!graceEnd || now > graceEnd) {
            setLockedVendorName(data.vendor_name || "This vendor");
            setStep("vendor_locked");
            return;
          }
        }
      }

      setLinkData({
        link_id: data.link_id,
        vendor_name: data.vendor_name || "Vendor",
        title: data.title,
        invoice_items: (data.invoice_items as any[]) || [],
        tax_items: (data.tax_items as unknown as TaxLineItem[]) || [],
        note: data.note || "",
        subtotal: Number(data.subtotal),
        tax_total: Number(data.tax_total),
        grand_total: Number(data.grand_total),
        industry: data.industry || "default",
        currency: (data as any).currency || "USD",
        incoterms: (data as any).incoterms || "",
        delivery_terms: (data as any).delivery_terms || "",
      });

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
    industry?: string;
    currency?: string;
    incoterms?: string;
    deliveryTerms?: string;
    documentGates?: Record<string, string>;
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
    // If buyer was recognized via email/username lookup, skip acknowledgement
    if (buyerRecognized) {
      setStep("contract");
      return;
    }
    setStep("acknowledge");
  }, [buyerRecognized]);

  const handleAcknowledgementAccept = useCallback(async () => {
    // Call auto-signature-protocol to check if vendor auto-signed
    if (linkData) {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-signature-protocol`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              vendor_id: (linkData as any).vendor_id || null,
              transaction_id: (linkData as any).transaction_id || linkData.link_id,
              order_amount: linkData.grand_total,
              industry: linkData.industry,
              buyer_name: "Checkout Buyer",
            }),
          }
        );
        const result = await resp.json();
        setAutoSignResult(result);
      } catch {
        // Fallback — proceed without auto-sign info
        setAutoSignResult(null);
      }
    }
    setStep("contract");
  }, [linkData]);

  const handleContractSigned = useCallback(async () => {
    // If we have a contract_id from auto-signature, update buyer signature
    if (autoSignResult?.contract_id) {
      try {
        await supabase
          .from("pre_order_contracts" as any)
          .update({
            buyer_typed_name: "Checkout Buyer",
            buyer_signed_at: new Date().toISOString(),
            buyer_ip: null, // captured server-side
            status: "fully_signed",
          })
          .eq("id", autoSignResult.contract_id);
      } catch {
        // Non-blocking — proceed to payment
      }
    }
    setStep("pay");
  }, [autoSignResult]);

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

            {/* Free downloadable documents */}
            <TransactionDocuments
              tx={{
                txId: refId,
                vendorName: vendorName,
                buyerName: "You",
                item: linkTitle,
                amount: invoiceData?.grandTotal ?? linkData?.grand_total ?? 0,
                date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                status: "locked",
                industry: linkData?.industry,
                invoiceItems: linkData?.invoice_items,
              }}
            />

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

      <div className="mx-auto w-full max-w-2xl space-y-4 overflow-x-hidden p-4 sm:p-6">
        {/* Returning buyer sign-in prompt */}
        <ReturningBuyerBanner onRecognized={setBuyerRecognized} />

        {/* Steps indicator */}
        {(() => {
          const isMilestone = isMilestoneIndustryByKey(linkData?.industry || "");
          const allSteps = isMilestone
            ? [
                { key: "invoice", label: "Invoice", num: 1 },
                { key: "negotiation", label: "Negotiate", num: 2 },
                { key: "compliance", label: "Compliance", num: 3 },
                { key: "acknowledge", label: "Acknowledge", num: 4 },
                { key: "contract", label: "Sign Contract", num: 5 },
                { key: "pay", label: "Pay", num: 6 },
              ]
            : [
                { key: "invoice", label: "Invoice", num: 1 },
                { key: "compliance", label: "Compliance", num: 2 },
                { key: "acknowledge", label: "Acknowledge", num: 3 },
                { key: "contract", label: "Sign Contract", num: 4 },
                { key: "pay", label: "Pay", num: 5 },
              ];
          const stepKeys = allSteps.map(s => s.key);
          return (
            <div className="flex items-center gap-2 justify-center flex-wrap">
              {allSteps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 text-xs font-semibold ${step === s.key ? "text-primary" : "text-muted-foreground"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step === s.key ? "bg-primary text-primary-foreground" :
                      stepKeys.indexOf(s.key) < stepKeys.indexOf(step) ? "bg-primary text-primary-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>{s.num}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < allSteps.length - 1 && <div className="w-4 sm:w-8 h-px bg-border" />}
                </div>
              ))}
            </div>
          );
        })()}



        {/* Invoice Step */}
        {step === "invoice" && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-lg font-bold">{linkTitle}</h1>
              <p className="text-xs text-muted-foreground">From: {vendorName} · Ref: {refId}</p>
            </div>

            {/* Industry Blueprint — shows buyer what security protocols apply */}
            <IndustryBlueprintCard industry={linkData?.industry} />

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
                    {linkData.industry && linkData.industry !== "default" && (
                      <Badge variant="outline" className="text-[10px] mt-1 capitalize">{linkData.industry.replace(/_/g, " ")}</Badge>
                    )}
                  </div>

                  {/* Trade terms row */}
                  {(linkData.incoterms || linkData.delivery_terms || linkData.currency !== "USD") && (
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {linkData.currency && linkData.currency !== "USD" && (
                        <Badge variant="secondary" className="text-[10px]">Currency: {linkData.currency}</Badge>
                      )}
                      {linkData.incoterms && (
                        <Badge variant="secondary" className="text-[10px]">Incoterms: {linkData.incoterms}</Badge>
                      )}
                      {linkData.delivery_terms && (
                        <Badge variant="secondary" className="text-[10px]">Delivery: {linkData.delivery_terms}</Badge>
                      )}
                    </div>
                  )}

                  {/* Line items */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
                    {linkData.invoice_items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-muted-foreground">
                            Qty: {item.quantity} {item.unit && item.unit !== "Unit" ? item.unit : ""} × {linkData.currency === "USD" ? "$" : linkData.currency + " "}{Number(item.unitPrice).toFixed(2)}
                          </p>
                        </div>
                        <span className="font-semibold">{linkData.currency === "USD" ? "$" : linkData.currency + " "}{(item.quantity * item.unitPrice).toFixed(2)}</span>
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
                    onClick={() => {
                      const isMilestone = isMilestoneIndustryByKey(linkData?.industry || "");
                      setStep(isMilestone ? "negotiation" : "compliance");
                    }}
                  >
                    {isMilestoneIndustryByKey(linkData?.industry || "") ? "Proceed to Milestone Negotiation" : "Proceed to Checkout"} <ExternalLink className="w-4 h-4" />
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

        {/* Milestone Negotiation Step */}
        {step === "negotiation" && linkData && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setStep("invoice")}>
              <ArrowLeft className="w-4 h-4" /> Back to Invoice
            </Button>

            {agreedMilestones ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-primary" /> Milestone Schedule Agreed
                  </p>
                  <MilestoneNegotiationGantt milestones={agreedMilestones} />
                  <div className="space-y-1">
                    {agreedMilestones.filter(m => m.percentage > 0).map((m) => (
                      <div key={m.id} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">{m.title}</span>
                        <span className="font-medium">{m.percentage}% · ${(linkData.grand_total * m.percentage / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-2" onClick={() => setStep("compliance")}>
                    Proceed to Compliance <ExternalLink className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <MilestoneNegotiation
                role="buyer"
                txId={linkData.link_id}
                industry={linkData.industry}
                orderAmount={linkData.grand_total}
                buyerName="Buyer"
                vendorName={linkData.vendor_name}
                status={negotiationStatus}
                proposedBy="vendor"
                existingMilestones={(() => {
                  const key = linkData.industry.replace(/_/g, "-");
                  const templates = INDUSTRY_MILESTONES[key] || INDUSTRY_MILESTONES[linkData.industry] || [];
                  return templates.map((m, i) => ({
                    id: `ms-${i}`,
                    title: m.name,
                    description: m.description || "",
                    percentage: m.percentage,
                    estimatedDays: 14,
                    documentRequired: true,
                    documentName: "",
                  }));
                })()}
                onSubmitDraft={(milestones) => {
                  setAgreedMilestones(milestones);
                  setNegotiationStatus("proposed");
                  toast.success("Milestone schedule locked — proceed to compliance.");
                }}
                onApproveDraft={() => {
                  setNegotiationStatus("agreed");
                  const key = linkData.industry.replace(/_/g, "-");
                  const templates = INDUSTRY_MILESTONES[key] || INDUSTRY_MILESTONES[linkData.industry] || [];
                  const accepted = templates.map((m, i) => ({
                    id: `ms-${i}`,
                    title: m.name,
                    description: m.description || "",
                    percentage: m.percentage,
                    estimatedDays: 14,
                    documentRequired: true,
                    documentName: "",
                  }));
                  setAgreedMilestones(accepted);
                  // Anchor pre-payment event: buyer accepted vendor's preset schedule
                  void anchorProof(
                    null,
                    "counter_proposal_accepted",
                    {
                      link_id: linkData.link_id,
                      vendor_id: (linkData as any).vendor_id || null,
                      vendor_name: linkData.vendor_name,
                      industry: linkData.industry,
                      accepted_by: "buyer",
                      accepted_milestones: accepted,
                      amount: linkData.grand_total,
                      accepted_at: new Date().toISOString(),
                      surface: "standalone_link",
                    },
                    `link:${linkData.link_id}`
                  ).catch((e) => console.warn("[PublicCheckout] counter_proposal_accepted anchor failed:", e));
                  toast.success("Vendor schedule accepted!");
                }}
                onRequestChanges={(note) => {
                  toast.info(`Change requested: ${note}`);
                }}

              />
            )}
          </div>
        )}

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
              vendorName={linkData?.vendor_name}
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
              isAutoSigned={autoSignResult?.auto_signed ?? true}
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
            <InvoiceEscrowCheckout
              vendorName={vendorName}
              invoiceTitle={linkTitle}
              lineItems={(linkData?.invoice_items as any[]) || []}
              subtotal={invoiceData?.subtotal ?? linkData?.subtotal ?? 0}
              taxItems={(linkData?.tax_items as TaxLineItem[]) || []}
              taxTotal={invoiceData?.taxTotal ?? linkData?.tax_total ?? 0}
              grandTotal={invoiceData?.grandTotal ?? linkData?.grand_total ?? 0}
              currency={linkData?.currency || "USD"}
              industry={linkData?.industry}
              vendorId={(linkData as any)?.vendor_id}
              linkId={linkId}
              isTestnet={false}
              onComplete={() => setStep("done")}
            />
          </div>
        )}

        {/* Vendor Locked */}
        {step === "vendor_locked" && (
          <Card className="border-amber-500/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Vendor Temporarily Unavailable</h2>
                <p className="text-sm text-muted-foreground">
                  <strong>{lockedVendorName}</strong> is currently unable to accept new orders through TrustLock. This is typically a temporary billing issue on the vendor's side.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
                <p className="text-xs font-semibold">What you can do:</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">•</span>
                    <span>Contact the vendor directly and let them know their TrustLock payment link is inactive.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">•</span>
                    <span>Check back later — once the vendor resolves their account status, this link will work automatically.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">•</span>
                    <span>Your funds are never at risk — TrustLock only processes payments through active, verified vendors.</span>
                  </li>
                </ul>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Reference: <span className="font-mono">{linkId}</span>
              </p>
            </CardContent>
          </Card>
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
          <InlineLegalLinks />
        </div>
      </div>
    </div>
  );
};

export default PublicCheckout;

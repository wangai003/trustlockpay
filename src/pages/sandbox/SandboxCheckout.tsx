import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, CreditCard, Wallet, Copy, Check, ArrowLeft, CheckCircle,
  FileText, AlertTriangle, PenTool, BookOpen, Loader2, Globe, MapPin,
  Phone, Building2, Lock, Navigation
} from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocodeToCountry, type GpsCountryResult } from "@/lib/gpsCountryDetect";
import { detectTradeScope } from "@/lib/tradeBlocs";
import TradeScopeSelector, { type TradeScope } from "@/components/shared/TradeScopeSelector";
import DualCurrencyPrice from "@/components/shared/DualCurrencyPrice";
import ProviderSearch from "@/components/shared/ProviderSearch";
import type { PaymentProvider } from "@/lib/paymentProviders";
import InternationalBankSelector from "@/components/shared/InternationalBankSelector";
import type { InternationalRegion } from "@/lib/internationalBankData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { SANDBOX_INDUSTRIES, createSandboxOrder, SandboxLiveOrder } from "./sandboxIndustryData";
import { toast } from "sonner";
import { selectProcessor, PROCESSORS, type ProcessorId, type PaymentMethod as FeePaymentMethod } from "@/lib/feeEngine";
import OrderIntentRouter, { type IntentDecision } from "@/components/shared/OrderIntentRouter";
import MilestoneNegotiationGantt from "@/components/shared/MilestoneNegotiationGantt";
import MilestoneNegotiation, { type MilestoneDraft } from "@/components/shared/MilestoneNegotiation";
import { isMilestoneIndustryByKey } from "@/lib/industryList";

type Step = "intent" | "negotiation" | "invoice" | "compliance" | "acknowledgement" | "contract" | "blueprint" | "payment" | "processing" | "confirmation";

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "intent", label: "Intent" },
  { key: "negotiation", label: "Negotiate" },
  { key: "invoice", label: "Invoice" },
  { key: "compliance", label: "Compliance" },
  { key: "acknowledgement", label: "Acknowledgement" },
  { key: "contract", label: "Contract" },
  { key: "blueprint", label: "Blueprint" },
  { key: "payment", label: "Payment" },
  { key: "confirmation", label: "Confirmation" },
];

const SandboxCheckout = () => {
  const { industry } = useParams<{ industry: string }>();
  const navigate = useNavigate();
  const config = SANDBOX_INDUSTRIES.find(i => i.key === industry);

  const isMilestone = isMilestoneIndustryByKey(config?.key || "");
  const [step, setStep] = useState<Step>(isMilestone ? "intent" : "invoice");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCountry, setBuyerCountry] = useState("US");
  const [vendorCountry] = useState("NG"); // Sandbox vendor is always Nigeria
  const [tradeScope, setTradeScope] = useState<TradeScope>("international");
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [payMode, setPayMode] = useState<"africa" | "international">("international");
  const [intlBankSelected, setIntlBankSelected] = useState<string | null>(null);
  const [intlBankRegion, setIntlBankRegion] = useState<InternationalRegion | null>(null);
  const [order, setOrder] = useState<SandboxLiveOrder | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);

  // Milestone negotiation state
  const [negotiationStatus, setNegotiationStatus] = useState<"drafting" | "proposed" | "agreed">("drafting");
  const [agreedMilestones, setAgreedMilestones] = useState<MilestoneDraft[] | null>(null);

  // GPS-enforced Trade Scope
  const { position: gpsPosition, loading: gpsLoading, capturePosition } = useGeolocation();
  const [gpsCountry, setGpsCountry] = useState<GpsCountryResult | null>(null);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [scopeLocked, setScopeLocked] = useState(false);

  // Auto-trigger GPS on mount
  useEffect(() => {
    handleGpsDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGpsDetection = useCallback(async () => {
    setGpsDetecting(true);
    const pos = await capturePosition();
    if (pos) {
      const result = await reverseGeocodeToCountry(pos.latitude, pos.longitude);
      if (result) {
        setGpsCountry(result);
        setBuyerCountry(result.countryCode);
        // Auto-detect scope from GPS country vs vendor country
        const detected = detectTradeScope(result.countryCode, vendorCountry);
        setTradeScope(detected.scope);
        setScopeLocked(true);
        toast.success(`📍 Location verified: ${result.countryName} — Trade scope auto-set to "${detected.scope}"`);
      } else {
        toast.warning("Could not determine your country from GPS. Please select trade scope manually.");
      }
    }
    setGpsDetecting(false);
  }, [capturePosition, vendorCountry]);

  const handleScopeChange = useCallback((scope: TradeScope) => {
    if (scopeLocked) return; // Prevent manual override when GPS-locked
    setTradeScope(scope);
    // Auto-adjust buyer country to match scope for demo purposes
    if (scope === "domestic") {
      setBuyerCountry("NG");
    } else if (scope === "regional") {
      setBuyerCountry("GH");
    } else {
      setBuyerCountry("US");
    }
  }, [scopeLocked]);

  // Map selected provider to legacy paymentMethod string
  const derivedPaymentMethod = useMemo(() => {
    if (!selectedProvider) return paymentMethod;
    const { category, processor, id } = selectedProvider;
    if (category === "crypto_wallet") return processor === "coinbase" ? "usdc" : id.includes("usdt") ? "usdt" : "usdc";
    if (category === "mobile_money") return "mobile_money";
    if (category === "bank_account") return "bank_transfer";
    if (id === "paypal") return "card";
    return "card";
  }, [selectedProvider, paymentMethod]);

  // Compliance
  const [complianceRunning, setComplianceRunning] = useState(false);
  const [compliancePassed, setCompliancePassed] = useState(false);

  // Acknowledgement
  const [ackChecked, setAckChecked] = useState(false);
  const [ackTypedName, setAckTypedName] = useState("");

  // Contract
  const [contractTypedName, setContractTypedName] = useState("");
  const [contractSigned, setContractSigned] = useState(false);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Industry not found</p>
        <Link to="/sandbox/store"><Button className="ml-2">Back</Button></Link>
      </div>
    );
  }

  const subtotal = config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  // Dynamic tax rates based on trade scope + industry
  const SANDBOX_TAX_RATES: Record<string, Record<TradeScope, number>> = {
    ecommerce:     { domestic: 0.075, regional: 0.05, international: 0.075, hybrid: 0.06 },
    real_estate:   { domestic: 0.05, regional: 0.035, international: 0.05, hybrid: 0.045 },
    mining:        { domestic: 0.08, regional: 0.06, international: 0.12, hybrid: 0.10 },
    energy:        { domestic: 0.05, regional: 0.04, international: 0.10, hybrid: 0.08 },
    freelance:     { domestic: 0.025, regional: 0.02, international: 0.025, hybrid: 0.025 },
    agriculture:   { domestic: 0.03, regional: 0.015, international: 0.08, hybrid: 0.05 },
    construction:  { domestic: 0.075, regional: 0.05, international: 0.10, hybrid: 0.08 },
    logistics:     { domestic: 0.05, regional: 0.03, international: 0.08, hybrid: 0.06 },
    automotive:    { domestic: 0.075, regional: 0.05, international: 0.14, hybrid: 0.10 },
    telecommunications: { domestic: 0.075, regional: 0.05, international: 0.075, hybrid: 0.06 },
  };
  const scopeRates = SANDBOX_TAX_RATES[config.key] || { domestic: 0.05, regional: 0.03, international: 0.05, hybrid: 0.04 };
  const taxRate = scopeRates[tradeScope];
  // Regional scope gets tariff reduction (trade bloc benefit)
  const tariffReduction = tradeScope === "regional" ? 0.85 : tradeScope === "domestic" ? 1.0 : 0;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  // Remittance fee: only for cross-border
  const remittanceFee = tradeScope === "domestic" ? 0 : Math.round(taxAmount * 0.02 * 100) / 100;
  const isCryptoPayment = derivedPaymentMethod === "usdc" || derivedPaymentMethod === "usdt";

  // Dynamic processor selection based on buyer country and payment method
  const feeMethod: FeePaymentMethod = isCryptoPayment ? "crypto"
    : derivedPaymentMethod === "mobile_money" ? "mobile_money"
    : derivedPaymentMethod === "bank_transfer" ? "bank_transfer"
    : "card";
  const selectedProcessorId = selectProcessor(buyerCountry, isCryptoPayment, undefined, feeMethod);
  const selectedProcessor = PROCESSORS[selectedProcessorId];

  const platformFee = Math.round(subtotal * 0.005 * 100) / 100;
  const rawProcessorFee = isCryptoPayment ? 0 : Math.round(subtotal * (selectedProcessor.feeRate / 100) * 100) / 100;
  const combinedProcessorFee = Math.round((platformFee + rawProcessorFee) * 100) / 100;
  const escrowServiceFee = Math.round(subtotal * 0.01 * 100) / 100;
  const totalTaxes = Math.round((taxAmount + remittanceFee) * 100) / 100;
  const totalFees = combinedProcessorFee;
  const grandTotal = Math.round((subtotal + totalFees + totalTaxes) * 100) / 100;
  const fee = totalFees + totalTaxes;

  // Step index calculation moved to inline stepper render

  const handleProceedFromInvoice = () => {
    if (!buyerName.trim() || !buyerEmail.trim()) return;
    setStep("compliance");
    setComplianceRunning(true);
    setTimeout(() => { setComplianceRunning(false); setCompliancePassed(true); }, 2000);
  };

  const handleSignAck = () => {
    if (!ackChecked || ackTypedName.trim().toLowerCase() !== buyerName.trim().toLowerCase()) {
      toast.error("Please check the box and type your full name exactly as entered.");
      return;
    }
    setStep("contract");
  };

  const handleSignContract = () => {
    if (contractTypedName.trim().toLowerCase() !== buyerName.trim().toLowerCase()) {
      toast.error("Type your full name exactly to sign the contract.");
      return;
    }
    setContractSigned(true);
    setStep("blueprint");
  };

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      const newOrder = createSandboxOrder(
        config, buyerName.trim(), buyerEmail.trim(),
        selectedProvider ? selectedProvider.name : derivedPaymentMethod === "card" ? "Card (Visa ****4242)" : derivedPaymentMethod === "usdc" ? "USDC (Polygon)" : "USDT (Polygon)"
      );
      setOrder(newOrder);
      setStep("confirmation");
    }, 2500);
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const goBack = (target: Step) => setStep(target);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">TrustLock Checkout</span>
          </div>
          <Badge variant="outline" className="text-[10px]">🧪 Sandbox</Badge>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Progress stepper — filter out intent/negotiation for non-milestone industries */}
        {(() => {
          const visibleSteps = isMilestone ? STEP_LABELS : STEP_LABELS.filter(s => s.key !== "intent" && s.key !== "negotiation");
          const currentIdx = visibleSteps.findIndex(s => s.key === step);
          const activeIdx = step === "processing" ? visibleSteps.findIndex(s => s.key === "payment") : currentIdx;
          return (
            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
              {visibleSteps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-1 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    i < activeIdx ? "bg-primary text-primary-foreground" :
                    i === activeIdx ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i < activeIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] ${i <= activeIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                  {i < visibleSteps.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
                </div>
              ))}
            </div>
          );
        })()}

        <AnimatePresence mode="wait">
          {/* ─── PRE-STEP: Order Intent Router (Milestone Industries Only) ─── */}
          {step === "intent" && config && (
            <motion.div key="intent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Pre-Escrow — Choose Your Path
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-4">
                      Before payment, both parties must agree on the milestone schedule.
                      The vendor has pre-configured a schedule below — you can accept, negotiate, or request a custom quote.
                    </p>
                    <OrderIntentRouter
                      industry={config.key}
                      industryLabel={config.label}
                      vendorName={config.vendorName}
                      subtotal={config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)}
                      presetMilestones={config.milestones}
                      hasFixedPrice={true}
                      rfqEnabled={true}
                      onDecision={(decision: IntentDecision) => {
                        if (decision === "accept") {
                          // Lock vendor presets as agreed milestones
                          const locked: MilestoneDraft[] = config.milestones
                            .filter(m => m.percentage > 0)
                            .map((m, i) => ({
                              id: `ms-preset-${i}`,
                              title: m.title,
                              description: m.documentGate ? `Document gate: ${m.documentGate}` : "",
                              percentage: m.percentage,
                              estimatedDays: 14 + i * 7,
                              documentRequired: !!m.documentGate,
                              documentName: m.documentGate || "",
                            }));
                          setAgreedMilestones(locked);
                          setNegotiationStatus("agreed");
                          toast.success("✅ Vendor schedule accepted! Proceeding to invoice.");
                          setStep("invoice");
                        } else if (decision === "counter") {
                          setStep("negotiation");
                        } else if (decision === "rfq") {
                          toast.info("📨 RFQ submitted to vendor. In production, the vendor would respond via CRM with a proforma invoice.");
                          // For sandbox, simulate vendor responding and go to negotiation
                          setTimeout(() => {
                            toast.success("📋 Vendor responded with a quote. Now negotiate milestones.");
                            setStep("negotiation");
                          }, 1500);
                        }
                      }}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Link to={`/sandbox/store/${config.key}`}>
                    <Button variant="outline" size="sm"><ArrowLeft className="w-3 h-3 mr-1" />Back to Store</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── PRE-STEP 2: Milestone Negotiation ─── */}
          {step === "negotiation" && config && (
            <motion.div key="negotiation" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-4">
                <MilestoneNegotiation
                  role="buyer"
                  txId={`SBX-DRAFT-${Date.now().toString(36)}`}
                  industry={config.label}
                  orderAmount={config.items.reduce((s, i) => s + i.qty * i.unitPrice, 0)}
                  buyerName="Sandbox Buyer"
                  vendorName={config.vendorName}
                  status={negotiationStatus}
                  proposedBy={negotiationStatus === "proposed" ? "vendor" : undefined}
                  existingMilestones={
                    config.milestones
                      .filter(m => m.percentage > 0)
                      .map((m, i) => ({
                        id: `ms-neg-${i}`,
                        title: m.title,
                        description: m.documentGate ? `Document gate: ${m.documentGate}` : "",
                        percentage: m.percentage,
                        estimatedDays: 14 + i * 7,
                        documentRequired: !!m.documentGate,
                        documentName: m.documentGate || "",
                      }))
                  }
                  onSubmitDraft={(milestones) => {
                    setNegotiationStatus("proposed");
                    toast.info("📤 Proposal sent to vendor for review...");
                    // Simulate vendor auto-approval after 2s
                    setTimeout(() => {
                      setAgreedMilestones(milestones);
                      setNegotiationStatus("agreed");
                      toast.success("🤝 Vendor approved! Milestone schedule locked.");
                    }, 2000);
                  }}
                  onApproveDraft={() => {
                    setAgreedMilestones(
                      config.milestones
                        .filter(m => m.percentage > 0)
                        .map((m, i) => ({
                          id: `ms-agreed-${i}`,
                          title: m.title,
                          description: m.documentGate ? `Document gate: ${m.documentGate}` : "",
                          percentage: m.percentage,
                          estimatedDays: 14 + i * 7,
                          documentRequired: !!m.documentGate,
                          documentName: m.documentGate || "",
                        }))
                    );
                    setNegotiationStatus("agreed");
                    toast.success("🤝 Milestones locked!");
                  }}
                  onRequestChanges={(note) => {
                    toast.info(`📝 Change request sent: "${note}". Vendor will revise.`);
                    setNegotiationStatus("drafting");
                  }}
                />

                {negotiationStatus === "agreed" && (
                  <Button onClick={() => setStep("invoice")} className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                    Continue to Invoice Review →
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={() => setStep("intent")}>
                  <ArrowLeft className="w-3 h-3 mr-1" />Back to Path Selection
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 1: Invoice Review ─── */}
          {step === "invoice" && (
            <motion.div key="invoice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> {isMilestone ? "Step 3" : "Step 1"} — Invoice Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Agreed Milestones Summary (if negotiated) */}
                  {agreedMilestones && agreedMilestones.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <p className="text-xs font-semibold text-foreground">Locked Milestone Schedule</p>
                        <Badge className="text-[9px] bg-primary/10 text-primary">{agreedMilestones.length} stages</Badge>
                      </div>
                      <MilestoneNegotiationGantt milestones={agreedMilestones} />
                      <div className="space-y-1">
                        {agreedMilestones.map((m, i) => (
                          <div key={m.id} className="flex justify-between text-[10px]">
                            <span>{i + 1}. {m.title}</span>
                            <span className="font-medium">{m.percentage}% · ${((subtotal * m.percentage) / 100).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-foreground">Vendor: {config.vendorName}</p>
                    <p className="text-[10px] text-muted-foreground">Industry: {config.label}</p>
                    <Separator className="my-2" />
                    {config.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span>{item.qty} {item.unit} — {item.name}</span>
                        <span className="font-medium">${(item.qty * item.unitPrice).toLocaleString()}</span>
                      </div>
                    ))}
                    <Separator className="my-2" />
                    <div className="flex justify-between text-xs items-center"><span className="text-muted-foreground">Subtotal</span><DualCurrencyPrice amount={subtotal} countryCode={buyerCountry} variant="compact" /></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Processor Fee{isCryptoPayment ? "" : ` (${selectedProcessor.name})`}</span><span>{isCryptoPayment ? "$0.00 — Direct" : `$${combinedProcessorFee.toLocaleString()}`}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxes & Duties ({(taxRate * 100).toFixed(1)}%{remittanceFee > 0 ? ` + $${remittanceFee.toFixed(2)} remittance` : ""})</span><span>${totalTaxes.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Escrow Service Fee (1.0%)</span><span className="text-muted-foreground italic">Deducted at release</span></div>
                    <div className="flex justify-between items-center text-sm font-bold pt-1">
                      <span>Total Due Now</span>
                      <DualCurrencyPrice amount={grandTotal} countryCode={buyerCountry} variant="primary" />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{config.invoiceNote}</p>

                  <Separator />
                  <p className="text-xs font-semibold text-foreground">Buyer Information</p>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Jane Mensah" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="jane@example.com" />
                  </div>

                  {/* GPS Location Verification */}
                  <div className={`rounded-lg p-3 space-y-2 border ${scopeLocked ? "bg-primary/5 border-primary/20" : gpsDetecting ? "bg-muted/50 border-border" : "bg-accent/5 border-accent/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Navigation className={`w-3.5 h-3.5 ${scopeLocked ? "text-primary" : "text-accent"}`} />
                        <span className="text-[10px] font-semibold">Location Verification</span>
                        {scopeLocked && <Lock className="w-3 h-3 text-primary" />}
                      </div>
                      {!scopeLocked && !gpsDetecting && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={handleGpsDetection}>
                          <MapPin className="w-3 h-3 mr-1" />Retry GPS
                        </Button>
                      )}
                    </div>
                    {gpsDetecting && (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-[10px] text-muted-foreground">Detecting your location…</span>
                      </div>
                    )}
                    {gpsCountry && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-foreground">📍 <strong>{gpsCountry.countryName}</strong>{gpsCountry.city ? `, ${gpsCountry.city}` : ""}</p>
                        <p className="text-[9px] text-muted-foreground">Coordinates: {gpsCountry.latitude.toFixed(4)}, {gpsCountry.longitude.toFixed(4)}</p>
                      </div>
                    )}
                    {!gpsCountry && !gpsDetecting && (
                      <p className="text-[9px] text-accent">⚠️ GPS unavailable. Trade scope is manually selectable but may trigger admin review.</p>
                    )}
                  </div>

                  {/* Trade Scope Selector — locked when GPS verified */}
                  <TradeScopeSelector
                    value={tradeScope}
                    onChange={handleScopeChange}
                    buyerCountry={buyerCountry}
                    vendorCountry={vendorCountry}
                    autoSet={false}
                    locked={scopeLocked}
                    lockedLabel={gpsCountry ? `Verified: ${gpsCountry.countryName}` : undefined}
                  />

                  {/* Dynamic corridor info based on scope */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">🌍 Trade Corridor {scopeLocked ? "(GPS-Verified)" : "(Sandbox Demo)"}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Buyer Location</span>
                      <span>{gpsCountry ? `${gpsCountry.countryName}` : buyerCountry === "NG" ? "🇳🇬 Nigeria" : buyerCountry === "GH" ? "🇬🇭 Ghana" : "🇺🇸 United States"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Vendor Location</span>
                      <span>🇳🇬 Nigeria</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Trade Scope</span>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[9px] capitalize">{tradeScope}</Badge>
                        {scopeLocked && <Lock className="w-2.5 h-2.5 text-primary" />}
                      </div>
                    </div>
                    {tradeScope === "regional" && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Trade Bloc</span>
                        <Badge className="text-[9px] bg-accent/20 text-accent">ECOWAS — Tariff Reduced</Badge>
                      </div>
                    )}
                    {tradeScope === "domestic" && (
                      <p className="text-[9px] text-muted-foreground mt-1">✅ Domestic trade — minimal docs, no import duties.</p>
                    )}
                    {tradeScope === "hybrid" && (
                      <p className="text-[9px] text-muted-foreground mt-1">⚙️ Hybrid — domestic sale with imported inputs. External fee tracker enabled.</p>
                    )}
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">Tax Rate ({config.label})</span>
                      <span className="font-medium">{(taxRate * 100).toFixed(1)}%</span>
                    </div>
                    {remittanceFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Remittance Fee</span>
                        <span>${remittanceFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/sandbox/store/${config.key}`}>
                      <Button variant="outline" size="sm"><ArrowLeft className="w-3 h-3 mr-1" />Back</Button>
                    </Link>
                    <Button onClick={handleProceedFromInvoice} disabled={!buyerName.trim() || !buyerEmail.trim()} className="flex-1">
                      Continue → Compliance Screening
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 2: Compliance / Sanctions Screening ─── */}
          {step === "compliance" && (
            <motion.div key="compliance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Step 2 — Compliance & Sanctions Screening
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    TrustLock screens all parties against OFAC, EU, and UN sanctions lists before any funds are locked. This is an automated, mandatory gate.
                  </p>

                  {complianceRunning ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-sm font-medium">Running AML / Sanctions Check…</p>
                      <div className="text-[10px] text-muted-foreground space-y-0.5 text-center">
                        <p>🔍 Checking OFAC SDN List…</p>
                        <p>🔍 Checking EU Consolidated Sanctions…</p>
                        <p>🔍 Checking UN Security Council List…</p>
                      </div>
                    </div>
                  ) : compliancePassed ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-800">Screening Passed</p>
                        <p className="text-[10px] text-green-700 mt-1">No matches found on OFAC, EU, or UN lists.</p>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Buyer</span><span>{buyerName}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{buyerEmail}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Screening Result</span><Badge className="bg-green-100 text-green-700 text-[9px]">CLEAR</Badge></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">AML Certificate</span><span>Auto-archived (7-yr retention)</span></div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => goBack("invoice")}>Back</Button>
                    <Button onClick={() => setStep("acknowledgement")} disabled={!compliancePassed} className="flex-1">
                      Continue → Acknowledgement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 3: Acknowledgement Form ─── */}
          {step === "acknowledgement" && (
            <motion.div key="acknowledgement" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenTool className="w-4 h-4" /> Step 3 — Escrow Acknowledgement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    This one-time onboarding gate confirms you understand the escrow process. Your IP address is recorded for verification.
                  </p>

                  <div className="bg-muted/50 rounded-lg p-3 text-[11px] space-y-2 max-h-40 overflow-y-auto border border-border">
                    <p className="font-semibold text-foreground">TrustLock Escrow Acknowledgement</p>
                    <p>By signing below, I, the Buyer, acknowledge and agree:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Funds will be locked in a TrustLock escrow account upon payment.</li>
                      <li>Funds will only be released to the Vendor upon completion of agreed milestones.</li>
                      <li>Disputes must be filed within 7 days of delivery confirmation.</li>
                      <li>For disputes ≥ $10,000, arbitration incurs a flat TrustLock Case Management Fee ($500 – $5,000 based on escrow size). Arbitrator professional fees are separate.</li>
                      <li>GPS location may be captured during milestone completion for physical-industry orders and resolved to a street address for audit/compliance purposes.</li>
                      <li>I agree to TrustLock's Terms of Service and Escrow Protection Policy.</li>
                      <li>Industry: <strong>{config.label}</strong> — milestone-based escrow applies.</li>
                      <li>A PDF receipt of this acknowledgement is available for download (free in sandbox).</li>
                    </ul>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox checked={ackChecked} onCheckedChange={(v) => setAckChecked(v === true)} id="ack-check" />
                    <label htmlFor="ack-check" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                      I have read and agree to the Escrow Acknowledgement terms above.
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Type your full name to sign</Label>
                    <Input
                      value={ackTypedName}
                      onChange={e => setAckTypedName(e.target.value)}
                      placeholder={buyerName}
                      className="font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground">Must match: {buyerName}</p>
                  </div>

                  <div className="bg-muted/30 rounded p-2 text-[9px] text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> IP Address: 192.168.1.xxx (simulated) · Timestamp: {new Date().toISOString()}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => goBack("compliance")}>Back</Button>
                    <Button
                      onClick={handleSignAck}
                      disabled={!ackChecked || !ackTypedName.trim()}
                      className="flex-1"
                    >
                      Sign & Continue → Contract
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 4: Pre-Order Signatory Contract ─── */}
          {step === "contract" && (
            <motion.div key="contract" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Step 4 — Pre-Order Signatory Contract
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Both buyer and vendor must sign this contract before funds are locked. In production, the vendor's signature may be auto-applied if they have opted into TrustLock's auto-signature protocol.
                  </p>

                  <div className="bg-muted/50 rounded-lg p-3 text-[11px] space-y-2 max-h-48 overflow-y-auto border border-border">
                    <p className="font-semibold text-foreground">PRE-ORDER SIGNATORY CONTRACT</p>
                    <p className="text-muted-foreground">Contract Ref: SBX-CTR-{Date.now().toString(36).toUpperCase()}</p>
                    <Separator className="my-1" />
                    <p><strong>Parties:</strong></p>
                    <p>Buyer: {buyerName} ({buyerEmail})</p>
                    <p>Vendor: {config.vendorName}</p>
                    <p>Industry: {config.label}</p>
                    <Separator className="my-1" />
                    <p><strong>Order Summary:</strong></p>
                    {config.items.map((item, i) => (
                      <p key={i}>• {item.qty} {item.unit} — {item.name} — ${(item.qty * item.unitPrice).toLocaleString()}</p>
                    ))}
                    <p><strong>Total: ${grandTotal.toLocaleString()}</strong> (incl. processor fee{!isCryptoPayment ? ` (${selectedProcessor.name})` : " (Direct)"} + 1.0% escrow service fee at release)</p>
                    <Separator className="my-1" />
                    <p><strong>Terms:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      <li>Escrow release follows the {config.milestones.length}-milestone schedule defined for {config.label}.</li>
                      <li>Document gates must be satisfied before milestone advancement.</li>
                      <li>GPS location verification is required for physical-industry milestone completion.</li>
                      <li>Disputes must be filed within 7 days of delivery confirmation.</li>
                      <li>For escrow ≥ $10,000, arbitration incurs a flat Case Management Fee: $10K–$50K → $500 · $50K–$250K → $1,500 · $250K–$1M → $3,000 · $1M+ → $5,000. Arbitrator professional fees are separate.</li>
                      <li>This contract is archived for 7 years per TrustLock compliance policy.</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-[10px] text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Vendor signature: <strong>AUTO-SIGNED by TrustLock Protocol</strong> (vendor has opted in)</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Buyer Signature — Type your full name</Label>
                    <Input
                      value={contractTypedName}
                      onChange={e => setContractTypedName(e.target.value)}
                      placeholder={buyerName}
                      className="font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground">Must match: {buyerName}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => goBack("acknowledgement")}>Back</Button>
                    <Button
                      onClick={handleSignContract}
                      disabled={!contractTypedName.trim()}
                      className="flex-1"
                    >
                      Sign Contract → View Blueprint
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 5: Industry Blueprint ─── */}
          {step === "blueprint" && (
            <motion.div key="blueprint" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Step 5 — Industry Blueprint
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Review the full protocol for your order. This blueprint shows exactly how your escrow will be managed.
                  </p>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{config.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{config.label} Blueprint</p>
                        <p className="text-[10px] text-muted-foreground">{config.milestones.length} milestones · {config.documents.length} required documents</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold mb-2">Milestone Schedule</p>
                      {config.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{i + 1}</div>
                          <div className="flex-1">
                            <p className="text-xs font-medium">{m.title}</p>
                            {m.documentGate && <p className="text-[9px] text-muted-foreground">📄 Gate: {m.documentGate}</p>}
                          </div>
                          <Badge variant="outline" className="text-[9px]">{m.percentage}%</Badge>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    <div>
                      <p className="text-xs font-semibold mb-2">Required Documents</p>
                      {config.documents.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 py-1 text-xs">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="flex-1">{d.name}</span>
                          <Badge variant="outline" className="text-[8px]">
                            {d.owner === "vendor" ? "(V) Vendor" : d.owner === "buyer" ? "(B) Buyer" : "(V/B) Either"}
                          </Badge>
                          {d.required && <Badge className="text-[8px] bg-destructive/10 text-destructive border-destructive/20">Required</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => goBack("contract")}>Back</Button>
                    <Button onClick={() => setStep("payment")} className="flex-1">
                      Proceed to Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── STEP 6: Payment ─── */}
          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Step 6 — Select Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dual-Mode Toggle: Africa / International */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setPayMode("africa"); setSelectedProvider(null); }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-colors text-xs font-medium ${payMode === "africa" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                    >
                      <MapPin className="w-4 h-4" /> Africa
                    </button>
                    <button
                      onClick={() => { setPayMode("international"); setSelectedProvider(null); }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-colors text-xs font-medium ${payMode === "international" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                    >
                      <Globe className="w-4 h-4" /> International
                    </button>
                  </div>

                  {/* Searchable Payment Provider */}
                  <ProviderSearch
                    mode={payMode === "africa" ? "local" : "diaspora"}
                    onSelect={(p) => { setSelectedProvider(p); setIntlBankSelected(null); setIntlBankRegion(null); }}
                    selected={selectedProvider}
                  />

                  {/* International Bank Selector — shown when bank_account provider selected in international mode */}
                  {payMode === "international" && selectedProvider?.category === "bank_account" && (
                    <InternationalBankSelector
                      onBankSelected={(bank, region) => { setIntlBankSelected(bank); setIntlBankRegion(region); }}
                      selectedBank={intlBankSelected}
                      onClear={() => { setIntlBankSelected(null); setIntlBankRegion(null); }}
                    />
                  )}

                  <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Processor Fee{isCryptoPayment ? "" : ` (${selectedProcessor.name})`}</span><span>{isCryptoPayment ? "$0.00 — Direct" : `$${combinedProcessorFee.toLocaleString()}`}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxes & Duties ({(taxRate * 100).toFixed(1)}%)</span><span>${totalTaxes.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Escrow Service Fee (1.0%)</span><span className="text-muted-foreground italic">At release</span></div>
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold"><span>Total Due Now</span><span>${grandTotal.toLocaleString()}</span></div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-[10px] text-green-700 space-y-0.5">
                    <p>✅ Compliance: Passed</p>
                    <p>✅ Acknowledgement: Signed</p>
                    <p>✅ Contract: Dual-signed</p>
                    <p>✅ Blueprint: Reviewed</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => goBack("blueprint")}>Back</Button>
                    <Button onClick={handlePay} className="flex-1">
                      Pay ${(subtotal + fee).toLocaleString()} — Simulated
                    </Button>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    🧪 No real payment will be charged. This is a sandbox simulation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── Processing ─── */}
          {step === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground">Processing Payment…</p>
              <p className="text-xs text-muted-foreground mt-1">Locking funds in escrow · Archiving documents · Anchoring to blockchain</p>
            </motion.div>
          )}

          {/* ─── STEP 7: Confirmation ─── */}
          {step === "confirmation" && order && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <h2 className="text-lg font-bold text-foreground">Payment Successful!</h2>
                    <p className="text-sm text-muted-foreground">Funds are now locked in escrow</p>
                  </div>

                  <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Order Number</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm">{order.orderNumber}</span>
                        <button onClick={() => copyText(order.orderNumber, "Order #")} className="p-1 hover:bg-muted rounded">
                          {copied === "Order #" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Confirmation Code</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-sm">{order.confirmationCode}</span>
                        <button onClick={() => copyText(order.confirmationCode, "Code")} className="p-1 hover:bg-muted rounded">
                          {copied === "Code" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                    <Separator />
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{order.industryLabel}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{order.vendorName}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span>{order.paymentMethod}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">${order.total.toLocaleString()}</span></div>
                    </div>
                  </div>

                  <div className="bg-muted/50 border border-border rounded-lg p-3 text-[10px] text-muted-foreground space-y-0.5">
                    <p className="font-semibold text-foreground text-xs mb-1">📁 Archived Documents (7-Year Retention)</p>
                    <p>• Escrow Acknowledgement Form — Signed</p>
                    <p>• Pre-Order Signatory Contract — Dual-Signed</p>
                    <p>• AML Screening Certificate — CLEAR</p>
                    <p>• Industry Blueprint — {config.label}</p>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-primary">📋 What Happens Next?</p>
                    <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Copy your <strong>Order Number</strong> above</li>
                      <li>Go to <strong>Sandbox Login</strong> and enter as <strong>Buyer</strong></li>
                      <li>Open the <strong>Overview</strong> page and enter your Order Number to claim it</li>
                      <li>Track milestones and confirm deliverables as the vendor progresses</li>
                      <li>The <strong>Vendor</strong> login shows all orders for fulfillment</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Link to="/sandbox/store" className="flex-1">
                      <Button variant="outline" className="w-full">Browse More Industries</Button>
                    </Link>
                    <Link to="/sandbox/login" className="flex-1">
                      <Button className="w-full">Go to Sandbox Dashboard →</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SandboxCheckout;

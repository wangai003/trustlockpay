import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, CreditCard, Wallet, Copy, Check, ArrowLeft, CheckCircle,
  FileText, AlertTriangle, PenTool, BookOpen, Loader2, Globe, MapPin,
  Phone, Building2
} from "lucide-react";
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

type Step = "invoice" | "compliance" | "acknowledgement" | "contract" | "blueprint" | "payment" | "processing" | "confirmation";

const STEP_LABELS: { key: Step; label: string }[] = [
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

  const [step, setStep] = useState<Step>("invoice");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCountry] = useState("US"); // Hardcoded: USA buyer
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [payMode, setPayMode] = useState<"africa" | "international">("international");
  const [intlBankSelected, setIntlBankSelected] = useState<string | null>(null);
  const [intlBankRegion, setIntlBankRegion] = useState<InternationalRegion | null>(null);
  const [order, setOrder] = useState<SandboxLiveOrder | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);

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

  // USA-Nigeria international corridor tax/tariff estimate
  const SANDBOX_TAX_RATES: Record<string, number> = {
    ecommerce: 0.075,      // 7.5% VAT
    real_estate: 0.05,      // 5% property transfer tax
    mining: 0.12,           // 12% royalty + export levy
    energy: 0.10,           // 10% petroleum levy
    freelance: 0.025,       // 2.5% withholding tax
  };
  const taxRate = SANDBOX_TAX_RATES[config.key] || 0.05;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const remittanceFee = Math.round(taxAmount * 0.02 * 100) / 100; // 2% remittance processing
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

  const currentStepIdx = STEP_LABELS.findIndex(s => s.key === step);
  const effectiveStepIdx = step === "processing" ? 5 : currentStepIdx;

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
        {/* Progress stepper */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {STEP_LABELS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                i < effectiveStepIdx ? "bg-primary text-primary-foreground" :
                i === effectiveStepIdx ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < effectiveStepIdx ? "✓" : i + 1}
              </div>
              <span className={`text-[10px] ${i <= effectiveStepIdx ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              {i < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-border mx-0.5" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Invoice Review ─── */}
          {step === "invoice" && (
            <motion.div key="invoice" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Step 1 — Invoice Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Processor Fee{isCryptoPayment ? "" : ` (${selectedProcessor.name})`}</span><span>{isCryptoPayment ? "$0.00 — Direct" : `$${combinedProcessorFee.toLocaleString()}`}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Taxes & Duties ({(taxRate * 100).toFixed(1)}% + {remittanceFee > 0 ? `$${remittanceFee.toFixed(2)} remittance` : "remittance"})</span><span>${totalTaxes.toLocaleString()}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Escrow Service Fee (1.0%)</span><span className="text-muted-foreground italic">Deducted at release</span></div>
                    <div className="flex justify-between text-sm font-bold pt-1"><span>Total Due Now</span><span>${grandTotal.toLocaleString()}</span></div>
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

                  {/* Hardcoded corridor info */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-foreground">🌍 Trade Corridor (Sandbox Demo)</p>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Buyer Location</span><span>🇺🇸 United States</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Vendor Location</span><span>🇳🇬 Nigeria</span></div>
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Trade Scope</span><Badge variant="outline" className="text-[9px]">International</Badge></div>
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

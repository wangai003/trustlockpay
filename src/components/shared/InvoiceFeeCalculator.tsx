import { Shield, Info, AlertTriangle } from "lucide-react";
import { calculateInvoiceFees, type ProcessorId, PROCESSORS, INVOICE_MANDATORY_DISCLOSURE } from "@/lib/feeEngine";
import { useState } from "react";

interface InvoiceFeeCalculatorProps {
  escrowPrincipal: number;
  processorId: ProcessorId;
  isCrypto: boolean;
  taxAmount?: number;
  currency?: string;
}

const InvoiceFeeCalculator = ({
  escrowPrincipal,
  processorId,
  isCrypto,
  taxAmount = 0,
  currency = "USD",
}: InvoiceFeeCalculatorProps) => {
  const [showDisclosure, setShowDisclosure] = useState(false);

  if (escrowPrincipal <= 0) return null;

  const calc = calculateInvoiceFees(escrowPrincipal, processorId, isCrypto, taxAmount);
  const processorName = PROCESSORS[processorId]?.name ?? "Direct";

  return (
    <div className="space-y-2">
      {/* Fee breakdown */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 text-xs border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Fee Breakdown</p>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Escrow Principal (vendor receives)</span>
          <span className="font-semibold text-foreground">{currency} {escrowPrincipal.toFixed(2)}</span>
        </div>

        <div className="border-t border-border/50 pt-1 mt-1">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">Fees added to your total:</p>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform Fee ({isCrypto ? "1.0%" : "1.5%"})</span>
          <span className="text-muted-foreground">+{currency} {calc.platformFee.toFixed(2)}</span>
        </div>

        {calc.processorFee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processor Fee ({processorName} {PROCESSORS[processorId]?.feeRate}%)</span>
            <span className="text-muted-foreground">+{currency} {calc.processorFee.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Escrow Service Fee (1.0%)</span>
          <span className="text-muted-foreground">+{currency} {calc.escrowFee.toFixed(2)}</span>
        </div>

        {calc.taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxes & Tariffs</span>
            <span className="text-muted-foreground">+{currency} {calc.taxAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-muted-foreground">Internal Gas Fees</span>
          <span className="text-primary font-medium">Covered by TrustLock</span>
        </div>

        <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
          <span className="font-bold text-sm text-foreground">Total You Pay</span>
          <span className="font-bold text-sm text-primary">{currency} {calc.totalBuyerCharge.toFixed(2)}</span>
        </div>
      </div>

      {/* Refund disclosure */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
          <strong>Refund Policy:</strong> If a refund is issued before work begins, you receive 100% of the escrow principal
          ({currency} {escrowPrincipal.toFixed(2)}) plus the pre-paid escrow fee ({currency} {calc.escrowFee.toFixed(2)}).
          Only minimal network gas fees (~$0.02–$0.05) apply. No TrustLock service fees on refunds.
        </div>
      </div>

      {/* Mandatory disclosure toggle */}
      <button
        onClick={() => setShowDisclosure(!showDisclosure)}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <AlertTriangle className="w-3 h-3" />
        <span className="font-semibold uppercase tracking-wider">
          {showDisclosure ? "Hide" : "View"} Full Fee Transparency Notice
        </span>
      </button>

      {showDisclosure && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border text-[10px] text-muted-foreground leading-relaxed whitespace-pre-line">
          {INVOICE_MANDATORY_DISCLOSURE}
        </div>
      )}
    </div>
  );
};

export default InvoiceFeeCalculator;

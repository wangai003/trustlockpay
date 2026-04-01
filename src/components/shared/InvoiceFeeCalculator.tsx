import { Shield, Info, AlertTriangle, Wallet, Zap } from "lucide-react";
import { calculateInvoiceFees, type ProcessorId, PROCESSORS, INVOICE_MANDATORY_DISCLOSURE, FEE_CATEGORIES, ALL_IN_RANGES, AZIX_WALLETS } from "@/lib/feeEngine";
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
  const isDirect = processorId === "direct";

  return (
    <div className="space-y-2">
      {/* Fee breakdown */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 text-xs border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Fee Breakdown</p>
          {isCrypto && (
            <span className="ml-auto text-[9px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              CRYPTO-TO-CRYPTO
            </span>
          )}
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

        {isDirect && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processor Fee</span>
            <span className="text-primary font-medium">$0.00 — Direct On-Chain</span>
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

        {isCrypto && (
          <div className="text-[10px] text-muted-foreground pt-1">
            All-in rate: <strong className="text-foreground">{ALL_IN_RANGES.cryptoDirect.range}</strong> (Platform {FEE_CATEGORIES.platform.crypto.display} transaction fee — no separate escrow deposit)
          </div>
        )}
      </div>

      {/* Crypto-specific wallet routing disclosure */}
      {isCrypto && (
        <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/30">
          <div className="flex items-start gap-2">
            <Wallet className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <div className="text-[10px] text-foreground leading-relaxed space-y-1">
              <p><strong>Crypto-to-Crypto Wallet Routing</strong></p>
              <p>• <strong>Transaction Wallet</strong>: Receives platform fee ({currency} {calc.platformFee.toFixed(2)}){calc.taxAmount > 0 ? ` + taxes (${currency} ${calc.taxAmount.toFixed(2)})` : ""} at checkout.</p>
              <p>• <strong>Escrow Wallet</strong>: Receives principal ({currency} {escrowPrincipal.toFixed(2)}) + escrow fee ({currency} {calc.escrowFee.toFixed(2)}) — held until release or refund.</p>
              <p>• <strong>No Processor Fee</strong>: Direct on-chain {isDirect ? "USDC/USDT" : processorName} transfers bypass third-party processor fees entirely.</p>
            </div>
          </div>
        </div>
      )}

      {/* Gas fee education */}
      <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-[10px] text-muted-foreground leading-relaxed space-y-1">
            <p><strong className="text-foreground">Gas Fees: $0 to You</strong> Gas fees are small blockchain network costs — like postage stamps for on-chain transfers. TrustLock absorbs ALL gas fees so you never pay them.</p>
            <p>• <strong>Checkout & Release:</strong> $0 — gas covered by TrustLock platform revenue</p>
            <p>• <strong>Refunds:</strong> $0 — gas absorbed from the pre-paid 1% escrow service fee</p>
            <p>• <strong>Split Payouts:</strong> $0 — gas absorbed from the pre-paid 1% escrow service fee</p>
            {isCrypto && (
              <p className="pt-1 border-t border-border/50 mt-1">
                <strong className="text-foreground">How it works:</strong> When funds are released, refunded, or split, any blockchain gas cost is deducted from the escrow fee balance <em>before</em> the remainder reaches the TrustLock fee/revenue wallet — not from your escrow principal or payout.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Refund disclosure */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <div className="text-[10px] text-foreground leading-relaxed">
          <strong>Refund Policy:</strong> If a refund is issued before work begins, you receive 100% of the escrow principal
          ({currency} {escrowPrincipal.toFixed(2)}) plus the full pre-paid escrow fee.
          {isCrypto
            ? " A small gas cost (~$0.01–$0.05 on Polygon) is absorbed from the escrow fee before the remaining balance reaches TrustLock's revenue wallet — you are never charged gas directly. No TrustLock service fees on refunds."
            : " A tiny gas cost (~$0.03) is absorbed from the escrow fee to cover the blockchain transfer — you are never charged gas directly. No TrustLock service fees on refunds."
          }
        </div>
      </div>

      {/* Split payout disclosure — crypto-specific */}
      {isCrypto && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/20">
          <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <div className="text-[10px] text-foreground leading-relaxed">
            <strong>Split Payout (Dispute Resolution):</strong> If a dispute results in a split payout, the escrow fee rate is halved
            (from 1.0% to 0.5%) and applied only to the vendor's share. Gas fees for both buyer and vendor transfers are absorbed from
            the escrow fee balance before it reaches TrustLock's revenue wallet — neither party pays gas directly. Both parties enter
            their payout details independently through the resolution workflow.
          </div>
        </div>
      )}

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
          {isCrypto && `\n\n**Crypto-to-Crypto Specific:**\n• All-in fee: ${ALL_IN_RANGES.cryptoDirect.range} (Platform ${FEE_CATEGORIES.platform.crypto.display} transaction fee)\n• No processor fee — direct on-chain transfer\n• 1.0% escrow service fee deducted from vendor principal at release\n• Escrow wallet net balance = 0 after trickle-down\n• Refunds: ALL fees waived, gasless`}
        </div>
      )}
    </div>
  );
};

export default InvoiceFeeCalculator;

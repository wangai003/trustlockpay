import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ShieldCheck, ArrowUpCircle, Info, XCircle } from "lucide-react";
import type { LimitCheckResult, ProcessorId, KycTier } from "@/lib/feeEngine";
import { PROCESSORS, getProcessorLimitsDisplay } from "@/lib/feeEngine";

interface TransactionLimitGuardProps {
  amount: number;
  processorId: ProcessorId;
  kycTier: KycTier;
  limitCheck: LimitCheckResult;
  onProceed?: () => void;
  onUpgradeKyc?: () => void;
  onBack?: () => void;
}

const TransactionLimitGuard = ({
  amount,
  processorId,
  kycTier,
  limitCheck,
  onProceed,
  onUpgradeKyc,
  onBack,
}: TransactionLimitGuardProps) => {
  const limits = getProcessorLimitsDisplay(processorId, kycTier);
  const processor = PROCESSORS[processorId];

  // If allowed and no AML flags, don't render anything (silent pass-through)
  if (limitCheck.allowed && !limitCheck.amlFlags?.length) return null;

  // Allowed but with AML flags → informational banner
  if (limitCheck.allowed && limitCheck.amlFlags?.length) {
    return (
      <Card className="border-2 border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-yellow-600" />
            Compliance Notice
            <Badge variant="secondary" className="text-[9px] ml-auto">{processor.name}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {limitCheck.amlFlags.map((flag, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/50 flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-600" />
              <p className="text-[10px] text-muted-foreground">{flag}</p>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center">
            Additional verification steps may be required during checkout.
          </p>
          {onProceed && (
            <Button className="w-full gap-2" onClick={onProceed}>
              <ShieldCheck className="w-4 h-4" /> Acknowledge & Continue
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Blocked — show the limit violation
  return (
    <Card className="border-2 border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          Transaction Limit Exceeded
          <Badge variant="destructive" className="text-[9px] ml-auto">{processor.name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{limitCheck.reason}</p>

        {/* Usage bars */}
        {limitCheck.currentUsage && (
          <div className="space-y-2 p-2.5 rounded-lg bg-muted/50">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Daily Volume</span>
                <span className="font-semibold">
                  ${limitCheck.currentUsage.daily.toLocaleString()} / ${limits.dailyLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(100, (limitCheck.currentUsage.daily / limits.dailyLimit) * 100)} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Monthly Volume</span>
                <span className="font-semibold">
                  ${limitCheck.currentUsage.monthly.toLocaleString()} / ${limits.monthlyLimit.toLocaleString()}
                </span>
              </div>
              <Progress value={Math.min(100, (limitCheck.currentUsage.monthly / limits.monthlyLimit) * 100)} className="h-1.5" />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">Today's Transactions</span>
              <span className="font-semibold">{limitCheck.currentUsage.dailyCount} / {limits.maxDailyTxCount}</span>
            </div>
          </div>
        )}

        {/* Limit breakdown */}
        <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-1.5">
          <p className="text-[10px] font-semibold">{processor.name} Limits — {kycTier.charAt(0).toUpperCase() + kycTier.slice(1)} Tier</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <span className="text-muted-foreground">Per Transaction</span>
            <span className="font-semibold text-right">${limits.minPerTx.toFixed(2)} – ${limits.maxPerTx.toLocaleString()}</span>
            <span className="text-muted-foreground">Daily Limit</span>
            <span className="font-semibold text-right">${limits.dailyLimit.toLocaleString()}</span>
            <span className="text-muted-foreground">Monthly Limit</span>
            <span className="font-semibold text-right">${limits.monthlyLimit.toLocaleString()}</span>
            <span className="text-muted-foreground">Max Daily Transactions</span>
            <span className="font-semibold text-right">{limits.maxDailyTxCount}</span>
          </div>
        </div>

        {limitCheck.suggestedAction && (
          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{limitCheck.suggestedAction}</span>
          </div>
        )}

        {limitCheck.maxAllowed !== undefined && limitCheck.maxAllowed > 0 && (
          <p className="text-[10px] text-center text-muted-foreground">
            Maximum you can transact right now: <strong className="text-foreground">${limitCheck.maxAllowed.toLocaleString()}</strong>
          </p>
        )}

        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" size="sm" className="flex-1" onClick={onBack}>
              Go Back
            </Button>
          )}
          {limitCheck.upgradeRequired && onUpgradeKyc && (
            <Button size="sm" className="flex-1 gap-1" onClick={onUpgradeKyc}>
              <ArrowUpCircle className="w-3.5 h-3.5" /> Upgrade Verification
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionLimitGuard;

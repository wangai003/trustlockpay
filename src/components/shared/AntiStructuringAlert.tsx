import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldX, TrendingUp, Layers, Info, ShieldCheck, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Displayed when compliance-velocity check returns flags.
 * Blocks transaction on "critical" severity (suspected structuring).
 * Blocks on "pre_kyc_hard_cap" (amount exceeds cap without verified KYC).
 * Warns on "high" severity (velocity spike, cumulative breach).
 */
interface VelocityFlag {
  type: string;
  severity: string;
  detail: string;
}

interface AntiStructuringAlertProps {
  flags: VelocityFlag[];
  severity: "critical" | "high" | "clear";
  allowTransaction: boolean;
  rollingVolume?: number;
  todayCount?: number;
  blockedReason?: string;
  preKycCap?: number;
  role?: "admin" | "vendor" | "buyer";
  onProceed?: () => void;
  onBlock?: () => void;
  onReduceAmount?: () => void;
}

const FLAG_ICONS: Record<string, typeof AlertTriangle> = {
  structuring_suspected: Layers,
  cumulative_threshold_breach: TrendingUp,
  velocity_spike: TrendingUp,
  pre_kyc_hard_cap: ShieldCheck,
};

const AntiStructuringAlert = ({
  flags,
  severity,
  allowTransaction,
  rollingVolume,
  todayCount,
  blockedReason,
  preKycCap,
  role,
  onProceed,
  onBlock,
  onReduceAmount,
}: AntiStructuringAlertProps) => {
  const navigate = useNavigate();
  if (flags.length === 0) return null;

  const isCritical = severity === "critical";
  const isPreKycBlock = blockedReason === "pre_kyc_hard_cap";

  // ── Pre-KYC Hard Cap Block ──
  if (isPreKycBlock) {
    const kycPath = role === "vendor" ? "/trustlock/vendor/kyc" : role === "buyer" ? "/trustlock/buyer/settings" : undefined;

    return (
      <Card className="border-2 border-accent/40 bg-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            Identity Verification Required
            <Badge className="text-[9px] ml-auto bg-accent/20 text-accent border-0">KYC REQUIRED</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-xs text-foreground leading-relaxed">
              Transactions above <strong className="text-accent">${preKycCap?.toLocaleString() || "5,000"}</strong> require 
              identity verification. This is a regulatory safeguard to protect both you and TrustLock.
            </p>
            <p className="text-[10px] text-muted-foreground">
              Your payment has <strong>not been charged</strong>. No funds have been taken.
            </p>
          </div>

          {flags.map((flag, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-accent/10 flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
              <p className="text-[10px] text-muted-foreground">{flag.detail}</p>
            </div>
          ))}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-foreground">You have two options:</p>
            <div className="grid gap-2">
              {kycPath && (
                <Button
                  className="w-full gap-2"
                  onClick={() => navigate(kycPath)}
                >
                  <Upload className="w-4 h-4" />
                  Complete Identity Verification (KYC)
                </Button>
              )}
              {onReduceAmount && (
                <Button variant="outline" className="w-full gap-2" onClick={onReduceAmount}>
                  Reduce Amount Below ${preKycCap?.toLocaleString() || "5,000"}
                </Button>
              )}
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={onBlock}>
                Cancel & Return
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
              An admin has been notified. If you need urgent processing, contact support with your order details for manual approval.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Standard AML / Structuring Alert ──
  return (
    <Card className={`border-2 ${isCritical ? "border-destructive/40 bg-destructive/5" : "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isCritical ? <ShieldX className="w-4 h-4 text-destructive" /> : <AlertTriangle className="w-4 h-4 text-yellow-600" />}
          {isCritical ? "Transaction Blocked — Suspected Structuring" : "AML Velocity Warning"}
          <Badge variant={isCritical ? "destructive" : "secondary"} className="text-[9px] ml-auto">
            {severity.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flags.map((flag, i) => {
          const Icon = FLAG_ICONS[flag.type] || AlertTriangle;
          return (
            <div key={i} className="p-2.5 rounded-lg bg-muted/50 flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${flag.severity === "critical" ? "text-destructive" : "text-yellow-600"}`} />
              <div>
                <p className="text-[10px] font-semibold text-foreground">
                  {flag.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{flag.detail}</p>
              </div>
            </div>
          );
        })}

        {/* Stats */}
        {(rollingVolume !== undefined || todayCount !== undefined) && (
          <div className="grid grid-cols-2 gap-2">
            {rollingVolume !== undefined && (
              <div className="p-2 rounded-lg bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">24h Rolling Volume</p>
                <p className="text-sm font-bold text-foreground">${rollingVolume.toLocaleString()}</p>
              </div>
            )}
            {todayCount !== undefined && (
              <div className="p-2 rounded-lg bg-muted/30 text-center">
                <p className="text-[10px] text-muted-foreground">Today's Transactions</p>
                <p className="text-sm font-bold text-foreground">{todayCount}</p>
              </div>
            )}
          </div>
        )}

        {/* Legal notice */}
        <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            {isCritical
              ? "Under 31 USC § 5324, structuring transactions to evade Currency Transaction Reports is a federal crime. This incident has been logged and reported to TrustLock compliance."
              : "This alert has been logged in the compliance audit trail. An admin has been notified for review."}
          </span>
        </div>

        {isCritical ? (
          <Button variant="outline" className="w-full" onClick={onBlock}>
            Return to Dashboard
          </Button>
        ) : (
          <Button className="w-full gap-2" onClick={onProceed}>
            <AlertTriangle className="w-4 h-4" /> Acknowledge & Proceed
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default AntiStructuringAlert;
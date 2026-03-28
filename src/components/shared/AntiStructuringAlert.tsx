import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldX, TrendingUp, Layers, Info } from "lucide-react";

/**
 * Displayed when compliance-velocity check returns flags.
 * Blocks transaction on "critical" severity (suspected structuring).
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
  rollingVolume: number;
  todayCount: number;
  onProceed?: () => void;
  onBlock?: () => void;
}

const FLAG_ICONS: Record<string, typeof AlertTriangle> = {
  structuring_suspected: Layers,
  cumulative_threshold_breach: TrendingUp,
  velocity_spike: TrendingUp,
};

const AntiStructuringAlert = ({
  flags,
  severity,
  allowTransaction,
  rollingVolume,
  todayCount,
  onProceed,
  onBlock,
}: AntiStructuringAlertProps) => {
  if (flags.length === 0) return null;

  const isCritical = severity === "critical";

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
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">24h Rolling Volume</p>
            <p className="text-sm font-bold text-foreground">${rollingVolume.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] text-muted-foreground">Today's Transactions</p>
            <p className="text-sm font-bold text-foreground">{todayCount}</p>
          </div>
        </div>

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

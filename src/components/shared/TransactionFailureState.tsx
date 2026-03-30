import { AlertTriangle, RefreshCw, ShieldCheck, HelpCircle, ArrowLeft, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TransactionFailureStateProps {
  /** "os_pay" or "os_payout" */
  flow: "os_pay" | "os_payout";
  role: "admin" | "vendor" | "buyer";
  errorMessage?: string;
  orderNumber?: string;
  amount?: string;
  method?: string;
  onRetry: () => void;
  onBack: () => void;
}

const FAILURE_REASONS = [
  "Network connectivity issue during processing",
  "Payment provider temporarily unavailable",
  "Insufficient funds or invalid payment details",
  "Session timeout — please re-authenticate",
  "Blockchain congestion causing delayed confirmation",
];

const TransactionFailureState = ({
  flow,
  role,
  errorMessage,
  orderNumber,
  amount,
  method,
  onRetry,
  onBack,
}: TransactionFailureStateProps) => {
  const flowLabel = flow === "os_pay" ? "Payment" : "Payout";
  const roleLabel = role === "admin" ? "Admin" : role === "vendor" ? "Vendor" : "Buyer";

  const referenceId = `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* ── Main Failure Card ── */}
      <Card className="border-2 border-destructive/30">
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{flowLabel} Unsuccessful</h3>
            <p className="text-sm text-muted-foreground">
              Your {flowLabel.toLowerCase()} could not be completed at this time.
            </p>
          </div>

          {/* Error Details */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs font-medium text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Transaction Summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {orderNumber && (
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Order</p>
                <p className="font-mono font-semibold text-foreground">{orderNumber}</p>
              </div>
            )}
            {amount && (
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold text-foreground">${amount}</p>
              </div>
            )}
            {method && (
              <div className="p-2.5 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Method</p>
                <p className="font-semibold text-foreground capitalize">{method.replace(/_/g, " ")}</p>
              </div>
            )}
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Role</p>
              <p className="font-semibold text-foreground">{roleLabel}</p>
            </div>
          </div>

          {/* Reference ID */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
            <div>
              <p className="text-[10px] text-muted-foreground">Error Reference</p>
              <code className="text-xs font-mono font-bold text-foreground">{referenceId}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referenceId);
                toast.success("Reference copied");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Fund Safety Assurance ── */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Your Funds Are Safe</p>
              <p className="text-xs text-muted-foreground">
                {flow === "os_payout"
                  ? "No funds have left the escrow wallet. Your money remains securely locked until a successful payout is confirmed."
                  : "No charge has been applied to your account. If any amount was pre-authorized, it will be automatically reversed within 24 hours."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Possible Reasons ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Possible Reasons</p>
          </div>
          <ul className="space-y-2">
            {FAILURE_REASONS.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                {reason}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── What to Do Next ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">What to Do Next</p>
          <ol className="space-y-2 list-decimal list-inside text-xs text-muted-foreground">
            <li>Double-check your payment details and account credentials</li>
            <li>Ensure your internet connection is stable</li>
            <li>Try again using the button below</li>
            <li>If the issue persists, contact support with reference <code className="font-mono text-foreground">{referenceId}</code></li>
          </ol>
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Go Back & Edit
        </Button>
        <Button className="flex-1 gap-2" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        Need help? Contact{" "}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">support@trustlockpay.com</Badge>
      </p>
    </div>
  );
};

export default TransactionFailureState;

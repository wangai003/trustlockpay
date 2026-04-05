import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, AlertTriangle, Percent, Lock, PenLine, Handshake, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScheduleItem {
  name: string;
  percentage: number;
  description: string;
}

interface MilestonePaymentScheduleProps {
  industry: string;
  orderAmount: number;
  /** Vendor-preset defaults from industry template or widget config */
  defaultSchedule: ScheduleItem[];
  /** When buyer accepts the schedule, fire this with the final schedule */
  onAccept: (schedule: ScheduleItem[]) => void;
  /** If buyer wants to counter-propose (async negotiation) */
  onCounterPropose?: (schedule: ScheduleItem[]) => void;
  vendorName?: string;
  readOnly?: boolean;
}

/**
 * Pre-escrow step shown during checkout for milestone industries.
 * Buyer reviews the vendor's proposed payout percentages per milestone
 * and can accept or request edits before payment.
 */
const MilestonePaymentSchedule = ({
  industry,
  orderAmount,
  defaultSchedule,
  onAccept,
  onCounterPropose,
  vendorName = "Vendor",
  readOnly = false,
}: MilestonePaymentScheduleProps) => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(defaultSchedule);
  const [editing, setEditing] = useState(false);

  const totalPct = useMemo(() => schedule.reduce((s, m) => s + (m.percentage || 0), 0), [schedule]);
  const isValid = totalPct === 100;

  const updatePct = (idx: number, val: number) => {
    setSchedule(prev => prev.map((item, i) => i === idx ? { ...item, percentage: val } : item));
  };

  const handleAccept = () => {
    if (editing) {
      // Buyer edited — this is a counter-proposal
      onCounterPropose?.(schedule);
    } else {
      onAccept(schedule);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Milestone Payment Schedule
          </CardTitle>
          <Badge variant="outline" className="text-[9px]">{industry}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Review how your payment will be released at each milestone. {vendorName} has preset these percentages based on industry standards.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2.5 text-xs">
          <span className="text-muted-foreground">Escrow Total: <strong className="text-foreground">${orderAmount.toLocaleString()}</strong></span>
          <div className="flex items-center gap-1">
            <span className={cn("font-semibold", isValid ? "text-green-600" : "text-red-500")}>
              {totalPct}%
            </span>
            {!isValid && <AlertTriangle className="h-3 w-3 text-red-500" />}
            {isValid && <CheckCircle2 className="h-3 w-3 text-green-600" />}
          </div>
        </div>

        {/* Schedule rows */}
        <div className="space-y-1.5">
          {schedule.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/10">
              <span className="text-[10px] font-bold text-muted-foreground w-5">#{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
              </div>
              {editing && !readOnly ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={item.percentage || ""}
                    onChange={e => updatePct(idx, Number(e.target.value))}
                    className="w-14 h-7 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">%</span>
                </div>
              ) : (
                <div className="text-right shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{item.percentage}%</Badge>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    ${((orderAmount * item.percentage) / 100).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!readOnly && (
          <>
            <Separator />

            {!editing ? (
              <div className="space-y-2">
                <Button onClick={() => onAccept(schedule)} className="w-full gap-2 text-xs" size="sm">
                  <Handshake className="h-3.5 w-3.5" />
                  Accept Schedule & Proceed to Payment
                </Button>
                {onCounterPropose && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => setEditing(true)}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Propose Different Percentages
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground text-center">
                  Adjust percentages to your preference. Total must equal 100%. Submitting sends a counter-proposal to {vendorName} for approval.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSchedule(defaultSchedule);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    disabled={!isValid}
                    onClick={handleAccept}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {isValid ? "Submit Counter-Proposal" : `Must equal 100% (${totalPct}%)`}
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[9px] text-muted-foreground text-center">
              <Lock className="h-3 w-3 inline mr-0.5" />
              Once agreed, this schedule is locked into the escrow smart contract and cannot be changed without mutual consent.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MilestonePaymentSchedule;

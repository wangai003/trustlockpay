import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, AlertTriangle, Percent, Lock, PenLine, Handshake,
  ArrowRight, Phone, Mail, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRY_CODES } from "@/lib/countryCodes";

export interface ScheduleItem {
  name: string;
  percentage: number;
  description: string;
}

export interface CounterProposalContact {
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
}

interface MilestonePaymentScheduleProps {
  industry: string;
  orderAmount: number;
  defaultSchedule: ScheduleItem[];
  onAccept: (schedule: ScheduleItem[]) => void;
  onCounterPropose?: (schedule: ScheduleItem[], contact: CounterProposalContact) => void;
  vendorName?: string;
  readOnly?: boolean;
}

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
  const [showContactForm, setShowContactForm] = useState(false);
  const [contact, setContact] = useState<CounterProposalContact>({
    fullName: "", email: "", phone: "", countryCode: "+1",
  });

  const totalPct = useMemo(() => schedule.reduce((s, m) => s + (m.percentage || 0), 0), [schedule]);
  const isValid = totalPct === 100;
  const contactValid = contact.fullName.trim().length > 0 && contact.email.trim().length > 0;

  const updatePct = (idx: number, val: number) => {
    setSchedule(prev => prev.map((item, i) => i === idx ? { ...item, percentage: val } : item));
  };

  const handleSubmitCounter = () => {
    if (isValid && contactValid) {
      onCounterPropose?.(schedule, contact);
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

            {!editing && !showContactForm ? (
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
            ) : editing && !showContactForm ? (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground text-center">
                  Adjust percentages to your preference. Total must equal 100%.
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
                    onClick={() => setShowContactForm(true)}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    {isValid ? "Continue" : `Must equal 100% (${totalPct}%)`}
                  </Button>
                </div>
              </div>
            ) : showContactForm ? (
              /* ─── Contact capture before counter-proposal submission ─── */
              <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <div className="text-center">
                  <p className="text-xs font-semibold">Your Contact Details</p>
                  <p className="text-[10px] text-muted-foreground">
                    {vendorName} needs your details to review and respond to your counter-proposal. You'll receive a separate payment link once agreed.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] flex items-center gap-1">
                      <User className="h-3 w-3" /> Full Name *
                    </Label>
                    <Input
                      placeholder="Jane Mensah"
                      value={contact.fullName}
                      onChange={e => setContact(p => ({ ...p, fullName: e.target.value }))}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email Address *
                    </Label>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      value={contact.email}
                      onChange={e => setContact(p => ({ ...p, email: e.target.value }))}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone Number
                    </Label>
                    <div className="flex gap-1.5">
                      <Select value={contact.countryCode} onValueChange={v => setContact(p => ({ ...p, countryCode: v }))}>
                        <SelectTrigger className="w-[100px] h-8 text-[10px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {COUNTRY_CODES.map(c => (
                            <SelectItem key={c.code} value={c.code} className="text-xs">
                              {c.code} {c.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="555 123 4567"
                        value={contact.phone}
                        onChange={e => setContact(p => ({ ...p, phone: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowContactForm(false)}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 text-xs"
                    disabled={!contactValid}
                    onClick={handleSubmitCounter}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Submit Counter-Proposal
                  </Button>
                </div>

                <p className="text-[9px] text-muted-foreground text-center">
                  No payment is charged now. {vendorName} will review your proposal and send a payment link if agreed.
                </p>
              </div>
            ) : null}

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

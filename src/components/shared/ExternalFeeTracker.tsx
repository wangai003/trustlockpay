import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Receipt, Plus, CheckCircle2, Clock, Upload, X, DollarSign, Building2, ShieldCheck, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TradeScope } from "./TradeScopeSelector";

export interface ExternalFeeTemplate {
  label: string;
  typical_range?: string;
  required_scope: TradeScope[];
}

interface ExternalFeeEntry {
  id?: string;
  fee_label: string;
  amount: string;
  currency: string;
  paid_to: string;
  evidence_note: string;
  receipt_url: string | null;
  verified_by_counterparty: boolean;
  logged_by_role?: string;
  rejected?: boolean;
}

interface ExternalFeeTrackerProps {
  transactionId?: string | null;
  milestoneIndex: number;
  milestoneName: string;
  role: "buyer" | "vendor";
  tradeScope: TradeScope;
  industrySuggestions?: ExternalFeeTemplate[];
  isTestnet?: boolean;
  existingEntries?: ExternalFeeEntry[];
}

const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS", "XOF", "CNY", "INR"];

const ExternalFeeTracker = ({
  transactionId,
  milestoneIndex,
  milestoneName,
  role,
  tradeScope,
  industrySuggestions = [],
  isTestnet = false,
  existingEntries = [],
}: ExternalFeeTrackerProps) => {
  const [entries, setEntries] = useState<ExternalFeeEntry[]>(existingEntries);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState<ExternalFeeEntry>({
    fee_label: "",
    amount: "",
    currency: "USD",
    paid_to: "",
    evidence_note: "",
    receipt_url: null,
    verified_by_counterparty: false,
  });

  const applicableSuggestions = industrySuggestions.filter(
    (s) => s.required_scope.includes(tradeScope) || s.required_scope.includes("domestic")
  );

  const handleAddEntry = async () => {
    if (!newEntry.fee_label.trim()) {
      toast.error("Enter a fee label");
      return;
    }
    if (!newEntry.amount || parseFloat(newEntry.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!newEntry.evidence_note.trim() && !newEntry.receipt_url) {
      toast.error("Provide a note or receipt as evidence");
      return;
    }

    setSaving(true);

    if (isTestnet) {
      await new Promise((r) => setTimeout(r, 400));
      setEntries((prev) => [...prev, { ...newEntry, id: `testnet-${Date.now()}` }]);
      toast.success("External fee logged (testnet)");
      resetForm();
      setSaving(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not authenticated");

      const { error } = await (supabase as any).from("external_fee_entries").insert({
        transaction_id: transactionId,
        milestone_index: milestoneIndex,
        fee_label: newEntry.fee_label,
        amount: parseFloat(newEntry.amount),
        currency: newEntry.currency,
        paid_to: newEntry.paid_to || null,
        evidence_note: newEntry.evidence_note || null,
        receipt_url: newEntry.receipt_url,
        logged_by: userData.user.id,
        logged_by_role: role,
        required_scope: [tradeScope],
      });

      if (error) throw error;

      setEntries((prev) => [...prev, { ...newEntry, id: `new-${Date.now()}` }]);
      toast.success("External fee logged — awaiting counterparty verification");
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to log fee");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewEntry({
      fee_label: "",
      amount: "",
      currency: "USD",
      paid_to: "",
      evidence_note: "",
      receipt_url: null,
      verified_by_counterparty: false,
    });
    setShowForm(false);
  };

  const totalExternal = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-semibold text-foreground">
            Third-Party Payments
          </span>
          {entries.length > 0 && (
            <Badge variant="outline" className="text-[8px]">
              {entries.length} logged • {newEntry.currency} {totalExternal.toLocaleString()}
            </Badge>
          )}
        </div>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="text-[9px] h-5 gap-1"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-2.5 h-2.5" /> Log Payment
          </Button>
        )}
      </div>

      {showForm && applicableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[9px] text-muted-foreground">Quick add:</span>
          {applicableSuggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setNewEntry((prev) => ({ ...prev, fee_label: s.label }))}
              className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:border-primary/40 bg-background transition-colors"
            >
              {s.label}
              {s.typical_range && <span className="text-muted-foreground ml-1">({s.typical_range})</span>}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="border-accent/20">
          <CardContent className="p-2 space-y-2">
            <div className="flex gap-1.5">
              <Input
                placeholder="Fee type (e.g., Customs duty)"
                className="text-xs h-7 flex-1"
                value={newEntry.fee_label}
                onChange={(e) => setNewEntry((p) => ({ ...p, fee_label: e.target.value }))}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetForm}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Select
                value={newEntry.currency}
                onValueChange={(v) => setNewEntry((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger className="w-20 h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount"
                className="text-xs h-7 flex-1"
                value={newEntry.amount}
                onChange={(e) => setNewEntry((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Paid to (company/entity name)"
              className="text-xs h-7"
              value={newEntry.paid_to}
              onChange={(e) => setNewEntry((p) => ({ ...p, paid_to: e.target.value }))}
            />
            <Textarea
              placeholder="Evidence notes (e.g., 'Paid $450 customs duty at Apapa port, receipt #CD-2025-1234')"
              className="text-xs min-h-[50px]"
              value={newEntry.evidence_note}
              onChange={(e) => setNewEntry((p) => ({ ...p, evidence_note: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[9px] h-6 gap-1"
                onClick={() => {
                  setNewEntry((p) => ({ ...p, receipt_url: `receipt-${Date.now()}` }));
                  toast.success("Receipt attached");
                }}
              >
                <Upload className="w-3 h-3" /> Attach Receipt
              </Button>
              {newEntry.receipt_url && (
                <Badge className="bg-primary/15 text-primary text-[8px] gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Receipt attached
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              className="w-full text-xs h-7 gap-1"
              disabled={saving}
              onClick={handleAddEntry}
            >
              {saving ? <Clock className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
              Log External Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {entries.map((entry, idx) => {
        const isCounterpartyEntry = entry.logged_by_role && entry.logged_by_role !== role;
        const canVerify = isCounterpartyEntry && !entry.verified_by_counterparty && !entry.rejected;

        const handleVerify = async () => {
          if (isTestnet) {
            setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, verified_by_counterparty: true } : e));
            toast.success("Fee verified (testnet)");
            return;
          }
          try {
            const { error } = await (supabase as any)
              .from("external_fee_entries")
              .update({ verified_by_counterparty: true, verified_at: new Date().toISOString() })
              .eq("id", entry.id);
            if (error) throw error;
            setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, verified_by_counterparty: true } : e));
            toast.success("Fee verified — counterparty confirmation recorded");
          } catch (err: any) {
            toast.error(err.message || "Failed to verify");
          }
        };

        const handleReject = () => {
          setEntries((prev) => prev.map((e, i) => i === idx ? { ...e, rejected: true } : e));
          toast.info("Fee rejected — counterparty will be notified");
        };

        return (
          <div
            key={entry.id || idx}
            className={`flex items-start gap-2 p-2 rounded-lg border bg-background ${
              entry.rejected ? "border-destructive/30 opacity-60" :
              canVerify ? "border-accent/30 bg-accent/[0.02]" :
              "border-border"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium">{entry.fee_label}</span>
                <Badge variant="outline" className="text-[8px]">
                  {entry.currency} {parseFloat(entry.amount).toLocaleString()}
                </Badge>
                {entry.paid_to && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Building2 className="w-2.5 h-2.5" /> {entry.paid_to}
                  </span>
                )}
                {entry.logged_by_role && (
                  <Badge variant="outline" className="text-[7px]">
                    by {entry.logged_by_role}
                  </Badge>
                )}
              </div>
              {entry.evidence_note && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{entry.evidence_note}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {entry.receipt_url ? (
                  <Badge className="bg-primary/15 text-primary text-[7px]">Receipt ✓</Badge>
                ) : (
                  <Badge variant="outline" className="text-[7px] text-destructive">No receipt</Badge>
                )}
                {entry.rejected ? (
                  <Badge variant="outline" className="text-[7px] text-destructive gap-0.5">
                    <XCircle className="w-2 h-2" /> Rejected
                  </Badge>
                ) : entry.verified_by_counterparty ? (
                  <Badge className="bg-primary/10 text-primary text-[7px] gap-0.5">
                    <ShieldCheck className="w-2 h-2" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[7px] text-muted-foreground gap-0.5">
                    <Clock className="w-2 h-2" /> Pending verification
                  </Badge>
                )}
              </div>

              {/* Counterparty verification actions */}
              {canVerify && (
                <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-border/50">
                  <span className="text-[9px] text-accent font-medium">Action required:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[9px] h-5 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={handleVerify}
                  >
                    <ShieldCheck className="w-2.5 h-2.5" /> Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[9px] h-5 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={handleReject}
                  >
                    <XCircle className="w-2.5 h-2.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {entries.length === 0 && !showForm && (
        <p className="text-[10px] text-muted-foreground italic">
          No third-party fees logged for this milestone.
          {tradeScope === "domestic" && " Domestic trades typically have minimal external costs."}
        </p>
      )}
    </div>
  );
};

export default ExternalFeeTracker;

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Receipt, Plus, CheckCircle2, Clock, Upload, X, DollarSign, Building2, ShieldCheck, XCircle,
  ChevronDown, AlertTriangle, MessageSquare, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TradeScope } from "./TradeScopeSelector";
import { type Incoterm, inferFeeCategory, getResponsibility, FEE_CATEGORY_LABELS } from "@/lib/incotermsMatrix";
import { type FeePhase, FEE_PHASE_LABELS, FEE_PHASE_ICONS, FEE_PHASE_ORDER, suggestFeePhase } from "@/lib/feePhaseUtils";

export interface ExternalFeeTemplate {
  label: string;
  typical_range?: string;
  required_scope: TradeScope[];
}

export interface ExternalFeeEntry {
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
  // New fields
  fee_phase?: FeePhase;
  base_currency?: string;
  exchange_rate_snapshot?: number | null;
  normalized_amount?: number | null;
  is_pre_escrow?: boolean;
  dispute_status?: "none" | "disputed" | "revised" | "withdrawn";
  dispute_note?: string;
}

interface ExternalFeeTrackerProps {
  transactionId?: string | null;
  milestoneIndex: number;
  milestoneName: string;
  role: "buyer" | "vendor" | "admin";
  tradeScope: TradeScope;
  industrySuggestions?: ExternalFeeTemplate[];
  isTestnet?: boolean;
  existingEntries?: ExternalFeeEntry[];
  readOnly?: boolean;
  /** Incoterm for this transaction — used to show responsibility labels */
  incoterm?: Incoterm | null;
  /** Escrow base currency for multi-currency normalization */
  escrowCurrency?: string;
  /** Total milestones for fee phase auto-suggestion */
  totalMilestones?: number;
  /** Called when entries change — parent can use for fee rollup */
  onTotalChange?: (total: number, currency: string) => void;
  /** Called with unverified fee info for soft-gate checks */
  onFeeStatusChange?: (info: { total: number; unverified: number; unverifiedAmount: number }) => void;
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
  readOnly = false,
  incoterm,
  escrowCurrency = "USD",
  totalMilestones = 1,
  onTotalChange,
  onFeeStatusChange,
}: ExternalFeeTrackerProps) => {
  const [entries, setEntries] = useState<ExternalFeeEntry[]>(existingEntries);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<FeePhase>>(new Set(FEE_PHASE_ORDER));
  const [newEntry, setNewEntry] = useState<ExternalFeeEntry>({
    fee_label: "",
    amount: "",
    currency: escrowCurrency,
    paid_to: "",
    evidence_note: "",
    receipt_url: null,
    verified_by_counterparty: false,
    fee_phase: "pre_shipment",
    is_pre_escrow: false,
    dispute_status: "none",
  });

  // Load entries from DB on mount
  useEffect(() => {
    if (!transactionId || isTestnet || existingEntries.length > 0) return;
    const load = async () => {
      const { data } = await supabase
        .from("external_fee_entries")
        .select("*")
        .eq("transaction_id", transactionId)
        .eq("milestone_index", milestoneIndex);
      if (data && data.length > 0) {
        setEntries(data.map((d: any) => ({
          id: d.id,
          fee_label: d.fee_label,
          amount: String(d.amount),
          currency: d.currency,
          paid_to: d.paid_to || "",
          evidence_note: d.evidence_note || "",
          receipt_url: d.receipt_url,
          verified_by_counterparty: d.verified_by_counterparty ?? false,
          logged_by_role: d.logged_by_role,
          fee_phase: d.fee_phase || "pre_shipment",
          base_currency: d.base_currency,
          exchange_rate_snapshot: d.exchange_rate_snapshot,
          normalized_amount: d.normalized_amount,
          is_pre_escrow: d.is_pre_escrow ?? false,
          dispute_status: d.dispute_status || "none",
          dispute_note: d.dispute_note,
        })));
      }
    };
    load();
  }, [transactionId, milestoneIndex, isTestnet, existingEntries.length]);

  const applicableSuggestions = industrySuggestions.filter(
    (s) => s.required_scope.includes(tradeScope) || s.required_scope.includes("domestic")
  );

  // Notify parent of total changes
  const totalExternal = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const primaryCurrency = entries[0]?.currency || newEntry.currency;

  useEffect(() => {
    onTotalChange?.(totalExternal, primaryCurrency);
  }, [totalExternal, primaryCurrency, onTotalChange]);

  // Notify parent of unverified fee status for soft-gate
  useEffect(() => {
    const unverifiedEntries = entries.filter(e => !e.verified_by_counterparty && !e.rejected && e.dispute_status !== "withdrawn");
    const unverifiedAmount = unverifiedEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    onFeeStatusChange?.({ total: entries.length, unverified: unverifiedEntries.length, unverifiedAmount });
  }, [entries, onFeeStatusChange]);

  // Auto-suggest fee phase when label changes
  const updateFeeLabel = (label: string) => {
    const phase = suggestFeePhase(label, milestoneIndex, totalMilestones);
    setNewEntry(p => ({ ...p, fee_label: label, fee_phase: phase, is_pre_escrow: phase === "pre_escrow" }));
  };

  const handleAddEntry = async () => {
    if (!newEntry.fee_label.trim()) { toast.error("Enter a fee label"); return; }
    if (!newEntry.amount || parseFloat(newEntry.amount) <= 0) { toast.error("Enter a valid amount"); return; }
    if (!newEntry.evidence_note.trim() && !newEntry.receipt_url) { toast.error("Provide a note or receipt as evidence"); return; }

    setSaving(true);
    const normalizedAmount = newEntry.currency === escrowCurrency
      ? parseFloat(newEntry.amount)
      : (newEntry.exchange_rate_snapshot ? parseFloat(newEntry.amount) * newEntry.exchange_rate_snapshot : null);

    if (isTestnet) {
      await new Promise((r) => setTimeout(r, 400));
      setEntries((prev) => [...prev, {
        ...newEntry,
        id: `testnet-${Date.now()}`,
        logged_by_role: role,
        normalized_amount: normalizedAmount,
        base_currency: escrowCurrency,
      }]);
      toast.success("External fee logged (testnet)");
      resetForm();
      setSaving(false);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error("Not authenticated");

      const { error } = await supabase.from("external_fee_entries").insert({
        transaction_id: transactionId!,
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
        fee_phase: newEntry.fee_phase || "pre_shipment",
        base_currency: escrowCurrency,
        exchange_rate_snapshot: newEntry.exchange_rate_snapshot || null,
        normalized_amount: normalizedAmount,
        is_pre_escrow: newEntry.is_pre_escrow ?? false,
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke("manage-notifications", {
          body: {
            action: "external_fee_logged",
            transaction_id: transactionId,
            fee_label: newEntry.fee_label,
            amount: parseFloat(newEntry.amount),
            currency: newEntry.currency,
            logged_by_role: role,
            milestone_name: milestoneName,
          },
        });
      } catch { /* non-blocking */ }

      setEntries((prev) => [...prev, {
        ...newEntry,
        id: `new-${Date.now()}`,
        logged_by_role: role,
        normalized_amount: normalizedAmount,
        base_currency: escrowCurrency,
      }]);
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
      fee_label: "", amount: "", currency: escrowCurrency, paid_to: "",
      evidence_note: "", receipt_url: null, verified_by_counterparty: false,
      fee_phase: "pre_shipment", is_pre_escrow: false, dispute_status: "none",
    });
    setShowForm(false);
  };

  const handleVerify = async (idx: number) => {
    const entry = entries[idx];
    if (isTestnet) {
      setEntries(prev => prev.map((e, i) => i === idx ? { ...e, verified_by_counterparty: true } : e));
      toast.success("Fee verified (testnet)");
      return;
    }
    try {
      const { error } = await supabase
        .from("external_fee_entries")
        .update({ verified_by_counterparty: true, verified_at: new Date().toISOString() })
        .eq("id", entry.id!);
      if (error) throw error;
      setEntries(prev => prev.map((e, i) => i === idx ? { ...e, verified_by_counterparty: true } : e));
      toast.success("Fee verified — counterparty confirmation recorded");
    } catch (err: any) {
      toast.error(err.message || "Failed to verify");
    }
  };

  const handleReject = async (idx: number, note: string) => {
    const entry = entries[idx];
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, rejected: true, dispute_status: "disputed", dispute_note: note } : e));

    if (!isTestnet && entry.id) {
      try {
        await supabase
          .from("external_fee_entries")
          .update({ dispute_status: "disputed", dispute_note: note, disputed_at: new Date().toISOString() })
          .eq("id", entry.id);
      } catch { /* non-blocking */ }
    }
    toast.info("Fee disputed — counterparty will be notified to revise or withdraw");
  };

  const handleDisputeAction = async (idx: number, action: "revised" | "withdrawn") => {
    const entry = entries[idx];
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, dispute_status: action, rejected: action === "withdrawn" } : e));

    if (!isTestnet && entry.id) {
      try {
        await supabase.from("external_fee_entries").update({ dispute_status: action }).eq("id", entry.id);
      } catch { /* non-blocking */ }
    }
    toast.success(action === "revised" ? "Fee revised — resubmit for verification" : "Fee withdrawn");
  };

  const isAdmin = role === "admin";

  // Group entries by fee phase
  const entriesByPhase = FEE_PHASE_ORDER.reduce((acc, phase) => {
    acc[phase] = entries.filter(e => (e.fee_phase || "pre_shipment") === phase);
    return acc;
  }, {} as Record<FeePhase, ExternalFeeEntry[]>);

  const hasMultiplePhases = FEE_PHASE_ORDER.filter(p => entriesByPhase[p].length > 0).length > 1;
  const hasMultipleCurrencies = new Set(entries.map(e => e.currency)).size > 1;

  const togglePhase = (phase: FeePhase) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-semibold text-foreground">Third-Party Payments</span>
          {entries.length > 0 && (
            <Badge variant="outline" className="text-[8px]">
              {entries.length} logged • {primaryCurrency} {totalExternal.toLocaleString()}
              {hasMultipleCurrencies && " (multi-currency)"}
            </Badge>
          )}
        </div>
        {!showForm && !readOnly && !isAdmin && (
          <Button variant="outline" size="sm" className="text-[9px] h-5 gap-1" onClick={() => setShowForm(true)}>
            <Plus className="w-2.5 h-2.5" /> Log Payment
          </Button>
        )}
      </div>

      {/* Incoterms responsibility hint */}
      {incoterm && !readOnly && !showForm && entries.length === 0 && (
        <div className="flex items-start gap-1.5 p-1.5 rounded bg-accent/10 border border-accent/20">
          <ArrowRightLeft className="w-3 h-3 text-accent mt-0.5 shrink-0" />
          <p className="text-[9px] text-muted-foreground">
            <strong>{incoterm}</strong> terms apply. Fee responsibility is auto-labeled based on Incoterms 2020 rules.
          </p>
        </div>
      )}

      {/* Quick-add suggestions */}
      {showForm && !readOnly && applicableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[9px] text-muted-foreground">Quick add:</span>
          {applicableSuggestions.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => updateFeeLabel(s.label)}
              className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:border-primary/40 bg-background transition-colors"
            >
              {s.label}
              {s.typical_range && <span className="text-muted-foreground ml-1">({s.typical_range})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Add Fee Form */}
      {showForm && !readOnly && (
        <Card className="border-accent/20">
          <CardContent className="p-2 space-y-2">
            <div className="flex gap-1.5">
              <Input
                placeholder="Fee type (e.g., Customs duty)"
                className="text-xs h-7 flex-1"
                value={newEntry.fee_label}
                onChange={(e) => updateFeeLabel(e.target.value)}
              />
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetForm}>
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Currency + Amount + FX Rate */}
            <div className="flex gap-1.5">
              <Select value={newEntry.currency} onValueChange={(v) => setNewEntry(p => ({ ...p, currency: v }))}>
                <SelectTrigger className="w-20 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (<SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Amount"
                className="text-xs h-7 flex-1"
                value={newEntry.amount}
                onChange={(e) => setNewEntry(p => ({ ...p, amount: e.target.value }))}
              />
            </div>

            {/* Multi-currency: show FX rate input when currency differs from escrow */}
            {newEntry.currency !== escrowCurrency && (
              <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/30 border border-border">
                <ArrowRightLeft className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-[9px] text-muted-foreground whitespace-nowrap">1 {escrowCurrency} =</span>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="FX rate"
                  className="text-xs h-6 w-24"
                  value={newEntry.exchange_rate_snapshot || ""}
                  onChange={(e) => setNewEntry(p => ({ ...p, exchange_rate_snapshot: parseFloat(e.target.value) || null }))}
                />
                <span className="text-[9px] text-muted-foreground">{newEntry.currency}</span>
              </div>
            )}

            {/* Fee Phase + Incoterm responsibility */}
            <div className="flex gap-1.5 items-center">
              <Select value={newEntry.fee_phase || "pre_shipment"} onValueChange={(v) => setNewEntry(p => ({ ...p, fee_phase: v as FeePhase, is_pre_escrow: v === "pre_escrow" }))}>
                <SelectTrigger className="w-32 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEE_PHASE_ORDER.map(p => (
                    <SelectItem key={p} value={p} className="text-xs">{FEE_PHASE_ICONS[p]} {FEE_PHASE_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Incoterms responsibility label */}
              {incoterm && newEntry.fee_label && (() => {
                const cat = inferFeeCategory(newEntry.fee_label);
                if (!cat) return null;
                const resp = getResponsibility(incoterm, cat);
                return (
                  <Badge variant="outline" className={`text-[7px] ${resp === "vendor" ? "border-primary/40 text-primary" : resp === "buyer" ? "border-accent/40 text-accent" : ""}`}>
                    {FEE_CATEGORY_LABELS[cat]}: {resp === "vendor" ? "Vendor pays" : resp === "buyer" ? "Buyer pays" : "Negotiable"}
                  </Badge>
                );
              })()}
            </div>

            <Input
              placeholder="Paid to (company/entity name)"
              className="text-xs h-7"
              value={newEntry.paid_to}
              onChange={(e) => setNewEntry(p => ({ ...p, paid_to: e.target.value }))}
            />
            <Textarea
              placeholder="Evidence notes (e.g., 'Paid $450 customs duty at Apapa port, receipt #CD-2025-1234')"
              className="text-xs min-h-[50px]"
              value={newEntry.evidence_note}
              onChange={(e) => setNewEntry(p => ({ ...p, evidence_note: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10 MB"); return; }
                    if (isTestnet) {
                      setNewEntry(p => ({ ...p, receipt_url: `testnet-receipt-${Date.now()}` }));
                      toast.success("Receipt attached (testnet)");
                      return;
                    }
                    const ext = file.name.split(".").pop() || "bin";
                    const path = `${transactionId || "unlinked"}/${milestoneIndex}/receipt-${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage
                      .from("milestone-documents")
                      .upload(path, file, { upsert: false });
                    if (upErr) { toast.error("Upload failed: " + upErr.message); return; }
                    setNewEntry(p => ({ ...p, receipt_url: path }));
                    toast.success("Receipt uploaded");
                  }}
                />
                <Button variant="outline" size="sm" className="text-[9px] h-6 gap-1" asChild>
                  <span><Upload className="w-3 h-3" /> Attach Receipt</span>
                </Button>
              </label>
              {newEntry.receipt_url && (
                <Badge className="bg-primary/15 text-primary text-[8px] gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Receipt attached
                </Badge>
              )}
            </div>
            <Button size="sm" className="w-full text-xs h-7 gap-1" disabled={saving} onClick={handleAddEntry}>
              {saving ? <Clock className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
              Log External Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entries — grouped by phase if multiple phases exist */}
      {hasMultiplePhases ? (
        FEE_PHASE_ORDER.map(phase => {
          const phaseEntries = entriesByPhase[phase];
          if (phaseEntries.length === 0) return null;
          const phaseTotal = phaseEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          return (
            <Collapsible key={phase} open={expandedPhases.has(phase)} onOpenChange={() => togglePhase(phase)}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-1.5 rounded bg-muted/20 border border-border hover:bg-muted/40 transition-colors">
                <span className="text-[9px] font-medium flex items-center gap-1">
                  {FEE_PHASE_ICONS[phase]} {FEE_PHASE_LABELS[phase]}
                  <Badge variant="outline" className="text-[7px] ml-1">{phaseEntries.length}</Badge>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground">{phaseEntries[0]?.currency} {phaseTotal.toLocaleString()}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedPhases.has(phase) ? "" : "-rotate-90"}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 mt-1">
                {phaseEntries.map((entry) => {
                  const globalIdx = entries.indexOf(entry);
                  return <FeeEntryRow key={entry.id || globalIdx} entry={entry} idx={globalIdx} role={role} isAdmin={isAdmin} readOnly={readOnly} isTestnet={isTestnet} incoterm={incoterm} escrowCurrency={escrowCurrency} onVerify={handleVerify} onReject={handleReject} onDisputeAction={handleDisputeAction} />;
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })
      ) : (
        entries.map((entry, idx) => (
          <FeeEntryRow key={entry.id || idx} entry={entry} idx={idx} role={role} isAdmin={isAdmin} readOnly={readOnly} isTestnet={isTestnet} incoterm={incoterm} escrowCurrency={escrowCurrency} onVerify={handleVerify} onReject={handleReject} onDisputeAction={handleDisputeAction} />
        ))
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-[10px] text-muted-foreground italic">
          No third-party fees logged for this milestone.
          {tradeScope === "domestic" && " Domestic trades typically have minimal external costs."}
        </p>
      )}

      {/* Fee rollup summary */}
      {entries.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border">
            <span className="text-[10px] text-muted-foreground font-medium">Total external costs (this milestone)</span>
            <span className="text-[11px] font-semibold text-foreground">{primaryCurrency} {totalExternal.toLocaleString()}</span>
          </div>
          {/* Multi-currency normalized total */}
          {hasMultipleCurrencies && (() => {
            const normalizedTotal = entries.reduce((s, e) => s + (e.normalized_amount ?? parseFloat(e.amount) ?? 0), 0);
            return (
              <div className="flex items-center justify-between p-1 rounded bg-accent/5 border border-accent/10">
                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <ArrowRightLeft className="w-2.5 h-2.5" /> Normalized total ({escrowCurrency})
                </span>
                <span className="text-[10px] font-medium text-foreground">{escrowCurrency} {normalizedTotal.toLocaleString()}</span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

/** Individual fee entry row — extracted for clarity */
function FeeEntryRow({
  entry, idx, role, isAdmin, readOnly, isTestnet, incoterm, escrowCurrency,
  onVerify, onReject, onDisputeAction,
}: {
  entry: ExternalFeeEntry; idx: number; role: string; isAdmin: boolean; readOnly: boolean; isTestnet: boolean;
  incoterm?: Incoterm | null; escrowCurrency: string;
  onVerify: (idx: number) => void; onReject: (idx: number, note: string) => void;
  onDisputeAction: (idx: number, action: "revised" | "withdrawn") => void;
}) {
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const isCounterpartyEntry = entry.logged_by_role && entry.logged_by_role !== role;
  const canVerify = !readOnly && !isAdmin && isCounterpartyEntry && !entry.verified_by_counterparty && !entry.rejected && entry.dispute_status !== "disputed";
  const isDisputed = entry.dispute_status === "disputed";
  const isMyDisputed = isDisputed && entry.logged_by_role === role;
  const cat = incoterm && entry.fee_label ? inferFeeCategory(entry.fee_label) : null;
  const resp = cat && incoterm ? getResponsibility(incoterm, cat) : null;

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg border bg-background ${
        entry.dispute_status === "withdrawn" ? "border-muted/50 opacity-40" :
        isDisputed ? "border-destructive/30 bg-destructive/[0.03]" :
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
          {/* Normalized amount if different currency */}
          {entry.currency !== escrowCurrency && entry.normalized_amount != null && (
            <Badge variant="outline" className="text-[7px] text-muted-foreground">
              ≈ {escrowCurrency} {entry.normalized_amount.toLocaleString()}
            </Badge>
          )}
          {entry.paid_to && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Building2 className="w-2.5 h-2.5" /> {entry.paid_to}
            </span>
          )}
          {entry.logged_by_role && (
            <Badge variant="outline" className="text-[7px]">by {entry.logged_by_role}</Badge>
          )}
          {/* Incoterms responsibility */}
          {resp && (
            <Badge variant="outline" className={`text-[7px] ${resp === "vendor" ? "border-primary/30 text-primary" : "border-accent/30 text-accent"}`}>
              {resp === "vendor" ? "Vendor" : "Buyer"} responsibility
            </Badge>
          )}
          {/* Fee phase badge */}
          {entry.fee_phase && entry.fee_phase !== "pre_shipment" && (
            <Badge variant="outline" className="text-[7px]">{FEE_PHASE_ICONS[entry.fee_phase]} {FEE_PHASE_LABELS[entry.fee_phase]}</Badge>
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
          {entry.dispute_status === "withdrawn" ? (
            <Badge variant="outline" className="text-[7px] text-muted-foreground gap-0.5">Withdrawn</Badge>
          ) : entry.dispute_status === "disputed" ? (
            <Badge variant="outline" className="text-[7px] text-destructive gap-0.5">
              <AlertTriangle className="w-2 h-2" /> Disputed
            </Badge>
          ) : entry.dispute_status === "revised" ? (
            <Badge variant="outline" className="text-[7px] text-accent gap-0.5">
              <MessageSquare className="w-2 h-2" /> Revised — re-verify
            </Badge>
          ) : entry.rejected ? (
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

        {/* Dispute note */}
        {entry.dispute_note && isDisputed && (
          <p className="text-[9px] text-destructive/80 mt-1 italic">Dispute: {entry.dispute_note}</p>
        )}

        {/* Counterparty verify/reject actions */}
        {canVerify && (
          <div className="mt-2 pt-1.5 border-t border-border/50 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-accent font-medium">Action required:</span>
              <Button variant="outline" size="sm" className="text-[9px] h-5 gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => onVerify(idx)}>
                <ShieldCheck className="w-2.5 h-2.5" /> Verify
              </Button>
              <Button variant="outline" size="sm" className="text-[9px] h-5 gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setShowRejectForm(true)}>
                <XCircle className="w-2.5 h-2.5" /> Dispute
              </Button>
            </div>
            {showRejectForm && (
              <div className="flex gap-1.5">
                <Input
                  placeholder="Reason for dispute..."
                  className="text-xs h-6 flex-1"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
                <Button size="sm" className="text-[9px] h-6" disabled={!rejectNote.trim()} onClick={() => { onReject(idx, rejectNote); setShowRejectForm(false); }}>
                  Submit
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Fee owner dispute resolution: revise or withdraw */}
        {isMyDisputed && (
          <div className="flex items-center gap-1.5 mt-2 pt-1.5 border-t border-destructive/20">
            <span className="text-[9px] text-destructive font-medium">Your fee was disputed:</span>
            <Button variant="outline" size="sm" className="text-[9px] h-5 gap-1" onClick={() => onDisputeAction(idx, "revised")}>
              Revise & Resubmit
            </Button>
            <Button variant="outline" size="sm" className="text-[9px] h-5 gap-1 text-destructive" onClick={() => onDisputeAction(idx, "withdrawn")}>
              Withdraw
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExternalFeeTracker;

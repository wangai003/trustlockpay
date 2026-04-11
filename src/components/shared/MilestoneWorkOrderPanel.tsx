import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2, Loader2, MapPin, AlertTriangle,
  ChevronDown, ChevronRight, Shield, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TradeScopeSelector, { type TradeScope } from "@/components/shared/TradeScopeSelector";
import OfflineReconciliation from "@/components/shared/OfflineReconciliation";
import { useGeolocation } from "@/hooks/useGeolocation";
import { isGpsRequiredByIndustry } from "@/lib/industryList";
import { useBlockchainAnchor } from "@/hooks/useBlockchainAnchor";
import { filterDocumentsByScope } from "@/lib/documentScopeFilter";
import {
  useAddTransactionObserver,
  useCreateMilestones,
  useReleaseMilestonePayment,
  useTransactionMilestones,
  useTransactionObservers,
  useUpdateMilestone,
} from "@/hooks/useSupabaseData";

import {
  type MilestoneWorkOrderPanelProps,
  FUNDS_LOCKED_STATUSES,
  OBSERVER_FREE_INDUSTRIES,
  statusLabel,
  LAYOUT_MODE_LABELS,
  LAYOUT_MODE_ICONS,
  INDUSTRY_MILESTONES,
  resolveLayoutMode,
  getDocGateStatus,
  resolveBlueprint,
} from "./milestone/milestoneConstants";

import { ProgressStepper, BlueprintSummary, OverallProgress } from "./milestone/MilestoneProgressSummary";
import MilestoneActionsTab from "./milestone/MilestoneActionsTab";
import MilestoneDocsTab from "./milestone/MilestoneDocsTab";
import MilestoneNotesTab from "./milestone/MilestoneNotesTab";
import MilestoneDialogs from "./milestone/MilestoneDialogs";

const MilestoneWorkOrderPanel = ({
  transactionId, txId, industry, role, transactionStatus, orderType,
  isTestnet = false, testnetMilestones,
  onTestnetUpdateStatus, onTestnetSaveNote, onTestnetAddDocument,
  onTestnetInviteObserver, onTestnetRelease, onTestnetAddGps,
}: MilestoneWorkOrderPanelProps) => {
  const { data: dbMilestones = [] } = useTransactionMilestones(isTestnet ? undefined : (transactionId || undefined));
  const { data: dbObservers = [] } = useTransactionObservers(isTestnet ? undefined : (transactionId || undefined));
  const createMilestones = useCreateMilestones();
  const updateMilestone = useUpdateMilestone();
  const releaseMilestonePayment = useReleaseMilestonePayment();
  const addObserver = useAddTransactionObserver();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [dismissedObserverPrompts, setDismissedObserverPrompts] = useState<Set<string>>(new Set());
  const [pendingDeleteMilestone, setPendingDeleteMilestone] = useState<{ id: string; title: string } | null>(null);
  const [pendingRestoreMilestone, setPendingRestoreMilestone] = useState<{ id: string; title: string } | null>(null);
  const [pendingFeeGateRelease, setPendingFeeGateRelease] = useState<{ id: string; title: string; unverifiedCount: number; unverifiedTotal: number } | null>(null);
  const [milestoneExternalFees, setMilestoneExternalFees] = useState<Record<number, { total: number; unverified: number; unverifiedAmount: number }>>({});
  const [docTypeSelections, setDocTypeSelections] = useState<Record<string, string>>({});
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [reconciliationComplete, setReconciliationComplete] = useState(false);
  const [skippedMilestoneIndices, setSkippedMilestoneIndices] = useState<number[]>([]);
  const [tradeScope, setTradeScope] = useState<TradeScope>("international");
  const { capturePosition, loading: gpsLoading } = useGeolocation();
  const { anchor: anchorProof } = useBlockchainAnchor();

  const fundsAreLocked = FUNDS_LOCKED_STATUSES.has(transactionStatus || "");
  const layoutMode = resolveLayoutMode(industry, orderType);
  const layoutLabels = LAYOUT_MODE_LABELS[layoutMode];
  const industryNeedsObservers = !OBSERVER_FREE_INDUSTRIES.has(industry || "");
  const rolePrefix = role === "vendor" ? "V" : role === "admin" ? "A" : "B";
  const isAdmin = role === "admin";

  const milestones = isTestnet ? (testnetMilestones || []) : dbMilestones;
  const observers = isTestnet
    ? (testnetMilestones || []).filter(ms => ms.observer_id).map(ms => ({
        id: ms.observer_id, observer_name: ms.observer_name,
        observer_email: ms.observer_email, access_token: ms.observer_access_token,
        milestoneId: ms.id,
      }))
    : dbObservers;

  const activeIndex = useMemo(() => {
    const idx = milestones.findIndex((ms: any) => ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted");
    return idx === -1 ? milestones.length - 1 : idx;
  }, [milestones]);

  const isExpanded = (idx: number) => expandedSteps.has(idx) || idx === activeIndex;
  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  const handleInitializeMilestones = async () => {
    if (isTestnet) { toast.info("Milestones auto-populated from industry template in testnet mode"); return; }
    if (!transactionId) return;
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await createMilestones.mutateAsync({
      transactionId, userId,
      customMilestones: [{ title: `${industry || "General"} fulfillment`, description: "Primary milestone for this work order", is_payment_milestone: true, payment_percentage: 100, required_documents: [], assigned_to: "vendor" }],
    });
  };

  const handleSaveNote = async (milestoneId: string) => {
    if (isTestnet) { onTestnetSaveNote?.(milestoneId, notes[milestoneId] ?? ""); return; }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await updateMilestone.mutateAsync({ milestoneId, userId, description: notes[milestoneId] ?? "" });
  };

  const handleMarkFulfilled = async (milestoneId: string) => {
    const milestone = milestones.find((m: any) => m.id === milestoneId) as any;
    if (milestone) {
      const gate = getDocGateStatus(milestone, fundsAreLocked);
      if (gate.mode === "required" && !gate.satisfied) {
        toast.error(`Cannot fulfill — upload required documents first: ${gate.missingRequired.join(", ")}`);
        return;
      }
      if (gate.autoSatisfied.length > 0) {
        toast.info(`${gate.autoSatisfied.join(", ")} auto-resolved — escrow already funded`, { duration: 4000 });
      }
      if (gate.mode === "optional" && gate.missingOptional.length > 0) {
        toast.warning(`Proceeding without recommended documents: ${gate.missingOptional.join(", ")}`, { duration: 5000 });
      }
    }
    if (isTestnet) {
      const gpsNeeded = isGpsRequiredByIndustry(industry || "");
      if (gpsNeeded) {
        const geo = await capturePosition();
        if (!geo) {
          toast.error("GPS location is required for this industry. Enable location services and try again.", { duration: 6000 });
          return;
        }
        try {
          const result = await anchorProof(
            transactionId || "testnet-sim", "gps_verification",
            { milestoneId, latitude: geo.latitude, longitude: geo.longitude, accuracy: geo.accuracy, capturedAt: geo.capturedAt, capturedBy: role, isTestnet: true }
          );
          const loc = result?.resolvedLocation;
          onTestnetAddGps?.(milestoneId, geo.latitude, geo.longitude, geo.accuracy, loc?.formatted || undefined, loc?.city || undefined, loc?.country || undefined);
          if (loc?.formatted) toast.success(`📍 ${loc.formatted}`, { duration: 6000 });
          else toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
        } catch {
          onTestnetAddGps?.(milestoneId, geo.latitude, geo.longitude, geo.accuracy);
          toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
        }
      }
      onTestnetUpdateStatus?.(milestoneId, "completed");
      return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    const gpsRequired = isGpsRequiredByIndustry(industry || "");
    if (gpsRequired) {
      const geo = await capturePosition();
      if (!geo) { toast.error("GPS location is required for this industry. Enable location services and try again.", { duration: 6000 }); return; }
      await supabase.from("transaction_milestones").update({
        gps_latitude: geo.latitude, gps_longitude: geo.longitude, gps_accuracy: geo.accuracy, gps_captured_at: geo.capturedAt,
      } as any).eq("id", milestoneId);
      if (transactionId) {
        try {
          const result = await anchorProof(transactionId, "gps_verification", {
            milestoneId, latitude: geo.latitude, longitude: geo.longitude, accuracy: geo.accuracy, capturedAt: geo.capturedAt, capturedBy: role,
          });
          const loc = result?.resolvedLocation;
          if (loc?.formatted) {
            toast.success(`📍 ${loc.formatted}`, { duration: 6000 });
            await supabase.from("transaction_milestones").update({ gps_address: loc.formatted, gps_city: loc.city, gps_country: loc.country } as any).eq("id", milestoneId);
          } else toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
        } catch { toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`); }
      } else toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
    }
    await updateMilestone.mutateAsync({ milestoneId, userId, status: "completed" });
  };

  const handleReleaseMilestone = async (milestoneId: string, bypassFeeGate = false) => {
    if (isTestnet) { onTestnetRelease?.(milestoneId); return; }
    if (!bypassFeeGate) {
      const msIdx = milestones.findIndex((m: any) => m.id === milestoneId);
      const feeInfo = milestoneExternalFees[msIdx];
      if (feeInfo && feeInfo.unverified > 0) {
        const msTitle = (milestones[msIdx] as any)?.title || `Stage #${msIdx + 1}`;
        setPendingFeeGateRelease({ id: milestoneId, title: msTitle, unverifiedCount: feeInfo.unverified, unverifiedTotal: feeInfo.unverifiedAmount });
        return;
      }
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await releaseMilestonePayment.mutateAsync({ milestoneId, userId });
  };

  const handleInviteObserver = async (milestoneId: string, name: string, email: string) => {
    if (!name.trim() || !email.trim()) return toast.error("Observer name and email are required");
    if (isTestnet) { onTestnetInviteObserver?.(milestoneId, name.trim(), email.trim()); return; }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    const response = await addObserver.mutateAsync({
      transactionId, observerName: name.trim(), observerEmail: email.trim(),
      observerRole: "observer", milestoneIds: [milestoneId], userId,
    });
    const token = (response as any)?.accessToken;
    if (token) {
      const inviteLink = `${window.location.origin}/trustlock/audit/${token}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Observer invite link copied");
    }
  };

  // Empty state
  if (!isTestnet && !transactionId) return null;
  if (milestones.length === 0 && !isTestnet) {
    return (
      <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              {layoutLabels.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No records found for {txId} yet.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={handleInitializeMilestones} disabled={createMilestones.isPending}>
              {createMilestones.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {layoutMode === "single" ? "Initialize Escrow" : "Initialize Milestones"}
            </Button>
          </CardContent>
        </Card>
    );
  }
  if (milestones.length === 0) return null;

  // Offline Reconciliation Gate
  const indKey = industry?.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-") || "";
  const reconciliationTemplates = resolveBlueprint(industry);

  if (
    !isAdmin && fundsAreLocked && !reconciliationComplete &&
    reconciliationTemplates && reconciliationTemplates.length > 1 && layoutMode !== "single"
  ) {
    return (
      <OfflineReconciliation
          role={role} transactionId={transactionId} txId={txId} industry={industry}
          milestoneTemplates={reconciliationTemplates.map(t => ({
            name: t.name, percentage: t.percentage, documents: t.documents, description: t.description,
          }))}
          onReconciliationComplete={async (skipped) => {
            setSkippedMilestoneIndices(skipped);
            setReconciliationComplete(true);
            if (skipped.length > 0) {
              toast.success(`Work order adjusted — ${skipped.length} milestone(s) marked as completed offline`);
              // Update milestone statuses in DB
              if (transactionId) {
                const { data: dbMilestones } = await supabase
                  .from("transaction_milestones")
                  .select("id, position")
                  .eq("transaction_id", transactionId)
                  .order("position", { ascending: true });
                if (dbMilestones) {
                  const toUpdate = dbMilestones.filter(m => skipped.includes(m.position));
                  for (const ms of toUpdate) {
                    await supabase.from("transaction_milestones").update({
                      status: "completed_offline",
                      completed_at: new Date().toISOString(),
                    }).eq("id", ms.id);
                  }
                }
              }
            }
          }}
          isTestnet={isTestnet}
        />
    );
  }

  const blueprint = resolveBlueprint(industry);

  return (
    <>
    <Card className="border-primary/20">
        <CardHeader className="pb-2 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{LAYOUT_MODE_ICONS[layoutMode]}</span>
              <div>
                <CardTitle className="text-sm">
                  {layoutLabels.title}
                  {industry && <span className="text-muted-foreground font-normal ml-1 capitalize">— {industry.replace(/-/g, " ")}</span>}
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">{layoutLabels.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] capitalize">{layoutMode}</Badge>
              {isTestnet && <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Testnet</Badge>}
            </div>
          </div>

          <BlueprintSummary industry={industry} layoutMode={layoutMode} />
          <OverallProgress milestones={milestones} industry={industry} role={role} />

          {!isAdmin && layoutMode !== "single" && (
            <TradeScopeSelector value={tradeScope} onChange={setTradeScope} compact autoSet={false} />
          )}

          {milestones.length > 1 && (
            <ProgressStepper milestones={milestones} activeIndex={activeIndex} onStepClick={toggleStep} />
          )}
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {milestones.map((ms: any, idx: number) => {
            const row = idx + 1;
            const gateStatus = getDocGateStatus(ms, fundsAreLocked);
            const template = blueprint?.[idx] || null;
            const stepOwner = template?.owner || "vendor";
            const docOwners = template?.documentOwners || {};
            const isVendorStep = stepOwner === "vendor" || stepOwner === "both";
            const isBuyerStep = stepOwner === "buyer" || stepOwner === "both";
            const vendorFulfilled = ms.status === "completed" || ms.status === "released";
            const buyerReleased = ms.status === "released";
            const isDisputed = ms.status === "disputed";
            const isDone = ms.status === "completed" || ms.status === "released";
            const isActive = idx === activeIndex;
            const expanded = isExpanded(idx);
            const isDeleted = ms.status === "deleted";
            const uploadedDocs: any[] = ms.uploaded_documents || [];
            const rawRequiredDocs: string[] = ms.required_documents || [];
            const rawOptionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];
            const scopeFiltered = filterDocumentsByScope(rawRequiredDocs, rawOptionalDocs, tradeScope);
            const requiredDocs = scopeFiltered.required;
            const optionalDocs = scopeFiltered.optional;
            const scopeDowngraded = scopeFiltered.scopeDowngraded;

            const canVendorFulfill = role === "vendor" && isVendorStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted";
            const canBuyerAct = role === "buyer" && isBuyerStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted";
            const canBuyerRelease = role === "buyer" && ms.status === "completed" && ms.is_payment_milestone && !ms.payment_released;
            const hasObserver = !!ms.observer_id;
            const vendorActionLabel = template?.vendorAction || (layoutMode === "offline" ? "Confirm Offline Step" : layoutMode === "single" ? "Confirm & Ship Order" : "Mark Fulfilled");
            const buyerActionLabel = template?.buyerAction || "Confirm & Approve";

            return (
              <div
                key={ms.id}
                className={`rounded-lg border transition-all ${
                  isDeleted ? "border-muted bg-muted/10 opacity-60" :
                  isActive ? "border-primary/40 bg-primary/[0.02] shadow-sm" :
                  isDone ? "border-primary/20 bg-primary/[0.01]" :
                  "border-border"
                }`}
              >
                {/* Collapsed Row */}
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/20 transition-colors rounded-lg"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    isDeleted ? "bg-muted text-muted-foreground" :
                    ms.status === "released" ? "bg-primary text-primary-foreground" :
                    isDone ? "bg-primary/20 text-primary" :
                    isActive ? "bg-primary/10 text-primary ring-2 ring-primary/30" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isDeleted ? "✕" : isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : row}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                        {layoutMode === "single" ? "Escrow Delivery" : ms.title}
                      </span>
                      {ms.is_payment_milestone && <Badge className="text-[8px] h-4 px-1 shrink-0">{ms.payment_percentage || 100}%</Badge>}
                      {!isDone && !isDeleted && (
                        <Badge variant="outline" className={`text-[7px] h-3.5 px-1 shrink-0 ${
                          stepOwner === "vendor" ? "border-primary/30 text-primary" :
                          stepOwner === "buyer" ? "border-accent/30 text-accent" :
                          "border-muted-foreground/30 text-muted-foreground"
                        }`}>
                          {stepOwner === "both" ? "Both" : stepOwner === "vendor" ? "Vendor" : "Buyer"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[8px] h-4 ${
                        isDone ? "border-primary/30 text-primary" : isActive ? "border-primary/40 text-primary" : "border-border"
                      }`}>
                        {statusLabel[ms.status] || ms.status}
                      </Badge>
                      {uploadedDocs.length > 0 && <span className="text-[9px] text-muted-foreground">{uploadedDocs.length} doc(s)</span>}
                      {ms.gps_latitude && <MapPin className="w-2.5 h-2.5 text-primary" />}
                      {gateStatus.mode === "required" && !gateStatus.satisfied && <AlertTriangle className="w-2.5 h-2.5 text-destructive" />}
                      {isDisputed && <Badge variant="destructive" className="text-[8px] h-4">Disputed</Badge>}
                      {role === "buyer" && vendorFulfilled && !buyerReleased && (
                        <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Vendor ✅</Badge>
                      )}
                      {role === "buyer" && !vendorFulfilled && !isDisputed && ms.status !== "deleted" && (
                        <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30 text-muted-foreground">Vendor ⏳</Badge>
                      )}
                      {role === "vendor" && vendorFulfilled && !buyerReleased && ms.is_payment_milestone && (
                        <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30 text-muted-foreground">Buyer ⏳</Badge>
                      )}
                      {role === "vendor" && buyerReleased && (
                        <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Buyer ✅</Badge>
                      )}
                      {isAdmin && (
                        <span className="text-[8px] text-muted-foreground">
                          V:{vendorFulfilled ? "✅" : "⏳"} B:{buyerReleased ? "✅" : vendorFulfilled ? "⏳" : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                  {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded Content with Tabs */}
                {expanded && !isDeleted && (
                  <div className="px-3 pb-3 border-t border-border/50 pt-3 ml-9">
                    <div className="text-[11px] text-muted-foreground mb-2">
                      Amount: ${Number(ms.payment_amount || 0).toLocaleString()}
                    </div>
                    <Tabs defaultValue="actions" className="w-full">
                      <TabsList className="w-full h-8 grid grid-cols-3 mb-3">
                        <TabsTrigger value="actions" className="text-[10px] h-6 data-[state=active]:text-primary">⚡ Actions</TabsTrigger>
                        <TabsTrigger value="docs" className="text-[10px] h-6 data-[state=active]:text-primary">
                          📄 Docs
                          {requiredDocs.length > 0 && (
                            <Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-0.5">
                              {uploadedDocs.length}/{requiredDocs.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="text-[10px] h-6 data-[state=active]:text-primary">📝 Notes</TabsTrigger>
                      </TabsList>

                      <TabsContent value="actions" className="mt-0">
                        <MilestoneActionsTab
                          ms={ms} idx={idx} row={row} role={role} layoutMode={layoutMode}
                          template={template} gateStatus={gateStatus} fundsAreLocked={fundsAreLocked}
                          milestoneExternalFees={milestoneExternalFees} txId={txId} isAdmin={isAdmin}
                          vendorFulfilled={vendorFulfilled} buyerReleased={buyerReleased}
                          isDisputed={isDisputed} isDone={isDone}
                          canVendorFulfill={canVendorFulfill} canBuyerAct={canBuyerAct}
                          canBuyerRelease={canBuyerRelease}
                          vendorActionLabel={vendorActionLabel} buyerActionLabel={buyerActionLabel}
                          onMarkFulfilled={handleMarkFulfilled}
                          onReleaseMilestone={(id) => handleReleaseMilestone(id)}
                          onDeleteMilestone={(id, title) => setPendingDeleteMilestone({ id, title })}
                        />
                      </TabsContent>

                      <TabsContent value="docs" className="mt-0">
                        <MilestoneDocsTab
                          ms={ms} role={role} isAdmin={isAdmin} isDone={isDone}
                          isTestnet={isTestnet} transactionId={transactionId}
                          requiredDocs={requiredDocs} optionalDocs={optionalDocs}
                          uploadedDocs={uploadedDocs} gateStatus={gateStatus}
                          docOwners={docOwners} scopeDowngraded={scopeDowngraded}
                          tradeScope={tradeScope} docTypeSelections={docTypeSelections}
                          setDocTypeSelections={setDocTypeSelections}
                          onTestnetAddDocument={onTestnetAddDocument}
                          getUserId={getUserId} updateMilestone={updateMilestone}
                        />
                      </TabsContent>

                      <TabsContent value="notes" className="mt-0">
                        <MilestoneNotesTab
                          ms={ms} idx={idx} role={role} isAdmin={isAdmin} isDone={isDone}
                          industry={industry} transactionId={transactionId} isTestnet={isTestnet}
                          tradeScope={tradeScope} milestones={milestones}
                          industryNeedsObservers={industryNeedsObservers}
                          hasObserver={hasObserver} observers={observers}
                          notes={notes} setNotes={setNotes}
                          dismissedObserverPrompts={dismissedObserverPrompts}
                          setDismissedObserverPrompts={setDismissedObserverPrompts}
                          milestoneExternalFees={milestoneExternalFees}
                          setMilestoneExternalFees={setMilestoneExternalFees}
                          onSaveNote={handleSaveNote}
                          onInviteObserver={(id, name, email) => handleInviteObserver(id, name, email)}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {expanded && isDeleted && !fundsAreLocked && (
                  <div className="px-3 pb-3 ml-9">
                    <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={() => setPendingRestoreMilestone({ id: ms.id, title: ms.title })}>
                      <RotateCcw className="w-3 h-3 mr-1" /> Restore Stage
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

    <MilestoneDialogs
      isTestnet={isTestnet}
      pendingDeleteMilestone={pendingDeleteMilestone}
      setPendingDeleteMilestone={setPendingDeleteMilestone}
      pendingRestoreMilestone={pendingRestoreMilestone}
      setPendingRestoreMilestone={setPendingRestoreMilestone}
      pendingFeeGateRelease={pendingFeeGateRelease}
      setPendingFeeGateRelease={setPendingFeeGateRelease}
      onTestnetUpdateStatus={onTestnetUpdateStatus}
      onReleaseMilestone={handleReleaseMilestone}
      getUserId={getUserId}
    />
    </>
  );
};

export default MilestoneWorkOrderPanel;

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Copy, FileText, Loader2, MapPin, StickyNote, Trash2, UserPlus, X, AlertTriangle, User, ShieldCheck, RotateCcw, FileWarning } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "@/components/shared/DocumentUpload";
import TLId from "@/components/shared/TLId";
import { woTLId } from "@/lib/tlIdRegistry";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  useAddTransactionObserver,
  useCreateMilestones,
  useReleaseMilestonePayment,
  useTransactionMilestones,
  useTransactionObservers,
  useUpdateMilestone,
} from "@/hooks/useSupabaseData";
import type { MockMilestone } from "@/hooks/useTestnetData";

type OrderType = "simple" | "milestone" | "hybrid";

interface MilestoneWorkOrderPanelProps {
  transactionId?: string | null;
  txId: string;
  industry?: string | null;
  role: "buyer" | "vendor";
  transactionStatus?: string;
  orderType?: OrderType;
  isTestnet?: boolean;
  testnetMilestones?: MockMilestone[];
  onTestnetUpdateStatus?: (milestoneId: string, status: MockMilestone["status"]) => void;
  onTestnetSaveNote?: (milestoneId: string, note: string) => void;
  onTestnetAddDocument?: (milestoneId: string, doc: { name: string; url: string }) => void;
  onTestnetInviteObserver?: (milestoneId: string, name: string, email: string) => string | void;
  onTestnetRelease?: (milestoneId: string) => void;
  onTestnetAddGps?: (milestoneId: string, lat: number, lng: number, accuracy: number) => void;
}

/** Statuses where funds are already locked — milestone deletion is blocked */
const FUNDS_LOCKED_STATUSES = new Set([
  "locked", "shipped", "delivered", "released", "disputed",
  "compliance_hold", "compliance_review", "blocked",
]);

/**
 * Industry layout mode determines how the work order panel renders:
 * - "linear"     → Traditional milestone progression (manufacturing, freelance, etc.)
 * - "single"     → Single escrow release, no progressive milestones (real estate, ecommerce)
 * - "inspection" → Milestone + mandatory observer/inspection gates (mining, oil & gas, pharma)
 * - "offline"    → Steps happen offline, parties confirm receipt digitally (real estate, legal)
 */
type LayoutMode = "linear" | "single" | "inspection" | "offline";

/** Map all 25+ industries to their default layout mode */
const INDUSTRY_LAYOUT: Record<string, LayoutMode> = {
  // ── Inspection-Gated (observer/inspector required, heavy compliance) ──
  "oil-gas": "inspection",
  "oil_gas": "inspection",
  "energy": "inspection",
  "renewable-energy": "inspection",
  "renewable_energy": "inspection",
  "mining": "inspection",
  "pharma": "inspection",
  "pharmaceutical": "inspection",
  "agriculture": "inspection",
  "marine": "inspection",
  "water-wash": "inspection",
  "water_wash": "inspection",
  "food-beverage": "inspection",
  "food_beverage": "inspection",
  "waste-recycling": "inspection",
  "waste_recycling": "inspection",
  "aviation": "inspection",

  // ── Offline Confirmation (steps happen offline, digital confirmation) ──
  "real-estate": "offline",
  "real_estate": "offline",
  "legal": "offline",
  "insurance": "offline",
  "construction": "offline",

  // ── Single Release (simple delivery → release) ──
  "ecommerce": "single",
  "e-commerce": "single",
  "tourism": "single",
  "hospitality-travel": "single",
  "hospitality_travel": "single",

  // ── Linear Progressive (milestone-by-milestone delivery) ──
  "freelance": "linear",
  "digital-services": "linear",
  "digital_services": "linear",
  "professional-services": "linear",
  "professional_services": "linear",
  "education": "linear",
  "manufacturing": "linear",
  "textiles": "linear",
  "automotive": "linear",
  "telecom": "linear",
  "telecommunications": "linear",
  "media": "linear",
  "media-entertainment": "linear",
  "media_entertainment": "linear",
  "logistics": "linear",
};

function resolveLayoutMode(industry?: string | null, orderType?: OrderType): LayoutMode {
  if (orderType === "simple") return "single";
  if (industry && INDUSTRY_LAYOUT[industry]) return INDUSTRY_LAYOUT[industry];
  if (orderType === "milestone") return "linear";
  return "linear"; // default
}

/** Industries where observer is NOT required on any milestone */
const OBSERVER_FREE_INDUSTRIES = new Set([
  "ecommerce", "tourism", "freelance", "education",
  "e-commerce", "digital-services", "hospitality-travel", "professional-services",
]);

const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Fulfilled",
  released: "Released",
  deleted: "Removed",
};

const LAYOUT_MODE_LABELS: Record<LayoutMode, { title: string; description: string }> = {
  linear: { title: "Milestone Work Order Flow", description: "Progressive milestone delivery" },
  single: { title: "Escrow Release Flow", description: "Single release upon delivery confirmation" },
  inspection: { title: "Inspection-Gated Work Order", description: "Observer-verified milestone delivery" },
  offline: { title: "Offline Confirmation Flow", description: "Parties confirm offline steps digitally" },
};

/* ---------- Sub-components ---------- */

interface ObserverInviteProps {
  role: "buyer" | "vendor";
  row: number;
  observerName: string;
  observerEmail: string;
  setObserverName: (v: string) => void;
  setObserverEmail: (v: string) => void;
  onInvite: () => void;
  onDismiss: () => void;
}

const ObserverInviteSection = ({ role, row, observerName, observerEmail, setObserverName, setObserverEmail, onInvite, onDismiss }: ObserverInviteProps) => (
  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 space-y-2 relative">
    <button
      onClick={onDismiss}
      className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-amber-500/20 transition-colors"
      aria-label="Dismiss"
    >
      <X className="w-3.5 h-3.5 text-amber-700" />
    </button>
    <p className="text-[11px] font-medium text-amber-700 pr-5">Observer recommended for this milestone. Invite one before next phase.</p>
    <div className="grid sm:grid-cols-2 gap-2">
      <TLId code={woTLId(role, row, "INP-OBS-NAME")} inline>
        <Input placeholder="Observer name" value={observerName} onChange={(e) => setObserverName(e.target.value)} />
      </TLId>
      <TLId code={woTLId(role, row, "INP-OBS-EMAIL")} inline>
        <Input placeholder="Observer email" value={observerEmail} onChange={(e) => setObserverEmail(e.target.value)} />
      </TLId>
    </div>
    <TLId code={woTLId(role, row, "BTN-OBS-INVITE")} inline>
      <Button size="sm" variant="outline" onClick={onInvite}>
        <UserPlus className="w-3 h-3 mr-1" /> Invite Observer + Copy Link
      </Button>
    </TLId>
  </div>
);

interface ObserverLinkedProps {
  role: "buyer" | "vendor";
  row: number;
  milestoneId: string;
  observers: any[];
}

const ObserverLinkedSection = ({ role, row, milestoneId, observers }: ObserverLinkedProps) => (
  <div className="rounded-md border border-border p-2 text-[11px] text-muted-foreground space-y-1">
    <p className="font-medium text-foreground">Observer already linked to this milestone.</p>
    {observers
      .filter((obs: any) => {
        if (obs.milestone_ids) return obs.milestone_ids.includes(milestoneId);
        if (obs.milestoneId === milestoneId) return true;
        return false;
      })
      .map((obs: any) => {
        const link = obs.access_token || obs.observer_access_token
          ? `${window.location.origin}/trustlock/audit/${obs.access_token || obs.observer_access_token}`
          : null;
        return (
          <TLId key={obs.id || obs.observer_email} code={woTLId(role, row, "LBL-OBS-INFO")} inline>
            <div className="flex items-center gap-2 flex-wrap">
              <span>{obs.observer_name} ({obs.observer_email})</span>
              {link ? (
                <TLId code={woTLId(role, row, `BTN-OBS-COPY`)} inline>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(link);
                      toast.success("Observer link copied");
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy Link
                  </Button>
                </TLId>
              ) : null}
            </div>
          </TLId>
        );
      })}
  </div>
);

/* ---------- Main Component ---------- */

const MilestoneWorkOrderPanel = ({
  transactionId,
  txId,
  industry,
  role,
  transactionStatus,
  orderType,
  isTestnet = false,
  testnetMilestones,
  onTestnetUpdateStatus,
  onTestnetSaveNote,
  onTestnetAddDocument,
  onTestnetInviteObserver,
  onTestnetRelease,
  onTestnetAddGps,
}: MilestoneWorkOrderPanelProps) => {
  // Mainnet hooks (only run when NOT testnet)
  const { data: dbMilestones = [] } = useTransactionMilestones(isTestnet ? undefined : (transactionId || undefined));
  const { data: dbObservers = [] } = useTransactionObservers(isTestnet ? undefined : (transactionId || undefined));
  const createMilestones = useCreateMilestones();
  const updateMilestone = useUpdateMilestone();
  const releaseMilestonePayment = useReleaseMilestonePayment();
  const addObserver = useAddTransactionObserver();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [observerName, setObserverName] = useState("");
  const [observerEmail, setObserverEmail] = useState("");
  const [dismissedObserverPrompts, setDismissedObserverPrompts] = useState<Set<string>>(new Set());
  const [pendingDeleteMilestone, setPendingDeleteMilestone] = useState<{ id: string; title: string } | null>(null);
  const [pendingRestoreMilestone, setPendingRestoreMilestone] = useState<{ id: string; title: string } | null>(null);
  const [docTypeSelections, setDocTypeSelections] = useState<Record<string, string>>({});
  const { capturePosition, loading: gpsLoading } = useGeolocation();

  const fundsAreLocked = FUNDS_LOCKED_STATUSES.has(transactionStatus || "");

  const layoutMode = resolveLayoutMode(industry, orderType);
  const layoutLabels = LAYOUT_MODE_LABELS[layoutMode];

  const industryNeedsObservers = !OBSERVER_FREE_INDUSTRIES.has(industry || "");

  const rolePrefix = role === "vendor" ? "V" : "B";

  // Select data source
  const milestones = isTestnet ? (testnetMilestones || []) : dbMilestones;

  // Build observers list for testnet
  const observers = isTestnet
    ? (testnetMilestones || [])
        .filter(ms => ms.observer_id)
        .map(ms => ({
          id: ms.observer_id,
          observer_name: ms.observer_name,
          observer_email: ms.observer_email,
          access_token: ms.observer_access_token,
          milestoneId: ms.id,
        }))
    : dbObservers;

  const getUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  };

  const handleInitializeMilestones = async () => {
    if (isTestnet) {
      toast.info("Milestones auto-populated from industry template in testnet mode");
      return;
    }
    if (!transactionId) return;
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await createMilestones.mutateAsync({
      transactionId,
      userId,
      customMilestones: [{
        title: `${industry || "General"} fulfillment`,
        description: "Primary milestone for this work order",
        is_payment_milestone: true,
        payment_percentage: 100,
        required_documents: [],
        assigned_to: "vendor",
      }],
    });
  };

  const handleSaveNote = async (milestoneId: string) => {
    if (isTestnet) {
      onTestnetSaveNote?.(milestoneId, notes[milestoneId] ?? "");
      return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await updateMilestone.mutateAsync({ milestoneId, userId, description: notes[milestoneId] ?? "" });
  };

  /** Build a set of uploaded doc keys for matching */
  const getUploadedKeys = (ms: any): Set<string> => {
    const uploadedDocs: any[] = Array.isArray(ms.uploaded_documents) ? ms.uploaded_documents : [];
    const keys = new Set<string>();
    for (const d of uploadedDocs) {
      if (d.document_type) keys.add(d.document_type.toLowerCase());
      if (d.name) keys.add(d.name.toLowerCase());
    }
    return keys;
  };

  /** Check if a specific doc list is satisfied against uploads */
  const areDocsSatisfied = (docList: string[], uploadedKeys: Set<string>): boolean => {
    return docList.every((doc: string) => {
      const docLower = doc.toLowerCase();
      for (const key of uploadedKeys) {
        if (key.includes(docLower) || docLower.includes(key.replace(/\.[^.]+$/, ""))) return true;
      }
      return false;
    });
  };

  /** 
   * Three-tier document gate:
   * - "required" → hard block (must upload all required_documents)
   * - "optional" → soft warning (recommend but allow)
   * - "none"     → pass silently
   */
  const getDocGateStatus = (ms: any): { mode: string; satisfied: boolean; missingRequired: string[]; missingOptional: string[] } => {
    const mode: string = ms.document_mode || "none";
    const requiredDocs: string[] = Array.isArray(ms.required_documents) ? ms.required_documents : [];
    const optionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];
    const uploadedKeys = getUploadedKeys(ms);

    if (mode === "none" && requiredDocs.length === 0) {
      return { mode: "none", satisfied: true, missingRequired: [], missingOptional: [] };
    }

    const effectiveMode = requiredDocs.length > 0 ? (mode === "none" ? "required" : mode) : mode;

    const missingRequired = requiredDocs.filter((doc) => {
      const docLower = doc.toLowerCase();
      for (const key of uploadedKeys) {
        if (key.includes(docLower) || docLower.includes(key.replace(/\.[^.]+$/, ""))) return false;
      }
      return true;
    });

    const missingOptional = optionalDocs.filter((doc) => {
      const docLower = doc.toLowerCase();
      for (const key of uploadedKeys) {
        if (key.includes(docLower) || docLower.includes(key.replace(/\.[^.]+$/, ""))) return false;
      }
      return true;
    });

    const satisfied = effectiveMode === "required" ? missingRequired.length === 0 : true;

    return { mode: effectiveMode, satisfied, missingRequired, missingOptional };
  };

  /** Legacy compat wrapper */
  const isMilestoneDocGateSatisfied = (ms: any): boolean => getDocGateStatus(ms).satisfied;

  const handleMarkFulfilled = async (milestoneId: string) => {
    if (isTestnet) {
      // Even in testnet, enforce doc gate
      const milestone = (testnetMilestones || []).find((m) => m.id === milestoneId) as any;
      if (milestone) {
        const gate = getDocGateStatus(milestone);
        if (gate.mode === "required" && !gate.satisfied) {
          toast.error(`Cannot fulfill — upload required documents first: ${gate.missingRequired.join(", ")}`);
          return;
        }
        if (gate.mode === "optional" && gate.missingOptional.length > 0) {
          toast.warning(`Proceeding without recommended documents: ${gate.missingOptional.join(", ")}`, { duration: 5000 });
        }
      }
      onTestnetUpdateStatus?.(milestoneId, "completed");
      return;
    }

    // 3-tier document gate enforcement
    const milestone = milestones.find((m: any) => m.id === milestoneId) as any;
    if (milestone) {
      const gate = getDocGateStatus(milestone);
      if (gate.mode === "required" && !gate.satisfied) {
        toast.error(`Cannot fulfill — upload required documents first: ${gate.missingRequired.join(", ")}`);
        return;
      }
      if (gate.mode === "optional" && gate.missingOptional.length > 0) {
        toast.warning(`Proceeding without recommended documents: ${gate.missingOptional.join(", ")}`, { duration: 5000 });
      }
    }

    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    const geo = await capturePosition();
    if (geo) {
      await supabase.from("transaction_milestones").update({
        gps_latitude: geo.latitude,
        gps_longitude: geo.longitude,
        gps_accuracy: geo.accuracy,
        gps_captured_at: geo.capturedAt,
      } as any).eq("id", milestoneId);
      toast.success(`GPS: ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}`);
    }
    await updateMilestone.mutateAsync({ milestoneId, userId, status: "completed" });
  };

  const handleReleaseMilestone = async (milestoneId: string) => {
    if (isTestnet) {
      onTestnetRelease?.(milestoneId);
      return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    await releaseMilestonePayment.mutateAsync({ milestoneId, userId });
  };

  const handleInviteObserver = async (milestoneId: string) => {
    if (isTestnet) {
      if (!observerName.trim() || !observerEmail.trim()) {
        return toast.error("Observer name and email are required");
      }
      onTestnetInviteObserver?.(milestoneId, observerName.trim(), observerEmail.trim());
      setObserverName("");
      setObserverEmail("");
      return;
    }
    const userId = await getUserId();
    if (!userId) return toast.error("Sign in required");
    if (!observerName.trim() || !observerEmail.trim()) {
      return toast.error("Observer name and email are required");
    }
    const response = await addObserver.mutateAsync({
      transactionId,
      observerName: observerName.trim(),
      observerEmail: observerEmail.trim(),
      observerRole: "observer",
      milestoneIds: [milestoneId],
      userId,
    });
    const token = (response as any)?.accessToken;
    if (token) {
      const inviteLink = `${window.location.origin}/trustlock/audit/${token}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Observer invite link copied");
    }
    setObserverName("");
    setObserverEmail("");
  };

  if (!isTestnet && !transactionId) return null;
  if (milestones.length === 0 && !isTestnet) {
    return (
      <TLId code={`TL-${rolePrefix}-WO-PANEL`}>
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{layoutLabels.title}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{layoutLabels.description}</p>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {layoutMode === "single"
                ? `No escrow record found for ${txId} yet.`
                : `No milestone records found for ${txId} yet.`}
            </p>
            <TLId code={`TL-${rolePrefix}-WO-BTN-INIT`} inline>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleInitializeMilestones} disabled={createMilestones.isPending}>
                {createMilestones.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                {layoutMode === "single" ? "Initialize Escrow Release" : "Initialize Milestones"}
              </Button>
            </TLId>
          </CardContent>
        </Card>
      </TLId>
    );
  }

  if (milestones.length === 0) return null;

  return (
    <>
    <TLId code={`TL-${rolePrefix}-WO-PANEL`}>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm">{layoutLabels.title}</CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">{layoutLabels.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] capitalize">{layoutMode}</Badge>
              {isTestnet && <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Testnet Simulation</Badge>}
            </div>
          </div>
          {/* Layout-specific guidance banners */}
          {layoutMode === "single" && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
              <strong>Simple Escrow:</strong> Funds are held until delivery is confirmed. No progressive milestones — a single release completes the transaction.
            </div>
          )}
          {layoutMode === "offline" && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
              <strong>Offline Confirmation:</strong> Steps in this transaction (e.g., title transfer, notary signing, property inspection) happen offline. Each party confirms completion digitally to move the escrow forward.
            </div>
          )}
          {layoutMode === "inspection" && (
            <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
              <strong>Inspection-Gated:</strong> Milestones require third-party observer verification before release. Invite inspectors, auditors, or certifiers for each stage.
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.map((ms: any, idx: number) => {
            const row = idx + 1;
            const gateStatus = getDocGateStatus(ms);
            const docGatePassed = gateStatus.satisfied;
            const canVendorFulfill = role === "vendor" && ms.status !== "completed" && ms.status !== "released";
            const canBuyerRelease =
              role === "buyer" &&
              ms.status === "completed" &&
              ms.is_payment_milestone &&
              !ms.payment_released;

            const hasObserver = isTestnet ? !!ms.observer_id : !!ms.observer_id;

            return (
              <div key={ms.id} className={`rounded-lg border border-border p-3 space-y-2 ${layoutMode === "single" ? "bg-muted/20" : ""}`}>
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {layoutMode !== "single" && <span className="text-xs font-bold">#{row}</span>}
                    <TLId code={woTLId(role, row, "LBL-TITLE")} inline>
                      <span className="text-sm font-medium">
                        {layoutMode === "single" ? "Escrow Delivery Confirmation" : ms.title}
                      </span>
                    </TLId>
                  </div>
                  <div className="flex items-center gap-2">
                    <TLId code={woTLId(role, row, "STS")} inline>
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabel[ms.status] || ms.status}
                      </Badge>
                    </TLId>
                    {ms.is_payment_milestone ? (
                      <TLId code={woTLId(role, row, "BDG-PAY")} inline>
                        <Badge className="text-[10px]">Payment Milestone</Badge>
                      </TLId>
                    ) : null}
                  </div>
                </div>

                {/* Info Row */}
                <TLId code={woTLId(role, row, "LBL-AMOUNT")} inline>
                  <div className="text-[11px] text-muted-foreground">
                    Amount: ${Number(ms.payment_amount || 0).toLocaleString()} · Uploaded docs: {(ms.uploaded_documents || []).length}
                    {ms.gps_latitude && (
                      <TLId code={woTLId(role, row, "LBL-GPS")} inline>
                        <span className="ml-2 inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-primary" />
                          {Number(ms.gps_latitude).toFixed(4)}, {Number(ms.gps_longitude).toFixed(4)}
                        </span>
                      </TLId>
                    )}
                  </div>
                </TLId>

                {/* Document Gate Checklist — 3-tier: required / optional / none */}
                {(() => {
                  const requiredDocs: string[] = ms.required_documents || [];
                  const optionalDocs: string[] = Array.isArray(ms.optional_documents) ? ms.optional_documents : [];
                  const uploadedDocs: any[] = ms.uploaded_documents || [];
                  if (requiredDocs.length === 0 && optionalDocs.length === 0) return null;

                  const uploadedKeys = getUploadedKeys(ms);
                  const checkDoc = (doc: string) => {
                    const docLower = doc.toLowerCase();
                    for (const key of uploadedKeys) {
                      if (key.includes(docLower) || docLower.includes(key.replace(/\.[^.]+$/, ""))) return true;
                    }
                    return false;
                  };

                  return (
                    <div className="rounded-md border border-border p-2 space-y-2">
                      {/* Required docs — hard gate */}
                      {requiredDocs.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Required Documents
                            <Badge variant="outline" className={`text-[8px] ml-1 ${gateStatus.missingRequired.length === 0 ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>
                              {gateStatus.missingRequired.length === 0 ? "All uploaded" : `${gateStatus.missingRequired.length} missing — blocks fulfillment`}
                            </Badge>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {requiredDocs.map((doc: string) => {
                              const isMet = checkDoc(doc);
                              return (
                                <Badge key={doc} variant="outline" className={`text-[8px] ${isMet ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"}`}>
                                  {isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                                  {doc}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Optional docs — soft warning */}
                      {optionalDocs.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground">
                            <FileWarning className="w-3 h-3" /> Recommended Documents
                            <Badge variant="outline" className="text-[8px] ml-1 border-muted-foreground/30 text-muted-foreground">
                              {gateStatus.missingOptional.length === 0 ? "All uploaded" : `${gateStatus.missingOptional.length} pending — won't block`}
                            </Badge>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {optionalDocs.map((doc: string) => {
                              const isMet = checkDoc(doc);
                              return (
                                <Badge key={doc} variant="outline" className={`text-[8px] ${isMet ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
                                  {isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <FileWarning className="w-2.5 h-2.5 mr-0.5" />}
                                  {doc}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Previously Uploaded Documents — visible to both parties with attribution */}
                {(() => {
                  const uploadedDocs: any[] = ms.uploaded_documents || [];
                  if (uploadedDocs.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold">Uploaded Documents</p>
                      <div className="flex flex-wrap gap-1">
                        {uploadedDocs.map((doc: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[8px] gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            {doc.document_type ? <span className="font-semibold">[{doc.document_type}]</span> : null}
                            {doc.name}
                            {doc.uploaded_by_role && (
                              <span className="text-muted-foreground ml-0.5 flex items-center gap-0.5">
                                <User className="w-2 h-2" />
                                {doc.uploaded_by_role}
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Description */}
                {ms.description && (
                  <p className="text-[11px] text-muted-foreground italic">{ms.description}</p>
                )}

                {/* Observer Invite — only for industries that need observers */}
                {role === "vendor" && !hasObserver && industryNeedsObservers && !dismissedObserverPrompts.has(ms.id) && (
                  <ObserverInviteSection
                    role={role}
                    row={row}
                    observerName={observerName}
                    observerEmail={observerEmail}
                    setObserverName={setObserverName}
                    setObserverEmail={setObserverEmail}
                    onInvite={() => handleInviteObserver(ms.id)}
                    onDismiss={() => setDismissedObserverPrompts(prev => new Set(prev).add(ms.id))}
                  />
                )}

                {/* Observer Linked */}
                {role === "vendor" && hasObserver && (
                  <ObserverLinkedSection role={role} row={row} milestoneId={ms.id} observers={observers} />
                )}

                {/* Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium flex items-center gap-1">
                    <StickyNote className="w-3 h-3" /> Milestone note
                  </label>
                  <TLId code={woTLId(role, row, "INP-NOTE")} inline>
                    <Textarea
                      rows={2}
                      value={notes[ms.id] ?? ms.description ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [ms.id]: e.target.value }))}
                      placeholder="Add implementation notes for this milestone"
                    />
                  </TLId>
                  <TLId code={woTLId(role, row, "BTN-NOTE-SAVE")} inline>
                    <Button size="sm" variant="outline" onClick={() => handleSaveNote(ms.id)}>
                      Save Note
                    </Button>
                  </TLId>
                </div>

                {/* Document Type Selector (for required document gates) */}
                {(() => {
                  const requiredDocs: string[] = ms.required_documents || [];
                  if (requiredDocs.length === 0) return null;
                  return (
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium">Tag upload as document type:</label>
                      <Select
                        value={docTypeSelections[ms.id] || ""}
                        onValueChange={(val) => setDocTypeSelections(prev => ({ ...prev, [ms.id]: val }))}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Evidence</SelectItem>
                          {requiredDocs.map((doc: string) => (
                            <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {/* Document Upload */}
                {isTestnet ? (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium">Upload milestone evidence</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        const name = `Evidence-${ms.title.replace(/\s/g, "_")}-${Date.now()}.pdf`;
                        onTestnetAddDocument?.(ms.id, { name, url: `testnet://mock/${name}` });
                      }}
                    >
                      <FileText className="w-3 h-3 mr-1" /> Simulate Upload
                    </Button>
                  </div>
                ) : (
                  <TLId code={woTLId(role, row, "UPL-EVIDENCE")}>
                    <DocumentUpload
                      label="Upload milestone evidence"
                      context={{ bucket: "milestone-documents", transactionId, milestoneId: ms.id }}
                      onUploadComplete={(files) => {
                        void (async () => {
                          const userId = await getUserId();
                          if (!userId) return;
                          const selectedDocType = docTypeSelections[ms.id] || "general";
                          await updateMilestone.mutateAsync({
                            milestoneId: ms.id,
                            userId,
                            uploadedDocuments: files.map((file) => ({
                              name: file.name,
                              url: file.url,
                              path: file.path,
                              uploadedAt: new Date().toISOString(),
                              uploaded_by: userId,
                              uploaded_by_role: role,
                              document_type: selectedDocType,
                            })),
                          });
                          // Reset doc type selection after upload
                          setDocTypeSelections(prev => ({ ...prev, [ms.id]: "" }));
                        })();
                      }}
                    />
                  </TLId>
                )}

                {/* Offline mode — contextual guidance */}
                {layoutMode === "offline" && ms.status === "pending" && (
                  <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                    💼 This step is expected to happen offline (e.g., property inspection, title signing, notary visit). Once completed, use the button below to confirm digitally.
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {canVendorFulfill ? (
                    <TLId code={woTLId(role, row, "BTN-FULFILL")} inline>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleMarkFulfilled(ms.id)}
                          disabled={!docGatePassed && (ms.required_documents || []).length > 0}
                          variant={!docGatePassed && (ms.required_documents || []).length > 0 ? "outline" : "default"}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {layoutMode === "offline" ? "Confirm Offline Step Complete" : layoutMode === "single" ? "Confirm Delivery" : "Mark Fulfilled"}
                        </Button>
                        {!docGatePassed && (ms.required_documents || []).length > 0 && (
                          <p className="text-[9px] text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Upload required documents to unlock
                          </p>
                        )}
                      </div>
                    </TLId>
                  ) : null}

                {canBuyerRelease ? (
                    <>
                      {/* ⚠️ Signature Required Banner */}
                      <div className="w-full flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-700">⚠️ Your Signature is Required</p>
                          <p className="text-amber-600 mt-0.5">
                            The vendor has marked <strong>Stage #{row} — {ms.title}</strong> as fulfilled.
                            Review the deliverables and sign the Milestone Acknowledgement Form to release funds.
                            If unresolved, funds auto-release after 14 days.
                          </p>
                        </div>
                      </div>
                      <TLId code={woTLId(role, row, "BTN-RELEASE")} inline>
                        <Button size="sm" onClick={() => handleReleaseMilestone(ms.id)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Sign &amp; Release Milestone
                        </Button>
                      </TLId>
                    </>
                  ) : null}

                  {/* Delete — only pending milestones during pre-order (before funds locked) */}
                  {ms.status === "pending" && !fundsAreLocked && (
                    <TLId code={woTLId(role, row, "BTN-DELETE")} inline>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingDeleteMilestone({ id: ms.id, title: ms.title })}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove Stage
                      </Button>
                    </TLId>
                  )}

                  {/* Restore — only for soft-deleted milestones during pre-order */}
                  {ms.status === "deleted" && !fundsAreLocked && (
                    <TLId code={woTLId(role, row, "BTN-RESTORE")} inline>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary border-primary/30"
                        onClick={() => setPendingRestoreMilestone({ id: ms.id, title: ms.title })}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore Stage
                      </Button>
                    </TLId>
                  )}

                  {/* Request Amendment — shown after funds locked instead of delete */}
                  {ms.status === "pending" && fundsAreLocked && (
                    <TLId code={woTLId(role, row, "BTN-AMEND")} inline>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-muted-foreground"
                        onClick={() => toast.info("Amendment requests are handled through the milestone negotiation workflow. Contact admin or use the Change Request feature.")}
                      >
                        <FileWarning className="w-3 h-3 mr-1" /> Request Amendment
                      </Button>
                    </TLId>
                  )}

                  {ms.status === "completed" && role === "vendor" && (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Awaiting buyer release
                    </Badge>
                  )}

                  {ms.status === "released" && (
                    <Badge className="text-[10px] bg-primary/15 text-primary">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Payment Released
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TLId>

    {/* Milestone Delete Confirmation Dialog */}
    <AlertDialog open={!!pendingDeleteMilestone} onOpenChange={(open) => !open && setPendingDeleteMilestone(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Remove Milestone Stage?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>"{pendingDeleteMilestone?.title}"</strong> from this work order?
            You can restore it later if you change your mind (before funds are locked). The counterparty will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => {
              if (!pendingDeleteMilestone) return;
              if (isTestnet) {
                onTestnetUpdateStatus?.(pendingDeleteMilestone.id, "released");
                toast.success(`Stage "${pendingDeleteMilestone.title}" removed`);
                setPendingDeleteMilestone(null);
                return;
              }
              const userId = await getUserId();
              if (!userId) return toast.error("Sign in required");
              const { error } = await supabase.functions.invoke("escrow-manager", {
                body: { action: "delete_milestone", milestone_id: pendingDeleteMilestone.id, user_id: userId },
              });
              if (error) toast.error("Failed to remove milestone");
              else toast.success(`Stage "${pendingDeleteMilestone.title}" removed — you can restore it before funds are locked`);
              setPendingDeleteMilestone(null);
            }}
          >
            Yes, Remove Stage
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Milestone Restore Confirmation Dialog */}
    <AlertDialog open={!!pendingRestoreMilestone} onOpenChange={(open) => !open && setPendingRestoreMilestone(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" /> Restore Milestone Stage?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will restore <strong>"{pendingRestoreMilestone?.title}"</strong> back to active status.
            The milestone will return to "Pending" and the counterparty will be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (!pendingRestoreMilestone) return;
              if (isTestnet) {
                onTestnetUpdateStatus?.(pendingRestoreMilestone.id, "pending");
                toast.success(`Stage "${pendingRestoreMilestone.title}" restored`);
                setPendingRestoreMilestone(null);
                return;
              }
              const userId = await getUserId();
              if (!userId) return toast.error("Sign in required");
              const { error } = await supabase.functions.invoke("escrow-manager", {
                body: { action: "restore_milestone", milestone_id: pendingRestoreMilestone.id, user_id: userId },
              });
              if (error) toast.error("Failed to restore milestone");
              else toast.success(`Stage "${pendingRestoreMilestone.title}" restored to work order`);
              setPendingRestoreMilestone(null);
            }}
          >
            Yes, Restore Stage
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default MilestoneWorkOrderPanel;

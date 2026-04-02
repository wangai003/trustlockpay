import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Copy, FileText, Loader2, MapPin, StickyNote, Trash2, UserPlus, X, AlertTriangle } from "lucide-react";
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

interface MilestoneWorkOrderPanelProps {
  transactionId?: string | null;
  txId: string;
  industry?: string | null;
  role: "buyer" | "vendor";
  isTestnet?: boolean;
  testnetMilestones?: MockMilestone[];
  onTestnetUpdateStatus?: (milestoneId: string, status: MockMilestone["status"]) => void;
  onTestnetSaveNote?: (milestoneId: string, note: string) => void;
  onTestnetAddDocument?: (milestoneId: string, doc: { name: string; url: string }) => void;
  onTestnetInviteObserver?: (milestoneId: string, name: string, email: string) => string | void;
  onTestnetRelease?: (milestoneId: string) => void;
  onTestnetAddGps?: (milestoneId: string, lat: number, lng: number, accuracy: number) => void;
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Fulfilled",
  released: "Released",
};

/** Industries where observer is NOT required on any milestone */
const OBSERVER_FREE_INDUSTRIES = new Set([
  "ecommerce", "tourism", "freelance", "education",
  "e-commerce", "digital-services", "hospitality-travel", "professional-services",
]);

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
  const { capturePosition, loading: gpsLoading } = useGeolocation();

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

  const handleMarkFulfilled = async (milestoneId: string) => {
    if (isTestnet) {
      onTestnetUpdateStatus?.(milestoneId, "completed");
      return;
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
            <CardTitle className="text-sm">Milestone Work Order Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">No milestone records found for {txId} yet.</p>
            <TLId code={`TL-${rolePrefix}-WO-BTN-INIT`} inline>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleInitializeMilestones} disabled={createMilestones.isPending}>
                {createMilestones.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Initialize Milestones
              </Button>
            </TLId>
          </CardContent>
        </Card>
      </TLId>
    );
  }

  if (milestones.length === 0) return null;

  return (
    <TLId code={`TL-${rolePrefix}-WO-PANEL`}>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Milestone Work Order Flow</CardTitle>
            {isTestnet && <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">Testnet Simulation</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.map((ms: any, idx: number) => {
            const row = idx + 1;
            const canVendorFulfill = role === "vendor" && ms.status !== "completed" && ms.status !== "released";
            const canBuyerRelease =
              role === "buyer" &&
              ms.status === "completed" &&
              ms.is_payment_milestone &&
              !ms.payment_released;

            const hasObserver = isTestnet ? !!ms.observer_id : !!ms.observer_id;

            return (
              <div key={ms.id} className="rounded-lg border border-border p-3 space-y-2">
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">#{row}</span>
                    <TLId code={woTLId(role, row, "LBL-TITLE")} inline>
                      <span className="text-sm font-medium">{ms.title}</span>
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
                    {(ms.uploaded_documents || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ms.uploaded_documents.map((doc: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[9px]">
                            <FileText className="w-2.5 h-2.5 mr-0.5" /> {doc.name}
                          </Badge>
                        ))}
                      </div>
                    )}
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
                          await updateMilestone.mutateAsync({
                            milestoneId: ms.id,
                            userId,
                            uploadedDocuments: files.map((file) => ({
                              name: file.name,
                              url: file.url,
                              path: file.path,
                              uploadedAt: new Date().toISOString(),
                            })),
                          });
                        })();
                      }}
                    />
                  </TLId>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {canVendorFulfill ? (
                    <TLId code={woTLId(role, row, "BTN-FULFILL")} inline>
                      <Button size="sm" onClick={() => handleMarkFulfilled(ms.id)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Fulfilled
                      </Button>
                    </TLId>
                  ) : null}

                  {canBuyerRelease ? (
                    <TLId code={woTLId(role, row, "BTN-RELEASE")} inline>
                      <Button size="sm" onClick={() => handleReleaseMilestone(ms.id)}>
                        <FileText className="w-3 h-3 mr-1" /> Release Milestone
                      </Button>
                    </TLId>
                  ) : null}

                  {/* Delete — only pending milestones can be removed during negotiation */}
                  {ms.status === "pending" && (
                    <TLId code={woTLId(role, row, "BTN-DELETE")} inline>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (isTestnet) {
                            onTestnetUpdateStatus?.(ms.id, "released"); // simulate removal in testnet
                            toast.success(`Stage "${ms.title}" removed`);
                            return;
                          }
                          const userId = await getUserId();
                          if (!userId) return toast.error("Sign in required");
                          const { error } = await supabase.functions.invoke("escrow-manager", {
                            body: { action: "delete_milestone", milestone_id: ms.id, user_id: userId },
                          });
                          if (error) toast.error("Failed to remove milestone");
                          else toast.success(`Stage "${ms.title}" removed from work order`);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove Stage
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
  );
};

export default MilestoneWorkOrderPanel;

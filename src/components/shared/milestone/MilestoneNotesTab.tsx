import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, MapPin, StickyNote, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import ExternalFeeTracker from "@/components/shared/ExternalFeeTracker";
import { getExternalFeeSuggestions } from "@/lib/externalFeeTemplates";
import type { TradeScope } from "@/components/shared/TradeScopeSelector";

interface MilestoneNotesTabProps {
  ms: any;
  idx: number;
  role: "buyer" | "vendor" | "admin";
  isAdmin: boolean;
  isDone: boolean;
  industry?: string | null;
  transactionId?: string | null;
  isTestnet: boolean;
  tradeScope: TradeScope;
  milestones: any[];
  industryNeedsObservers: boolean;
  hasObserver: boolean;
  observers: any[];
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dismissedObserverPrompts: Set<string>;
  setDismissedObserverPrompts: React.Dispatch<React.SetStateAction<Set<string>>>;
  milestoneExternalFees: Record<number, { total: number; unverified: number; unverifiedAmount: number }>;
  setMilestoneExternalFees: React.Dispatch<React.SetStateAction<Record<number, { total: number; unverified: number; unverifiedAmount: number }>>>;
  onSaveNote: (milestoneId: string) => void;
  onInviteObserver: (milestoneId: string, name: string, email: string) => void;
}

const MilestoneNotesTab = ({
  ms, idx, role, isAdmin, isDone, industry, transactionId, isTestnet,
  tradeScope, milestones, industryNeedsObservers, hasObserver, observers,
  notes, setNotes, dismissedObserverPrompts, setDismissedObserverPrompts,
  milestoneExternalFees, setMilestoneExternalFees,
  onSaveNote, onInviteObserver,
}: MilestoneNotesTabProps) => {
  const [observerName, setObserverName] = useState("");
  const [observerEmail, setObserverEmail] = useState("");

  return (
    <div className="space-y-3">
      {ms.gps_latitude && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold flex items-center gap-1 text-primary"><MapPin className="w-3.5 h-3.5" /> GPS Verification</p>
          {ms.gps_address && <p className="text-[11px] font-medium">{ms.gps_address}</p>}
          <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            <span>Lat: {Number(ms.gps_latitude).toFixed(6)}</span>
            <span>Lng: {Number(ms.gps_longitude).toFixed(6)}</span>
            {ms.gps_accuracy && <span>Accuracy: ±{Number(ms.gps_accuracy).toFixed(0)}m</span>}
            {ms.gps_captured_at && <span>Captured: {new Date(ms.gps_captured_at).toLocaleString()}</span>}
          </div>
          {ms.gps_city && ms.gps_country && <p className="text-[10px] text-muted-foreground">{ms.gps_city}, {ms.gps_country}</p>}
        </div>
      )}

      {ms.description && <p className="text-[11px] text-muted-foreground italic">{ms.description}</p>}

      {role === "vendor" && !hasObserver && industryNeedsObservers && !dismissedObserverPrompts.has(ms.id) && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 space-y-2 relative">
          <button onClick={() => setDismissedObserverPrompts(prev => new Set(prev).add(ms.id))} className="absolute top-1.5 right-1.5 p-0.5 rounded hover:bg-amber-500/20" aria-label="Dismiss">
            <X className="w-3.5 h-3.5 text-amber-700" />
          </button>
          <p className="text-[11px] font-medium text-amber-700 pr-5">Observer recommended for this milestone.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input placeholder="Observer name" value={observerName} onChange={(e) => setObserverName(e.target.value)} />
            <Input placeholder="Observer email" value={observerEmail} onChange={(e) => setObserverEmail(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => {
            onInviteObserver(ms.id, observerName, observerEmail);
            setObserverName("");
            setObserverEmail("");
          }}>
            <UserPlus className="w-3 h-3 mr-1" /> Invite Observer
          </Button>
        </div>
      )}

      {(role === "vendor" || isAdmin) && hasObserver && (
        <div className="rounded-md border border-border p-2 text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Observer linked</p>
          {observers.filter((obs: any) => (obs.milestone_ids ? obs.milestone_ids.includes(ms.id) : obs.milestoneId === ms.id)).map((obs: any) => {
            const link = obs.access_token || obs.observer_access_token
              ? `${window.location.origin}/trustlock/audit/${obs.access_token || obs.observer_access_token}` : null;
            return (
              <div key={obs.id || obs.observer_email} className="flex items-center gap-2 flex-wrap">
                <span>{obs.observer_name} ({obs.observer_email})</span>
                {link && !isAdmin && (
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Observer link copied"); }}>
                    <Copy className="w-3 h-3 mr-1" /> Copy Link
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin ? (
        ms.description && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</label>
            <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2">{ms.description}</p>
          </div>
        )
      ) : (
        <div className="space-y-1">
          <label className="text-[11px] font-medium flex items-center gap-1"><StickyNote className="w-3 h-3" /> Note</label>
          <Textarea rows={2} value={notes[ms.id] ?? ms.description ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [ms.id]: e.target.value }))} placeholder="Add notes for this milestone" />
          <Button size="sm" variant="outline" onClick={() => onSaveNote(ms.id)}>Save Note</Button>
        </div>
      )}

      {!isAdmin && !isDone && (
        <ExternalFeeTracker
          transactionId={transactionId} milestoneIndex={idx} milestoneName={ms.title}
          role={role} tradeScope={tradeScope}
          industrySuggestions={getExternalFeeSuggestions(industry || "")}
          isTestnet={isTestnet} totalMilestones={milestones.length}
          onFeeStatusChange={(info) => setMilestoneExternalFees(prev => ({ ...prev, [idx]: info }))}
        />
      )}
      {isAdmin && (
        <ExternalFeeTracker
          transactionId={transactionId} milestoneIndex={idx} milestoneName={ms.title}
          role={role} tradeScope={tradeScope} industrySuggestions={[]}
          isTestnet={isTestnet} totalMilestones={milestones.length} readOnly
        />
      )}
    </div>
  );
};

export default MilestoneNotesTab;

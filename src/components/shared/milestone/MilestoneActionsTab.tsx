import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, CheckCircle2, Eye, Lock, Trash2,
  FileWarning, Receipt, Scale, RotateCcw,
} from "lucide-react";
import { Banknote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  classifyAction, ACTION_STYLES, type LayoutMode, type MilestoneTemplate,
} from "./milestoneConstants";

interface MilestoneActionsTabProps {
  ms: any;
  idx: number;
  row: number;
  role: "buyer" | "vendor" | "admin";
  layoutMode: LayoutMode;
  template: MilestoneTemplate | null;
  gateStatus: { mode: string; satisfied: boolean; missingRequired: string[] };
  fundsAreLocked: boolean;
  milestoneExternalFees: Record<number, { total: number; unverified: number; unverifiedAmount: number }>;
  txId: string;
  isAdmin: boolean;
  vendorFulfilled: boolean;
  buyerReleased: boolean;
  isDisputed: boolean;
  isDone: boolean;
  canVendorFulfill: boolean;
  canBuyerAct: boolean;
  canBuyerRelease: boolean;
  vendorActionLabel: string;
  buyerActionLabel: string;
  onMarkFulfilled: (id: string) => void;
  onReleaseMilestone: (id: string) => void;
  onDeleteMilestone: (id: string, title: string) => void;
}

const MilestoneActionsTab = ({
  ms, idx, row, role, layoutMode, template, gateStatus,
  fundsAreLocked, milestoneExternalFees, txId, isAdmin,
  vendorFulfilled, buyerReleased, isDisputed, isDone,
  canVendorFulfill, canBuyerAct, canBuyerRelease,
  vendorActionLabel, buyerActionLabel,
  onMarkFulfilled, onReleaseMilestone, onDeleteMilestone,
}: MilestoneActionsTabProps) => {
  const navigate = useNavigate();
  const stepOwner = template?.owner || "vendor";
  const isVendorStep = stepOwner === "vendor" || stepOwner === "both";
  const isBuyerStep = stepOwner === "buyer" || stepOwner === "both";

  return (
    <div className="space-y-3">
      {layoutMode === "offline" && ms.status === "pending" && (
        <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
          💼 This step happens offline. Once completed, confirm digitally below.
        </div>
      )}

      {/* Enhanced waiting states with nudges */}
      {role === "vendor" && !isVendorStep && ms.status !== "completed" && ms.status !== "released" && ms.status !== "deleted" && (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Lock className="w-4 h-4 shrink-0 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground">Waiting for buyer</p>
              <p>This step is buyer-driven. They need to: <span className="font-medium text-foreground">{buyerActionLabel}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
            Notification sent to buyer
          </div>
        </div>
      )}
      {role === "buyer" && !isBuyerStep && !vendorFulfilled && ms.status !== "deleted" && ms.status !== "released" && (
        <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Lock className="w-4 h-4 shrink-0 text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground">Waiting for vendor</p>
              <p>This step is vendor-driven. They need to: <span className="font-medium text-foreground">{vendorActionLabel}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent/60 animate-pulse" />
            Notification sent to vendor
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold flex items-center gap-1"><Eye className="w-3 h-3" /> Admin View</p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Vendor:</span>
              {vendorFulfilled
                ? <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Fulfilled ✅</Badge>
                : <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30">Pending ⏳</Badge>
              }
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Buyer:</span>
              {buyerReleased
                ? <Badge variant="outline" className="text-[8px] h-4 border-primary/30 text-primary">Released ✅</Badge>
                : vendorFulfilled
                  ? <Badge variant="outline" className="text-[8px] h-4 border-accent/30 text-accent">Action Required ⏳</Badge>
                  : <Badge variant="outline" className="text-[8px] h-4 border-muted-foreground/30">Waiting —</Badge>
              }
            </div>
          </div>
          {isDisputed && (
            <div className="flex items-center gap-1 text-destructive text-[10px] font-medium mt-1">
              <AlertTriangle className="w-3 h-3" /> Dispute active — review in Disputes tab
            </div>
          )}
          {ms.is_payment_milestone && (
            <p className="text-[9px] text-muted-foreground">
              💰 Payment milestone · {ms.payment_percentage || 100}% · ${Number(ms.payment_amount || 0).toLocaleString()}
            </p>
          )}
          <p className="text-[9px] text-muted-foreground">
            🎯 Step owned by: <span className="font-semibold capitalize">{stepOwner}</span>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1">
        {canVendorFulfill && (() => {
          const actionType = classifyAction(vendorActionLabel);
          const style = ACTION_STYLES[actionType];
          const ActionIcon = style.icon;
          return (
            <div className="flex flex-col gap-1">
              <Button
                size="default" variant="outline"
                onClick={() => onMarkFulfilled(ms.id)}
                disabled={gateStatus.mode === "required" && !gateStatus.satisfied}
                className={`w-full ${gateStatus.mode === "required" && !gateStatus.satisfied ? "opacity-50 border-muted" : style.className}`}
              >
                <ActionIcon className="w-4 h-4 mr-2" /> {vendorActionLabel}
              </Button>
              {gateStatus.mode === "required" && !gateStatus.satisfied && (
                <p className="text-[9px] text-destructive flex items-center gap-0.5 justify-center">
                  <AlertTriangle className="w-2.5 h-2.5" /> Upload {gateStatus.missingRequired.length} required doc(s) to unlock
                </p>
              )}
            </div>
          );
        })()}

        {canBuyerAct && !canBuyerRelease && (() => {
          const actionType = classifyAction(buyerActionLabel);
          const style = ACTION_STYLES[actionType];
          const ActionIcon = style.icon;
          return (
            <div className="flex flex-col gap-1">
              <Button
                size="default" variant="outline"
                onClick={() => onMarkFulfilled(ms.id)}
                disabled={gateStatus.mode === "required" && !gateStatus.satisfied}
                className={`w-full ${gateStatus.mode === "required" && !gateStatus.satisfied ? "opacity-50 border-muted" : style.className}`}
              >
                <ActionIcon className="w-4 h-4 mr-2" /> {buyerActionLabel}
              </Button>
              {gateStatus.mode === "required" && !gateStatus.satisfied && (
                <p className="text-[9px] text-destructive flex items-center gap-0.5 justify-center">
                  <AlertTriangle className="w-2.5 h-2.5" /> Upload {gateStatus.missingRequired.length} required doc(s) to unlock
                </p>
              )}
            </div>
          );
        })()}

        {canBuyerRelease && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-700">⚠️ Your Signature Required</p>
                <p className="text-amber-600 mt-0.5">Stage #{row} — {ms.title} is fulfilled. Review and release funds.</p>
              </div>
            </div>
            {milestoneExternalFees[idx]?.unverified > 0 && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs">
                <Receipt className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">{milestoneExternalFees[idx].unverified} unverified external fee(s)</p>
                  <p className="text-destructive/70 text-[10px] mt-0.5">${milestoneExternalFees[idx].unverifiedAmount.toLocaleString()} in third-party costs not yet confirmed.</p>
                </div>
              </div>
            )}
            <Button size="default" className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg ring-1 ring-amber-400/30" onClick={() => onReleaseMilestone(ms.id)}>
              <Banknote className="w-4 h-4 mr-2" /> Sign & Release Milestone
            </Button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!isAdmin && ms.status === "pending" && !fundsAreLocked && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs" onClick={() => onDeleteMilestone(ms.id, ms.title)}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          )}
          {!isAdmin && ms.status === "pending" && fundsAreLocked && (
            <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={() => toast.info("Use milestone negotiation or contact admin for amendments.")}>
              <FileWarning className="w-3 h-3 mr-1" /> Request Amendment
            </Button>
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
          {!isAdmin && !isDisputed && ms.status !== "released" && ms.status !== "deleted" && ms.status !== "pending" && (
            <Button
              size="sm" variant="ghost"
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 text-xs ml-auto"
              onClick={() => {
                const disputePath = role === "buyer" ? `/trustlock/buyer/disputes` : `/trustlock/vendor/disputes`;
                navigate(`${disputePath}?tx=${encodeURIComponent(txId)}&milestone=${encodeURIComponent(ms.title)}&step=${row}`);
                toast.info(`Opening dispute form for milestone "${ms.title}"`);
              }}
            >
              <Scale className="w-3 h-3 mr-1" /> Raise Dispute
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MilestoneActionsTab;

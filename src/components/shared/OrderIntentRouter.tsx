import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, GitPullRequest, FileQuestion, CheckCircle2, ArrowRight, Handshake, PenLine, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isMilestoneIndustryByKey } from "@/lib/industryList";

export type OrderPath = "fixed" | "preset_milestones" | "rfq";
export type IntentDecision = "accept" | "counter" | "rfq";

interface PresetMilestone {
  title: string;
  percentage: number;
  documentGate?: string;
}

interface OrderIntentRouterProps {
  industry: string;
  industryLabel: string;
  vendorName: string;
  subtotal: number;
  presetMilestones: PresetMilestone[];
  hasFixedPrice: boolean;
  rfqEnabled?: boolean;
  onDecision: (decision: IntentDecision) => void;
}

const OrderIntentRouter = ({
  industry,
  industryLabel,
  vendorName,
  subtotal,
  presetMilestones,
  hasFixedPrice,
  rfqEnabled = false,
  onDecision,
}: OrderIntentRouterProps) => {
  const isMilestone = isMilestoneIndustryByKey(industry);
  const hasPresets = presetMilestones.length > 0 && presetMilestones.some(m => m.percentage > 0);

  // Fixed-price simple industry — no routing needed
  if (!isMilestone && hasFixedPrice && !rfqEnabled) {
    return null; // Skip router, go straight to checkout
  }

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">How Would You Like to Proceed?</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>{vendorName}</strong> has a preset configuration for <strong>{industryLabel}</strong> orders.
          Choose how you'd like to handle this deal.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Path 1: Accept Preset (if vendor has milestones) */}
        {hasPresets && (
          <button
            onClick={() => onDecision("accept")}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Accept Vendor's Schedule</span>
                  <Badge variant="secondary" className="text-[9px]">Fastest</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  The vendor has pre-configured a {presetMilestones.length}-stage milestone schedule.
                  Accept it to proceed directly to invoice and payment.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {presetMilestones.filter(m => m.percentage > 0).map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] gap-1">
                      {m.title} · {m.percentage}%
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Total: <strong>${subtotal.toLocaleString()}</strong> across {presetMilestones.filter(m => m.percentage > 0).length} payment stages
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
          </button>
        )}

        {/* Path 2: Counter-Propose */}
        {isMilestone && (
          <button
            onClick={() => onDecision("counter")}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <PenLine className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Negotiate Milestones</span>
                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-700">Counter-Propose</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasPresets
                    ? "Modify the vendor's preset schedule — adjust percentages, timelines, or add/remove stages before agreeing."
                    : "Draft a milestone schedule from scratch. Both parties must agree before escrow locks."
                  }
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 transition-colors mt-1" />
            </div>
          </button>
        )}

        {/* Path 3: RFQ / Request Quote */}
        {rfqEnabled && (
          <button
            onClick={() => onDecision("rfq")}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileQuestion className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">Request a Quote (RFQ)</span>
                  <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-700">Custom Pricing</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submit a Request for Quotation. The vendor will review and respond with a custom proforma invoice.
                  Milestone negotiation follows the quote.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-1" />
            </div>
          </button>
        )}

        {/* Info bar */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            <strong>Pre-Escrow Protocol:</strong> The milestone schedule must be mutually agreed upon before the invoice is generated and payment begins.
            No funds are locked until both parties sign off on the schedule.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderIntentRouter;

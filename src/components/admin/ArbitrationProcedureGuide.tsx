/**
 * ArbitrationProcedureGuide — Step-by-step card for chief admins
 * showing exactly what to do when an arbitration fee is paid.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, DollarSign, FileText, Link2, Clock, Gavel, Archive, Bell } from "lucide-react";

const steps = [
  {
    icon: DollarSign,
    title: "1. Confirm Fee Payment",
    desc: "Verify the Arbitration Fee Order status shows \"Paid\" in the fee payments section below. The system auto-updates this when OS Pay records the transaction.",
    timing: "Immediate",
  },
  {
    icon: FileText,
    title: "2. Generate Case File Package",
    desc: "Click \"Generate Case Bundle\" on the Arbitrator Management Panel for this dispute. This auto-compiles: transaction timeline, blockchain proofs, milestone records, uploaded evidence, and signed acknowledgement forms into a single PDF bundle.",
    timing: "Within 24 hours of payment",
  },
  {
    icon: Clock,
    title: "3. Monitor 7-Day Arbitrator Selection",
    desc: "Both parties have 7 days to agree on an arbitrator via the Arbitrator Proposal Panel. Watch the countdown timer — if no agreement is reached, the system flags it for admin assignment from the curated panel.",
    timing: "7-day window",
  },
  {
    icon: Link2,
    title: "4. Generate Secure Arbitrator Portal Link",
    desc: "Once an arbitrator is agreed upon (or auto-assigned), click \"Generate Portal Link\" in the Arbitrator Management Panel. Enter the arbitrator's name and email — the system generates a unique URL and hashed password. Send both to the arbitrator via secure channel.",
    timing: "Within 24 hours of agreement",
  },
  {
    icon: Gavel,
    title: "5. Monitor Ruling Upload",
    desc: "The arbitrator uploads their ruling document through their secure portal. The system automatically: clones the ruling to buyer/vendor/admin document archives, anchors a SHA-256 hash to the blockchain, and updates the dispute status to \"ruling_issued\".",
    timing: "Per arbitrator timeline",
  },
  {
    icon: Bell,
    title: "6. Notify Parties & Execute Ruling",
    desc: "System auto-notifies both parties of the ruling. Chief admin reviews the ruling and executes the financial outcome (full refund, vendor release, or compromise split) using the resolution buttons on the dispute card.",
    timing: "Within 48 hours of ruling",
  },
  {
    icon: Archive,
    title: "7. Archive & Close",
    desc: "Once funds are disbursed, the dispute is closed. All documents (case bundle, ruling, blockchain proof) are retained for 7 years per compliance policy. The 48-hour override window begins for the Rank 1 Chief.",
    timing: "Post-execution",
  },
];

const ArbitrationProcedureGuide = () => (
  <Card className="border-accent/20">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <BookOpen className="w-4 h-4" /> Arbitration Procedure — Chief Admin Guide
      </CardTitle>
      <p className="text-[10px] text-muted-foreground">
        Follow this sequence when an arbitration fee payment is confirmed via OS Pay
      </p>
    </CardHeader>
    <CardContent className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
          {/* Vertical connector line */}
          {i < steps.length - 1 && (
            <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-border" />
          )}
          <div className="shrink-0 w-[31px] h-[31px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center z-10">
            <step.icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 space-y-0.5 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold text-foreground">{step.title}</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {step.timing}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 rounded-lg bg-muted/30 border space-y-1">
        <p className="text-[10px] font-semibold text-foreground">Key Reminders</p>
        <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
          <li>TrustLock's case management fee ($500–$5,000) covers platform coordination only</li>
          <li>Institution filing fees and arbitrator compensation are separate — paid directly by the parties</li>
          <li>If parties fail to agree on an arbitrator within 7 days, assign from the platform's curated panel</li>
          <li>The Rank 1 Chief has a 48-hour override window after any ruling execution</li>
          <li>All rulings are final once the override window expires — no reversals</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

export default ArbitrationProcedureGuide;

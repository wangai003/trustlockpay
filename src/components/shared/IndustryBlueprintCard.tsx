import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, Eye, FileText, Lock, Milestone, Shield, Users, Unlock, Layers, AlertTriangle,
} from "lucide-react";

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: "none" | "optional" | "required";
  description: string;
  requiresObserver: boolean;
}

const INDUSTRY_MILESTONES: Record<string, MilestoneTemplate[]> = {
  "construction": [
    { name: "Contract Upload", percentage: 5, documents: ["Construction Contract"], documentMode: "required", description: "Both parties sign the contract", requiresObserver: false },
    { name: "Foundation Inspection", percentage: 15, documents: ["Inspection Report", "Soil Test"], documentMode: "required", description: "Inspector verifies foundation", requiresObserver: true },
    { name: "Structural Phase", percentage: 25, documents: ["Engineer Report"], documentMode: "required", description: "Walls, roofing completed", requiresObserver: true },
    { name: "MEP Verification", percentage: 20, documents: ["Electrical Cert", "Plumbing Report"], documentMode: "required", description: "Systems verified", requiresObserver: true },
    { name: "Walkthrough", percentage: 15, documents: ["Punch List"], documentMode: "optional", description: "Final inspection with buyer", requiresObserver: false },
    { name: "Certificate of Occupancy", percentage: 10, documents: ["Occupancy Certificate"], documentMode: "required", description: "Government cert obtained", requiresObserver: true },
    { name: "Final Release", percentage: 10, documents: [], documentMode: "none", description: "Escrow released", requiresObserver: false },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Survey"], documentMode: "required", description: "Legal review", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], documentMode: "optional", description: "Property inspection", requiresObserver: false },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], documentMode: "required", description: "Property valuation", requiresObserver: true },
    { name: "Closing", percentage: 60, documents: ["Transfer Agreement"], documentMode: "required", description: "Key handover", requiresObserver: true },
  ],
  "agriculture": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract"], documentMode: "required", description: "Trade agreement", requiresObserver: true },
    { name: "Harvest & Assay", percentage: 15, documents: ["Quality Certificate"], documentMode: "required", description: "Quality testing", requiresObserver: true },
    { name: "Packaging", percentage: 15, documents: ["Phytosanitary Cert"], documentMode: "required", description: "Export certified", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Customs", percentage: 15, documents: ["Customs Declaration"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Delivery", percentage: 20, documents: ["Delivery Receipt"], documentMode: "optional", description: "Accepted", requiresObserver: false },
  ],
  "mining": [
    { name: "Assay & Cert", percentage: 10, documents: ["Assay Report"], documentMode: "required", description: "Purity certified", requiresObserver: true },
    { name: "Export License", percentage: 5, documents: ["Export Permit"], documentMode: "required", description: "Authorized", requiresObserver: true },
    { name: "Insurance", percentage: 10, documents: ["Insurance Cert"], documentMode: "required", description: "Insured & sealed", requiresObserver: false },
    { name: "Customs (Origin)", percentage: 15, documents: ["AML Declaration"], documentMode: "required", description: "Origin clearance", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Air Waybill"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Destination", percentage: 20, documents: ["Import Declaration"], documentMode: "required", description: "Dest. clearance", requiresObserver: true },
    { name: "Delivery", percentage: 15, documents: ["Acceptance Form"], documentMode: "required", description: "Released", requiresObserver: false },
  ],
  "logistics": [
    { name: "LC / Agreement", percentage: 5, documents: ["Trade Contract"], documentMode: "required", description: "LC opened", requiresObserver: true },
    { name: "Origin Inspection", percentage: 15, documents: ["Inspection Cert"], documentMode: "required", description: "Inspected", requiresObserver: true },
    { name: "Export Customs", percentage: 15, documents: ["Export License"], documentMode: "required", description: "Cleared", requiresObserver: true },
    { name: "Shipping", percentage: 25, documents: ["Bill of Lading"], documentMode: "required", description: "In transit", requiresObserver: true },
    { name: "Import Customs", percentage: 15, documents: ["Duty Receipt"], documentMode: "required", description: "Processed", requiresObserver: true },
    { name: "Delivery", percentage: 10, documents: ["POD"], documentMode: "optional", description: "Delivered", requiresObserver: false },
    { name: "Settlement", percentage: 15, documents: ["Payment Confirmation"], documentMode: "required", description: "Released", requiresObserver: true },
  ],
  "freelance": [
    { name: "Scope", percentage: 20, documents: ["Scope Doc"], documentMode: "optional", description: "Requirements", requiresObserver: false },
    { name: "Draft", percentage: 30, documents: ["Draft"], documentMode: "optional", description: "First delivery", requiresObserver: false },
    { name: "Revision", percentage: 20, documents: [], documentMode: "none", description: "Feedback round", requiresObserver: false },
    { name: "Final", percentage: 30, documents: ["Sign-off Form"], documentMode: "required", description: "Approved", requiresObserver: false },
  ],
  "projectmanagement": [
    { name: "Charter & SOW", percentage: 10, documents: ["Project Charter"], documentMode: "required", description: "Scope defined", requiresObserver: false },
    { name: "Kick-Off", percentage: 5, documents: ["Resource Plan"], documentMode: "optional", description: "Team assigned", requiresObserver: false },
    { name: "Phase 1", percentage: 25, documents: ["Phase 1 Report"], documentMode: "required", description: "First deliverable", requiresObserver: true },
    { name: "Mid-Review", percentage: 10, documents: ["Status Report"], documentMode: "required", description: "Scope check", requiresObserver: true },
    { name: "Phase 2", percentage: 25, documents: ["Phase 2 Report"], documentMode: "required", description: "Second deliverable", requiresObserver: true },
    { name: "UAT", percentage: 15, documents: ["UAT Sign-Off"], documentMode: "required", description: "Client testing", requiresObserver: false },
    { name: "Close-Out", percentage: 10, documents: ["Close-Out Report"], documentMode: "optional", description: "Final release", requiresObserver: false },
  ],
  "tourism": [
    { name: "Booking", percentage: 50, documents: ["Booking Confirmation"], documentMode: "optional", description: "Reserved", requiresObserver: false },
    { name: "Completed", percentage: 50, documents: [], documentMode: "none", description: "Service done", requiresObserver: false },
  ],
  "retail": [
    { name: "Payment Locked", percentage: 100, documents: [], documentMode: "none", description: "Full escrow", requiresObserver: false },
  ],
  "education": [
    { name: "Enrollment", percentage: 25, documents: ["Enrollment Form"], documentMode: "optional", description: "Enrolled", requiresObserver: false },
    { name: "Course Access", percentage: 25, documents: [], documentMode: "none", description: "Materials provided", requiresObserver: false },
    { name: "Assessment", percentage: 25, documents: ["Results"], documentMode: "optional", description: "Assessed", requiresObserver: false },
    { name: "Certification", percentage: 25, documents: ["Certificate"], documentMode: "required", description: "Certified", requiresObserver: false },
  ],
};

interface IndustryBlueprintCardProps {
  industry?: string | null;
}

const IndustryBlueprintCard = ({ industry }: IndustryBlueprintCardProps) => {
  const key = industry?.toLowerCase().replace(/[^a-z-]/g, "").replace(/-+/g, "-") || "";
  const milestones = INDUSTRY_MILESTONES[key]
    || INDUSTRY_MILESTONES[Object.keys(INDUSTRY_MILESTONES).find(k => key.includes(k)) || ""]
    || null;

  const stats = useMemo(() => {
    if (!milestones) return null;
    const totalMilestones = milestones.length;
    const requiredDocs = milestones.flatMap(m => m.documentMode === "required" ? m.documents : []);
    const optionalDocs = milestones.flatMap(m => m.documentMode === "optional" ? m.documents : []);
    const observerStages = milestones.filter(m => m.requiresObserver);
    const docGatedStages = milestones.filter(m => m.documentMode === "required");
    return { totalMilestones, requiredDocs, optionalDocs, observerStages, docGatedStages };
  }, [milestones]);

  if (!milestones || !stats) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Order Blueprint — <span className="capitalize">{industry?.replace(/-/g, " ")}</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          TrustLock has pre-configured the following security protocol for this order type. All gates are enforced automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
            <Layers className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.totalMilestones}</p>
            <p className="text-[10px] text-muted-foreground">Milestones</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
            <FileText className="w-4 h-4 mx-auto text-destructive mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.requiredDocs.length}</p>
            <p className="text-[10px] text-muted-foreground">Required Docs</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
            <Eye className="w-4 h-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.observerStages.length}</p>
            <p className="text-[10px] text-muted-foreground">Observer Gates</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2 text-center">
            <Lock className="w-4 h-4 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-bold text-foreground">{stats.docGatedStages.length}</p>
            <p className="text-[10px] text-muted-foreground">Doc-Gated Stages</p>
          </div>
        </div>

        {/* Milestone Breakdown */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Milestone className="w-3.5 h-3.5" />
            Milestone-by-Milestone Breakdown
          </p>
          {milestones.map((ms, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/20 border border-transparent hover:border-border transition-colors"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold">{ms.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">({ms.percentage}% of funds)</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{ms.description}</p>

                {/* Required docs for this milestone */}
                {ms.documents.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ms.documents.map((doc) => (
                      <Badge
                        key={doc}
                        variant={ms.documentMode === "required" ? "destructive" : "secondary"}
                        className="text-[8px] h-4 px-1.5 gap-0.5"
                      >
                        {ms.documentMode === "required" ? (
                          <Lock className="w-2 h-2" />
                        ) : (
                          <Unlock className="w-2 h-2" />
                        )}
                        {doc}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Observer tag */}
                {ms.requiresObserver && (
                  <div className="mt-1">
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 gap-0.5">
                      <Users className="w-2 h-2" />
                      Third-Party Observer / Inspector Required
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* What this means for buyers */}
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-accent-foreground">What This Means For You</p>
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5 list-disc pl-3">
                <li>Funds are released <span className="font-semibold">only</span> when each milestone's documents and observer sign-offs are verified</li>
                <li>You will be notified at each stage and can view all uploaded documents in real-time</li>
                <li>No milestone can be skipped — the vendor must follow the exact sequence above</li>
                {stats.observerStages.length > 0 && (
                  <li><span className="font-semibold">{stats.observerStages.length} stage(s)</span> require independent third-party verification before funds move</li>
                )}
                {stats.requiredDocs.length > 0 && (
                  <li><span className="font-semibold">{stats.requiredDocs.length} mandatory document(s)</span> must be uploaded and verified across all milestones</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IndustryBlueprintCard;

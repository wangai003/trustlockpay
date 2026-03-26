import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, X, GripVertical, Upload, Check, AlertTriangle, ArrowRight,
  FileText, Lock, Unlock, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Industry Templates ───────────────────────────────────
const INDUSTRY_TEMPLATES: Record<string, MilestoneTemplate[]> = {
  "e-commerce": [
    { name: "Payment Confirmed", percentage: 100, documents: [], description: "Full payment locked in escrow" },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Property Survey"], description: "Legal review and property verification" },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], description: "Physical property inspection" },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], description: "Independent property valuation" },
    { name: "Closing", percentage: 60, documents: ["Closing Documents", "Transfer Agreement"], description: "Final transfer and key handover" },
  ],
  "professional-services": [
    { name: "Discovery & Scope", percentage: 20, documents: ["Scope Document"], description: "Requirements gathering and project scoping" },
    { name: "Draft Delivery", percentage: 30, documents: ["Draft Deliverable"], description: "First draft or prototype delivered" },
    { name: "Revision Round", percentage: 20, documents: [], description: "Client feedback and revisions" },
    { name: "Final Delivery", percentage: 30, documents: ["Final Deliverable", "Sign-off Form"], description: "Approved final work product" },
  ],
  "agriculture-cargo": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract", "Export License"], description: "Trade agreement executed" },
    { name: "Loading & Inspection", percentage: 20, documents: ["Inspection Certificate", "Phytosanitary Certificate"], description: "Goods loaded and inspected" },
    { name: "Shipping", percentage: 30, documents: ["Bill of Lading", "Insurance Certificate"], description: "Goods in transit" },
    { name: "Customs Clearance", percentage: 15, documents: ["Certificate of Origin", "Customs Declaration"], description: "Import clearance completed" },
    { name: "Delivery & Acceptance", percentage: 25, documents: ["Delivery Receipt", "Quality Report"], description: "Goods received and accepted" },
  ],
  "mining-minerals": [
    { name: "Sample Approval", percentage: 15, documents: ["Assay Report"], description: "Mineral sample analysis approved" },
    { name: "Extraction", percentage: 25, documents: ["Extraction Report", "Environmental Compliance"], description: "Mineral extraction completed" },
    { name: "Processing", percentage: 25, documents: ["Processing Report", "Certificate of Origin"], description: "Mineral processing and grading" },
    { name: "Shipment", percentage: 35, documents: ["Bill of Lading", "Export License"], description: "Final shipment dispatched" },
  ],
  "digital-services": [
    { name: "Setup & Access", percentage: 25, documents: [], description: "Account setup and access credentials shared" },
    { name: "Development", percentage: 35, documents: ["Progress Report"], description: "Core development phase" },
    { name: "Testing & QA", percentage: 15, documents: ["Test Results"], description: "Quality assurance and bug fixes" },
    { name: "Launch & Handover", percentage: 25, documents: ["Launch Confirmation", "Access Credentials"], description: "Go-live and full handover" },
  ],
  "hospitality-travel": [
    { name: "Booking Confirmed", percentage: 50, documents: ["Booking Confirmation"], description: "Reservation secured" },
    { name: "Service Completed", percentage: 50, documents: ["Checkout Confirmation"], description: "Stay/service completed" },
  ],
  "logistics-freight": [
    { name: "Pickup", percentage: 15, documents: ["Pickup Receipt"], description: "Goods collected from origin" },
    { name: "Transit", percentage: 30, documents: ["Tracking Update", "Insurance Certificate"], description: "Goods in transit" },
    { name: "Customs", percentage: 25, documents: ["Customs Declaration", "Duty Receipt"], description: "Customs processing" },
    { name: "Last Mile Delivery", percentage: 30, documents: ["Delivery Receipt", "POD"], description: "Final delivery to destination" },
  ],
};

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  description: string;
}

interface Milestone extends MilestoneTemplate {
  id: string;
  status: "pending" | "in_progress" | "fulfilled" | "released";
}

interface ChangeRequest {
  milestones: Milestone[];
  requestedBy: "buyer" | "vendor";
  reason: string;
  status: "pending" | "accepted" | "rejected";
}

interface MilestoneEditorProps {
  role: "admin" | "vendor" | "buyer";
  orderId?: string;
  industry?: string;
  onSave?: (milestones: Milestone[]) => void;
}

const MilestoneEditor = ({ role, orderId, industry: initialIndustry, onSave }: MilestoneEditorProps) => {
  const [industry, setIndustry] = useState(initialIndustry || "");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [locked, setLocked] = useState(false);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [changeReason, setChangeReason] = useState("");

  const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
  const isValid = totalPercentage === 100 && milestones.length > 0;

  const applyTemplate = (industryKey: string) => {
    const template = INDUSTRY_TEMPLATES[industryKey];
    if (!template) return;
    setIndustry(industryKey);
    setMilestones(
      template.map((t, i) => ({
        ...t,
        id: `ms-${Date.now()}-${i}`,
        status: "pending",
      }))
    );
    setLocked(false);
    toast.success(`${industryKey.replace(/-/g, " ")} template applied — customize as needed`);
  };

  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        id: `ms-${Date.now()}`,
        name: "",
        percentage: 0,
        documents: [],
        description: "",
        status: "pending",
      },
    ]);
  };

  const removeMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const addDocument = (id: string, doc: string) => {
    if (!doc.trim()) return;
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, documents: [...m.documents, doc.trim()] } : m
      )
    );
  };

  const removeDocument = (milestoneId: string, docIndex: number) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? { ...m, documents: m.documents.filter((_, i) => i !== docIndex) }
          : m
      )
    );
  };

  const handleLock = () => {
    if (!isValid) {
      toast.error("Milestones must sum to exactly 100%");
      return;
    }
    setLocked(true);
    onSave?.(milestones);
    toast.success("Milestones locked — both parties must agree to any changes");
  };

  const handleProposeChange = () => {
    if (!changeReason.trim()) {
      toast.error("Please provide a reason for the change");
      return;
    }
    setChangeRequest({
      milestones: [...milestones],
      requestedBy: role === "admin" ? "vendor" : role,
      reason: changeReason,
      status: "pending",
    });
    setShowDiff(true);
    toast.info("Change request created — awaiting counterparty approval");
  };

  const handleAcceptChange = () => {
    if (changeRequest) {
      setMilestones(changeRequest.milestones);
      setChangeRequest(null);
      setShowDiff(false);
      toast.success("Changes accepted and applied");
    }
  };

  const handleRejectChange = () => {
    setChangeRequest(null);
    setShowDiff(false);
    toast.info("Changes rejected — original milestones preserved");
  };

  return (
    <div className="space-y-4">
      {/* Industry Selector */}
      {!locked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Industry Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(INDUSTRY_TEMPLATES).map((key) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className={cn(
                    "p-2.5 rounded-lg border-2 text-xs font-medium transition-all text-left capitalize",
                    industry === key
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-muted-foreground/40 text-foreground"
                  )}
                >
                  {key.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone List */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Milestones
                {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={isValid ? "default" : "destructive"}
                  className="text-[10px]"
                >
                  {totalPercentage}% / 100%
                </Badge>
                {locked && (role === "vendor" || role === "buyer") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => setShowDiff(!showDiff)}
                  >
                    <RotateCcw className="w-3 h-3" /> Propose Change
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((ms, index) => (
              <div
                key={ms.id}
                className={cn(
                  "p-3 rounded-lg border border-border space-y-2",
                  ms.status === "released" && "bg-primary/5 border-primary/30",
                  ms.status === "fulfilled" && "bg-accent/5 border-accent/30"
                )}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 cursor-grab" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground w-5">#{index + 1}</span>
                      <Input
                        placeholder="Milestone name"
                        value={ms.name}
                        onChange={(e) => updateMilestone(ms.id, "name", e.target.value)}
                        disabled={locked}
                        className="text-sm font-semibold h-8"
                      />
                      <Input
                        type="number"
                        placeholder="%"
                        value={ms.percentage || ""}
                        onChange={(e) => updateMilestone(ms.id, "percentage", parseInt(e.target.value) || 0)}
                        disabled={locked}
                        className="w-20 text-sm h-8 text-center font-bold"
                        min={0}
                        max={100}
                      />
                      {!locked && (
                        <button onClick={() => removeMilestone(ms.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Description (optional)"
                      value={ms.description}
                      onChange={(e) => updateMilestone(ms.id, "description", e.target.value)}
                      disabled={locked}
                      className="text-xs h-7"
                    />
                    {/* Document Gates */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Required Documents
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {ms.documents.map((doc, di) => (
                          <Badge key={di} variant="secondary" className="text-[10px] gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            {doc}
                            {!locked && (
                              <button onClick={() => removeDocument(ms.id, di)}>
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {!locked && (
                          <Input
                            placeholder="+ Add document"
                            className="h-6 text-[10px] w-32"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                addDocument(ms.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = "";
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {/* Status indicator */}
                    {locked && (
                      <Badge
                        variant={ms.status === "released" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {ms.status === "released" ? "✓ Released" : ms.status === "fulfilled" ? "Awaiting Release" : "Pending"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!locked && (
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={addMilestone}>
                <Plus className="w-4 h-4" /> Add Milestone
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Change Request Diff View */}
      {showDiff && !changeRequest && (
        <Card className="border-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Propose Milestone Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Edit the milestones above, then submit your change request with a reason. The other party will see a before/after comparison.</p>
            <div>
              <Label className="text-xs">Reason for change</Label>
              <Textarea
                placeholder="Explain why these changes are needed..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="mt-1 text-xs"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleProposeChange} className="gap-1">
                <ArrowRight className="w-3 h-3" /> Submit Change Request
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDiff(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Incoming Change Request */}
      {changeRequest && changeRequest.status === "pending" && (
        <Card className="border-2 border-accent/40 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              Milestone Change Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground capitalize">{changeRequest.requestedBy}</strong> has proposed changes to the milestone structure.
            </p>
            <div className="p-2 rounded-lg bg-muted text-xs">
              <p className="font-semibold text-foreground mb-1">Reason:</p>
              <p className="text-muted-foreground">{changeRequest.reason}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAcceptChange} className="gap-1 bg-primary">
                <Check className="w-3 h-3" /> Accept Changes
              </Button>
              <Button size="sm" variant="destructive" onClick={handleRejectChange} className="gap-1">
                <X className="w-3 h-3" /> Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lock / Save Actions */}
      {milestones.length > 0 && !locked && (
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-2"
            onClick={handleLock}
            disabled={!isValid}
          >
            <Lock className="w-4 h-4" />
            Lock Milestones ({totalPercentage}%)
          </Button>
        </div>
      )}

      {!isValid && milestones.length > 0 && totalPercentage !== 100 && (
        <p className="text-xs text-destructive text-center">
          {totalPercentage > 100
            ? `Over-allocated by ${totalPercentage - 100}% — reduce some milestones`
            : `Under-allocated by ${100 - totalPercentage}% — add to remaining milestones`}
        </p>
      )}
    </div>
  );
};

export default MilestoneEditor;

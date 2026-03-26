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
  FileText, Lock, Unlock, RotateCcw, Eye, UserPlus, Mail
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Industry Templates ───────────────────────────────────
const INDUSTRY_TEMPLATES: Record<string, MilestoneTemplate[]> = {
  "e-commerce": [
    { name: "Payment Confirmed", percentage: 100, documents: [], documentMode: "none", description: "Full payment locked in escrow", requiresObserver: false },
  ],
  "real-estate": [
    { name: "Due Diligence", percentage: 10, documents: ["Title Deed", "Property Survey"], documentMode: "required", description: "Legal review and property verification", requiresObserver: true },
    { name: "Inspection", percentage: 15, documents: ["Inspection Report"], documentMode: "optional", description: "Physical property inspection", requiresObserver: false },
    { name: "Appraisal", percentage: 15, documents: ["Appraisal Report"], documentMode: "required", description: "Independent property valuation", requiresObserver: true },
    { name: "Closing", percentage: 60, documents: ["Closing Documents", "Transfer Agreement"], documentMode: "required", description: "Final transfer and key handover", requiresObserver: true },
  ],
  "professional-services": [
    { name: "Discovery & Scope", percentage: 20, documents: ["Scope Document"], documentMode: "optional", description: "Requirements gathering and project scoping", requiresObserver: false },
    { name: "Draft Delivery", percentage: 30, documents: ["Draft Deliverable"], documentMode: "optional", description: "First draft or prototype delivered", requiresObserver: false },
    { name: "Revision Round", percentage: 20, documents: [], documentMode: "none", description: "Client feedback and revisions", requiresObserver: false },
    { name: "Final Delivery", percentage: 30, documents: ["Final Deliverable", "Sign-off Form"], documentMode: "required", description: "Approved final work product", requiresObserver: false },
  ],
  "agriculture-cargo": [
    { name: "Contract Signed", percentage: 10, documents: ["Purchase Contract", "Export License"], documentMode: "required", description: "Trade agreement executed", requiresObserver: true },
    { name: "Loading & Inspection", percentage: 20, documents: ["Inspection Certificate", "Phytosanitary Certificate"], documentMode: "required", description: "Goods loaded and inspected", requiresObserver: true },
    { name: "Shipping", percentage: 30, documents: ["Bill of Lading", "Insurance Certificate"], documentMode: "required", description: "Goods in transit", requiresObserver: true },
    { name: "Customs Clearance", percentage: 15, documents: ["Certificate of Origin", "Customs Declaration"], documentMode: "required", description: "Import clearance completed", requiresObserver: true },
    { name: "Delivery & Acceptance", percentage: 25, documents: ["Delivery Receipt", "Quality Report"], documentMode: "optional", description: "Goods received and accepted", requiresObserver: false },
  ],
  "mining-minerals": [
    { name: "Sample Approval", percentage: 15, documents: ["Assay Report"], documentMode: "required", description: "Mineral sample analysis approved", requiresObserver: true },
    { name: "Extraction", percentage: 25, documents: ["Extraction Report", "Environmental Compliance"], documentMode: "required", description: "Mineral extraction completed", requiresObserver: true },
    { name: "Processing", percentage: 25, documents: ["Processing Report", "Certificate of Origin"], documentMode: "required", description: "Mineral processing and grading", requiresObserver: true },
    { name: "Shipment", percentage: 35, documents: ["Bill of Lading", "Export License"], documentMode: "required", description: "Final shipment dispatched", requiresObserver: true },
  ],
  "gold-export-dubai": [
    { name: "Assay & Certification", percentage: 10, documents: ["Assay Report", "Purity Certificate (LBMA)"], documentMode: "required", description: "Independent assay lab certifies gold purity and weight", requiresObserver: true },
    { name: "Export License", percentage: 5, documents: ["Mining License", "Export Permit", "Tax Clearance"], documentMode: "required", description: "Government export authorization obtained", requiresObserver: true },
    { name: "Insurance & Packaging", percentage: 10, documents: ["Insurance Certificate", "Secure Packaging Report"], documentMode: "required", description: "Goods insured and sealed in tamper-proof packaging", requiresObserver: false },
    { name: "Customs Clearance (Origin)", percentage: 15, documents: ["Customs Declaration", "Certificate of Origin", "AML Declaration"], documentMode: "required", description: "Origin country customs clearance and AML check", requiresObserver: true },
    { name: "Air Freight / Shipping", percentage: 20, documents: ["Air Waybill", "Bill of Lading", "Tracking Manifest"], documentMode: "required", description: "Secure transit via air freight to Dubai", requiresObserver: true },
    { name: "Dubai Customs & DMCC", percentage: 25, documents: ["UAE Import Declaration", "DMCC Registration", "Hallmarking Certificate"], documentMode: "required", description: "Dubai Multi Commodities Centre clearance and hallmarking", requiresObserver: true },
    { name: "Delivery & Fund Release", percentage: 15, documents: ["Delivery Receipt", "Buyer Acceptance Form"], documentMode: "required", description: "Physical delivery confirmed, escrow funds released", requiresObserver: false },
  ],
  "digital-services": [
    { name: "Setup & Access", percentage: 25, documents: [], documentMode: "none", description: "Account setup and access credentials shared", requiresObserver: false },
    { name: "Development", percentage: 35, documents: ["Progress Report"], documentMode: "optional", description: "Core development phase", requiresObserver: false },
    { name: "Testing & QA", percentage: 15, documents: ["Test Results"], documentMode: "optional", description: "Quality assurance and bug fixes", requiresObserver: false },
    { name: "Launch & Handover", percentage: 25, documents: ["Launch Confirmation", "Access Credentials"], documentMode: "required", description: "Go-live and full handover", requiresObserver: false },
  ],
  "hospitality-travel": [
    { name: "Booking Confirmed", percentage: 50, documents: ["Booking Confirmation"], documentMode: "optional", description: "Reservation secured", requiresObserver: false },
    { name: "Service Completed", percentage: 50, documents: ["Checkout Confirmation"], documentMode: "optional", description: "Stay/service completed", requiresObserver: false },
  ],
  "logistics-freight": [
    { name: "Pickup", percentage: 15, documents: ["Pickup Receipt"], documentMode: "optional", description: "Goods collected from origin", requiresObserver: false },
    { name: "Transit", percentage: 30, documents: ["Tracking Update", "Insurance Certificate"], documentMode: "required", description: "Goods in transit", requiresObserver: true },
    { name: "Customs", percentage: 25, documents: ["Customs Declaration", "Duty Receipt"], documentMode: "required", description: "Customs processing", requiresObserver: true },
    { name: "Last Mile Delivery", percentage: 30, documents: ["Delivery Receipt", "POD"], documentMode: "optional", description: "Final delivery to destination", requiresObserver: false },
  ],
  "letter-of-credit": [
    { name: "LC Issuance", percentage: 5, documents: ["Letter of Credit", "LC Application"], documentMode: "required", description: "Issuing bank opens the LC", requiresObserver: true },
    { name: "Advising", percentage: 5, documents: ["LC Advice"], documentMode: "required", description: "Advising bank notifies beneficiary", requiresObserver: true },
    { name: "Goods Production", percentage: 20, documents: ["Production Report", "Quality Certificate"], documentMode: "optional", description: "Manufacturing / sourcing of goods", requiresObserver: false },
    { name: "Shipping & Documents", percentage: 30, documents: ["Bill of Lading", "Packing List", "Insurance Certificate", "Certificate of Origin"], documentMode: "required", description: "Goods shipped, docs presented to bank", requiresObserver: true },
    { name: "Document Examination", percentage: 10, documents: ["Bank Verification"], documentMode: "required", description: "Issuing bank examines documents for compliance", requiresObserver: true },
    { name: "Payment & Release", percentage: 30, documents: ["Bank Payment Confirmation", "Release Order"], documentMode: "required", description: "Bank pays beneficiary, releases docs to buyer", requiresObserver: true },
  ],
};

type DocumentMode = "none" | "optional" | "required";

interface MilestoneTemplate {
  name: string;
  percentage: number;
  documents: string[];
  documentMode: DocumentMode;
  description: string;
  requiresObserver: boolean;
}

interface Observer {
  id: string;
  name: string;
  email: string;
  role: string; // e.g. "Bank", "Customs Broker", "Surveyor", "Arbitrator"
  signedOff: boolean;
}

interface Milestone extends MilestoneTemplate {
  id: string;
  status: "pending" | "in_progress" | "fulfilled" | "released";
  observers: Observer[];
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

const OBSERVER_ROLES = ["Bank", "Customs Broker", "Surveyor", "Legal Counsel", "Arbitrator", "Insurance", "Quality Inspector", "Other"];

const MilestoneEditor = ({ role, orderId, industry: initialIndustry, onSave }: MilestoneEditorProps) => {
  const [industry, setIndustry] = useState(initialIndustry || "");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [locked, setLocked] = useState(false);
  const [changeRequest, setChangeRequest] = useState<ChangeRequest | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [addingObserverFor, setAddingObserverFor] = useState<string | null>(null);
  const [newObserver, setNewObserver] = useState({ name: "", email: "", role: "Bank" });

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
        observers: [],
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
        documentMode: "none" as DocumentMode,
        description: "",
        requiresObserver: false,
        status: "pending",
        observers: [],
      },
    ]);
  };

  const removeMilestone = (id: string) => setMilestones((prev) => prev.filter((m) => m.id !== id));

  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const addDocument = (id: string, doc: string) => {
    if (!doc.trim()) return;
    setMilestones((prev) =>
      prev.map((m) => m.id === id ? { ...m, documents: [...m.documents, doc.trim()] } : m)
    );
  };

  const removeDocument = (milestoneId: string, docIndex: number) => {
    setMilestones((prev) =>
      prev.map((m) => m.id === milestoneId ? { ...m, documents: m.documents.filter((_, i) => i !== docIndex) } : m)
    );
  };

  // ─── Observer Management ───────────────────────────
  const addObserver = (milestoneId: string) => {
    if (!newObserver.name.trim() || !newObserver.email.trim()) {
      toast.error("Observer name and email required");
      return;
    }
    const observer: Observer = {
      id: `obs-${Date.now()}`,
      name: newObserver.name.trim(),
      email: newObserver.email.trim(),
      role: newObserver.role,
      signedOff: false,
    };
    setMilestones((prev) =>
      prev.map((m) => m.id === milestoneId ? { ...m, observers: [...m.observers, observer] } : m)
    );
    setNewObserver({ name: "", email: "", role: "Bank" });
    setAddingObserverFor(null);
    toast.success(`Observer ${observer.name} (${observer.role}) added — they'll receive a sign-off request`);
  };

  const removeObserver = (milestoneId: string, observerId: string) => {
    setMilestones((prev) =>
      prev.map((m) => m.id === milestoneId ? { ...m, observers: m.observers.filter((o) => o.id !== observerId) } : m)
    );
  };

  const toggleObserverSignOff = (milestoneId: string, observerId: string) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId
          ? { ...m, observers: m.observers.map((o) => o.id === observerId ? { ...o, signedOff: !o.signedOff } : o) }
          : m
      )
    );
  };

  const canReleaseMilestone = (ms: Milestone) => {
    if (!ms.requiresObserver || ms.observers.length === 0) return true;
    return ms.observers.every((o) => o.signedOff);
  };

  const handleLock = () => {
    if (!isValid) {
      toast.error("Milestones must sum to exactly 100%");
      return;
    }
    // Check observer-gated milestones have at least one observer
    const missingObservers = milestones.filter((m) => m.requiresObserver && m.observers.length === 0);
    if (missingObservers.length > 0) {
      toast.error(`${missingObservers.length} milestone(s) require at least one observer — add them before locking`);
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
                <Badge variant={isValid ? "default" : "destructive"} className="text-[10px]">
                  {totalPercentage}% / 100%
                </Badge>
                {locked && (role === "vendor" || role === "buyer") && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => setShowDiff(!showDiff)}>
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

                    {/* Observer Gate Toggle */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ms.requiresObserver}
                          onChange={(e) => updateMilestone(ms.id, "requiresObserver", e.target.checked)}
                          disabled={locked}
                          className="rounded border-border"
                        />
                        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Requires Observer Sign-off
                        </span>
                      </label>
                    </div>

                    {/* Observer List */}
                    {ms.requiresObserver && (
                      <div className="pl-2 border-l-2 border-primary/20 space-y-1.5">
                        {ms.observers.length === 0 && !locked && (
                          <p className="text-[10px] text-destructive/70">⚠ Add at least one observer before locking</p>
                        )}
                        {ms.observers.map((obs) => (
                          <div key={obs.id} className="flex items-center gap-2 text-[10px]">
                            <button
                              onClick={() => locked && (role === "admin") && toggleObserverSignOff(ms.id, obs.id)}
                              className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                obs.signedOff
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40"
                              )}
                            >
                              {obs.signedOff && <Check className="w-2.5 h-2.5" />}
                            </button>
                            <Badge variant={obs.signedOff ? "default" : "outline"} className="text-[9px] gap-1">
                              {obs.role}
                            </Badge>
                            <span className="font-medium text-foreground">{obs.name}</span>
                            <span className="text-muted-foreground">{obs.email}</span>
                            {obs.signedOff && <span className="text-primary font-bold">✓ Signed</span>}
                            {!locked && (
                              <button onClick={() => removeObserver(ms.id, obs.id)} className="text-muted-foreground hover:text-destructive ml-auto">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add Observer Form */}
                        {!locked && addingObserverFor === ms.id ? (
                          <div className="space-y-1.5 p-2 rounded-md bg-muted/50">
                            <div className="grid grid-cols-3 gap-1.5">
                              <Input
                                placeholder="Name"
                                value={newObserver.name}
                                onChange={(e) => setNewObserver((p) => ({ ...p, name: e.target.value }))}
                                className="h-6 text-[10px]"
                              />
                              <Input
                                placeholder="Email"
                                value={newObserver.email}
                                onChange={(e) => setNewObserver((p) => ({ ...p, email: e.target.value }))}
                                className="h-6 text-[10px]"
                              />
                              <Select value={newObserver.role} onValueChange={(v) => setNewObserver((p) => ({ ...p, role: v }))}>
                                <SelectTrigger className="h-6 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {OBSERVER_ROLES.map((r) => (
                                    <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => addObserver(ms.id)}>
                                <Mail className="w-3 h-3" /> Invite Observer
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setAddingObserverFor(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : !locked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] gap-1"
                            onClick={() => {
                              setAddingObserverFor(ms.id);
                              setNewObserver({ name: "", email: "", role: "Bank" });
                            }}
                          >
                            <UserPlus className="w-3 h-3" /> Add Observer
                          </Button>
                        )}

                        {/* Release blocked indicator */}
                        {locked && !canReleaseMilestone(ms) && (
                          <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Funds blocked — awaiting {ms.observers.filter((o) => !o.signedOff).length} observer sign-off(s)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Status indicator */}
                    {locked && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ms.status === "released" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {ms.status === "released" ? "✓ Released" : ms.status === "fulfilled" ? "Awaiting Release" : "Pending"}
                        </Badge>
                        {ms.requiresObserver && ms.observers.length > 0 && (
                          <Badge variant="outline" className="text-[9px] gap-1">
                            <Eye className="w-2.5 h-2.5" />
                            {ms.observers.filter((o) => o.signedOff).length}/{ms.observers.length} signed
                          </Badge>
                        )}
                      </div>
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
          <Button className="flex-1 gap-2" onClick={handleLock} disabled={!isValid}>
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

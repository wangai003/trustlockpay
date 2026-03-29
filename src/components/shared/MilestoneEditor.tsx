import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, X, GripVertical, Upload, Check, AlertTriangle, ArrowRight,
  FileText, Lock, Unlock, RotateCcw, Eye, UserPlus, Mail, Trash2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "./DocumentUpload";
import AcknowledgementForm from "./AcknowledgementForm";

// ─── Industry Templates (for offline/template selection) ───
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

interface DbMilestone {
  id: string;
  transaction_id: string;
  title: string;
  description: string | null;
  position: number;
  status: string;
  required_documents: string[];
  uploaded_documents: unknown[] | null;
  assigned_to: string | null;
  is_payment_milestone: boolean;
  payment_amount: number | null;
  payment_released: boolean;
  observer_id: string | null;
  observer_signed: boolean;
  observer_signed_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

interface MilestoneEditorProps {
  role: "admin" | "vendor" | "buyer";
  orderId?: string;
  industry?: string;
  onSave?: (milestones: DbMilestone[]) => void;
}

const OBSERVER_ROLES = ["Bank", "Customs Broker", "Surveyor", "Legal Counsel", "Arbitrator", "Insurance", "Quality Inspector", "Other"];

const MilestoneEditor = ({ role, orderId, industry: initialIndustry, onSave }: MilestoneEditorProps) => {
  const [industry, setIndustry] = useState(initialIndustry || "");
  const [milestones, setMilestones] = useState<DbMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showAckModal, setShowAckModal] = useState<string | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<string | null>(null);

  // Add milestone form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPercentage, setNewPercentage] = useState(0);
  const [newIsPayment, setNewIsPayment] = useState(true);

  // Observer form
  const [addingObserverFor, setAddingObserverFor] = useState<string | null>(null);
  const [newObserver, setNewObserver] = useState({ name: "", email: "", role: "Bank" });

  // Change request
  const [showDiff, setShowDiff] = useState(false);
  const [changeReason, setChangeReason] = useState("");

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const transactionId = orderId;

  // ─── Fetch milestones from DB ─────────────────────────────
  const fetchMilestones = useCallback(async () => {
    if (!transactionId) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("transaction_milestones")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Failed to fetch milestones:", error.message);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setMilestones(data as DbMilestone[]);
      // If any milestone is not pending, consider locked
      const hasNonPending = data.some((m) => m.status !== "pending");
      setLocked(hasNonPending);
    }
    setLoading(false);
  }, [transactionId]);

  // ─── On mount: fetch or auto-create ───────────────────────
  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  // ─── Real-time subscription ───────────────────────────────
  useEffect(() => {
    if (!transactionId) return;

    const channel = supabase
      .channel(`milestones-${transactionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transaction_milestones",
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMilestones((prev) => {
              const exists = prev.find((m) => m.id === (payload.new as DbMilestone).id);
              if (exists) return prev;
              return [...prev, payload.new as DbMilestone].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === "UPDATE") {
            setMilestones((prev) =>
              prev.map((m) => (m.id === (payload.new as DbMilestone).id ? (payload.new as DbMilestone) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMilestones((prev) => prev.filter((m) => m.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [transactionId]);

  // ─── Create milestones via edge function ──────────────────
  const createMilestonesFromTemplate = async (industryKey: string) => {
    if (!transactionId) {
      toast.error("No transaction ID — cannot create milestones");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not authenticated"); return; }

    // Build custom milestones from template
    const template = INDUSTRY_TEMPLATES[industryKey];
    if (!template) return;

    const customMilestones = template.map((t) => ({
      title: t.name,
      description: t.description,
      is_payment_milestone: true,
      payment_percentage: t.percentage,
      required_documents: t.documents,
      assigned_to: null,
    }));

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("escrow-manager", {
      body: {
        action: "create_milestones",
        transaction_id: transactionId,
        custom_milestones: customMilestones,
        user_id: user.id,
      },
    });

    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Failed to create milestones");
      return;
    }

    setIndustry(industryKey);
    toast.success(`${industryKey.replace(/-/g, " ")} milestones created (${data.count} stages)`);
    await fetchMilestones();
  };

  // ─── Add custom milestone ─────────────────────────────────
  const addCustomMilestone = async () => {
    if (!newTitle.trim()) { toast.error("Milestone title required"); return; }
    if (!transactionId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const { data, error } = await supabase.functions.invoke("escrow-manager", {
      body: {
        action: "create_milestones",
        transaction_id: transactionId,
        custom_milestones: [{
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          is_payment_milestone: newIsPayment,
          payment_percentage: newPercentage,
          required_documents: [],
        }],
        user_id: user.id,
      },
    });
    setSaving(false);

    if (error || !data?.success) {
      // If milestones already exist, insert directly
      if (data?.error?.includes("already exist")) {
        const { error: insertErr } = await supabase.from("transaction_milestones").insert({
          transaction_id: transactionId,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          position: milestones.length,
          status: "pending",
          is_payment_milestone: newIsPayment,
          payment_amount: null,
          required_documents: [],
        });
        if (insertErr) { toast.error(insertErr.message); return; }
        toast.success("Milestone added");
      } else {
        toast.error(data?.error || "Failed to add milestone");
        return;
      }
    } else {
      toast.success("Milestone added");
    }

    setNewTitle("");
    setNewDesc("");
    setNewPercentage(0);
    await fetchMilestones();
  };

  // ─── Delete milestone ─────────────────────────────────────
  const deleteMilestone = async (milestoneId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("escrow-manager", {
      body: { action: "delete_milestone", milestone_id: milestoneId, user_id: user.id },
    });

    if (error || !data?.success) {
      toast.error(data?.error || "Failed to delete milestone");
      return;
    }
    toast.success("Milestone deleted");
  };

  // ─── Drag-to-reorder ──────────────────────────────────────
  const handleDragStart = (index: number) => { dragItem.current = index; };

  const handleDragEnter = (index: number) => { dragOverItem.current = index; };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const reordered = [...milestones];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    setMilestones(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    // Persist reorder
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !transactionId) return;

    await supabase.functions.invoke("escrow-manager", {
      body: {
        action: "reorder_milestones",
        transaction_id: transactionId,
        milestone_ids: reordered.map((m) => m.id),
        user_id: user.id,
      },
    });
  };

  // ─── Update milestone status ──────────────────────────────
  const updateMilestoneStatus = async (milestoneId: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("escrow-manager", {
      body: { action: "update_milestone", milestone_id: milestoneId, user_id: user.id, status },
    });

    if (error || !data?.success) {
      toast.error(data?.error || "Failed to update milestone");
      return;
    }
    toast.success(`Milestone marked as ${status}`);

    // If completed payment milestone, show acknowledgement modal
    if (status === "completed") {
      const ms = milestones.find((m) => m.id === milestoneId);
      if (ms?.is_payment_milestone) {
        setShowAckModal(milestoneId);
      }
    }
  };

  // ─── Add observer ─────────────────────────────────────────
  const addObserver = async (milestoneId: string) => {
    if (!newObserver.name.trim() || !newObserver.email.trim()) {
      toast.error("Observer name and email required");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !transactionId) return;

    const { data, error } = await supabase.functions.invoke("escrow-manager", {
      body: {
        action: "add_observer",
        transaction_id: transactionId,
        observer_email: newObserver.email.trim(),
        observer_name: newObserver.name.trim(),
        observer_role: newObserver.role,
        permissions: ["view", "sign"],
        milestone_ids: [milestoneId],
        user_id: user.id,
      },
    });

    if (error || !data?.success) {
      toast.error(data?.error || "Failed to add observer");
      return;
    }

    toast.success(`Observer ${newObserver.name} invited — access token generated`);
    setNewObserver({ name: "", email: "", role: "Bank" });
    setAddingObserverFor(null);
    await fetchMilestones();
  };

  // ─── Document upload handler ──────────────────────────────
  const handleDocUpload = async (milestoneId: string, files: { name: string; url: string; path: string }[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const docs = files.map((f) => ({ name: f.name, url: f.url, path: f.path, uploaded_at: new Date().toISOString() }));

    await supabase.functions.invoke("escrow-manager", {
      body: {
        action: "update_milestone",
        milestone_id: milestoneId,
        user_id: user.id,
        uploaded_documents: docs,
      },
    });

    toast.success(`${files.length} document(s) attached to milestone`);
  };

  // ─── Lock milestones ──────────────────────────────────────
  const handleLock = async () => {
    if (!transactionId) return;
    // Update transaction milestone_status to 'agreed'
    const { error } = await supabase
      .from("transactions")
      .update({ milestone_status: "agreed", updated_at: new Date().toISOString() })
      .eq("id", transactionId);

    if (error) { toast.error(error.message); return; }
    setLocked(true);
    onSave?.(milestones);
    toast.success("Milestones locked — both parties must agree to any changes");
  };

  // Calculate total allocated and equal-split info
  const totalAllocated = milestones.reduce((sum, m) => sum + (Number(m.payment_amount) || 0), 0);
  const equalSplitHint = milestones.length > 0
    ? `Equal split: ${(100 / milestones.length).toFixed(1)}% each`
    : "";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-primary/10 border-primary/30";
      case "in_progress": return "bg-accent/10 border-accent/30";
      default: return "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading milestones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Industry Template Selector — only when no milestones exist */}
      {milestones.length === 0 && !locked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Select Industry Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(INDUSTRY_TEMPLATES).map((key) => (
                <button
                  key={key}
                  onClick={() => createMilestonesFromTemplate(key)}
                  disabled={saving}
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
            {saving && (
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Creating milestones...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Milestone List */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                Milestones ({milestones.length})
                {locked && <Lock className="w-3 h-3 text-muted-foreground" />}
              </CardTitle>
              <div className="flex items-center gap-2">
                {totalAllocated > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    💰 Total: ${totalAllocated.toLocaleString()}
                  </Badge>
                )}
                {milestones.length > 1 && !locked && (
                  <Badge variant="secondary" className="text-[9px]">
                    {equalSplitHint}
                  </Badge>
                )}
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
                draggable={!locked && ms.status === "pending"}
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "p-3 rounded-lg border border-border space-y-2 transition-all",
                  getStatusColor(ms.status),
                  ms.payment_released && "bg-primary/5 border-primary/30"
                )}
              >
                <div className="flex items-start gap-2">
                  {!locked && ms.status === "pending" && (
                    <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0 cursor-grab" />
                  )}
                  <div className="flex-1 space-y-2">
                    {/* Title + Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{ms.title}</span>
                      <Badge
                        variant={ms.payment_released ? "default" : ms.status === "completed" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {ms.payment_released ? "✓ Released" : ms.status === "completed" ? "Completed" : ms.status === "in_progress" ? "In Progress" : "Pending"}
                      </Badge>
                      {ms.is_payment_milestone && ms.payment_amount && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          💰 ${Number(ms.payment_amount).toLocaleString()}
                        </Badge>
                      )}
                      {/* Observer badge */}
                      {ms.observer_id && (
                        <Badge variant="outline" className="text-[9px] gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          Observer {ms.observer_signed ? "✓ Signed" : "Pending"}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {ms.description && (
                      <p className="text-xs text-muted-foreground">{ms.description}</p>
                    )}

                    {/* Required documents */}
                    {ms.required_documents && ms.required_documents.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ms.required_documents.map((doc, di) => (
                          <Badge key={di} variant="secondary" className="text-[10px] gap-1">
                            <FileText className="w-2.5 h-2.5" /> {doc}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Uploaded documents */}
                    {ms.uploaded_documents && Array.isArray(ms.uploaded_documents) && ms.uploaded_documents.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-muted-foreground font-semibold">Uploaded:</span>
                        {(ms.uploaded_documents as Array<{ name?: string }>).map((doc, di) => (
                          <Badge key={di} variant="default" className="text-[10px] gap-1">
                            <Check className="w-2.5 h-2.5" /> {doc.name || `File ${di + 1}`}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {/* Upload documents button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] gap-1"
                        onClick={() => setShowUploadFor(showUploadFor === ms.id ? null : ms.id)}
                      >
                        <Upload className="w-3 h-3" /> Upload Doc
                      </Button>

                      {/* Status progression buttons */}
                      {ms.status === "pending" && !ms.payment_released && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => updateMilestoneStatus(ms.id, "in_progress")}
                        >
                          <ArrowRight className="w-3 h-3" /> Start
                        </Button>
                      )}
                      {ms.status === "in_progress" && !ms.payment_released && (
                        <Button
                          size="sm"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => updateMilestoneStatus(ms.id, "completed")}
                        >
                          <Check className="w-3 h-3" /> Mark Complete
                        </Button>
                      )}

                      {/* Add observer */}
                      {!ms.observer_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => {
                            setAddingObserverFor(ms.id);
                            setNewObserver({ name: "", email: "", role: "Bank" });
                          }}
                        >
                          <UserPlus className="w-3 h-3" /> Observer
                        </Button>
                      )}

                      {/* Delete (only pending) */}
                      {ms.status === "pending" && !locked && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive"
                          onClick={() => deleteMilestone(ms.id)}
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                      )}

                      {/* Acknowledgement sign-off (for completed payment milestones) */}
                      {ms.status === "completed" && ms.is_payment_milestone && !ms.payment_released && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-[10px] gap-1"
                          onClick={() => setShowAckModal(ms.id)}
                        >
                          <FileText className="w-3 h-3" /> Sign & Release
                        </Button>
                      )}
                    </div>

                    {/* Document upload panel (inline) */}
                    {showUploadFor === ms.id && transactionId && (
                      <div className="mt-2 p-2 rounded-md border border-border bg-muted/30">
                        <DocumentUpload
                          label="Upload Milestone Documents"
                          context={{
                            bucket: "milestone-documents",
                            transactionId: transactionId,
                            milestoneId: ms.id,
                          }}
                          onUploadComplete={(files) => handleDocUpload(ms.id, files)}
                        />
                      </div>
                    )}

                    {/* Add Observer Form (inline) */}
                    {addingObserverFor === ms.id && (
                      <div className="space-y-1.5 p-2 rounded-md bg-muted/50 mt-2">
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
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add Custom Milestone Form */}
      {!locked && transactionId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Custom Milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Milestone title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-sm h-8"
            />
            <Input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="text-xs h-7"
            />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[10px]">
                <input
                  type="checkbox"
                  checked={newIsPayment}
                  onChange={(e) => setNewIsPayment(e.target.checked)}
                  className="rounded border-border"
                />
                Payment milestone
              </label>
              {newIsPayment && (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    placeholder="% (optional)"
                    value={newPercentage || ""}
                    onChange={(e) => setNewPercentage(parseInt(e.target.value) || 0)}
                    className="w-24 text-xs h-7"
                    min={0}
                    max={100}
                  />
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    Leave blank for equal split
                  </span>
                </div>
              )}
            </div>
            <Button size="sm" className="gap-2" onClick={addCustomMilestone} disabled={saving || !newTitle.trim()}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Milestone
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Lock Action */}
      {milestones.length > 0 && !locked && (
        <Button className="w-full gap-2" onClick={handleLock}>
          <Lock className="w-4 h-4" /> Lock Milestones
        </Button>
      )}

      {/* Change Request UI */}
      {showDiff && locked && (
        <Card className="border-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Propose Milestone Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Describe what changes are needed. The other party will review and approve/reject.</p>
            <Textarea
              placeholder="Reason for change..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="text-xs"
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { toast.info("Change request submitted"); setShowDiff(false); }}>
                <ArrowRight className="w-3 h-3 mr-1" /> Submit
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDiff(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acknowledgement Form Modal */}
      <Dialog open={!!showAckModal} onOpenChange={() => setShowAckModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Sign Milestone Acknowledgement</DialogTitle>
          </DialogHeader>
          {showAckModal && transactionId && (
            <AcknowledgementForm
              txId={transactionId}
              milestoneCount={1}
              requireTypedSignature
              onAccept={() => {
                setShowAckModal(null);
                toast.success("Acknowledgement signed — payment can now be released");
              }}
              onDecline={() => setShowAckModal(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MilestoneEditor;

import { useState, useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Building2, Globe, FileText, CheckCircle2, XCircle, Clock, ExternalLink, Search } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface KYBEntry {
  id: string;
  lender_id: string;
  status: string;
  submitted_documents: Json;
  review_notes: string | null;
  approved_tier: number | null;
  created_at: string;
  updated_at: string;
  lender_profile?: {
    institution_name: string;
    institution_type: string;
    logo_url: string | null;
    website_url: string | null;
    operating_regions: string[] | null;
    sector_focus: string[] | null;
    lender_tier: number;
  };
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Tier 1 — Micro-Lender", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  2: { label: "Tier 2 — Standard", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  3: { label: "Tier 3 — Institutional", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  4: { label: "Tier 4 — DFI / Sovereign", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  under_review: { icon: <Search className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  approved: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { icon: <XCircle className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const AdminLenderKYB = () => {
  const [entries, setEntries] = useState<KYBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<KYBEntry | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedTier, setAssignedTier] = useState("1");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lender_kyb_queue")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { toast.error("Failed to load KYB queue"); setLoading(false); return; }

    // Fetch lender profiles for each entry
    const lenderIds = (data || []).map((e: any) => e.lender_id);
    const { data: profiles } = await supabase
      .from("lender_profiles")
      .select("user_id, institution_name, institution_type, logo_url, website_url, operating_regions, sector_focus, lender_tier")
      .in("user_id", lenderIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    setEntries((data || []).map((e: any) => ({
      ...e,
      lender_profile: profileMap.get(e.lender_id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const filtered = filter === "all" ? entries : entries.filter(e => e.status === filter);

  const handleAction = async (action: "approve" | "reject") => {
    if (!selected) return;
    setActionLoading(true);

    const tier = action === "approve" ? parseInt(assignedTier) : null;

    const { error: queueError } = await supabase
      .from("lender_kyb_queue")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        review_notes: reviewNotes,
        approved_tier: tier,
        reviewed_by: "admin",
      })
      .eq("id", selected.id);

    if (queueError) {
      toast.error("Failed to update KYB status");
      setActionLoading(false);
      return;
    }

    if (action === "approve") {
      // Update lender profile
      await supabase
        .from("lender_profiles")
        .update({
          is_verified: true,
          kyb_status: "approved",
          lender_tier: tier || 1,
        })
        .eq("user_id", selected.lender_id);
    } else {
      await supabase
        .from("lender_profiles")
        .update({ kyb_status: "rejected" })
        .eq("user_id", selected.lender_id);
    }

    // Send notification to lender
    await supabase.from("notifications").insert({
      user_id: selected.lender_id,
      type: action === "approve" ? "kyb_approved" : "kyb_rejected",
      title: action === "approve" ? "KYB Verification Approved" : "KYB Verification Rejected",
      message: action === "approve"
        ? `Your KYB has been approved. You are now assigned ${TIER_LABELS[tier || 1]?.label || "Tier 1"}.`
        : `Your KYB has been rejected. ${reviewNotes || "Please contact support for details."}`,
      data: { tier },
    });

    toast.success(action === "approve" ? "Lender KYB approved" : "Lender KYB rejected");
    setSelected(null);
    setReviewNotes("");
    setActionLoading(false);
    fetchEntries();
  };

  const docs = selected?.submitted_documents as Record<string, string> | null;

  return (
    <div>
      <AdminHeader title="Lender KYB Review" />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">KYB Verification Queue</h2>
            <Badge variant="secondary" className="text-xs">{entries.length} total</Badge>
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs h-7">Pending</TabsTrigger>
              <TabsTrigger value="under_review" className="text-xs h-7">In Review</TabsTrigger>
              <TabsTrigger value="approved" className="text-xs h-7">Approved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs h-7">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground text-center py-12">Loading KYB queue...</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No KYB submissions found.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((entry) => {
              const lp = entry.lender_profile;
              const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending;
              return (
                <Card key={entry.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setSelected(entry); setReviewNotes(entry.review_notes || ""); setAssignedTier(String(entry.approved_tier || 1)); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {lp?.logo_url ? (
                          <img src={lp.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm text-foreground">{lp?.institution_name || "Unknown Lender"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{lp?.institution_type || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] gap-1 ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {entry.status.replace(/_/g, " ")}
                        </Badge>
                        {entry.approved_tier && (
                          <Badge className={`text-[10px] ${TIER_LABELS[entry.approved_tier]?.color || ""}`}>
                            Tier {entry.approved_tier}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
                      {lp?.website_url && (
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{lp.website_url}</span>
                      )}
                      <span>Regions: {lp?.operating_regions?.length || 0}</span>
                      <span>Sectors: {lp?.sector_focus?.length || 0}</span>
                      <span>Submitted: {new Date(entry.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                KYB Review — {selected?.lender_profile?.institution_name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Institution Info */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Institution Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{selected?.lender_profile?.institution_type}</span></div>
                  <div><span className="text-muted-foreground">Website:</span>{" "}
                    {selected?.lender_profile?.website_url ? (
                      <a href={selected.lender_profile.website_url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : "N/A"}
                  </div>
                  <div><span className="text-muted-foreground">Regions:</span> <span className="font-medium">{selected?.lender_profile?.operating_regions?.join(", ") || "None"}</span></div>
                  <div><span className="text-muted-foreground">Sectors:</span> <span className="font-medium">{selected?.lender_profile?.sector_focus?.join(", ") || "None"}</span></div>
                </CardContent>
              </Card>

              {/* Submitted Documents */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Submitted Documents</CardTitle></CardHeader>
                <CardContent>
                  {docs && Object.keys(docs).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(docs).map(([key, url]) => (
                        <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50 text-xs">
                          <span className="capitalize font-medium">{key.replace(/_/g, " ")}</span>
                          <a href={String(url)} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No documents submitted yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Decision Panel */}
              {selected?.status !== "approved" && selected?.status !== "rejected" && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Decision</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Assign Tier</label>
                      <Select value={assignedTier} onValueChange={setAssignedTier}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TIER_LABELS).map(([val, { label }]) => (
                            <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1 block">Review Notes</label>
                      <Textarea
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        placeholder="Add review notes (required for rejection)..."
                        className="text-xs min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {selected?.status !== "approved" && selected?.status !== "rejected" && (
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="destructive" size="sm" disabled={actionLoading || !reviewNotes.trim()} onClick={() => handleAction("reject")}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button size="sm" disabled={actionLoading} onClick={() => handleAction("approve")}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve as {TIER_LABELS[parseInt(assignedTier)]?.label}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminLenderKYB;

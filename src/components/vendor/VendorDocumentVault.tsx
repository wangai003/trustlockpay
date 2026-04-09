import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Archive, AlertTriangle, CheckCircle2, Copy, FileText, Loader2, Plus,
  Search, ShieldAlert, ShieldCheck, Trash2, Upload, X, XCircle, Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "license", label: "Business License" },
  { value: "certificate", label: "Certificate of Origin" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Tax Document" },
  { value: "permit", label: "Export/Import Permit" },
  { value: "inspection", label: "Inspection Report" },
  { value: "compliance", label: "Compliance Doc" },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  valid: { icon: ShieldCheck, color: "text-primary bg-primary/10", label: "Verified" },
  pending: { icon: Loader2, color: "text-muted-foreground bg-muted", label: "Unscanned" },
  expired: { icon: XCircle, color: "text-destructive bg-destructive/10", label: "Expired" },
  flagged: { icon: AlertTriangle, color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30", label: "Flagged" },
  rejected: { icon: ShieldAlert, color: "text-destructive bg-destructive/10", label: "Rejected" },
};

export default function VendorDocumentVault() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newExpiry, setNewExpiry] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; issues: string[]; docName: string }>({
    open: false, issues: [], docName: "",
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ["vendor-document-vault", search],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      let q = supabase
        .from("vendor_document_vault")
        .select("*")
        .eq("user_id", user.id)
        .order("use_count", { ascending: false })
        .limit(100);
      if (search) q = q.ilike("vault_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_document_vault").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });
      toast.success("Document removed from vault");
    },
  });

  const handleUploadToVault = async () => {
    if (!selectedFile || !newName.trim()) {
      toast.error("Please provide a name and select a file");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const path = `${user.id}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("milestone-documents")
        .upload(path, selectedFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("milestone-documents")
        .getPublicUrl(path);

      const insertPayload: any = {
        user_id: user.id,
        vault_name: newName.trim(),
        file_url: urlData.publicUrl || path,
        file_type: selectedFile.type,
        file_size: `${(selectedFile.size / 1024).toFixed(0)} KB`,
        category: newCategory,
      };
      if (newExpiry) insertPayload.expiry_date = newExpiry;

      const { data: inserted, error: insertErr } = await supabase
        .from("vendor_document_vault")
        .insert(insertPayload)
        .select()
        .single();
      if (insertErr) throw insertErr;

      // Auto-trigger validation scan on upload
      if (inserted) {
        triggerValidation(inserted.id, newCategory);
      }

      queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });
      toast.success("Saved to vault — AI is scanning for compliance");
      setShowAdd(false);
      setNewName("");
      setSelectedFile(null);
      setNewCategory("general");
      setNewExpiry("");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const triggerValidation = async (docId: string, targetCategory?: string, targetIndustry?: string) => {
    setValidatingId(docId);
    try {
      const { data, error } = await supabase.functions.invoke("validate-vault-document", {
        body: { vaultDocId: docId, targetCategory, targetIndustry },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });

      if (data?.status === "expired" || data?.status === "rejected") {
        toast.error("Document failed validation — cannot be reused");
      } else if (data?.status === "flagged") {
        toast.warning("Document flagged — review issues before reusing");
      } else {
        toast.success("Document passed validation ✓");
      }
    } catch (err: any) {
      console.error("Validation error:", err);
      toast.error("Validation scan failed — try again later");
    } finally {
      setValidatingId(null);
    }
  };

  const handleReuse = async (doc: any) => {
    // Block expired/rejected outright
    if (doc.validation_status === "expired" || doc.validation_status === "rejected") {
      setBlockDialog({
        open: true,
        docName: doc.vault_name,
        issues: (doc.validation_notes || "Document is expired or rejected and cannot be reused for new orders.")
          .split(" | "),
      });
      return;
    }

    // If pending or stale validation (>7 days), re-validate first
    const lastValidated = doc.last_validated_at ? new Date(doc.last_validated_at) : null;
    const isStale = !lastValidated || (Date.now() - lastValidated.getTime()) > 7 * 24 * 60 * 60 * 1000;

    if (doc.validation_status === "pending" || isStale) {
      setValidatingId(doc.id);
      try {
        const { data, error } = await supabase.functions.invoke("validate-vault-document", {
          body: { vaultDocId: doc.id, targetCategory: doc.category },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });

        if (!data?.canReuse) {
          setBlockDialog({
            open: true,
            docName: doc.vault_name,
            issues: data?.issues || ["Document failed revalidation."],
          });
          setValidatingId(null);
          return;
        }

        if (data?.status === "flagged") {
          toast.warning(
            `⚠️ ${doc.vault_name} has warnings: ${data.issues?.[0] || "Review before using"}`,
            { duration: 6000 }
          );
        }
      } catch {
        toast.error("Could not validate document — try again");
        setValidatingId(null);
        return;
      }
      setValidatingId(null);
    }

    // If flagged, warn but allow (non-blocking)
    if (doc.validation_status === "flagged") {
      toast.warning(
        `⚠️ This document has compliance warnings. Review before attaching to an order.`,
        { duration: 5000 }
      );
    }

    // Copy URL
    navigator.clipboard.writeText(doc.file_url);
    toast.success("File URL copied — paste into any document upload field");

    // Increment use count
    await supabase
      .from("vendor_document_vault")
      .update({ use_count: (doc.use_count || 0) + 1 })
      .eq("id", doc.id);
    queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });
  };

  const getStatusBadge = (doc: any) => {
    const config = STATUS_CONFIG[doc.validation_status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    const isScanning = validatingId === doc.id;

    return (
      <Badge className={`text-[9px] gap-0.5 ${config.color}`}>
        {isScanning ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : (
          <Icon className="w-2.5 h-2.5" />
        )}
        {isScanning ? "Scanning..." : config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Archive className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Document Vault</CardTitle>
                <CardDescription className="text-[10px]">
                  Save common docs once — AI validates before reuse
                </CardDescription>
              </div>
            </div>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAdd ? "Cancel" : "Add to Vault"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add new document form */}
          {showAdd && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
              <Input
                placeholder="Document name (e.g. Business License 2026)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Calendar className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Expiry date"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="h-8 text-xs pl-7"
                  />
                </div>
              </div>
              <label className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background text-xs cursor-pointer hover:bg-accent transition-colors w-full">
                <Upload className="w-3 h-3 shrink-0" />
                <span className="truncate">{selectedFile ? selectedFile.name : "Choose File"}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={handleUploadToVault}
                disabled={uploading || !selectedFile || !newName.trim()}
              >
                {uploading ? "Saving & Scanning..." : "Save to Vault"}
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vault..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Document list */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {isLoading && [1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
            {!isLoading && (docs || []).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Archive className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p className="text-xs">No documents in vault yet.</p>
                <p className="text-[10px] mt-1">Save frequently-used files to avoid re-uploading.</p>
              </div>
            )}
            {!isLoading && (docs || []).map((doc: any) => {
              const catLabel = CATEGORIES.find((c) => c.value === doc.category)?.label || doc.category;
              const isBlocked = doc.validation_status === "expired" || doc.validation_status === "rejected";
              const isScanning = validatingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isBlocked
                      ? "border-destructive/30 bg-destructive/5 opacity-75"
                      : doc.validation_status === "flagged"
                      ? "border-amber-500/30 bg-amber-50/30 dark:bg-amber-900/10"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isBlocked ? "bg-destructive/10" : "bg-primary/10"
                  }`}>
                    <FileText className={`w-4 h-4 ${isBlocked ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold truncate">{doc.vault_name}</h4>
                      {getStatusBadge(doc)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">{catLabel}</Badge>
                      {doc.file_size && <span className="text-[10px] text-muted-foreground">{doc.file_size}</span>}
                      <span className="text-[10px] text-muted-foreground">Used {doc.use_count || 0}×</span>
                      {doc.expiry_date && (
                        <span className={`text-[10px] ${
                          new Date(doc.expiry_date) <= new Date() ? "text-destructive font-medium" : "text-muted-foreground"
                        }`}>
                          Exp: {doc.expiry_date}
                        </span>
                      )}
                    </div>
                    {/* Validation notes for flagged/expired */}
                    {(doc.validation_status === "flagged" || doc.validation_status === "expired") && doc.validation_notes && (
                      <p className="text-[10px] mt-1 text-amber-700 dark:text-amber-400 line-clamp-2">
                        ⚠️ {doc.validation_notes.split(" | ")[0]}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {/* Rescan button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Re-scan document"
                      disabled={isScanning}
                      onClick={() => triggerValidation(doc.id, doc.category)}
                    >
                      {isScanning ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3 h-3" />
                      )}
                    </Button>
                    {/* Reuse / Copy button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 ${isBlocked ? "opacity-50" : ""}`}
                      title={isBlocked ? "Document cannot be reused" : "Copy file URL to attach to an order"}
                      disabled={isScanning}
                      onClick={() => handleReuse(doc)}
                    >
                      {isBlocked ? <XCircle className="w-3 h-3 text-destructive" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title="Remove from vault"
                      onClick={() => deleteMut.mutate(doc.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Block dialog when document can't be reused */}
      <AlertDialog open={blockDialog.open} onOpenChange={(o) => setBlockDialog((p) => ({ ...p, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Document Cannot Be Reused
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm">
                  <strong>"{blockDialog.docName}"</strong> failed compliance validation and cannot be attached to a new order.
                </p>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5">
                  {blockDialog.issues.map((issue, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Please upload a current, valid replacement document to your vault.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setBlockDialog((p) => ({ ...p, open: false })); setShowAdd(true); }}>
              Upload Replacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

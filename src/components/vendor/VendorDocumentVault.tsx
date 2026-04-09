import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Archive, Copy, FileText, Plus, Search, Trash2, Upload, X,
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

export default function VendorDocumentVault() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      const { error: insertErr } = await supabase.from("vendor_document_vault").insert({
        user_id: user.id,
        vault_name: newName.trim(),
        file_url: urlData.publicUrl || path,
        file_type: selectedFile.type,
        file_size: `${(selectedFile.size / 1024).toFixed(0)} KB`,
        category: newCategory,
      });
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ["vendor-document-vault"] });
      toast.success("Saved to vault — attach to any future order with one click");
      setShowAdd(false);
      setNewName("");
      setSelectedFile(null);
      setNewCategory("general");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCopyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("File URL copied — paste into any document upload field");
  };

  return (
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
                Save common docs once, attach to orders with one click
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
              <label className="flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background text-xs cursor-pointer hover:bg-accent transition-colors">
                <Upload className="w-3 h-3" />
                {selectedFile ? selectedFile.name.slice(0, 20) : "Choose File"}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={handleUploadToVault}
              disabled={uploading || !selectedFile || !newName.trim()}
            >
              {uploading ? "Saving..." : "Save to Vault"}
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
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
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
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate">{doc.vault_name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{catLabel}</Badge>
                    {doc.file_size && <span className="text-[10px] text-muted-foreground">{doc.file_size}</span>}
                    <span className="text-[10px] text-muted-foreground">Used {doc.use_count || 0}×</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Copy file URL to attach to an order"
                    onClick={() => handleCopyToClipboard(doc.file_url)}
                  >
                    <Copy className="w-3 h-3" />
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
  );
}

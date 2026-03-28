import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  workspaceId: string;
  onImported: () => void;
  disabled?: boolean;
}

type ParsedRow = { user_id: string; display_name: string; preferred_language?: string };

const TeamBulkImport = ({ workspaceId, onImported, disabled }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { rows: [], errors: ["CSV must have a header row and at least one data row."] };

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const userIdIdx = header.indexOf("user_id");
    const nameIdx = header.indexOf("display_name");
    const langIdx = header.indexOf("language");

    if (userIdIdx === -1) return { rows: [], errors: ["CSV must have a 'user_id' column."] };

    const parsed: ParsedRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const uid = cols[userIdIdx];
      if (!uid || uid.length < 8) { errs.push(`Row ${i + 1}: Invalid user_id`); continue; }
      parsed.push({
        user_id: uid,
        display_name: nameIdx >= 0 ? cols[nameIdx] || "" : "",
        preferred_language: langIdx >= 0 ? cols[langIdx] || "en" : "en",
      });
    }
    return { rows: parsed, errors: errs };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseCSV(ev.target?.result as string);
      setRows(result.rows);
      setErrors(result.errors);
      setShowPreview(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const importMembers = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const inserts = rows.map((r) => ({
      workspace_id: workspaceId,
      user_id: r.user_id,
      display_name: r.display_name || null,
      preferred_language: r.preferred_language || "en",
      added_by: user!.id,
    }));

    const { error } = await supabase.from("team_members").insert(inserts as any);
    setImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} members imported`);
    setShowPreview(false);
    setRows([]);
    onImported();
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={disabled}>
        <Upload className="w-4 h-4 mr-1" /> Bulk Import
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> CSV Import Preview</DialogTitle></DialogHeader>
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{e}</p>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                  <div>
                    <span className="font-medium">{r.display_name || "Unnamed"}</span>
                    <span className="text-muted-foreground ml-2 font-mono text-xs">{r.user_id.slice(0, 12)}...</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{r.preferred_language || "en"}</Badge>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Format: <code className="bg-muted px-1 rounded">user_id,display_name,language</code> (language column optional)
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button onClick={importMembers} disabled={importing || rows.length === 0}>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Import {rows.length} Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TeamBulkImport;

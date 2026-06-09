import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, X, Check, AlertTriangle, MessageSquare, Film, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryRule, validateFilesForCategory, getAcceptStringForCategory } from "@/lib/documentFileRules";

export type UploadContext =
  | { bucket: "milestone-documents"; transactionId: string; milestoneId: string }
  | { bucket: "kyc-documents"; userId: string }
  | { bucket: "dispute-evidence"; disputeId: string }
  | { bucket: "invoices"; vendorId: string }
  | { bucket: "acknowledgement-forms"; transactionId: string };

type UploadedDoc = {
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
  date: string;
  url?: string;
  storagePath?: string;
};

const BUCKET_CONFIG: Record<string, { maxSize: number; accept: string; maxFiles: number; storageMb: number }> = {
  "milestone-documents": {
    maxSize: 10 * 1024 * 1024,
    accept: ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
    maxFiles: 10,
    storageMb: 100,
  },
  "kyc-documents": {
    maxSize: 5 * 1024 * 1024,
    accept: ".pdf,.jpg,.jpeg,.png",
    maxFiles: 5,
    storageMb: 50,
  },
  "dispute-evidence": {
    maxSize: 10 * 1024 * 1024,
    accept: ".pdf,.jpg,.jpeg,.png,.mp4,.mov",
    maxFiles: 10,
    storageMb: 100,
  },
  invoices: {
    maxSize: 5 * 1024 * 1024,
    accept: ".pdf,.jpg,.jpeg,.png",
    maxFiles: 5,
    storageMb: 50,
  },
  "acknowledgement-forms": {
    maxSize: 5 * 1024 * 1024,
    accept: ".pdf",
    maxFiles: 5,
    storageMb: 50,
  },
};

function buildStoragePath(ctx: UploadContext, fileName: string): string {
  switch (ctx.bucket) {
    case "milestone-documents":
      return `${ctx.transactionId}/${ctx.milestoneId}/${fileName}`;
    case "kyc-documents":
      return `${ctx.userId}/${fileName}`;
    case "dispute-evidence":
      return `${ctx.disputeId}/${fileName}`;
    case "invoices":
      return `${ctx.vendorId}/${fileName}`;
    case "acknowledgement-forms":
      return `${ctx.transactionId}/${fileName}`;
  }
}

interface DocumentUploadProps {
  label?: string;
  storageLimitMb?: number;
  context?: UploadContext;
  /** Document category for file-type enforcement (e.g. "assay_report", "certificate", "proof_of_delivery"). Defaults to "general". */
  documentCategory?: string;
  onUploadComplete?: (files: { name: string; url: string; path: string }[]) => void;
}

const DocumentUpload = ({
  label = "Upload Documents",
  storageLimitMb,
  context,
  documentCategory = "general",
  onUploadComplete,
}: DocumentUploadProps) => {
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [intelReports, setIntelReports] = useState<{ name: string; pageCount?: number; minExpected?: number; issues?: string[]; aiRecommendation?: string | null; valid: boolean }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const bucketConfig = context ? BUCKET_CONFIG[context.bucket] : BUCKET_CONFIG["milestone-documents"];
  const categoryRule = getCategoryRule(documentCategory);
  const effectiveStorageMb = storageLimitMb ?? bucketConfig.storageMb;
  const storageLimitBytes = effectiveStorageMb * 1024 * 1024;

  // Use category rule for maxFiles and accept when a specific category is set
  const effectiveMaxFiles = documentCategory !== "general" ? categoryRule.maxFiles : bucketConfig.maxFiles;
  const effectiveAccept = documentCategory !== "general" ? getAcceptStringForCategory(documentCategory) : bucketConfig.accept;
  const effectiveMaxSize = bucketConfig.maxSize;

  const usedBytes = useMemo(() => uploads.reduce((sum, f) => sum + f.sizeBytes, 0), [uploads]);
  const usedMb = usedBytes / (1024 * 1024);
  const usagePercent = Math.min((usedBytes / storageLimitBytes) * 100, 100);
  const isNearCap = usagePercent >= 80;
  const isAtCap = usagePercent >= 100;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setCategoryError(null);

    const fileArray = Array.from(files);

    // ── Category-level validation (anti-fragmentation, format, max files) ──
    const validation = validateFilesForCategory(fileArray, documentCategory, uploads.length);
    if (!validation.valid) {
      setCategoryError(validation.reason || null);
      toast.error(validation.reason || "File validation failed.");
      return;
    }

    const allowedExts = effectiveAccept.split(",").map((e) => e.trim().replace(".", ""));

    setUploading(true);
    const newUploads: { name: string; url: string; path: string }[] = [];

    for (const file of fileArray) {
      if (uploads.length + newUploads.length >= effectiveMaxFiles) {
        toast.error(`Maximum ${effectiveMaxFiles} file(s) allowed for ${categoryRule.label}.`);
        break;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExts.includes(ext)) {
        toast.error(`${file.name} — file type .${ext} not accepted for ${categoryRule.label}.`);
        continue;
      }

      if (file.size > effectiveMaxSize) {
        toast.error(`${file.name} is too large. Max ${effectiveMaxSize / (1024 * 1024)}MB.`);
        continue;
      }

      if (usedBytes + file.size > storageLimitBytes) {
        toast.error(`Storage limit reached (${effectiveStorageMb}MB).`);
        break;
      }

      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

      if (context) {
        const uniqueName = `${Date.now()}_${file.name}`;
        const path = buildStoragePath(context, uniqueName);

        const { error } = await supabase.storage
          .from(context.bucket)
          .upload(path, file, { upsert: false });

        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from(context.bucket).getPublicUrl(path);
        newUploads.push({ name: file.name, url: urlData.publicUrl, path });

        setUploads((prev) => [
          ...prev,
          { name: file.name, type: file.type, size: sizeStr, sizeBytes: file.size, date: new Date().toLocaleDateString(), url: urlData.publicUrl, storagePath: path },
        ]);

        // ── Document Intelligence: validate page count + AI analysis for known categories ──
        if (documentCategory !== "general" && file.type === "application/pdf") {
          try {
            const { data: intel } = await supabase.functions.invoke("validate-document-pages", {
              body: {
                documentCategory,
                storageBucket: context.bucket,
                storagePath: path,
              },
            });
            if (intel && !intel.skipped) {
              setIntelReports((prev) => [
                ...prev,
                {
                  name: file.name,
                  pageCount: intel.pageCount,
                  minExpected: intel.minExpected,
                  issues: intel.issues || [],
                  aiRecommendation: intel.aiRecommendation || null,
                  valid: !!intel.valid,
                },
              ]);
              if (!intel.valid && intel.issues?.length) {
                toast.warning(`${file.name}: ${intel.issues[0]}`);
              }
            }
          } catch (e) {
            // Non-fatal: intelligence is advisory
            console.warn("[DocumentUpload] intelligence scan failed:", e);
          }
        }
      } else {
        setUploads((prev) => [
          ...prev,
          { name: file.name, type: file.type, size: sizeStr, sizeBytes: file.size, date: new Date().toLocaleDateString() },
        ]);
      }

      toast.success(`${file.name} uploaded successfully`);
    }

    if (newUploads.length > 0 && onUploadComplete) {
      onUploadComplete(newUploads);
    }
    setUploading(false);
  };

  const removeFile = async (index: number) => {
    const file = uploads[index];
    if (file.storagePath && context) {
      await supabase.storage.from(context.bucket).remove([file.storagePath]);
    }
    setUploads((prev) => prev.filter((_, i) => i !== index));
    setCategoryError(null);
  };

  const getIcon = (type: string) => {
    if (type === "application/pdf") return <FileText className="w-4 h-4 text-destructive" />;
    if (type.startsWith("video/")) return <Film className="w-4 h-4 text-accent-foreground" />;
    return <Image className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{label}</h3>

      {/* Category-specific format hint */}
      {documentCategory !== "general" ? (
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium">{categoryRule.label}</p>
          <p>{categoryRule.formatHint}</p>
          <p>Max {effectiveMaxSize / (1024 * 1024)}MB each · up to {effectiveMaxFiles} file(s)</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {effectiveAccept.replace(/\./g, "").toUpperCase()} — max {effectiveMaxSize / (1024 * 1024)}MB each · up to {effectiveMaxFiles} files
        </p>
      )}

      {/* Category validation error banner */}
      {categoryError && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/50 bg-destructive/10">
          <ShieldAlert className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-destructive">Upload Blocked</p>
            <p className="text-[10px] text-destructive/80 mt-0.5">{categoryError}</p>
          </div>
        </div>
      )}

      {/* Storage usage bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {uploads.length}/{effectiveMaxFiles} files · {usedMb.toFixed(1)}MB of {effectiveStorageMb}MB used
          </span>
          {isNearCap && !isAtCap && (
            <span className="flex items-center gap-1 text-yellow-600 font-medium">
              <AlertTriangle className="w-3 h-3" /> Near limit
            </span>
          )}
          {isAtCap && (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="w-3 h-3" /> Storage full
            </span>
          )}
        </div>
        <Progress value={usagePercent} className="h-1.5" />
      </div>

      {/* Upload button */}
      <div className="flex gap-2 items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={isAtCap || uploads.length >= effectiveMaxFiles || uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={effectiveAccept}
          multiple={effectiveMaxFiles > 1}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      {/* At-cap redirect notice */}
      {(isAtCap || uploads.length >= effectiveMaxFiles) && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Need to upload more?</p>
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 mt-0.5">
              Use the <span className="font-semibold">Message Inbox</span> to attach additional files to a support ticket.
            </p>
          </div>
        </div>
      )}

      {/* Uploaded files list */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((doc, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                {getIcon(doc.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.size} · {doc.date}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-primary" />
                  <button onClick={() => removeFile(i)} className="p-1 hover:bg-muted rounded">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Document Intelligence reports */}
      {intelReports.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Document Intelligence</p>
          {intelReports.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${r.valid ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-yellow-300 bg-yellow-50/40 dark:border-yellow-900 dark:bg-yellow-950/20"}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold truncate">{r.name}</p>
                <span className={`text-[10px] font-mono ${r.valid ? "text-emerald-700 dark:text-emerald-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                  {r.pageCount ?? "?"} / {r.minExpected ?? "?"} pages
                </span>
              </div>
              {r.issues && r.issues.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {r.issues.map((iss, j) => (
                    <li key={j} className="text-[10px] text-yellow-800 dark:text-yellow-300 flex gap-1.5">
                      <ShieldAlert className="w-3 h-3 shrink-0 mt-0.5" /> {iss}
                    </li>
                  ))}
                </ul>
              )}
              {r.aiRecommendation && (
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">AI: {r.aiRecommendation}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;

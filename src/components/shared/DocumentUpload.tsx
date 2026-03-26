import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, X, Check, AlertTriangle, MessageSquare, Film, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  onUploadComplete?: (files: { name: string; url: string; path: string }[]) => void;
}

const DocumentUpload = ({
  label = "Upload Documents",
  storageLimitMb,
  context,
  onUploadComplete,
}: DocumentUploadProps) => {
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const config = context ? BUCKET_CONFIG[context.bucket] : BUCKET_CONFIG["milestone-documents"];
  const effectiveStorageMb = storageLimitMb ?? config.storageMb;
  const storageLimitBytes = effectiveStorageMb * 1024 * 1024;

  const usedBytes = useMemo(() => uploads.reduce((sum, f) => sum + f.sizeBytes, 0), [uploads]);
  const usedMb = usedBytes / (1024 * 1024);
  const usagePercent = Math.min((usedBytes / storageLimitBytes) * 100, 100);
  const isNearCap = usagePercent >= 80;
  const isAtCap = usagePercent >= 100;

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const allowedExts = config.accept.split(",").map((e) => e.trim().replace(".", ""));

    setUploading(true);
    const newUploads: { name: string; url: string; path: string }[] = [];

    for (const file of Array.from(files)) {
      if (uploads.length + newUploads.length >= config.maxFiles) {
        toast.error(`Maximum ${config.maxFiles} files allowed.`);
        break;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExts.includes(ext)) {
        toast.error(`${file.name} — file type .${ext} not accepted.`);
        continue;
      }

      if (file.size > config.maxSize) {
        toast.error(`${file.name} is too large. Max ${config.maxSize / (1024 * 1024)}MB.`);
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

      // Upload to Supabase Storage if context provided
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
      } else {
        // Local-only mode (no storage context)
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
  };

  const getIcon = (type: string) => {
    if (type === "application/pdf") return <FileText className="w-4 h-4 text-destructive" />;
    if (type.startsWith("video/")) return <Film className="w-4 h-4 text-accent-foreground" />;
    return <Image className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-xs text-muted-foreground">
        {config.accept.replace(/\./g, "").toUpperCase()} — max {config.maxSize / (1024 * 1024)}MB each · up to {config.maxFiles} files
      </p>

      {/* Storage usage bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {uploads.length}/{config.maxFiles} files · {usedMb.toFixed(1)}MB of {effectiveStorageMb}MB used
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
          disabled={isAtCap || uploads.length >= config.maxFiles || uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? "Uploading..." : "Upload Files"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={config.accept}
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      {/* At-cap redirect notice */}
      {(isAtCap || uploads.length >= config.maxFiles) && (
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
    </div>
  );
};

export default DocumentUpload;

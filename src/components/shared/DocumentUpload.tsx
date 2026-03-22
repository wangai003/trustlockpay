import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Image, X, Check, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type UploadedDoc = {
  name: string;
  type: string;
  size: string;
  sizeBytes: number;
  date: string;
};

const ACCEPTED = ".pdf,.jpg,.jpeg,.png";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 5; // max files stored at once
const STORAGE_CAP_MB = 50; // 50MB default (Starter/Free tier)
const STORAGE_CAP_BYTES = STORAGE_CAP_MB * 1024 * 1024;

const DocumentUpload = ({ label = "Upload Documents", storageLimitMb = STORAGE_CAP_MB }: { label?: string; storageLimitMb?: number }) => {
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const storageLimitBytes = storageLimitMb * 1024 * 1024;

  const usedBytes = useMemo(() => uploads.reduce((sum, f) => sum + f.sizeBytes, 0), [uploads]);
  const usedMb = usedBytes / (1024 * 1024);
  const usagePercent = Math.min((usedBytes / storageLimitBytes) * 100, 100);
  const isNearCap = usagePercent >= 80;
  const isAtCap = usagePercent >= 100;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];

    Array.from(files).forEach(file => {
      // Check file count limit
      if (uploads.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed. Remove a file before uploading more.`, {
          description: "For larger submissions, use the Message Inbox to attach files to a support ticket.",
          duration: 5000,
        });
        return;
      }

      if (!allowed.includes(file.type)) {
        toast.error(`${file.name} — only PDF, JPEG, and PNG files are accepted.`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max 10MB per file.`);
        return;
      }

      // Check storage cap
      if (usedBytes + file.size > storageLimitBytes) {
        toast.error(`Storage limit reached (${storageLimitMb}MB).`, {
          description: "Remove existing files or use the Message Inbox to send files directly to support.",
          duration: 6000,
        });
        return;
      }

      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      setUploads(prev => {
        if (prev.length >= MAX_FILES) return prev;
        return [...prev, {
          name: file.name,
          type: file.type,
          size: sizeStr,
          sizeBytes: file.size,
          date: new Date().toLocaleDateString(),
        }];
      });
      toast.success(`${file.name} uploaded successfully`);
    });
  };

  const removeFile = (index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index));
  };

  const getIcon = (type: string) => {
    if (type === "application/pdf") return <FileText className="w-4 h-4 text-destructive" />;
    return <Image className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{label}</h3>
      <p className="text-xs text-muted-foreground">
        PDF, JPEG, PNG — max 10MB each · up to {MAX_FILES} files · {storageLimitMb}MB storage limit
      </p>

      {/* Storage usage bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{uploads.length}/{MAX_FILES} files · {usedMb.toFixed(1)}MB of {storageLimitMb}MB used</span>
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
          disabled={isAtCap || uploads.length >= MAX_FILES}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload Files
        </Button>
        <input ref={fileRef} type="file" accept={ACCEPTED} multiple className="hidden"
          onChange={e => { handleFiles(e.target.files); if (fileRef.current) fileRef.current.value = ""; }} />
      </div>

      {/* At-cap redirect notice */}
      {(isAtCap || uploads.length >= MAX_FILES) && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Need to upload more?</p>
            <p className="text-[10px] text-yellow-700 dark:text-yellow-400 mt-0.5">
              Use the <span className="font-semibold">Message Inbox</span> to attach additional files to a support ticket. An admin can assist with larger submissions.
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
                  <p className="text-[10px] text-muted-foreground">{doc.size} · {doc.date}</p>
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

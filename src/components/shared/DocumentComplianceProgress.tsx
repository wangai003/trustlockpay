import { useMemo } from "react";
import { CheckCircle2, Circle, FileText, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { INDUSTRY_MILESTONE_MAP } from "@/components/shared/industryPlaybookData";
import { useTransactionMilestones } from "@/hooks/useSupabaseData";

interface DocumentComplianceProgressProps {
  industry: string | null | undefined;
  transactionId: string;
  /** If true, show a minimal single-line version */
  compact?: boolean;
}

interface DocStatus {
  name: string;
  stage: string;
  uploaded: boolean;
}

/**
 * Shows buyers which compliance documents have been uploaded vs. still pending.
 * Gives visibility into vendor activity during pre-shipping phase.
 */
export default function DocumentComplianceProgress({
  industry,
  transactionId,
  compact = false,
}: DocumentComplianceProgressProps) {
  const { data: dbMilestones, isLoading } = useTransactionMilestones(transactionId);

  const templates = useMemo(() => {
    if (!industry) return [];
    return INDUSTRY_MILESTONE_MAP[industry as keyof typeof INDUSTRY_MILESTONE_MAP] || [];
  }, [industry]);

  // Collect all required docs across all stages
  const requiredDocs = useMemo((): DocStatus[] => {
    if (!templates.length) return [];

    const uploadedNames = new Set<string>();
    if (dbMilestones) {
      for (const ms of dbMilestones) {
        if (ms.uploaded_documents && Array.isArray(ms.uploaded_documents)) {
          for (const doc of ms.uploaded_documents as Array<{ name?: string }>) {
            if (doc?.name) uploadedNames.add(doc.name.toLowerCase());
          }
        }
      }
    }

    const docs: DocStatus[] = [];
    for (const stage of templates) {
      if (stage.documentMode === "required" && stage.documents.length > 0) {
        for (const docName of stage.documents) {
          const docLower = docName.toLowerCase();
          const isUploaded = Array.from(uploadedNames).some(
            (u) => u.includes(docLower) || docLower.includes(u.replace(/\.[^.]+$/, ""))
          );
          docs.push({ name: docName, stage: stage.name, uploaded: isUploaded });
        }
      }
    }
    return docs;
  }, [templates, dbMilestones]);

  if (!industry || requiredDocs.length === 0) return null;

  const uploadedCount = requiredDocs.filter((d) => d.uploaded).length;
  const totalCount = requiredDocs.length;
  const percentage = Math.round((uploadedCount / totalCount) * 100);
  const isComplete = uploadedCount === totalCount;
  const hasStarted = uploadedCount > 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading compliance status…
      </div>
    );
  }

  // ─── Compact: single-line badge ───
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={isComplete ? "default" : "secondary"}
          className={`text-[9px] gap-1 ${
            isComplete
              ? "bg-primary/15 text-primary border-primary/30"
              : hasStarted
              ? "bg-accent/15 text-accent-foreground border-accent/30"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : hasStarted ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
          Docs: {uploadedCount}/{totalCount}
        </Badge>
      </div>
    );
  }

  // ─── Full: progress bar + checklist ───
  return (
    <div
      className={`rounded-lg border p-3 space-y-2.5 ${
        isComplete
          ? "border-primary/30 bg-primary/5"
          : hasStarted
          ? "border-accent/30 bg-accent/5"
          : "border-border bg-muted/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">
            {isComplete
              ? "✅ Compliance Documents Complete"
              : hasStarted
              ? "📝 Vendor Preparing Documents…"
              : "⏳ Awaiting Compliance Documents"}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] ${
            isComplete ? "border-primary/40 text-primary" : "border-muted-foreground/30"
          }`}
        >
          {uploadedCount}/{totalCount}
        </Badge>
      </div>

      {/* Progress bar */}
      <Progress value={percentage} className="h-1.5" />

      {/* Status message */}
      <p className="text-xs text-muted-foreground">
        {isComplete
          ? "All required documents have been uploaded. The vendor can now confirm shipment."
          : hasStarted
          ? "The vendor is actively uploading compliance documents. Shipment is blocked until all are submitted."
          : "No compliance documents uploaded yet. The vendor must submit all required documents before shipping."}
      </p>

      {/* Document checklist by stage */}
      <div className="space-y-2 pt-1">
        {/* Group by stage */}
        {Array.from(new Set(requiredDocs.map((d) => d.stage))).map((stageName) => {
          const stageDocs = requiredDocs.filter((d) => d.stage === stageName);
          return (
            <div key={stageName}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {stageName}
              </p>
              <div className="space-y-0.5">
                {stageDocs.map((doc) => (
                  <div key={doc.name} className="flex items-center gap-1.5 text-xs">
                    {doc.uploaded ? (
                      <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    )}
                    <FileText className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <span
                      className={
                        doc.uploaded
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }
                    >
                      {doc.name}
                    </span>
                    {doc.uploaded && (
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-primary/30 text-primary">
                        Uploaded
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

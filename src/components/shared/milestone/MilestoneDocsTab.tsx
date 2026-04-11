import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, CheckCircle2, Eye, FileText, FileWarning,
  Globe, Shield, ShieldCheck, Trash2, Unlock, User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DocumentUpload from "@/components/shared/DocumentUpload";
import SecureDocumentViewer from "@/components/shared/SecureDocumentViewer";
import { getUploadedKeys } from "./milestoneConstants";

interface MilestoneDocsTabProps {
  ms: any;
  role: "buyer" | "vendor" | "admin";
  isAdmin: boolean;
  isDone: boolean;
  isTestnet: boolean;
  transactionId?: string | null;
  requiredDocs: string[];
  optionalDocs: string[];
  uploadedDocs: any[];
  gateStatus: any;
  docOwners: Record<string, "vendor" | "buyer" | "either">;
  scopeDowngraded: string[];
  tradeScope: string;
  docTypeSelections: Record<string, string>;
  setDocTypeSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onTestnetAddDocument?: (milestoneId: string, doc: { name: string; url: string }) => void;
  getUserId: () => Promise<string | null>;
  updateMilestone: any;
}

const MilestoneDocsTab = ({
  ms, role, isAdmin, isDone, isTestnet, transactionId,
  requiredDocs, optionalDocs, uploadedDocs, gateStatus, docOwners,
  scopeDowngraded, tradeScope, docTypeSelections, setDocTypeSelections,
  onTestnetAddDocument, getUserId, updateMilestone,
}: MilestoneDocsTabProps) => {
  return (
    <div className="space-y-3">
      {(requiredDocs.length > 0 || optionalDocs.length > 0) && (
        <div className="rounded-md border border-border p-2 space-y-2">
          {gateStatus.autoSatisfied.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5">
              <Unlock className="w-3 h-3 shrink-0" />
              <span><strong>{gateStatus.autoSatisfied.length}</strong> pre-payment doc(s) auto-resolved</span>
            </div>
          )}
          {scopeDowngraded.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded p-1.5">
              <Globe className="w-3 h-3 shrink-0" />
              <span><strong>{scopeDowngraded.length}</strong> doc(s) moved to optional for <span className="capitalize font-medium">{tradeScope}</span> trades</span>
            </div>
          )}
          {requiredDocs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Required
                <Badge variant="outline" className={`text-[8px] ml-1 ${gateStatus.missingRequired.length === 0 ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>
                  {gateStatus.missingRequired.length === 0 ? "All uploaded" : `${gateStatus.missingRequired.length} missing`}
                </Badge>
              </p>
              <div className="flex flex-wrap gap-1">
                {requiredDocs.map((doc: string) => {
                  const uKeys = getUploadedKeys(ms);
                  const dl = doc.toLowerCase();
                  const isMet = Array.from(uKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
                  const isAutoSat = gateStatus.autoSatisfied.includes(doc);
                  const owner = docOwners[doc] || "either";
                  return (
                    <Badge key={doc} variant="outline" className={`text-[8px] ${
                      isAutoSat ? "border-muted-foreground/30 text-muted-foreground line-through" :
                      isMet ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"
                    }`}>
                      {isAutoSat ? <Unlock className="w-2.5 h-2.5 mr-0.5" /> : isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />}
                      {doc}
                      {isAutoSat ? (
                        <span className="ml-0.5 text-[7px] text-muted-foreground italic">N/A</span>
                      ) : (
                        <span className={`ml-0.5 text-[7px] ${owner === "vendor" ? "text-primary" : owner === "buyer" ? "text-accent" : "text-muted-foreground"}`}>
                          ({owner === "either" ? "V/B" : owner === "vendor" ? "V" : "B"})
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
          {optionalDocs.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold flex items-center gap-1 text-muted-foreground"><FileWarning className="w-3 h-3" /> Recommended</p>
              <div className="flex flex-wrap gap-1">
                {optionalDocs.map((doc: string) => {
                  const uKeys = getUploadedKeys(ms);
                  const dl = doc.toLowerCase();
                  const isMet = Array.from(uKeys).some(k => k.includes(dl) || dl.includes(k.replace(/\.[^.]+$/, "")));
                  return (
                    <Badge key={doc} variant="outline" className={`text-[8px] ${isMet ? "border-primary/40 text-primary" : "border-muted-foreground/30 text-muted-foreground"}`}>
                      {isMet ? <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> : <FileWarning className="w-2.5 h-2.5 mr-0.5" />}
                      {doc}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {uploadedDocs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold">Uploaded Documents</p>
          {(() => {
            const cpDocs = uploadedDocs.filter((d: any) => d.uploaded_by_role && d.uploaded_by_role !== role);
            const myDocs = uploadedDocs.filter((d: any) => d.uploaded_by_role === role);
            return cpDocs.length > 0 ? (
              <div className="flex items-center gap-1.5 rounded border border-accent/30 bg-accent/5 px-2 py-1 text-[10px]">
                <Shield className="w-3 h-3 text-accent shrink-0" />
                <span className="text-accent font-medium">{cpDocs.length} doc{cpDocs.length > 1 ? "s" : ""} from {role === "vendor" ? "Buyer" : "Vendor"}</span>
                {myDocs.length > 0 && <span className="text-muted-foreground ml-auto">{myDocs.length} from you</span>}
              </div>
            ) : null;
          })()}
          <div className="space-y-1">
            {uploadedDocs.map((doc: any, i: number) => {
              const isCp = doc.uploaded_by_role && doc.uploaded_by_role !== role;
              return (
                <div key={i} className={`flex items-center gap-1.5 rounded border p-1.5 text-[10px] ${isCp ? "border-accent/30 bg-accent/5" : "border-border"}`}>
                  <FileText className={`w-3 h-3 shrink-0 ${isCp ? "text-accent" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">
                      {doc.document_type && doc.document_type !== "general" && <span className="font-semibold">[{doc.document_type}] </span>}
                      {doc.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <User className="w-2 h-2" />
                      {isCp ? <span className="text-accent font-medium">{doc.uploaded_by_role === "vendor" ? "Vendor" : "Buyer"}</span> : <span>You ({doc.uploaded_by_role})</span>}
                      {doc.uploadedAt && <> · {new Date(doc.uploadedAt).toLocaleDateString()}</>}
                    </span>
                  </div>
                  {doc.url && (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px]" onClick={(e) => { e.stopPropagation(); window.open(doc.url, "_blank"); }}>
                      <Eye className="w-2.5 h-2.5 mr-0.5" /> View
                    </Button>
                  )}
                  {!isAdmin && !isDone && doc.uploaded_by_role === role && (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-destructive hover:text-destructive" onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Remove "${doc.name}"?`)) return;
                      if (isTestnet) { toast.success(`Document "${doc.name}" removed`); return; }
                      const userId = await getUserId();
                      if (!userId) return;
                      const remaining = uploadedDocs.filter((_: any, j: number) => j !== i);
                      await supabase.from("transaction_milestones").update({ uploaded_documents: remaining } as any).eq("id", ms.id);
                      toast.success(`Document "${doc.name}" removed`);
                    }}>
                      <Trash2 className="w-2.5 h-2.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isAdmin && (() => {
        const allDocs = [...requiredDocs, ...optionalDocs];
        if (allDocs.length > 0) {
          return (
            <div className="space-y-1">
              <label className="text-[10px] font-medium">Tag upload as:</label>
              <Select value={docTypeSelections[ms.id] || ""} onValueChange={(val) => setDocTypeSelections(prev => ({ ...prev, [ms.id]: val }))}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select document type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Evidence</SelectItem>
                  {requiredDocs.map((doc: string) => <SelectItem key={doc} value={doc}>🔒 {doc}</SelectItem>)}
                  {optionalDocs.map((doc: string) => <SelectItem key={doc} value={doc}>📎 {doc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return null;
      })()}

      {!isAdmin && (isTestnet ? (
        <Button size="sm" variant="outline" className="text-xs" onClick={() => {
          const name = `Evidence-${ms.title.replace(/\s/g, "_")}-${Date.now()}.pdf`;
          onTestnetAddDocument?.(ms.id, { name, url: `testnet://mock/${name}` });
        }}>
          <FileText className="w-3 h-3 mr-1" /> Simulate Upload
        </Button>
      ) : (
        <DocumentUpload
          label="Upload evidence"
          context={{ bucket: "milestone-documents", transactionId, milestoneId: ms.id }}
          onUploadComplete={(files) => {
            void (async () => {
              const userId = await getUserId();
              if (!userId) return;
              const selectedDocType = docTypeSelections[ms.id] || "general";
              await updateMilestone.mutateAsync({
                milestoneId: ms.id, userId,
                uploadedDocuments: files.map((file) => ({
                  name: file.name, url: file.url, path: file.path,
                  uploadedAt: new Date().toISOString(), uploaded_by: userId,
                  uploaded_by_role: role, document_type: selectedDocType,
                })),
              });
              setDocTypeSelections(prev => ({ ...prev, [ms.id]: "" }));
            })();
          }}
        />
      ))}

      {uploadedDocs.length === 0 && requiredDocs.length === 0 && optionalDocs.length === 0 && (
        <p className="text-[11px] text-muted-foreground italic">No documents required for this stage.</p>
      )}
    </div>
  );
};

export default MilestoneDocsTab;

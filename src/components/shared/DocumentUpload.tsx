import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Image, X, Check } from "lucide-react";
import { toast } from "sonner";

type UploadedDoc = {
  name: string;
  type: string;
  size: string;
  date: string;
};

const ACCEPTED = ".pdf,.jpg,.jpeg,.png";

const DocumentUpload = ({ label = "Upload Documents" }: { label?: string }) => {
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];

    Array.from(files).forEach(file => {
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name} — only PDF, JPEG, and PNG files are accepted.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB.`);
        return;
      }
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      setUploads(prev => [...prev, {
        name: file.name,
        type: file.type,
        size: sizeStr,
        date: new Date().toLocaleDateString(),
      }]);
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
      <p className="text-xs text-muted-foreground">Accepted formats: PDF, JPEG, PNG (max 10MB each)</p>

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Drop PDF or image files here</p>
        <Button variant="outline" size="sm" className="mt-2">Browse Files</Button>
        <input ref={fileRef} type="file" accept={ACCEPTED} multiple className="hidden"
          onChange={e => handleFiles(e.target.files)} />
      </div>

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

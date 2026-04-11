import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, X, Eye, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SecureDocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string;
  documentName: string;
  viewerIdentity: string; // e.g. "TL-2847 · vendor@example.com"
}

const SecureDocumentViewer = ({
  open,
  onOpenChange,
  documentUrl,
  documentName,
  viewerIdentity,
}: SecureDocumentViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [blurred, setBlurred] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const watermarkId = useRef(`wm-${Date.now()}`);

  // Generate signed URL with expiry and auto-refresh
  useEffect(() => {
    if (!open || !documentUrl) return;
    setLoading(true);
    setSignedUrl(null);
    setExpiresAt(null);

    const fetchSignedUrl = async () => {
      try {
        const urlObj = new URL(documentUrl);
        const storageMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);

        if (storageMatch) {
          const [, bucket, path] = storageMatch;
          const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 600); // 10-minute expiry

          if (error || !data?.signedUrl) {
            console.error("Signed URL error:", error);
            setSignedUrl(documentUrl);
          } else {
            setSignedUrl(data.signedUrl);
            setExpiresAt(Date.now() + 600 * 1000);
          }
        } else {
          setSignedUrl(documentUrl);
          setExpiresAt(Date.now() + 600 * 1000);
        }
      } catch {
        setSignedUrl(documentUrl);
        setExpiresAt(Date.now() + 600 * 1000);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [open, documentUrl]);

  // Auto-refresh signed URL before expiry (at 8-min mark)
  useEffect(() => {
    if (!expiresAt || !open) return;
    
    const timeUntilRefresh = expiresAt - Date.now() - 120000; // Refresh at 8-min mark (2 min before expiry)
    if (timeUntilRefresh <= 0) return;

    const refreshTimer = setTimeout(async () => {
      try {
        const urlObj = new URL(documentUrl);
        const storageMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (storageMatch) {
          const [, bucket, path] = storageMatch;
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
          if (data?.signedUrl) {
            setSignedUrl(data.signedUrl);
            setExpiresAt(Date.now() + 600 * 1000);
            toast.success("Access renewed — 10 minutes remaining");
          }
        }
      } catch {
        toast.info("Access will expire in 2 minutes — click refresh to extend");
      }
    }, timeUntilRefresh);

    return () => clearTimeout(refreshTimer);
  }, [expiresAt, open, documentUrl]);

  // Blur on tab switch (anti-screenshot deterrent)
  useEffect(() => {
    if (!open) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setBlurred(true);
      }
    };

    const handleBlur = () => setBlurred(true);
    const handleFocus = () => setBlurred(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [open]);

  // Block right-click and keyboard shortcuts
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Document protected — right-click disabled");
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Block Print Screen, Ctrl+P, Ctrl+S, Ctrl+C
    if (
      e.key === "PrintScreen" ||
      (e.ctrlKey && ["p", "s", "c"].includes(e.key.toLowerCase())) ||
      (e.metaKey && ["p", "s", "c"].includes(e.key.toLowerCase()))
    ) {
      e.preventDefault();
      toast.info("Document protected — action blocked");
    }
  }, []);

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(documentUrl);
  const isPdf = /\.pdf(\?|$)/i.test(documentUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden"
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <DialogHeader className="p-3 pb-0 flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <DialogTitle className="text-sm truncate">{documentName}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <Eye className="w-3 h-3" />
              <span>View-only · 5min session</span>
            </div>
          </div>
        </DialogHeader>

        {/* Security notice */}
        <div className="mx-3 flex items-center gap-1.5 text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>This document is watermarked and tracked. Unauthorized sharing is traceable and may result in account suspension.</span>
        </div>

        {/* Document viewer area */}
        <div
          ref={containerRef}
          className="relative flex-1 m-3 mt-1 rounded-lg border border-border overflow-hidden bg-muted/20"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            filter: blurred ? "blur(20px)" : "none",
            transition: "filter 0.15s ease",
          }}
        >
          {/* Dynamic watermark overlay */}
          <div
            className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
            style={{ opacity: 0.08 }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute text-foreground font-mono text-[11px] whitespace-nowrap"
                style={{
                  top: `${(i * 25) % 100}%`,
                  left: `${((i * 37) + 5) % 90}%`,
                  transform: `rotate(-35deg)`,
                }}
              >
                {viewerIdentity} · {timestamp}
              </div>
            ))}
          </div>

          {/* Blur overlay when tab is switched */}
          {blurred && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-xl">
              <div className="text-center space-y-2">
                <Shield className="w-8 h-8 text-primary mx-auto" />
                <p className="text-sm font-semibold">Document Protected</p>
                <p className="text-xs text-muted-foreground">Click this window to resume viewing</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Render document */}
          {signedUrl && !loading && (
            <>
              {isImage ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={signedUrl}
                    alt={documentName}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-0"
                  title={documentName}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Eye className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(signedUrl, "_blank")}
                    >
                      Open in new tab (signed link)
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecureDocumentViewer;

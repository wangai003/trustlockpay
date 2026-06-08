import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Eye,
  Download,
  Lock,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import TrustLockWatermark from "@/components/shared/TrustLockWatermark";

type Deliverable = {
  id: string;
  transaction_id: string;
  vendor_id: string;
  buyer_id: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  external_url: string | null;
  notes: string | null;
  released_to_buyer: boolean;
  created_at: string;
};

interface Props {
  transactionId: string;
  vendorId: string;
  buyerId?: string | null;
  status: string;
  role: "vendor" | "buyer";
}

const fmtSize = (b?: number | null) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const DigitalDeliverableVault = ({
  transactionId,
  vendorId,
  buyerId,
  status,
  role,
}: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extLink, setExtLink] = useState("");
  const [notes, setNotes] = useState("");
  const [previewing, setPreviewing] = useState<{ id: string; url: string; mime?: string | null; filename?: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const released = status === "released";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transaction_deliverables")
      .select("*")
      .eq("transaction_id", transactionId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setItems((data as Deliverable[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  const handleUpload = async (file: File) => {
    if (!user?.id) return;
    if (role !== "vendor") return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large (max 100 MB)");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9_.-]/g, "_");
      const path = `${user.id}/${transactionId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("deliverables")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase
        .from("transaction_deliverables")
        .insert({
          transaction_id: transactionId,
          vendor_id: user.id,
          buyer_id: buyerId || null,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          notes: notes || null,
        });
      if (insErr) throw insErr;
      toast.success("Deliverable uploaded");
      setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!user?.id || !extLink.trim()) return;
    try {
      const { error } = await supabase.from("transaction_deliverables").insert({
        transaction_id: transactionId,
        vendor_id: user.id,
        buyer_id: buyerId || null,
        external_url: extLink.trim(),
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Link added");
      setExtLink("");
      setNotes("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const handleDelete = async (id: string, path: string | null) => {
    if (!confirm("Remove this deliverable?")) return;
    if (path) {
      await supabase.storage.from("deliverables").remove([path]);
    }
    const { error } = await supabase
      .from("transaction_deliverables")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Removed");
      load();
    }
  };

  const fetchUrl = async (id: string, mode: "preview" | "download") => {
    const { data, error } = await supabase.functions.invoke("secure-deliverable", {
      body: { action: "get_url", deliverableId: id, mode },
    });
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Failed";
      toast.error(msg);
      return null;
    }
    return data as { url: string; mime_type?: string | null; filename?: string | null };
  };

  const handlePreview = async (d: Deliverable) => {
    if (d.external_url) {
      window.open(d.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    const res = await fetchUrl(d.id, "preview");
    if (res) setPreviewing({ id: d.id, url: res.url, mime: d.mime_type, filename: d.original_filename });
  };

  const handleDownload = async (d: Deliverable) => {
    const res = await fetchUrl(d.id, "download");
    if (res) {
      const a = document.createElement("a");
      a.href = res.url;
      a.download = d.original_filename || "deliverable";
      a.click();
    }
  };

  return (
    <Card className="p-3 space-y-3 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <p className="text-xs font-semibold">Digital Deliverables</p>
          {released ? (
            <Badge variant="default" className="text-[9px]">Unlocked</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] gap-1">
              <Lock className="w-2.5 h-2.5" /> Watermarked Preview Only
            </Badge>
          )}
        </div>
      </div>

      {role === "buyer" && !released && (
        <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
          You can preview the vendor's digital work product here under a TrustLock anti-fraud watermark.
          The original, un-watermarked file unlocks for download automatically once you release funds (or after the auto-release window expires).
        </p>
      )}

      {role === "vendor" && (
        <div className="space-y-2 border-b border-border pb-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Upload file (max 100 MB)</label>
              <Input
                ref={fileRef}
                type="file"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">…or attach an external link</label>
              <div className="flex gap-1">
                <Input
                  value={extLink}
                  onChange={(e) => setExtLink(e.target.value)}
                  placeholder="https://…"
                  className="text-xs h-8"
                />
                <Button size="sm" className="h-8" onClick={handleAddLink} disabled={!extLink.trim()}>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note (e.g. v1 final draft)"
            className="text-[11px] h-7"
          />
          {uploading && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
            </p>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-[10px] text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground italic">
          {role === "vendor"
            ? "No deliverables attached yet. Upload before marking the order delivered."
            : "Vendor has not attached any digital deliverables to this order."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 p-2 rounded border border-border bg-card/50 text-xs"
            >
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {d.original_filename || d.external_url || "Deliverable"}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  {d.external_url ? "External link" : `${d.mime_type || "file"} · ${fmtSize(d.file_size_bytes)}`}
                  {d.notes && ` · ${d.notes}`}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handlePreview(d)}>
                <Eye className="w-3 h-3" />
              </Button>
              {!d.external_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={() => handleDownload(d)}
                  disabled={role === "buyer" && !released && !d.released_to_buyer}
                  title={
                    role === "buyer" && !released && !d.released_to_buyer
                      ? "Unlocks after funds are released"
                      : "Download original"
                  }
                >
                  {role === "buyer" && !released && !d.released_to_buyer ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                </Button>
              )}
              {role === "vendor" && !released && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive"
                  onClick={() => handleDelete(d.id, d.storage_path)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Watermarked Preview Modal */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="relative w-full max-w-4xl h-[85vh] bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-xs font-medium truncate">{previewing.filename || "Preview"}</p>
                {!released && role === "buyer" && (
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Lock className="w-2.5 h-2.5" /> Preview Only
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPreviewing(null)}>
                Close
              </Button>
            </div>
            <div className="relative w-full h-[calc(100%-40px)] bg-muted/10 select-none">
              {/* The watermark sits ABOVE preview, click-through */}
              <TrustLockWatermark
                certificateId={`${transactionId}-${previewing.id}-${user?.email || ""}`}
                className="text-foreground"
              />
              {/* Repeating diagonal text watermark */}
              {(role === "buyer" && !released) && (
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-10 opacity-[0.18] overflow-hidden"
                  style={{
                    backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 80px, rgba(0,0,0,0.04) 80px 160px)`,
                  }}
                >
                  <div
                    className="absolute inset-0 flex flex-wrap items-center justify-center text-[10px] font-mono text-foreground"
                    style={{ transform: "rotate(-25deg)", gap: "40px" }}
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <span key={i}>
                        ESCROW HELD · TL·{transactionId.slice(0, 8).toUpperCase()} · {user?.email || ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {previewing.mime?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewing.url} alt="" className="w-full h-full object-contain" draggable={false} />
              ) : previewing.mime?.startsWith("video/") ? (
                <video src={previewing.url} controls controlsList="nodownload" className="w-full h-full" />
              ) : (
                <iframe
                  src={previewing.url}
                  title="Preview"
                  className="w-full h-full"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DigitalDeliverableVault;

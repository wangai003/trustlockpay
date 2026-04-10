import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNote, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { serverEncrypt, serverDecryptBatch } from "@/lib/cryptoUtils";

interface Note {
  id: string;
  thread_id: string;
  admin_account_id: string;
  body: string;
  is_encrypted?: boolean;
  encryption_version?: number | null;
  created_at: string;
}

interface Props {
  threadId: string;
  adminAliasMap: Record<string, string>;
  adminNameMap: Record<string, string>;
  isChief: boolean;
}

const ThreadInternalNotes = ({ threadId, adminAliasMap, adminNameMap, isChief }: Props) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [decryptedBodies, setDecryptedBodies] = useState<Record<string, string>>({});
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const currentAdminId = (() => {
    try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}").id || null; } catch { return null; }
  })();

  const decryptNotes = useCallback(async (items: Note[]) => {
    const encrypted = items.filter(n => n.is_encrypted);
    if (encrypted.length === 0) return;
    try {
      const toDecrypt = encrypted.map(n => {
        try {
          const parsed = JSON.parse(n.body);
          return { id: n.id, body: parsed.ciphertext, nonce: parsed.nonce };
        } catch { return { id: n.id, body: n.body, nonce: "" }; }
      }).filter(n => n.nonce);
      if (toDecrypt.length > 0) {
        const results = await serverDecryptBatch(toDecrypt);
        setDecryptedBodies(prev => ({ ...prev, ...results }));
      }
    } catch {}
  }, []);

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("thread_internal_notes")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (data) {
      const items = data as Note[];
      setNotes(items);
      decryptNotes(items);
    }
  }, [threadId, decryptNotes]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  useEffect(() => {
    const channel = supabase
      .channel(`internal-notes-${threadId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "thread_internal_notes",
        filter: `thread_id=eq.${threadId}`,
      }, (payload) => {
        const note = payload.new as Note;
        setNotes((prev) => [...prev, note]);
        if (note.is_encrypted) decryptNotes([note]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, decryptNotes]);

  const handleSubmit = async () => {
    if (!newNote.trim() || !currentAdminId) return;
    setLoading(true);
    try {
      const { ciphertext, nonce } = await serverEncrypt(newNote.trim());
      const encryptedBody = JSON.stringify({ ciphertext, nonce });

      const { error } = await supabase.from("thread_internal_notes").insert({
        thread_id: threadId,
        admin_account_id: currentAdminId,
        body: encryptedBody,
        is_encrypted: true,
        encryption_version: 1,
      });
      if (error) { toast.error("Failed to add note"); }
      else { setNewNote(""); }
    } catch {
      toast.error("Encryption failed");
    }
    setLoading(false);
  };

  const getLabel = (adminId: string) => {
    const alias = adminAliasMap[adminId] || "Admin";
    if (isChief && adminNameMap[adminId]) return `${alias} (${adminNameMap[adminId]})`;
    return alias;
  };

  const getDisplayBody = (note: Note) => {
    if (!note.is_encrypted) return note.body;
    if (decryptedBodies[note.id]) return decryptedBodies[note.id];
    return "🔒 Decrypting...";
  };

  return (
    <div className="border-t border-border">
      <div className="p-2 flex items-center gap-1.5 bg-muted/30 border-b border-border">
        <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Internal Notes (admin only)</span>
        <Lock className="w-2.5 h-2.5 text-green-500" />
        <Badge variant="secondary" className="text-[9px] ml-auto">{notes.length}</Badge>
      </div>

      <ScrollArea className="max-h-48">
        <div className="p-2 space-y-2">
          {notes.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">No internal notes yet</p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="p-2 rounded bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-accent-foreground">
                  {note.admin_account_id === currentAdminId ? "You" : getLabel(note.admin_account_id)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {format(new Date(note.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-xs text-foreground whitespace-pre-wrap">{getDisplayBody(note)}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 flex gap-2 border-t border-border">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add internal note..."
          className="min-h-[32px] max-h-[60px] text-xs resize-none flex-1"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <Button size="icon" className="shrink-0 self-end h-8 w-8" onClick={handleSubmit} disabled={!newNote.trim() || loading}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ThreadInternalNotes;

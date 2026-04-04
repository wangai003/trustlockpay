import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNote, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Note {
  id: string;
  thread_id: string;
  admin_account_id: string;
  body: string;
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
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const currentAdminId = (() => {
    try { return JSON.parse(localStorage.getItem("tl_admin_auth") || "{}").id || null; } catch { return null; }
  })();

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("thread_internal_notes")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (data) setNotes(data as Note[]);
  }, [threadId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSubmit = async () => {
    if (!newNote.trim() || !currentAdminId) return;
    setLoading(true);
    const { error } = await supabase.from("thread_internal_notes").insert({
      thread_id: threadId,
      admin_account_id: currentAdminId,
      body: newNote.trim(),
    });
    if (error) { toast.error("Failed to add note"); }
    else { setNewNote(""); loadNotes(); }
    setLoading(false);
  };

  const getLabel = (adminId: string) => {
    const alias = adminAliasMap[adminId] || "Admin";
    if (isChief && adminNameMap[adminId]) return `${alias} (${adminNameMap[adminId]})`;
    return alias;
  };

  return (
    <div className="border-t border-border">
      <div className="p-2 flex items-center gap-1.5 bg-muted/30 border-b border-border">
        <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Internal Notes (admin only)</span>
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
              <p className="text-xs text-foreground whitespace-pre-wrap">{note.body}</p>
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

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Forward } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS } from "@/lib/adminDepartments";
import { forwardMessageToDepartment } from "@/lib/forwardToDepartment";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  callerAdminId: string;
  fromDepartmentSlug: string | null;
  bodyPlaintext: string;
  /** Optional excluded department (e.g. don't forward to your own dept) */
  excludeSlug?: string | null;
}

const ForwardMessageDialog = ({
  open,
  onOpenChange,
  callerAdminId,
  fromDepartmentSlug,
  bodyPlaintext,
  excludeSlug,
}: Props) => {
  const [target, setTarget] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const fromLabel =
    DEPARTMENTS.find((d) => d.slug === fromDepartmentSlug)?.name ||
    "Admin Staff";

  const handleForward = async () => {
    if (!target) {
      toast.error("Choose a department");
      return;
    }
    setBusy(true);
    try {
      const assignee = await forwardMessageToDepartment({
        callerAdminId,
        fromDepartmentLabel: fromLabel,
        targetDepartmentSlug: target,
        bodyPlaintext,
        note: note.trim() || undefined,
      });
      if (!assignee) {
        toast.error("No staff available in that department");
        return;
      }
      const deptName = DEPARTMENTS.find((d) => d.slug === target)?.name || target;
      toast.success(`Forwarded to ${deptName} (round-robin assigned)`);
      onOpenChange(false);
      setTarget("");
      setNote("");
    } catch (e: any) {
      toast.error(e?.message || "Forward failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="w-4 h-4" /> Forward to Department
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Target department
            </label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.filter(
                  (d) => d.slug !== (excludeSlug ?? "")
                ).map((d) => (
                  <SelectItem key={d.slug} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              The next agent in that department's round-robin queue will receive it.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Add a note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you forwarding this?"
              className="text-sm min-h-[70px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleForward} disabled={busy || !target}>
            {busy ? "Forwarding..." : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;

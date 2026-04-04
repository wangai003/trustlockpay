import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Clock, Eye, Gavel, Search, Shield } from "lucide-react";
import { useAdminActionLog, useAdminAliases, useChiefAdminConfig, useChiefReviewAction } from "@/hooks/useAdminMessaging";
import { format } from "date-fns";

const AdminActionLogViewer = () => {
  const [search, setSearch] = useState("");
  const [filterDeviation, setFilterDeviation] = useState(false);
  const [reviewDialog, setReviewDialog] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: logs = [] } = useAdminActionLog(100);
  const { data: aliases = [] } = useAdminAliases();
  const { data: chiefConfig } = useChiefAdminConfig();
  const chiefReview = useChiefReviewAction();

  const aliasMap = Object.fromEntries((aliases || []).map((a: any) => [a.admin_id, a.alias]));

  const currentAdminId = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
      return auth.id;
    } catch { return null; }
  })();

  const isChief = chiefConfig?.admin_id === currentAdminId;

  const filtered = logs.filter((log: any) => {
    if (filterDeviation && !log.is_deviation) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        log.action_type?.toLowerCase().includes(s) ||
        log.case_id?.toLowerCase().includes(s) ||
        aliasMap[log.admin_id]?.toLowerCase().includes(s) ||
        log.justification?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const handleReview = () => {
    if (reviewDialog && reviewDecision) {
      chiefReview.mutate({ logId: reviewDialog, decision: reviewDecision, notes: reviewNotes });
      setReviewDialog(null);
      setReviewDecision("");
      setReviewNotes("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search actions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button
          size="sm"
          variant={filterDeviation ? "destructive" : "outline"}
          onClick={() => setFilterDeviation(!filterDeviation)}
          className="gap-1"
        >
          <AlertTriangle className="w-3 h-3" /> {filterDeviation ? "Showing Deviations" : "Filter Deviations"}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-2">
          {filtered.map((log: any) => (
            <Card key={log.id} className={log.is_deviation ? "border-destructive/30" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {aliasMap[log.admin_id] || "Unknown Agent"}
                      </Badge>
                      <span className="text-xs font-semibold">{log.action_type}</span>
                      {log.is_deviation && (
                        <Badge className="bg-destructive/15 text-destructive text-[10px]">
                          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> DEVIATION
                        </Badge>
                      )}
                      {log.requires_chief_review && !log.chief_reviewed_at && (
                        <Badge className="bg-accent/15 text-accent-foreground text-[10px]">
                          <Clock className="w-2.5 h-2.5 mr-0.5" /> CHIEF REVIEW PENDING
                        </Badge>
                      )}
                      {log.chief_reviewed_at && (
                        <Badge className="bg-primary/15 text-primary text-[10px]">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Reviewed: {log.chief_decision}
                        </Badge>
                      )}
                    </div>
                    {log.case_id && (
                      <p className="text-xs text-muted-foreground">Case: {log.case_id} ({log.case_type || "general"})</p>
                    )}
                    {log.justification && (
                      <p className="text-xs text-foreground">{log.justification}</p>
                    )}
                    {log.deviation_details && (
                      <p className="text-xs text-destructive italic">{log.deviation_details}</p>
                    )}
                    {log.chief_notes && (
                      <p className="text-xs text-primary italic">Chief Notes: {log.chief_notes}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>

                  {isChief && log.requires_chief_review && !log.chief_reviewed_at && (
                    <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => setReviewDialog(log.id)}>
                      <Gavel className="w-3 h-3" /> Review
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No action logs found.</p>
          )}
        </div>
      </ScrollArea>

      {/* Chief Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4" /> Chief Admin Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Decision</label>
              <Select value={reviewDecision} onValueChange={setReviewDecision}>
                <SelectTrigger><SelectValue placeholder="Select decision..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve Action</SelectItem>
                  <SelectItem value="reversed">Reverse Action</SelectItem>
                  <SelectItem value="warning_issued">Issue Warning</SelectItem>
                  <SelectItem value="escalate">Escalate Further</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Decision rationale..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button onClick={handleReview} disabled={!reviewDecision}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActionLogViewer;

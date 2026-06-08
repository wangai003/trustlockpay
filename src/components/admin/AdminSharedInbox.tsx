import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Forward, Hand, MessageSquare, Search, UserCheck, XCircle } from "lucide-react";
import { useAdminAliases, useClaimThread, useUnclaimThread, useUpdateCaseStatus } from "@/hooks/useAdminMessaging";
import { format } from "date-fns";
import ForwardMessageDialog from "@/components/admin/ForwardMessageDialog";

const ADMIN_SENTINEL_ID = "00000000-0000-0000-0000-000000000001";

interface ThreadWithClaim {
  id: string;
  participant_1: string;
  participant_2: string;
  subject: string | null;
  category: string;
  status: string;
  case_status: string;
  claimed_by: string | null;
  claimed_at: string | null;
  last_message_at: string;
  created_at: string;
  transaction_id: string | null;
}

const caseStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-primary/15 text-primary", icon: MessageSquare },
  resolved: { label: "Resolved", color: "bg-primary/20 text-primary", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-muted text-muted-foreground", icon: XCircle },
};

const AdminSharedInbox = () => {
  const [threads, setThreads] = useState<ThreadWithClaim[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const { data: aliases = [] } = useAdminAliases();
  const claimThread = useClaimThread();
  const unclaimThread = useUnclaimThread();
  const updateCaseStatus = useUpdateCaseStatus();

  const aliasMap = Object.fromEntries((aliases || []).map((a: any) => [a.admin_id, a.alias]));

  const currentAdminId = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
      return auth.id;
    } catch { return null; }
  })();

  const isChief = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
      return auth.isChief === true;
    } catch { return false; }
  })();

  const chiefRank = (() => {
    try {
      const auth = JSON.parse(localStorage.getItem("tl_admin_auth") || "{}");
      return auth.chiefRank || null;
    } catch { return null; }
  })();

  const loadThreads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("message_threads")
      .select("*")
      .or(`participant_1.eq.${ADMIN_SENTINEL_ID},participant_2.eq.${ADMIN_SENTINEL_ID}`)
      .order("last_message_at", { ascending: false });

    if (!error && data) setThreads(data as ThreadWithClaim[]);
    setLoading(false);
  }, []);

  const resolveNames = useCallback(async (threadList: ThreadWithClaim[]) => {
    const ids = new Set<string>();
    threadList.forEach((t) => {
      if (t.participant_1 !== ADMIN_SENTINEL_ID) ids.add(t.participant_1);
      if (t.participant_2 !== ADMIN_SENTINEL_ID) ids.add(t.participant_2);
    });
    if (ids.size === 0) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(ids));

    const names: Record<string, string> = {};
    data?.forEach((p) => { names[p.id] = p.full_name || p.email || p.id.slice(0, 8); });
    setParticipantNames(names);
  }, []);

  // Load admin real names for chief visibility
  const resolveAdminNames = useCallback(async () => {
    if (!isChief) return;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-admin-staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ action: "list", chiefAdminId: currentAdminId }),
    });
    const json = await res.json();
    if (json.staff) {
      const map: Record<string, string> = {};
      json.staff.forEach((s: any) => { map[s.id] = s.name; });
      setAdminNames(map);
    }
  }, [isChief, currentAdminId]);

  useEffect(() => { loadThreads(); resolveAdminNames(); }, [loadThreads, resolveAdminNames]);
  useEffect(() => { if (threads.length > 0) resolveNames(threads); }, [threads, resolveNames]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-shared-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_threads" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadThreads]);

  const getUserName = (thread: ThreadWithClaim) => {
    const otherId = thread.participant_1 === ADMIN_SENTINEL_ID ? thread.participant_2 : thread.participant_1;
    return participantNames[otherId] || otherId.slice(0, 8);
  };

  const filtered = threads.filter((t) => {
    if (statusFilter !== "all" && t.case_status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        getUserName(t).toLowerCase().includes(s) ||
        t.subject?.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const claimedByOther = (t: ThreadWithClaim) => t.claimed_by && t.claimed_by !== currentAdminId;
  const claimedByMe = (t: ThreadWithClaim) => t.claimed_by === currentAdminId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search threads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(caseStatusConfig).map(([key, cfg]) => {
          const count = threads.filter((t) => t.case_status === key).length;
          return (
            <Card key={key} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setStatusFilter(key)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <cfg.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
                <p className="text-xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No threads found.</p>
          )}
          {filtered.map((thread) => {
            const cfg = caseStatusConfig[thread.case_status] || caseStatusConfig.open;
            return (
              <Card key={thread.id} className={claimedByOther(thread) ? "opacity-70" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{getUserName(thread)}</span>
                        <Badge className={`text-[10px] ${cfg.color}`}>
                          <cfg.icon className="w-2.5 h-2.5 mr-0.5" /> {cfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{thread.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{thread.subject || "No subject"}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{format(new Date(thread.last_message_at || thread.created_at), "MMM d, h:mm a")}</span>
                        {thread.claimed_by && (
                          <span className="flex items-center gap-1 font-medium text-primary">
                            <UserCheck className="w-2.5 h-2.5" />
                            {claimedByMe(thread) ? "You" : aliasMap[thread.claimed_by] || "Agent"} handling
                            {/* Chief sees real name in parentheses */}
                            {isChief && !claimedByMe(thread) && adminNames[thread.claimed_by] && (
                              <span className="text-muted-foreground font-normal ml-0.5">({adminNames[thread.claimed_by]})</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 flex-wrap">
                      {!thread.claimed_by && (
                        <Button
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => currentAdminId && claimThread.mutate({ threadId: thread.id, adminId: currentAdminId })}
                        >
                          <Hand className="w-3 h-3" /> Claim
                        </Button>
                      )}
                      {claimedByMe(thread) && (
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => unclaimThread.mutate(thread.id)}>
                          Release
                        </Button>
                      )}
                      {claimedByOther(thread) && (
                        <>
                          <Badge variant="outline" className="text-[10px] border-primary/30">
                            <UserCheck className="w-2.5 h-2.5 mr-0.5" /> {aliasMap[thread.claimed_by!] || "Agent"} active
                          </Badge>
                          {/* Chief can forcibly release another admin's claim */}
                          {isChief && (
                            <Button size="sm" variant="ghost" className="gap-1 text-[10px] h-6" onClick={() => unclaimThread.mutate(thread.id)}>
                              Force Release
                            </Button>
                          )}
                        </>
                      )}

                      {/* Only the claiming admin, unclaimed threads, or chief can change status */}
                      {(claimedByMe(thread) || !thread.claimed_by || isChief) ? (
                        <Select
                          value={thread.case_status}
                          onValueChange={(v) => updateCaseStatus.mutate({ threadId: thread.id, caseStatus: v })}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">{cfg.label}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminSharedInbox;

import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, Clock, CheckCircle, Bot, Eye, ArrowUpRight } from "lucide-react";
import { useDisputes, useReviewDispute } from "@/hooks/useSupabaseData";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  ai_reviewing: { label: "Emmanuel Analyzing", color: "bg-primary/15 text-primary", icon: Bot },
  resolved: { label: "Resolved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  escalated: { label: "Escalated", color: "bg-destructive/15 text-destructive", icon: ArrowUpRight },
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminDisputes = () => {
  const [search, setSearch] = useState("");
  const { data: rawDisputes = [] } = useDisputes();
  const reviewDispute = useReviewDispute();

  const disputes = rawDisputes.map(d => ({
    id: d.dispute_id,
    dbId: d.id,
    txId: d.tx_id || "—",
    buyer: d.buyer_name || "Unknown",
    vendor: d.vendor_name || "Unknown",
    amount: d.amount ? `$${Number(d.amount).toLocaleString()}` : "—",
    reason: d.reason || "—",
    status: d.status,
    aiConfidence: d.ai_confidence ?? 0,
    aiRecommendation: d.ai_recommendation || "Awaiting analysis",
    filed: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    priority: d.priority || "medium",
  }));

  const filtered = disputes.filter((d) =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.buyer.toLowerCase().includes(search.toLowerCase()) ||
    d.vendor.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = disputes.filter(d => d.status !== "resolved").length;
  const aiProcessing = disputes.filter(d => d.status === "ai_reviewing").length;
  const resolvedCount = disputes.filter(d => d.status === "resolved").length;

  return (
    <div>
      <AdminHeader title="Dispute Management" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open Disputes", value: String(openCount), icon: AlertTriangle },
            { label: "Emmanuel Processing", value: String(aiProcessing), icon: Bot },
            { label: "Avg Resolution", value: "2.4 days", icon: Clock },
            { label: "Resolved (30d)", value: String(resolvedCount), icon: CheckCircle },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-4">
          {filtered.map((dispute) => {
            const cfg = statusConfig[dispute.status] || statusConfig.pending;
            return (
              <Card key={dispute.id} className={dispute.priority === "critical" ? "border-destructive/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold">{dispute.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" /> {cfg.label}
                        </span>
                        <Badge className={`text-[10px] ${priorityColors[dispute.priority] || ""}`}>
                          {dispute.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">
                        <strong>{dispute.buyer}</strong> vs <strong>{dispute.vendor}</strong> — {dispute.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>TX: {dispute.txId}</span>
                        <span>Amount: {dispute.amount}</span>
                        <span>Filed: {dispute.filed}</span>
                      </div>
                    </div>

                    <div className="lg:w-72 bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">Emmanuel's Take</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">{dispute.aiConfidence}% confident</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{dispute.aiRecommendation}</p>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${dispute.aiConfidence >= 90 ? "bg-primary" : dispute.aiConfidence >= 70 ? "bg-accent" : "bg-destructive"}`} style={{ width: `${dispute.aiConfidence}%` }} />
                      </div>
                    </div>

                    <div className="flex lg:flex-col gap-2">
                      <Button size="sm" variant="outline" className="gap-1"><Eye className="w-3 h-3" /> View</Button>
                      {dispute.status !== "resolved" && (
                        <Button size="sm" className="gap-1" onClick={() => reviewDispute.mutate(dispute.dbId)}>Review</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDisputes;

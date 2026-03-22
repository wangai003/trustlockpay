import { useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, Clock, CheckCircle, Bot, Eye, ArrowUpRight } from "lucide-react";

const mockDisputes = [
  { id: "DSP-001", txId: "TL-2026-0894", buyer: "Amara D.", vendor: "GreenFarm Co", amount: "$680", reason: "Item not as described", status: "pending" as const, aiConfidence: 87, aiRecommendation: "Partial refund (60% buyer)", filed: "Mar 15, 2026", priority: "medium" as const },
  { id: "DSP-002", txId: "TL-2026-0878", buyer: "Kwame S.", vendor: "AutoParts Accra", amount: "$340", reason: "Non-delivery", status: "ai_reviewing" as const, aiConfidence: 92, aiRecommendation: "Full refund to buyer", filed: "Mar 17, 2026", priority: "high" as const },
  { id: "DSP-003", txId: "TL-2026-0865", buyer: "Chioma E.", vendor: "Lagos Fashion Hub", amount: "$95", reason: "Wrong size received", status: "resolved" as const, aiConfidence: 96, aiRecommendation: "Auto-resolved: Full refund", filed: "Mar 12, 2026", priority: "low" as const },
  { id: "DSP-004", txId: "TL-2026-0880", buyer: "Yusuf A.", vendor: "Sahara Logistics", amount: "$2,100", reason: "Service incomplete - only 2 of 5 milestones", status: "escalated" as const, aiConfidence: 64, aiRecommendation: "Requires senior admin review", filed: "Mar 18, 2026", priority: "critical" as const },
  { id: "DSP-005", txId: "TL-2026-0890", buyer: "Ngozi P.", vendor: "TechBuild Solutions", amount: "$5,800", reason: "Project abandoned mid-milestone", status: "pending" as const, aiConfidence: 78, aiRecommendation: "Split payout: 40% vendor, 60% buyer", filed: "Mar 20, 2026", priority: "high" as const },
];

const statusConfig = {
  pending: { label: "Pending Review", color: "bg-accent/15 text-accent-foreground", icon: Clock },
  ai_reviewing: { label: "Emmanuel Analyzing", color: "bg-primary/15 text-primary", icon: Bot },
  resolved: { label: "Resolved", color: "bg-primary/15 text-primary", icon: CheckCircle },
  escalated: { label: "Escalated", color: "bg-destructive/15 text-destructive", icon: ArrowUpRight },
};

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminDisputes = () => {
  const [search, setSearch] = useState("");

  const filtered = mockDisputes.filter((d) =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.buyer.toLowerCase().includes(search.toLowerCase()) ||
    d.vendor.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <AdminHeader title="Dispute Management" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Open Disputes", value: "12", icon: AlertTriangle },
            { label: "Emmanuel Processing", value: "3", icon: Bot },
            { label: "Avg Resolution", value: "2.4 days", icon: Clock },
            { label: "Resolved (30d)", value: "42", icon: CheckCircle },
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

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Dispute Cards */}
        <div className="space-y-4">
          {filtered.map((dispute) => {
            const cfg = statusConfig[dispute.status];
            return (
              <Card key={dispute.id} className={dispute.priority === "critical" ? "border-destructive/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-bold">{dispute.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <Badge className={`text-[10px] ${priorityColors[dispute.priority]}`}>
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

                    {/* AI Recommendation */}
                    <div className="lg:w-72 bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold">Emmanuel's Take</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {dispute.aiConfidence}% confident
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{dispute.aiRecommendation}</p>
                      {/* Confidence bar */}
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${dispute.aiConfidence >= 90 ? "bg-primary" : dispute.aiConfidence >= 70 ? "bg-accent" : "bg-destructive"}`}
                          style={{ width: `${dispute.aiConfidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="w-3 h-3" /> View
                      </Button>
                      {dispute.status !== "resolved" && (
                        <Button size="sm" className="gap-1">
                          Review
                        </Button>
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

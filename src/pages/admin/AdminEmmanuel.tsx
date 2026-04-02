import { useState } from "react";
import { motion } from "framer-motion";
import EmmanuelChat from "@/components/admin/EmmanuelChat";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Brain, Eye, FileText, MessageSquare, Shield, TrendingUp,
  Clock, CheckCircle, AlertTriangle, ArrowRight, Zap, Activity,
  Target, Heart, Search, BarChart3, Mail, HelpCircle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

const accuracyData = [
  { week: "W1", accuracy: 89 },
  { week: "W2", accuracy: 91 },
  { week: "W3", accuracy: 90 },
  { week: "W4", accuracy: 93 },
  { week: "W5", accuracy: 92 },
  { week: "W6", accuracy: 94 },
  { week: "W7", accuracy: 94.2 },
];

const resolutionData = [
  { category: "Non-delivery", count: 18 },
  { category: "Not as described", count: 14 },
  { category: "Service incomplete", count: 9 },
  { category: "Wrong item", count: 7 },
  { category: "Quality issue", count: 5 },
];

const mockCaseWorkflow = {
  id: "DSP-002",
  txId: "TL-2026-0878",
  buyer: "Kwame S. (Toronto)",
  vendor: "AutoParts Accra (Ghana)",
  amount: "$340.00",
  reason: "Non-delivery — buyer claims item never arrived",
  status: "ai_reviewing",
  confidence: 92,
  opinion: "Evidence strongly supports buyer. Vendor has repeated non-delivery history and failed to respond. I recommend a full refund to buyer.",
  recommendation: "Refund",
  timeline: [
    { time: "Mar 17, 10:32 AM", event: "Dispute filed by buyer", type: "system" as const },
    { time: "Mar 17, 10:32 AM", event: "Emmanuel AI assigned to case", type: "ai" as const },
    { time: "Mar 17, 10:33 AM", event: "Evidence collection started", type: "ai" as const },
    { time: "Mar 17, 10:34 AM", event: "Shipping records analyzed — no tracking confirmation found", type: "ai" as const },
    { time: "Mar 17, 10:35 AM", event: "Vendor communication history scanned — 2 unresponded buyer messages", type: "ai" as const },
    { time: "Mar 17, 10:36 AM", event: "Sentiment analysis: Buyer frustration HIGH, Vendor engagement LOW", type: "ai" as const },
    { time: "Mar 17, 10:37 AM", event: "Cross-case check: Vendor has 3 prior non-delivery complaints", type: "ai" as const },
    { time: "Mar 17, 10:38 AM", event: "Confidence reached 92% — Recommendation: Full refund to buyer", type: "ai" as const },
    { time: "Mar 17, 10:38 AM", event: "Awaiting admin approval (24h window)", type: "system" as const },
  ],
  evidence: [
    { type: "Shipping Record", finding: "No tracking number provided by vendor", severity: "high" as const },
    { type: "Communication Log", finding: "Buyer sent 2 follow-up messages, vendor unresponsive for 5 days", severity: "high" as const },
    { type: "Vendor History", finding: "3 prior non-delivery disputes in past 60 days", severity: "critical" as const },
    { type: "Payment Verification", finding: "Buyer payment confirmed and locked in escrow", severity: "info" as const },
    { type: "Sentiment Analysis", finding: "Buyer: frustrated, factual tone. Vendor: no response to analyze", severity: "medium" as const },
    { type: "Contradiction Check", finding: "No contradictions in buyer's account", severity: "info" as const },
  ],
};

const severityColors = {
  info: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminEmmanuel = () => {
  const [showWorkflow, setShowWorkflow] = useState(false);
  const c = mockCaseWorkflow;

  return (
    <div>
      <AdminHeader title="Emmanuel AI" />
      <div className="p-6 space-y-6">
        {/* Hero Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="font-heading text-xl font-bold text-foreground">Emmanuel</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI-powered dispute resolution engine. Analyzes evidence, detects contradictions, and recommends fair outcomes.
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    <Badge className="bg-primary/15 text-primary">Online</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Processing 3 cases
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Avg response: 6 min
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="shrink-0">Kill Switch</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Cases", value: "82", icon: FileText },
            { label: "Auto-Resolved", value: "42", icon: Zap },
            { label: "Admin Approved", value: "28", icon: CheckCircle },
            { label: "Overridden", value: "4", icon: AlertTriangle },
            { label: "Accuracy (30d)", value: "94.2%", icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <div className="text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Accuracy Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={accuracyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 10%, 90%)" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[85, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="accuracy" stroke="hsl(152, 52%, 24%)" strokeWidth={2} dot={{ fill: "hsl(152, 52%, 24%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Disputes by Category</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={resolutionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(45, 10%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(45,10%,90%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="hsl(43, 80%, 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Case View */}
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Case Workflow — {c.id}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{c.buyer} vs {c.vendor}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowWorkflow(!showWorkflow)}>
              <Eye className="w-3 h-3 mr-1" /> {showWorkflow ? "Collapse" : "Expand Workflow"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 rounded-lg p-4">
              <div><span className="text-xs text-muted-foreground">Amount</span><div className="font-bold">{c.amount}</div></div>
              <div><span className="text-xs text-muted-foreground">Reason</span><div className="text-sm">{c.reason}</div></div>
              <div><span className="text-xs text-muted-foreground">Confidence</span>
                <div className="font-bold text-primary">{c.confidence}%</div>
              </div>
              <div><span className="text-xs text-muted-foreground">Recommendation</span>
                <Badge className={`${c.recommendation === "Refund" ? "bg-destructive/15 text-destructive" : c.recommendation === "Release" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent-foreground"}`}>
                  {c.recommendation}
                </Badge>
              </div>
            </div>
            {/* Emmanuel's Opinion */}
            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 flex gap-3">
              <Bot className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Emmanuel's Opinion</p>
                <p className="text-xs text-muted-foreground mt-1">{c.opinion}</p>
              </div>
            </div>

            {showWorkflow && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4">
                {/* Evidence Table */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" /> Evidence Collected
                  </h4>
                  <div className="space-y-2">
                    {c.evidence.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3">
                        <Badge className={`text-[10px] shrink-0 ${severityColors[e.severity]}`}>{e.severity.toUpperCase()}</Badge>
                        <div>
                          <div className="text-xs font-semibold">{e.type}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{e.finding}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" /> Activity Timeline
                  </h4>
                  <div className="space-y-0">
                    {c.timeline.map((step, i) => (
                      <div key={i} className="flex gap-3 relative">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${step.type === "ai" ? "bg-primary" : "bg-accent"} shrink-0 mt-1`} />
                          {i < c.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-xs text-muted-foreground">{step.time}</p>
                          <p className="text-sm">{step.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Admin Decision Required</p>
                    <p className="text-xs text-muted-foreground">Approve Emmanuel's recommendation or override with your own ruling.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-primary">Approve</Button>
                    <Button size="sm" variant="outline">Override</Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30">Escalate</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Emmanuel Chat */}
        <EmmanuelChat />
      </div>
    </div>
  );
};

export default AdminEmmanuel;

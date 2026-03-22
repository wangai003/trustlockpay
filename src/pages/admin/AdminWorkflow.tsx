import { useState, useMemo } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Bot, User, CheckCircle, Clock, AlertTriangle, ArrowRight,
  Eye, Shield, RefreshCw, BarChart3, Users, Zap
} from "lucide-react";

// ── Admin officials ──
const admins = [
  { id: "michael", name: "Michael", initials: "MT", color: "bg-blue-600", aiName: "Michael AI" },
  { id: "david", name: "David", initials: "DT", color: "bg-amber-600", aiName: "David AI" },
  { id: "emmanuel", name: "Emmanuel", initials: "ET", color: "bg-emerald-600", aiName: "Emmanuel AI" },
];

type CaseStatus = "ai_scanning" | "ai_analyzed" | "assigned" | "in_review" | "resolved" | "escalated";
type CasePriority = "low" | "medium" | "high" | "critical";

interface WorkflowCase {
  id: string;
  disputeId: string;
  txId: string;
  buyer: string;
  vendor: string;
  amount: string;
  reason: string;
  priority: CasePriority;
  status: CaseStatus;
  assignedAdmin: string;
  assignedAi: string;
  emmanuelConfidence: number;
  emmanuelRecommendation: string;
  aiScanComplete: boolean;
  aiAnalysisNotes: string;
  filed: string;
  lastUpdated: string;
  roundRobinOrder: number;
}

// ── Mock cases distributed via round-robin ──
const mockCases: WorkflowCase[] = [
  {
    id: "WF-001", disputeId: "DSP-001", txId: "TL-2026-0894", buyer: "Amara D. (BYR-2026-0112)", vendor: "GreenFarm Co (VND-2026-0045)",
    amount: "$680", reason: "Item not as described", priority: "medium", status: "assigned",
    assignedAdmin: "michael", assignedAi: "Michael AI", emmanuelConfidence: 87,
    emmanuelRecommendation: "Partial refund (60% buyer) — evidence supports buyer claim with minor vendor compliance",
    aiScanComplete: true, aiAnalysisNotes: "Photos show color discrepancy. Vendor shipping docs confirm correct SKU.",
    filed: "Mar 15, 2026", lastUpdated: "Mar 20, 2026", roundRobinOrder: 1
  },
  {
    id: "WF-002", disputeId: "DSP-002", txId: "TL-2026-0878", buyer: "Kwame S. (BYR-2026-0098)", vendor: "AutoParts Accra (VND-2026-0032)",
    amount: "$340", reason: "Non-delivery", priority: "high", status: "in_review",
    assignedAdmin: "david", assignedAi: "David AI", emmanuelConfidence: 92,
    emmanuelRecommendation: "Full refund to buyer — tracking shows package returned to origin",
    aiScanComplete: true, aiAnalysisNotes: "Carrier confirmed package undeliverable. Vendor did not reship within SLA.",
    filed: "Mar 17, 2026", lastUpdated: "Mar 21, 2026", roundRobinOrder: 2
  },
  {
    id: "WF-003", disputeId: "DSP-003", txId: "TL-2026-0865", buyer: "Chioma E. (BYR-2026-0076)", vendor: "Lagos Fashion (VND-2026-0051)",
    amount: "$95", reason: "Wrong size received", priority: "low", status: "resolved",
    assignedAdmin: "emmanuel", assignedAi: "Emmanuel AI", emmanuelConfidence: 96,
    emmanuelRecommendation: "Full refund — clear evidence of vendor packing error",
    aiScanComplete: true, aiAnalysisNotes: "Order receipt vs delivered item size mismatch confirmed via photo analysis.",
    filed: "Mar 12, 2026", lastUpdated: "Mar 19, 2026", roundRobinOrder: 3
  },
  {
    id: "WF-004", disputeId: "DSP-004", txId: "TL-2026-0880", buyer: "Yusuf A. (BYR-2026-0134)", vendor: "Sahara Logistics (VND-2026-0019)",
    amount: "$2,100", reason: "Service incomplete — 2 of 5 milestones", priority: "critical", status: "escalated",
    assignedAdmin: "michael", assignedAi: "Michael AI", emmanuelConfidence: 64,
    emmanuelRecommendation: "Requires senior admin review — milestone evidence contradicts both parties",
    aiScanComplete: true, aiAnalysisNotes: "Contract ambiguity in milestone definitions. Both parties submitted conflicting deliverables.",
    filed: "Mar 18, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 4
  },
  {
    id: "WF-005", disputeId: "DSP-005", txId: "TL-2026-0890", buyer: "Ngozi P. (BYR-2026-0156)", vendor: "TechBuild Solutions (VND-2026-0067)",
    amount: "$5,800", reason: "Project abandoned mid-milestone", priority: "high", status: "assigned",
    assignedAdmin: "david", assignedAi: "David AI", emmanuelConfidence: 78,
    emmanuelRecommendation: "Split payout: 40% vendor (completed work), 60% buyer refund",
    aiScanComplete: true, aiAnalysisNotes: "Git commits show vendor delivered 2 of 4 modules. Communication went dark Mar 14.",
    filed: "Mar 20, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 5
  },
  {
    id: "WF-006", disputeId: "DSP-006", txId: "TL-2026-0901", buyer: "Fatima B. (BYR-2026-0089)", vendor: "Mombasa Textiles (VND-2026-0073)",
    amount: "$420", reason: "Counterfeit goods allegation", priority: "high", status: "ai_scanning",
    assignedAdmin: "emmanuel", assignedAi: "Emmanuel AI", emmanuelConfidence: 0,
    emmanuelRecommendation: "Pending — initial scan in progress",
    aiScanComplete: false, aiAnalysisNotes: "Awaiting image comparison and brand verification scan.",
    filed: "Mar 22, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 6
  },
  {
    id: "WF-007", disputeId: "DSP-007", txId: "TL-2026-0905", buyer: "Kofi M. (BYR-2026-0201)", vendor: "Accra Motors (VND-2026-0088)",
    amount: "$1,750", reason: "Defective auto parts — engine failure", priority: "critical", status: "ai_analyzed",
    assignedAdmin: "michael", assignedAi: "Michael AI", emmanuelConfidence: 85,
    emmanuelRecommendation: "Full refund + vendor warning — safety-critical defect confirmed",
    aiScanComplete: true, aiAnalysisNotes: "Mechanic report confirms part failure. Vendor has 2 prior similar complaints.",
    filed: "Mar 21, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 7
  },
  {
    id: "WF-008", disputeId: "DSP-008", txId: "TL-2026-0910", buyer: "Adaeze N. (BYR-2026-0178)", vendor: "Safari Dreams (VND-2026-0055)",
    amount: "$3,200", reason: "Tour package cancellation refusal", priority: "medium", status: "assigned",
    assignedAdmin: "david", assignedAi: "David AI", emmanuelConfidence: 74,
    emmanuelRecommendation: "70% refund — vendor cancellation policy unclear in listing",
    aiScanComplete: true, aiAnalysisNotes: "Terms of service were not clearly displayed at checkout. Buyer cancelled 48hrs before.",
    filed: "Mar 19, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 8
  },
  {
    id: "WF-009", disputeId: "DSP-009", txId: "TL-2026-0915", buyer: "Emmanuel K. (BYR-2026-0190)", vendor: "Lagos Realty (VND-2026-0041)",
    amount: "$8,500", reason: "Property inspection discrepancies", priority: "critical", status: "in_review",
    assignedAdmin: "emmanuel", assignedAi: "Emmanuel AI", emmanuelConfidence: 71,
    emmanuelRecommendation: "Hold funds pending independent inspection — high-value case",
    aiScanComplete: true, aiAnalysisNotes: "Photos differ from listing. Independent appraisal recommended before ruling.",
    filed: "Mar 16, 2026", lastUpdated: "Mar 22, 2026", roundRobinOrder: 9
  },
];

const statusConfig: Record<CaseStatus, { label: string; color: string; icon: typeof Clock }> = {
  ai_scanning: { label: "AI Scanning", color: "bg-muted text-muted-foreground", icon: RefreshCw },
  ai_analyzed: { label: "AI Analyzed", color: "bg-primary/15 text-primary", icon: Bot },
  assigned: { label: "Assigned", color: "bg-accent/15 text-accent-foreground", icon: ArrowRight },
  in_review: { label: "In Review", color: "bg-blue-500/15 text-blue-400", icon: Eye },
  resolved: { label: "Resolved", color: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle },
  escalated: { label: "Escalated", color: "bg-destructive/15 text-destructive", icon: AlertTriangle },
};

const priorityColors: Record<CasePriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent/15 text-accent-foreground",
  high: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const AdminWorkflow = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  // Current logged-in admin (testnet defaults to michael)
  const currentAdmin = localStorage.getItem("tl_admin_name")?.toLowerCase() || "michael";

  const getAdminCases = (adminId: string) => mockCases.filter(c => c.assignedAdmin === adminId);

  const adminStats = useMemo(() =>
    admins.map(admin => {
      const cases = getAdminCases(admin.id);
      return {
        ...admin,
        total: cases.length,
        active: cases.filter(c => !["resolved"].includes(c.status)).length,
        resolved: cases.filter(c => c.status === "resolved").length,
        critical: cases.filter(c => c.priority === "critical").length,
        avgConfidence: cases.length ? Math.round(cases.reduce((s, c) => s + c.emmanuelConfidence, 0) / cases.length) : 0,
      };
    }),
  []);

  const totalCases = mockCases.length;
  const resolvedCases = mockCases.filter(c => c.status === "resolved").length;
  const activeCases = totalCases - resolvedCases;
  const avgConfidence = Math.round(mockCases.filter(c => c.emmanuelConfidence > 0).reduce((s, c) => s + c.emmanuelConfidence, 0) / mockCases.filter(c => c.emmanuelConfidence > 0).length);

  const renderCaseCard = (c: WorkflowCase) => {
    const cfg = statusConfig[c.status];
    const admin = admins.find(a => a.id === c.assignedAdmin)!;
    return (
      <Card key={c.id} className={c.priority === "critical" ? "border-destructive/30" : ""}>
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold">{c.id}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
              </span>
              <Badge className={`text-[10px] ${priorityColors[c.priority]}`}>{c.priority.toUpperCase()}</Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full ${admin.color} flex items-center justify-center`}>
                <span className="text-[9px] font-bold text-white">{admin.initials}</span>
              </div>
              <span className="text-xs font-medium text-foreground">{admin.name}</span>
              <span className="text-[10px] text-muted-foreground">+ {c.assignedAi}</span>
            </div>
          </div>

          {/* Case details */}
          <div>
            <p className="text-sm"><strong>{c.buyer}</strong> vs <strong>{c.vendor}</strong></p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.reason} — {c.amount}</p>
          </div>

          {/* Emmanuel's analysis */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold">Emmanuel AI Analysis</span>
              {c.aiScanComplete ? (
                <Badge variant="outline" className="ml-auto text-[9px]">{c.emmanuelConfidence}% confident</Badge>
              ) : (
                <Badge variant="outline" className="ml-auto text-[9px] animate-pulse">Scanning...</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{c.emmanuelRecommendation}</p>
            {c.aiScanComplete && (
              <p className="text-[10px] text-muted-foreground/70 italic">Notes: {c.aiAnalysisNotes}</p>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Filed: {c.filed}</span>
            <span>Updated: {c.lastUpdated}</span>
            <span>Round #{c.roundRobinOrder}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <AdminHeader title="Workflow Tracker" />
      <div className="p-4 sm:p-6 space-y-6">

        {/* ── Global stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Cases", value: totalCases, icon: Shield },
            { label: "Active", value: activeCases, icon: Clock },
            { label: "Resolved", value: resolvedCases, icon: CheckCircle },
            { label: "Avg AI Confidence", value: `${avgConfidence}%`, icon: Bot },
            { label: "Round-Robin Cycle", value: `#${Math.ceil(totalCases / 3)}`, icon: RefreshCw },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-xl font-bold text-foreground">{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Admin Distribution Panel ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Admin Workload Distribution (Round-Robin)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Emmanuel AI scans and analyzes all cases first, then assigns via round-robin. No admin overlaps.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adminStats.map(admin => {
                const isYou = admin.id === currentAdmin;
                return (
                  <button
                    key={admin.id}
                    onClick={() => { setSelectedAdmin(admin.id); setActiveTab("admin"); }}
                    className={`text-left p-4 rounded-xl border transition-all hover:border-primary/50 ${
                      isYou ? "border-primary/40 bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${admin.color} flex items-center justify-center`}>
                        <span className="text-sm font-bold text-white">{admin.initials}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {admin.name} {isYou && <span className="text-primary text-[10px]">(You)</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Paired with {admin.aiName}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Active Cases</span>
                        <span className="font-semibold text-foreground">{admin.active}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Resolved</span>
                        <span className="font-semibold text-emerald-400">{admin.resolved}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Critical</span>
                        <span className="font-semibold text-destructive">{admin.critical}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avg AI Confidence</span>
                        <span className="font-semibold">{admin.avgConfidence}%</span>
                      </div>
                      <Progress value={(admin.resolved / (admin.total || 1)) * 100} className="h-1.5 mt-1" />
                      <p className="text-[10px] text-muted-foreground text-center">
                        {admin.resolved}/{admin.total} resolved
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Workflow Pipeline ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Workflow Pipeline
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Cases flow: Emmanuel AI Scan → Analysis → Round-Robin Assignment → Admin Review → Resolution
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(["ai_scanning", "ai_analyzed", "assigned", "in_review", "escalated", "resolved"] as CaseStatus[]).map((stage, i) => {
                const count = mockCases.filter(c => c.status === stage).length;
                const cfg = statusConfig[stage];
                return (
                  <div key={stage} className="flex items-center gap-2">
                    <div className="min-w-[120px] text-center">
                      <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </div>
                      <p className="text-lg font-bold text-foreground mt-1">{count}</p>
                    </div>
                    {i < 5 && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs: All Cases / Per-Admin View ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">All Cases</TabsTrigger>
            {admins.map(a => (
              <TabsTrigger key={a.id} value={a.id} onClick={() => setSelectedAdmin(a.id)}>
                {a.name} {a.id === currentAdmin ? "(You)" : ""}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-4">
            {mockCases.map(renderCaseCard)}
          </TabsContent>

          {admins.map(admin => (
            <TabsContent key={admin.id} value={admin.id} className="space-y-4 mt-4">
              {/* Admin header */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className={`w-10 h-10 rounded-full ${admin.color} flex items-center justify-center`}>
                  <span className="text-sm font-bold text-white">{admin.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {admin.name}'s Assigned Cases {admin.id === currentAdmin && <Badge variant="outline" className="ml-2 text-[10px]">Your Queue</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI Partner: {admin.aiName} — {getAdminCases(admin.id).length} cases assigned via round-robin
                  </p>
                </div>
              </div>

              {getAdminCases(admin.id).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cases assigned. Queue is clear.</p>
                </div>
              ) : (
                getAdminCases(admin.id).map(renderCaseCard)
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* ── Round-Robin Explanation ── */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Round-Robin Distribution Logic</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Emmanuel AI performs the initial scan and thorough analysis of every incoming dispute.
                  Once complete, cases are assigned to admins in strict rotation: Michael → David → Emmanuel → Michael → ...
                  This ensures equal workload distribution and eliminates the risk of duplicate approvals or admin overlap.
                  Each admin sees only their assigned queue but can view all assignments for full transparency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminWorkflow;

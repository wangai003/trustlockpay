import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign, TrendingUp, Users, FileCheck, Shield, AlertTriangle,
  Building2, Search, Bot, BarChart3, CheckCircle2, Clock, XCircle,
  Send, MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import VendorRiskScorecard, { type RiskScoreData } from "@/components/lender/VendorRiskScorecard";

/* ── Mock Lender Data ── */

const MOCK_LENDER = {
  name: "Atlas Capital Partners",
  tier: "Institutional",
  logo: "🏛️",
  totalDisbursed: 2_450_000,
  activeFacilities: 14,
  portfolioAtRisk: 3.2,
  facilityLimit: 5_000_000,
  utilized: 2_450_000,
};

interface MockApplication {
  id: string;
  vendorName: string;
  industry: string;
  amount: number;
  status: "submitted" | "under_review" | "approved" | "rejected";
  date: string;
  riskScore: number;
}

const MOCK_APPLICATIONS: MockApplication[] = [
  { id: "FA-001", vendorName: "GreenSahel Agro Exports", industry: "Agriculture", amount: 85_000, status: "submitted", date: "2026-04-10", riskScore: 72 },
  { id: "FA-002", vendorName: "SahelGold Mining Corp", industry: "Mining", amount: 320_000, status: "under_review", date: "2026-04-08", riskScore: 58 },
  { id: "FA-003", vendorName: "Kente Craft Online", industry: "E-Commerce", amount: 15_000, status: "approved", date: "2026-04-05", riskScore: 89 },
  { id: "FA-004", vendorName: "Atlas Build International", industry: "Construction", amount: 450_000, status: "rejected", date: "2026-04-02", riskScore: 34 },
  { id: "FA-005", vendorName: "PetroWest Energy Ltd", industry: "Energy", amount: 180_000, status: "under_review", date: "2026-04-09", riskScore: 65 },
  { id: "FA-006", vendorName: "TransAfrica Freight Co", industry: "Logistics", amount: 42_000, status: "approved", date: "2026-03-28", riskScore: 81 },
  { id: "FA-007", vendorName: "Precision Works Ltd", industry: "Manufacturing", amount: 210_000, status: "submitted", date: "2026-04-11", riskScore: 77 },
  { id: "FA-008", vendorName: "DriveLink Auto Imports", industry: "Automotive", amount: 95_000, status: "approved", date: "2026-03-20", riskScore: 85 },
];

interface MockVendorProfile {
  name: string;
  industry: string;
  transactions: number;
  escrowVolume: number;
  completionRate: number;
  disputes: number;
  kycStatus: "approved" | "pending" | "not_submitted";
}

const MOCK_VENDORS: MockVendorProfile[] = [
  { name: "GreenSahel Agro Exports", industry: "Agriculture", transactions: 47, escrowVolume: 892_000, completionRate: 96, disputes: 1, kycStatus: "approved" },
  { name: "SahelGold Mining Corp", industry: "Mining", transactions: 12, escrowVolume: 1_450_000, completionRate: 92, disputes: 2, kycStatus: "approved" },
  { name: "Kente Craft Online", industry: "E-Commerce", transactions: 234, escrowVolume: 156_000, completionRate: 99, disputes: 0, kycStatus: "approved" },
  { name: "Atlas Build International", industry: "Construction", transactions: 8, escrowVolume: 2_100_000, completionRate: 88, disputes: 3, kycStatus: "pending" },
  { name: "PetroWest Energy Ltd", industry: "Energy", transactions: 19, escrowVolume: 3_200_000, completionRate: 94, disputes: 1, kycStatus: "approved" },
  { name: "Kwame Digital Studio", industry: "Freelance", transactions: 89, escrowVolume: 245_000, completionRate: 98, disputes: 0, kycStatus: "approved" },
];

const MOCK_RISK_SCORES: Record<string, RiskScoreData> = {
  "GreenSahel Agro Exports": {
    composite_score: 72,
    risk_tier: "moderate",
    pillars: {
      escrow_performance: { score: 82, weight: 20, details: { total_transactions: 47, completed: 45, cancelled: 1, refunded: 1, avg_days_to_release: 14.2 } },
      dispute_profile: { score: 78, weight: 20, details: { total_disputes: 1, vendor_favorable: 0, escalated_to_arbitration: 0, dispute_rate_pct: 2.1 } },
      velocity_consistency: { score: 68, weight: 20, details: { tx_last_90_days: 12, tx_prev_90_days: 10, total_volume_usd: 892000, trend: "growing" } },
      compliance_standing: { score: 80, weight: 20, details: { kyc_status: "approved", business_kyc_verified: true, compliance_flags: 0, critical_flags: 0 } },
      counterparty_network: { score: 52, weight: 20, details: { unique_buyers: 8, repeat_buyers: 5, cross_border_transactions: 12 } },
    },
    computed_at: new Date().toISOString(),
    methodology_version: "1.0",
    scoring_model: "equal_weight_5_pillar",
  },
  "SahelGold Mining Corp": {
    composite_score: 58,
    risk_tier: "elevated",
    pillars: {
      escrow_performance: { score: 72, weight: 20, details: { total_transactions: 12, completed: 11, cancelled: 0, refunded: 1, avg_days_to_release: 28.5 } },
      dispute_profile: { score: 55, weight: 20, details: { total_disputes: 2, vendor_favorable: 1, escalated_to_arbitration: 1, dispute_rate_pct: 16.7 } },
      velocity_consistency: { score: 45, weight: 20, details: { tx_last_90_days: 3, tx_prev_90_days: 4, total_volume_usd: 1450000, trend: "declining" } },
      compliance_standing: { score: 70, weight: 20, details: { kyc_status: "approved", business_kyc_verified: true, compliance_flags: 1, critical_flags: 0 } },
      counterparty_network: { score: 48, weight: 20, details: { unique_buyers: 4, repeat_buyers: 2, cross_border_transactions: 8 } },
    },
    computed_at: new Date().toISOString(),
    methodology_version: "1.0",
    scoring_model: "equal_weight_5_pillar",
  },
  "Atlas Build International": {
    composite_score: 34,
    risk_tier: "high_risk",
    pillars: {
      escrow_performance: { score: 55, weight: 20, details: { total_transactions: 8, completed: 7, cancelled: 1, refunded: 0, avg_days_to_release: 42.1 } },
      dispute_profile: { score: 25, weight: 20, details: { total_disputes: 3, vendor_favorable: 0, escalated_to_arbitration: 2, dispute_rate_pct: 37.5 } },
      velocity_consistency: { score: 30, weight: 20, details: { tx_last_90_days: 1, tx_prev_90_days: 3, total_volume_usd: 2100000, trend: "declining" } },
      compliance_standing: { score: 35, weight: 20, details: { kyc_status: "pending", business_kyc_verified: false, compliance_flags: 2, critical_flags: 1 } },
      counterparty_network: { score: 25, weight: 20, details: { unique_buyers: 3, repeat_buyers: 1, cross_border_transactions: 0 } },
    },
    computed_at: new Date().toISOString(),
    methodology_version: "1.0",
    scoring_model: "equal_weight_5_pillar",
  },
  "Kente Craft Online": {
    composite_score: 89,
    risk_tier: "low_risk",
    pillars: {
      escrow_performance: { score: 97, weight: 20, details: { total_transactions: 234, completed: 231, cancelled: 2, refunded: 1, avg_days_to_release: 5.8 } },
      dispute_profile: { score: 95, weight: 20, details: { total_disputes: 0, vendor_favorable: 0, escalated_to_arbitration: 0, dispute_rate_pct: 0 } },
      velocity_consistency: { score: 85, weight: 20, details: { tx_last_90_days: 18, tx_prev_90_days: 15, total_volume_usd: 156000, trend: "growing" } },
      compliance_standing: { score: 80, weight: 20, details: { kyc_status: "approved", business_kyc_verified: true, compliance_flags: 0, critical_flags: 0 } },
      counterparty_network: { score: 88, weight: 20, details: { unique_buyers: 45, repeat_buyers: 28, cross_border_transactions: 89 } },
    },
    computed_at: new Date().toISOString(),
    methodology_version: "1.0",
    scoring_model: "equal_weight_5_pillar",
  },
};

const FLASHVET_RESPONSES: Record<string, string> = {
  default: "I'm FlashVet AI — your intelligent lending assistant. I can help you analyze vendor risk profiles, review applications, check escrow performance metrics, and generate portfolio insights. Try asking about a specific vendor or application!",
  risk: "**Risk Assessment Summary:**\n\nBased on the current portfolio:\n- 🟢 Low Risk (score >75): 5 vendors — representing 62% of exposure\n- 🟡 Medium Risk (50-75): 2 vendors — representing 28% of exposure\n- 🔴 High Risk (<50): 1 vendor — representing 10% of exposure\n\n**Recommendation:** Consider reducing exposure to Atlas Build International (score: 34) — their KYC is still pending and dispute rate is elevated at 37.5%.",
  portfolio: "**Portfolio Health Dashboard:**\n\n📊 Total Disbursed: $2,450,000 / $5,000,000 (49% utilized)\n✅ Escrow Completion Rate: 94.6%\n⏱️ Avg Days-to-Release: 18.3 days\n🔄 Active Facilities: 14\n⚠️ Portfolio-at-Risk: 3.2%\n\n**Sector Concentration:**\n- Mining: 38% ⚠️ (approaching 40% threshold)\n- Energy: 24%\n- Agriculture: 18%\n- Others: 20%\n\nNo immediate action required, but monitor mining concentration.",
  vendor: "**Vendor Due Diligence — GreenSahel Agro Exports:**\n\n🏢 Industry: Agriculture & Export\n📋 KYC Status: ✅ Approved\n📊 Escrow Track Record: 47 transactions | $892K volume\n✅ Completion Rate: 96%\n⚠️ Disputes: 1 (resolved in buyer's favor)\n🌍 Operating Region: West Africa\n📄 Certifications: Phytosanitary, Certificate of Origin\n\n**FlashVet Score: 72/100** — Moderate-Good\nRecommended facility limit: $100,000",
};

const statusConfig = {
  submitted: { label: "Submitted", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  under_review: { label: "Under Review", icon: Search, color: "text-blue-600 bg-blue-50" },
  approved: { label: "Approved", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-600 bg-red-50" },
};

const SandboxLenderOverview = () => {
  const [vendorSearch, setVendorSearch] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: FLASHVET_RESPONSES.default },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedRiskVendor, setSelectedRiskVendor] = useState<string>("GreenSahel Agro Exports");

  const utilizationPct = Math.round((MOCK_LENDER.utilized / MOCK_LENDER.facilityLimit) * 100);
  const filteredVendors = MOCK_VENDORS.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.industry.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const handleChat = () => {
    if (!chatInput.trim()) return;
    const input = chatInput.toLowerCase();
    setChatMessages(prev => [...prev, { role: "user", text: chatInput }]);
    setChatInput("");
    setChatLoading(true);

    setTimeout(() => {
      let response = FLASHVET_RESPONSES.default;
      if (input.includes("risk") || input.includes("score")) response = FLASHVET_RESPONSES.risk;
      else if (input.includes("portfolio") || input.includes("health") || input.includes("summary")) response = FLASHVET_RESPONSES.portfolio;
      else if (input.includes("vendor") || input.includes("greensahel") || input.includes("due diligence")) response = FLASHVET_RESPONSES.vendor;
      setChatMessages(prev => [...prev, { role: "ai", text: response }]);
      setChatLoading(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
          {MOCK_LENDER.logo}
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{MOCK_LENDER.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{MOCK_LENDER.tier} Tier</Badge>
            <Badge className="bg-green-100 text-green-700 text-[10px]">KYB Verified</Badge>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Total Disbursed
            </div>
            <p className="text-lg font-bold text-foreground">${(MOCK_LENDER.totalDisbursed / 1_000_000).toFixed(2)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3.5 h-3.5" />
              Active Facilities
            </div>
            <p className="text-lg font-bold text-foreground">{MOCK_LENDER.activeFacilities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Utilization
            </div>
            <p className="text-lg font-bold text-foreground">{utilizationPct}%</p>
            <Progress value={utilizationPct} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Portfolio at Risk
            </div>
            <p className="text-lg font-bold text-foreground">{MOCK_LENDER.portfolioAtRisk}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="applications" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="applications" className="text-xs">Applications</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs">Vendor Lookup</TabsTrigger>
          <TabsTrigger value="flashvet" className="text-xs">FlashVet AI</TabsTrigger>
          <TabsTrigger value="kyb" className="text-xs">KYB Demo</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Financing Applications ({MOCK_APPLICATIONS.length})</h2>
          </div>
          <div className="space-y-2">
            {MOCK_APPLICATIONS.map(app => {
              const sc = statusConfig[app.status];
              return (
                <Card key={app.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{app.vendorName}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{app.industry}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>${app.amount.toLocaleString()}</span>
                        <span>•</span>
                        <span>{app.id}</span>
                        <span>•</span>
                        <span>Risk: {app.riskScore}/100</span>
                      </div>
                    </div>
                    <Badge className={`${sc.color} text-[10px] shrink-0`}>
                      <sc.icon className="w-3 h-3 mr-1" />
                      {sc.label}
                    </Badge>
                    {(app.status === "submitted" || app.status === "under_review") && (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => toast.success(`Application ${app.id} approved (sandbox demo)`)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => toast.error(`Application ${app.id} rejected (sandbox demo)`)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Vendor Lookup Tab */}
        <TabsContent value="vendors" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vendors by name or industry…"
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="space-y-2">
            {filteredVendors.map((v, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.industry}</p>
                    </div>
                    <Badge className={v.kycStatus === "approved" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"} >
                      {v.kycStatus === "approved" ? "KYC ✓" : "KYC Pending"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="text-sm font-semibold text-foreground">{v.transactions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-sm font-semibold text-foreground">${(v.escrowVolume / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completion</p>
                      <p className="text-sm font-semibold text-foreground">{v.completionRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Disputes</p>
                      <p className="text-sm font-semibold text-foreground">{v.disputes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FlashVet AI Tab */}
        <TabsContent value="flashvet" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                FlashVet AI — Lending Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-64 overflow-auto space-y-3 border rounded-lg p-3 bg-muted/30">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border text-foreground"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card border rounded-lg px-3 py-2 text-xs text-muted-foreground animate-pulse">
                      FlashVet is thinking…
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask about risk, portfolio health, or a vendor…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
                  className="min-h-[40px] max-h-[80px] text-xs"
                  rows={1}
                />
                <Button size="sm" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {["Portfolio health?", "Risk assessment", "Vendor due diligence"].map(q => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6"
                    onClick={() => { setChatInput(q); }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYB Demo Tab */}
        <TabsContent value="kyb" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                KYB Verification Status (Demo)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200">
                <Shield className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">KYB Verified — Institutional Tier</p>
                  <p className="text-xs text-green-600">Verified on March 15, 2026 • Certificate #TL-KYB-2026-0847</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verification Checklist</h3>
                {[
                  { label: "Company Registration", status: "verified" },
                  { label: "Business License", status: "verified" },
                  { label: "Director ID Verification", status: "verified" },
                  { label: "Financial Statements (Audited)", status: "verified" },
                  { label: "AML/CFT Compliance Declaration", status: "verified" },
                  { label: "Liability Contract Signed", status: "verified" },
                  { label: "Logo & Website Verified", status: "verified" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-foreground">{item.label}</span>
                    <Badge className="ml-auto bg-green-100 text-green-700 text-[10px]">Verified</Badge>
                  </div>
                ))}
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Liability Contract Preview</h3>
                  <div className="text-xs text-foreground space-y-1.5 font-mono bg-background p-3 rounded border max-h-40 overflow-auto">
                    <p><strong>TRADE FINANCE LIABILITY AGREEMENT</strong></p>
                    <p>Party A: Atlas Capital Partners ("Lender")</p>
                    <p>Party B: TrustLock Inc. ("Platform")</p>
                    <p>---</p>
                    <p>1. The Lender acknowledges that all financing decisions are made at their sole discretion.</p>
                    <p>2. TrustLock provides escrow infrastructure and vendor verification data but does not guarantee repayment.</p>
                    <p>3. The Lender agrees to maintain adequate reserves per the Institutional Tier requirements ($500K minimum).</p>
                    <p>4. Dispute resolution for financed transactions follows TrustLock's standard arbitration process.</p>
                    <p>5. This agreement is governed by the laws of [Jurisdiction] and subject to binding arbitration.</p>
                    <p>---</p>
                    <p>✅ Signed digitally on March 15, 2026</p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SandboxLenderOverview;

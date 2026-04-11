import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Info, RefreshCw, ChevronDown, ChevronUp, Scale, Users, FileCheck, BarChart3,
} from "lucide-react";

/* ── Types ── */

export interface PillarDetail {
  score: number;
  weight: number;
  details: Record<string, unknown>;
}

export interface RiskScoreData {
  composite_score: number;
  risk_tier: "low_risk" | "moderate" | "elevated" | "high_risk" | "critical" | "unrated";
  pillars: {
    escrow_performance: PillarDetail;
    dispute_profile: PillarDetail;
    velocity_consistency: PillarDetail;
    counterparty_network: PillarDetail;
    compliance_standing: PillarDetail;
  };
  computed_at: string;
  methodology_version: string;
  scoring_model: string;
}

interface Props {
  data: RiskScoreData;
  vendorName?: string;
  onRefresh?: () => void;
  loading?: boolean;
  compact?: boolean;
}

/* ── Config ── */

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  low_risk: { label: "Low Risk", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: CheckCircle2 },
  moderate: { label: "Moderate", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Shield },
  elevated: { label: "Elevated", color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200", icon: AlertTriangle },
  high_risk: { label: "High Risk", color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle },
  unrated: { label: "Unrated", color: "text-muted-foreground", bgColor: "bg-muted border-border", icon: Info },
};

const PILLAR_CONFIG: Record<string, { label: string; icon: typeof Shield; description: string }> = {
  escrow_performance: {
    label: "Escrow Performance",
    icon: Shield,
    description: "Completion rate, average days-to-release, cancellation & refund ratio",
  },
  dispute_profile: {
    label: "Dispute Profile",
    icon: Scale,
    description: "Dispute frequency, vendor-favorable resolution rate, arbitration escalation",
  },
  velocity_consistency: {
    label: "Velocity & Consistency",
    icon: BarChart3,
    description: "Transaction frequency trends, volume stability, seasonal patterns",
  },
  compliance_standing: {
    label: "Compliance Standing",
    icon: FileCheck,
    description: "KYC/KYB verification status, compliance flag history, document checks",
  },
  counterparty_network: {
    label: "Counterparty Network",
    icon: Users,
    description: "Repeat buyer rate, buyer diversity, cross-border transaction reach",
  },
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  if (score >= 20) return "text-orange-600";
  return "text-red-600";
}

function progressColor(score: number): string {
  if (score >= 80) return "[&>div]:bg-green-500";
  if (score >= 60) return "[&>div]:bg-blue-500";
  if (score >= 40) return "[&>div]:bg-yellow-500";
  if (score >= 20) return "[&>div]:bg-orange-500";
  return "[&>div]:bg-red-500";
}

function trendIcon(details: Record<string, unknown>) {
  const trend = details?.trend as string | undefined;
  if (trend === "growing") return <TrendingUp className="w-3.5 h-3.5 text-green-500" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

/* ── Component ── */

const VendorRiskScorecard = ({ data, vendorName, onRefresh, loading, compact }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CONFIG[data.risk_tier] || TIER_CONFIG.unrated;
  const TierIcon = tier.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            TrustLock Risk Score
            {vendorName && <span className="text-muted-foreground font-normal">— {vendorName}</span>}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  <p className="font-semibold mb-1">Scoring Methodology v{data.methodology_version}</p>
                  <p>5 equally-weighted pillars (20% each), computed from on-platform behavioral data only. No demographic or location-based inputs. Time-weighted — recent performance has more impact.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Composite Score + Tier */}
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted" />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                strokeDasharray={`${(data.composite_score / 100) * 264} 264`}
                strokeLinecap="round"
                className={data.composite_score >= 80 ? "stroke-green-500" : data.composite_score >= 60 ? "stroke-blue-500" : data.composite_score >= 40 ? "stroke-yellow-500" : "stroke-red-500"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-lg font-bold ${scoreColor(data.composite_score)}`}>{data.composite_score}</span>
              <span className="text-[9px] text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${tier.bgColor} ${tier.color}`}>
              <TierIcon className="w-3.5 h-3.5" />
              {tier.label}
            </div>
            <p className="text-xs text-muted-foreground">
              Computed {new Date(data.computed_at).toLocaleDateString()} • Model: {data.scoring_model.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* Pillar Summary Bars */}
        <div className="space-y-2.5">
          {Object.entries(data.pillars).map(([key, pillar]) => {
            const config = PILLAR_CONFIG[key];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">{config.label}</span>
                    {key === "velocity_consistency" && trendIcon(pillar.details)}
                  </div>
                  <span className={`font-semibold ${scoreColor(pillar.score)}`}>{pillar.score}</span>
                </div>
                <Progress value={pillar.score} className={`h-1.5 ${progressColor(pillar.score)}`} />
              </div>
            );
          })}
        </div>

        {/* Expand/Collapse Details */}
        {!compact && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {expanded ? "Hide Details" : "Show Pillar Details"}
            </Button>

            {expanded && (
              <div className="space-y-3 pt-2 border-t">
                {Object.entries(data.pillars).map(([key, pillar]) => {
                  const config = PILLAR_CONFIG[key];
                  if (!config) return null;
                  return (
                    <div key={key} className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground">{config.description}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-muted/30 rounded p-2">
                        {Object.entries(pillar.details).map(([dk, dv]) => (
                          <div key={dk} className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">{dk.replace(/_/g, " ")}</span>
                            <span className="font-medium text-foreground">
                              {typeof dv === "number" ? (dk.includes("volume") || dk.includes("amount") ? `$${(dv as number).toLocaleString()}` : dv) : String(dv)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Methodology Footer */}
                <div className="bg-muted/20 rounded-lg p-3 border border-dashed space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Methodology Transparency</p>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>5 pillars, equally weighted at 20% each — no single factor dominates</li>
                    <li>Purely behavioral — based on on-platform activity, not demographics</li>
                    <li>Time-weighted — recent 90 days carry more weight than older history</li>
                    <li>No location, ethnicity, gender, or company-size inputs</li>
                    <li>Scores refreshed on-demand — not stale snapshots</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorRiskScorecard;

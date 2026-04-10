import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LenderKYB = () => (
  <div>
    <LenderHeader title="KYB Verification" />
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-heading font-bold text-foreground">Know Your Business</h2>
        <Badge variant="outline" className="text-[10px]">Status: Pending</Badge>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground mb-1">Complete KYB to Unlock Your Tier</h3>
              <p className="text-sm text-muted-foreground mb-3">Your tier determines maximum facility limits, analytics depth, and concurrent exposure caps.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { tier: "Tier 1 — Micro-Lender", limit: "≤ $50,000", docs: "Business registration + license" },
                  { tier: "Tier 2 — Standard", limit: "≤ $500,000", docs: "Full KYB + audited financials" },
                  { tier: "Tier 3 — Institutional", limit: "≤ $5,000,000", docs: "Enhanced KYB + capital adequacy" },
                  { tier: "Tier 4 — DFI / Sovereign", limit: "Unlimited", docs: "Custom negotiated" },
                ].map((t) => (
                  <div key={t.tier} className="p-3 rounded-lg border border-border bg-muted/30">
                    <p className="text-xs font-medium text-foreground">{t.tier}</p>
                    <p className="text-[10px] text-muted-foreground">Limit: {t.limit}</p>
                    <p className="text-[10px] text-muted-foreground">{t.docs}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default LenderKYB;

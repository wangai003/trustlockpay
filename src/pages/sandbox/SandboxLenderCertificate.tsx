import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Download, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { SandboxLiveOrder } from "./sandboxIndustryData";

interface Props {
  order: SandboxLiveOrder;
}

const PROMOTED_INDUSTRIES = ["mining", "agriculture", "energy", "manufacturing", "construction", "renewable_energy"];

const SandboxLenderCertificate = ({ order }: Props) => {
  const [generated, setGenerated] = useState(false);
  const isPromoted = PROMOTED_INDUSTRIES.includes(order.industryKey);

  const now = new Date();
  const expires = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const certId = `LC-${order.industryKey.slice(0, 3).toUpperCase()}-${order.orderNumber.replace("SBX-", "")}`;
  const token = `vrf_sbx_${order.id}_demo`;

  const handleGenerate = () => {
    setGenerated(true);
    toast.success("Lender Certificate generated (sandbox demo)");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/verify/${token}`);
    toast.success("Verification link copied (sandbox demo)");
  };

  // Only show for locked/in_progress orders
  if (order.status !== "escrow_locked" && order.status !== "in_progress") return null;

  return (
    <Card className={isPromoted ? "border-primary/30 bg-primary/[0.02]" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Lender Certificate
            {isPromoted && (
              <Badge variant="secondary" className="text-[9px] gap-1">
                ⭐ Recommended for {order.industryLabel}
              </Badge>
            )}
          </CardTitle>
          <Badge variant="default" className="gap-1 text-[10px]">
            <CheckCircle className="h-3 w-3" /> Active
          </Badge>
        </div>
        <CardDescription className="text-[10px]">
          Share this certificate with lenders as proof of guaranteed escrow payment. Valid for 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Certificate ID: <span className="text-foreground font-medium">{certId}</span></span>
          <span>Amount: <span className="text-foreground font-bold">${order.subtotal.toLocaleString()}</span></span>
          <span>Buyer: <span className="text-foreground font-medium">{order.buyerName}</span></span>
          <span>Industry: <span className="text-foreground font-medium">{order.industryLabel}</span></span>
          <span>Issued: <span className="text-foreground">{now.toLocaleDateString()}</span></span>
          <span>Expires: <span className="text-foreground">{expires.toLocaleDateString()}</span></span>
        </div>

        {/* Milestone schedule preview */}
        <div className="border border-border rounded p-2 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground">MILESTONE SCHEDULE</p>
          {order.milestones.map((ms, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate mr-2">{ms.title}</span>
              <span className="font-medium text-foreground shrink-0">{ms.percentage}% · ${(order.subtotal * ms.percentage / 100).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {generated ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => toast.info("PDF download simulated (sandbox)")}>
              <Download className="h-3 w-3" /> Download PDF
            </Button>
          ) : (
            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={handleGenerate}>
              <FileText className="h-3 w-3" /> Generate Certificate
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCopy}>
            <Copy className="h-3 w-3" /> Copy Link
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => toast.info("Verification page preview (sandbox demo)")}>
            <ExternalLink className="h-3 w-3" /> Preview
          </Button>
        </div>

        {isPromoted && (
          <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
            💡 {order.industryLabel} vendors frequently use this certificate to secure pre-production financing from trade lenders and DFIs.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default SandboxLenderCertificate;

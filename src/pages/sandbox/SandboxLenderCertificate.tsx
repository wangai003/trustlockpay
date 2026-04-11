import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Download, Copy, ExternalLink, CheckCircle, Lock, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";
import TrustLockWatermark from "@/components/shared/TrustLockWatermark";
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
  const verifyUrl = `${window.location.origin}/verify/${token}`;

  const handleGenerate = () => {
    setGenerated(true);
    toast.success("Lender Certificate generated (sandbox demo)");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    toast.success("Verification link copied (sandbox demo)");
  };

  // Only show for locked/in_progress orders
  if (order.status !== "escrow_locked" && order.status !== "in_progress") return null;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/[0.03]">
      {/* Anti-fraud watermark */}
      <TrustLockWatermark certificateId={certId} />

      {/* Content — above watermark */}
      <div className="relative z-10">
        {/* Certificate header bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5">
            <img src={trustlockLogo} alt="TrustLock" className="h-8 w-8 object-contain" />
            <div>
              <p className="text-[11px] font-bold tracking-wide uppercase text-foreground">
                Escrow Collateral Certificate
              </p>
              <p className="text-[9px] text-muted-foreground">
                Lender-Facing Instrument · {certId}
              </p>
            </div>
          </div>
          <Badge variant="default" className="gap-1 text-[9px] px-2 py-0.5">
            <Lock className="h-2.5 w-2.5" />
            Funds Verified & Locked
          </Badge>
        </div>

        {isPromoted && (
          <div className="mx-4 mb-2 px-2 py-1 rounded bg-primary/5 border border-primary/10">
            <p className="text-[9px] text-primary font-medium">
              ⭐ Recommended instrument for {order.industryLabel} — frequently used to secure pre-production financing from trade lenders & DFIs
            </p>
          </div>
        )}

        <CardContent className="pt-0 pb-4 space-y-3">
          <div className="flex gap-3">
            {/* Left: details grid */}
            <div className="flex-1 space-y-2">
              {/* Collateral value highlight */}
              <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Collateral Value (Irrevocable)</p>
                <p className="text-lg font-bold text-foreground">${order.subtotal.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">USDC · Polygon Smart Contract · Non-Custodial</p>
              </div>

              {/* Key details */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                <div>
                  <span className="text-muted-foreground">Buyer</span>
                  <p className="font-medium text-foreground truncate">{order.buyerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Industry</span>
                  <p className="font-medium text-foreground">{order.industryLabel}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Issued</span>
                  <p className="font-medium text-foreground">{now.toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valid Until</span>
                  <p className="font-medium text-foreground">{expires.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Right: QR code */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <div className="border border-border rounded-md p-1.5 bg-white">
                <QRCodeSVG
                  value={verifyUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                  imageSettings={{
                    src: trustlockLogo,
                    height: 14,
                    width: 14,
                    excavate: true,
                  }}
                />
              </div>
              <p className="text-[7px] text-muted-foreground text-center leading-tight">
                Scan to verify<br />on-chain proof
              </p>
            </div>
          </div>

          {/* Milestone schedule */}
          <div className="border border-border rounded-md p-2 space-y-1">
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-primary" />
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Release Schedule (Milestone-Gated)</p>
            </div>
            {order.milestones.map((ms, i) => (
              <div key={i} className="flex justify-between text-[10px] py-0.5">
                <span className="text-muted-foreground truncate mr-2">{ms.title}</span>
                <span className="font-medium text-foreground shrink-0">
                  {ms.percentage}% · ${(order.subtotal * ms.percentage / 100).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Blockchain proof indicator */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 border border-border">
            <CheckCircle className="h-3 w-3 text-primary shrink-0" />
            <p className="text-[9px] text-muted-foreground">
              <span className="font-medium text-foreground">SHA-256 hash chain anchored to Polygon</span> · 14 proof record types · 7-year forensic retention
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-1">
            {generated ? (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" asChild>
                <a href="/samples/sample_escrow_certificate.pdf" download="TrustLock_Escrow_Certificate_SAMPLE.pdf">
                  <Download className="h-3 w-3" /> Download PDF
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="default" className="h-7 text-[10px] gap-1" onClick={handleGenerate}>
                <FileText className="h-3 w-3" /> Generate Certificate
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleCopy}>
              <Link2 className="h-3 w-3" /> Copy Link
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => toast.info("Verification page preview (sandbox demo)")}>
              <ExternalLink className="h-3 w-3" /> Preview
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default SandboxLenderCertificate;

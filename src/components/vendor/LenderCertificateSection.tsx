import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ExternalLink, RefreshCw, Copy, CheckCircle, AlertTriangle, Shield, Lock, Link2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import trustlockLogo from "@/assets/trustlock-pay-logo.png";
import TrustLockWatermark from "@/components/shared/TrustLockWatermark";

const LenderCertificateSection = () => {
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: certs, isLoading, refetch } = useQuery({
    queryKey: ["lender-certificates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("lender_certificates")
        .select("*")
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const handleGenerate = async (certId: string) => {
    setGenerating(certId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { action: "generate_lender_certificate", certificateId: certId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("Certificate generated successfully");
        refetch();
      } else {
        toast.error(data?.error || "Generation failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate certificate");
    } finally {
      setGenerating(null);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/verify/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied to clipboard");
  };

  const statusConfig = (status: string, expiresAt: string) => {
    const expired = new Date(expiresAt) < new Date();
    if (expired || status === "expired") {
      return { icon: <AlertTriangle className="h-2.5 w-2.5" />, label: "Expired", variant: "destructive" as const, bg: "bg-destructive/90" };
    }
    if (status === "revoked") {
      return { icon: <AlertTriangle className="h-2.5 w-2.5" />, label: "Revoked", variant: "destructive" as const, bg: "bg-destructive/90" };
    }
    return { icon: <Lock className="h-2.5 w-2.5" />, label: "Funds Verified & Locked", variant: "default" as const, bg: "" };
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  if (!certs || certs.length === 0) {
    return (
      <Card>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <img src={trustlockLogo} alt="TrustLock" className="h-6 w-6 object-contain" />
            <div>
              <p className="text-sm font-semibold text-foreground">Escrow Collateral Certificates</p>
              <p className="text-[10px] text-muted-foreground">Lender-facing instruments · Auto-generated on escrow lock</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center py-6">
            No certificates yet. They appear automatically when escrow funds are locked on a transaction.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <img src={trustlockLogo} alt="TrustLock" className="h-6 w-6 object-contain" />
        <div>
          <p className="text-sm font-semibold text-foreground">Escrow Collateral Certificates</p>
          <p className="text-[10px] text-muted-foreground">
            Share with lenders or financiers as proof of guaranteed escrow payment · 90-day validity
          </p>
        </div>
      </div>

      {certs.map((cert: any) => {
        const meta = cert.certificate_metadata || {};
        const isGenerating = generating === cert.id;
        const hasFile = cert.generation_status === "generated" && cert.file_url;
        const status = statusConfig(cert.status, cert.expires_at);
        const verifyUrl = `${window.location.origin}/verify/${cert.verification_token}`;

        return (
          <Card key={cert.id} className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/[0.03]">
            {/* Anti-fraud watermark */}
            <TrustLockWatermark certificateId={cert.id} />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div>
                  <p className="text-[11px] font-bold tracking-wide uppercase text-foreground">
                    Escrow Collateral Certificate
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {meta.tx_id || cert.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant={status.variant} className={`gap-1 text-[9px] px-2 py-0.5 ${status.variant === "default" ? status.bg : ""}`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>

              <CardContent className="pt-0 pb-4 space-y-3">
                <div className="flex gap-3">
                  {/* Left: details */}
                  <div className="flex-1 space-y-2">
                    {/* Collateral value */}
                    <div className="rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Collateral Value (Irrevocable)</p>
                      <p className="text-lg font-bold text-foreground">${Number(meta.amount || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Smart Contract · Non-Custodial</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Buyer</span>
                        <p className="font-medium text-foreground truncate">{meta.buyer_name || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Issued</span>
                        <p className="font-medium text-foreground">{new Date(cert.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valid Until</span>
                        <p className="font-medium text-foreground">{new Date(cert.expires_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: QR */}
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

                {/* Blockchain proof indicator */}
                <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 border border-border">
                  <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                  <p className="text-[9px] text-muted-foreground">
                    <span className="font-medium text-foreground">SHA-256 hash chain anchored to Polygon</span> · 14 proof types · 7-year retention
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {hasFile ? (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" asChild>
                      <a href={cert.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" /> Download PDF
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[10px] gap-1"
                      disabled={isGenerating}
                      onClick={() => handleGenerate(cert.id)}
                    >
                      {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                      {isGenerating ? "Generating..." : "Generate PDF"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => handleCopyLink(cert.verification_token)}
                  >
                    <Link2 className="h-3 w-3" /> Copy Link
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" asChild>
                    <a href={`/verify/${cert.verification_token}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" /> Preview
                    </a>
                  </Button>
                </div>
              </CardContent>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LenderCertificateSection;

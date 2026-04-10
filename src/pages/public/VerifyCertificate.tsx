import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CertificateData {
  id: string;
  status: string;
  expires_at: string;
  created_at: string;
  certificate_metadata: any;
  transaction_id: string;
}

const VerifyCertificate = () => {
  const { token } = useParams<{ token: string }>();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("lender_certificates")
        .select("id, status, expires_at, created_at, certificate_metadata, transaction_id")
        .eq("verification_token", token)
        .maybeSingle();
      if (err || !data) {
        setError("Certificate not found or has expired.");
      } else {
        setCert(data as CertificateData);
      }
      setLoading(false);
    })();
  }, [token]);

  const isExpired = cert ? new Date(cert.expires_at) < new Date() : false;
  const isActive = cert?.status === "active" && !isExpired;
  const meta = cert?.certificate_metadata || {};

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">TrustLock</h1>
          </div>
          <p className="text-sm text-muted-foreground">Escrow Certificate Verification</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Verification Failed</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        ) : cert ? (
          <Card className={isActive ? "border-primary/30" : "border-destructive/30"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Certificate Status</CardTitle>
                <Badge variant={isActive ? "default" : "destructive"} className="gap-1">
                  {isActive ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {isActive ? "ACTIVE — VERIFIED" : isExpired ? "EXPIRED" : "REVOKED"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Certificate ID" value={cert.id.slice(0, 8).toUpperCase()} />
              <Row label="Escrow Amount" value={`$${Number(meta.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`} bold />
              <Row label="Escrow Status" value={isActive ? "LOCKED — Funds Held in Trust" : "Certificate no longer active"} />
              <Row label="Vendor" value={meta.vendor_name || "N/A"} />
              <Row label="Buyer" value={meta.buyer_name || "N/A"} />
              <Row label="Buyer Contact" value={meta.buyer_email || "N/A"} />
              <Row label="Industry" value={meta.industry || "General"} />
              <Row label="Issued" value={new Date(cert.created_at).toLocaleDateString()} />
              <Row label="Valid Until" value={new Date(cert.expires_at).toLocaleDateString()} />

              {meta.milestones && Array.isArray(meta.milestones) && meta.milestones.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">MILESTONE SCHEDULE</p>
                  {meta.milestones.map((ms: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-muted-foreground">{ms.label || ms.title || `Phase ${i + 1}`}</span>
                      <span className="font-medium text-foreground">{ms.percentage || "N/A"}%</span>
                    </div>
                  ))}
                </div>
              )}

              {meta.blockchain_tx_hash && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">BLOCKCHAIN PROOF</p>
                  <a
                    href={`https://polygonscan.com/tx/${meta.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View on Polygonscan <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              <div className="pt-3 border-t border-border text-center">
                <p className="text-[10px] text-muted-foreground">
                  Verified by TrustLock Escrow Platform · trustlockpay.lovable.app
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={`text-foreground ${bold ? "font-bold text-base" : "font-medium"}`}>{value}</span>
  </div>
);

export default VerifyCertificate;

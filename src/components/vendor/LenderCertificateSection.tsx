import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, ExternalLink, RefreshCw, Copy, CheckCircle, Clock, AlertTriangle, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

  const statusIcon = (status: string, expiresAt: string) => {
    const expired = new Date(expiresAt) < new Date();
    if (expired || status === "expired") return <AlertTriangle className="h-3.5 w-3.5" />;
    if (status === "revoked") return <AlertTriangle className="h-3.5 w-3.5" />;
    return <CheckCircle className="h-3.5 w-3.5" />;
  };

  const statusLabel = (status: string, expiresAt: string) => {
    const expired = new Date(expiresAt) < new Date();
    if (expired) return "Expired";
    return status === "active" ? "Active" : status === "revoked" ? "Revoked" : status;
  };

  const statusVariant = (status: string, expiresAt: string): "default" | "destructive" | "secondary" => {
    const expired = new Date(expiresAt) < new Date();
    if (expired || status !== "active") return "destructive";
    return "default";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!certs || certs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Lender Certificates
          </CardTitle>
          <CardDescription>
            Certificates are auto-generated when escrow funds are locked. Share them with financiers as proof of guaranteed payment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No certificates yet. They will appear here when you have locked escrow orders.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Lender Certificates
        </CardTitle>
        <CardDescription>
          Share these with lenders or financiers as proof of guaranteed escrow payment. Valid for 90 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {certs.map((cert: any) => {
          const meta = cert.certificate_metadata || {};
          const isGenerating = generating === cert.id;
          const hasFile = cert.generation_status === "generated" && cert.file_url;

          return (
            <div key={cert.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{meta.tx_id || cert.id.slice(0, 8)}</span>
                </div>
                <Badge variant={statusVariant(cert.status, cert.expires_at)} className="gap-1 text-[10px]">
                  {statusIcon(cert.status, cert.expires_at)}
                  {statusLabel(cert.status, cert.expires_at)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Amount: <span className="text-foreground font-medium">${Number(meta.amount || 0).toLocaleString()}</span></span>
                <span>Buyer: <span className="text-foreground font-medium">{meta.buyer_name || "N/A"}</span></span>
                <span>Issued: {new Date(cert.created_at).toLocaleDateString()}</span>
                <span>Expires: {new Date(cert.expires_at).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {hasFile ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={cert.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" /> Download PDF
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={isGenerating}
                    onClick={() => handleGenerate(cert.id)}
                  >
                    {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                    {isGenerating ? "Generating..." : "Generate PDF"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleCopyLink(cert.verification_token)}
                >
                  <Copy className="h-3 w-3" /> Copy Verification Link
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild>
                  <a href={`/verify/${cert.verification_token}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LenderCertificateSection;

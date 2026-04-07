import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Package, Link2, Copy, CheckCircle, Loader2, Shield, Eye,
  ExternalLink, XCircle, Gavel, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  disputeId: string;
  disputeLabel: string;
  txId: string;
  amount: number;
}

const ArbitratorManagementPanel = ({ disputeId, disputeLabel, txId, amount }: Props) => {
  const queryClient = useQueryClient();
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleResult, setBundleResult] = useState<any>(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [arbName, setArbName] = useState("");
  const [arbEmail, setArbEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ url: string; password: string } | null>(null);

  const { data: sessions = [], refetch } = useQuery({
    queryKey: ["arbitrator-sessions", disputeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("arbitrator_sessions")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const activeSession = sessions.find((s: any) => s.status === "active");

  const handlePackageBundle = async () => {
    setBundleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("arbitrator-portal", {
        body: { action: "generate_bundle", dispute_id: disputeId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to generate bundle");
        return;
      }
      setBundleResult(data.bundle);
      toast.success("Case file bundle compiled successfully");
    } catch {
      toast.error("Failed to generate bundle");
    } finally {
      setBundleLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!arbName.trim()) { toast.error("Arbitrator name required"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("arbitrator-portal", {
        body: { action: "create_session", dispute_id: disputeId, arbitrator_name: arbName, arbitrator_email: arbEmail },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to create link");
        return;
      }
      const fullUrl = `${window.location.origin}${data.portal_url}`;
      setCreatedLink({ url: fullUrl, password: data.access_password });
      refetch();
      toast.success("Arbitrator onboarding link generated");
    } catch {
      toast.error("Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (sessionId: string) => {
    if (!confirm("Revoke this arbitrator's access? This cannot be undone.")) return;
    await supabase.functions.invoke("arbitrator-portal", {
      body: { action: "revoke_session", session_id: sessionId },
    });
    refetch();
    toast.success("Arbitrator access revoked");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-3 border-t border-border pt-4 mt-4">
      <h4 className="text-xs font-semibold flex items-center gap-2 text-foreground">
        <Gavel className="w-3.5 h-3.5" /> Arbitration Case Management
      </h4>

      <div className="flex flex-wrap gap-2">
        {/* Case File Packaging Button */}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePackageBundle} disabled={bundleLoading}>
          {bundleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
          {bundleLoading ? "Compiling..." : "Package Case File"}
        </Button>

        {/* Generate Onboarding Link */}
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setLinkDialog(true)}>
          <Link2 className="w-3 h-3" /> Generate Arbitrator Link
        </Button>
      </div>

      {/* Bundle Result */}
      {bundleResult && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Case Bundle Compiled</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="bg-background rounded p-2">
                <p className="text-muted-foreground">Evidence Files</p>
                <p className="font-bold text-foreground">{bundleResult.evidence_count}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-muted-foreground">Milestones</p>
                <p className="font-bold text-foreground">{bundleResult.milestones?.length || 0}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-muted-foreground">Blockchain Proofs</p>
                <p className="font-bold text-foreground">{bundleResult.blockchain_proof_count}</p>
              </div>
              <div className="bg-background rounded p-2">
                <p className="text-muted-foreground">Signed Forms</p>
                <p className="font-bold text-foreground">{bundleResult.acknowledgement_forms_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Arbitrator Sessions</p>
          {sessions.map((s: any) => (
            <Card key={s.id} className={s.status === "active" ? "border-primary/20" : "opacity-60"}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{s.arbitrator_name}</span>
                      <Badge variant="outline" className={`text-[9px] ${
                        s.status === "active" ? "border-primary/50 text-primary" :
                        s.status === "ruling_submitted" ? "border-primary/50 text-primary" :
                        s.status === "revoked" ? "border-destructive/50 text-destructive" : "text-muted-foreground"
                      }`}>
                        {s.status === "ruling_submitted" ? "RULING SUBMITTED" : s.status.toUpperCase()}
                      </Badge>
                      {s.ruling_uploaded_at && (
                        <Badge className="text-[9px] bg-primary/15 text-primary">
                          <FileText className="w-2.5 h-2.5 mr-0.5" /> Ruling Uploaded
                        </Badge>
                      )}
                      {s.ruling_anchored && (
                        <Badge className="text-[9px] bg-primary/15 text-primary">
                          <Shield className="w-2.5 h-2.5 mr-0.5" /> Anchored
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>Accessed: {s.access_count}x</span>
                      {s.last_accessed_at && <span>Last: {new Date(s.last_accessed_at).toLocaleDateString()}</span>}
                      <span>Expires: {new Date(s.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {s.status === "active" && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1"
                          onClick={() => copyToClipboard(`${window.location.origin}/arbitrator/${s.access_token}`)}>
                          <Copy className="w-3 h-3" /> Copy Link
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-destructive"
                          onClick={() => handleRevoke(s.id)}>
                          <XCircle className="w-3 h-3" /> Revoke
                        </Button>
                      </>
                    )}
                    {s.ruling_file_url && (
                      <a href={s.ruling_file_url} target="_blank" rel="noopener">
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1">
                          <Eye className="w-3 h-3" /> View Ruling
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Link Dialog */}
      <Dialog open={linkDialog} onOpenChange={() => { setLinkDialog(false); setCreatedLink(null); setArbName(""); setArbEmail(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Arbitrator Onboarding Link</DialogTitle>
          </DialogHeader>
          {createdLink ? (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Link Generated</span>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Portal URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={createdLink.url} className="text-xs font-mono" />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdLink.url)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Access Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input readOnly value={createdLink.password} className="text-xs font-mono" />
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(createdLink.password)}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Send both the URL and password to the arbitrator. Access will auto-expire when the dispute is resolved or you revoke it manually.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This generates a secure portal link for dispute <strong>{disputeLabel}</strong> (Order: {txId}).
                The arbitrator will access evidence, milestones, blockchain proofs, and TrustLock escrow mechanics.
              </p>
              <div>
                <Label>Order Number</Label>
                <Input readOnly value={txId} className="font-mono bg-muted/30" />
              </div>
              <div>
                <Label>Arbitrator Name</Label>
                <Input value={arbName} onChange={(e) => setArbName(e.target.value)} placeholder="Jane Doe, Esq." />
              </div>
              <div>
                <Label>Arbitrator Email (optional)</Label>
                <Input value={arbEmail} onChange={(e) => setArbEmail(e.target.value)} placeholder="arbitrator@firm.com" type="email" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinkDialog(false); setCreatedLink(null); }}>
              {createdLink ? "Close" : "Cancel"}
            </Button>
            {!createdLink && (
              <Button onClick={handleCreateLink} disabled={creating || !arbName.trim()}>
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link2 className="w-4 h-4 mr-1" />}
                Generate Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArbitratorManagementPanel;

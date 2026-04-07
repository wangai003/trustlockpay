import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, FileText, Upload, CheckCircle, Scale, Clock,
  AlertTriangle, Link2, Eye, Gavel, BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ArbitratorPortal = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rulingUploaded, setRulingUploaded] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("arbitrator-portal", {
        body: { action: "verify", token, password },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Authentication failed");
        return;
      }
      setSessionId(data.session_id);
      setAuthenticated(true);
      toast.success("Access granted");
    } catch {
      toast.error("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authenticated || !token) return;
    const loadCase = async () => {
      const { data } = await supabase.functions.invoke("arbitrator-portal", {
        body: { action: "get_case", token },
      });
      if (data && !data.error) setCaseData(data);
    };
    loadCase();
  }, [authenticated, token]);

  const handleRulingUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const filePath = `${sessionId}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from("arbitrator-rulings").upload(filePath, file);
        if (uploadError) { toast.error("Upload failed"); return; }

        const { data: urlData } = supabase.storage.from("arbitrator-rulings").getPublicUrl(filePath);

        const { data, error } = await supabase.functions.invoke("arbitrator-portal", {
          body: {
            action: "record_ruling",
            session_id: sessionId,
            ruling_file_url: urlData.publicUrl,
            ruling_file_name: file.name,
          },
        });
        if (error || data?.error) { toast.error("Failed to record ruling"); return; }

        setRulingUploaded(true);
        toast.success("Ruling uploaded, distributed to all parties, and anchored to blockchain");
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  // ── Login Screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-xl">TrustLock Arbitrator Portal</CardTitle>
            <p className="text-sm text-muted-foreground">Enter the credentials provided by TrustLock to access this case.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Access Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loading || !password}>
              <Lock className="w-4 h-4 mr-2" /> {loading ? "Verifying..." : "Access Case"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              This portal is exclusively for appointed arbitrators. Unauthorized access is prohibited.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Case Portal ──
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">TrustLock Arbitrator Portal</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Shield className="w-3 h-3 mr-1" /> Secure Session
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {!caseData ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-4">Loading case bundle...</p>
          </div>
        ) : (
          <>
            {/* Case Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Case Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Dispute ID", value: caseData.dispute?.dispute_id || "—" },
                    { label: "Order", value: caseData.transaction?.tx_id || "—" },
                    { label: "Amount", value: caseData.transaction?.amount ? `$${Number(caseData.transaction.amount).toLocaleString()}` : "—" },
                    { label: "Industry", value: caseData.transaction?.industry?.replace(/_/g, " ") || "—" },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-[10px] text-muted-foreground uppercase">{item.label}</p>
                      <p className="text-sm font-semibold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Buyer</p>
                    <p className="text-sm font-medium text-foreground">{caseData.dispute?.buyer_name || caseData.transaction?.buyer_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Vendor</p>
                    <p className="text-sm font-medium text-foreground">{caseData.dispute?.vendor_name || caseData.transaction?.vendor_name || "—"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Dispute Reason</p>
                  <p className="text-sm text-foreground">{caseData.dispute?.reason || "—"}</p>
                  {caseData.dispute?.description && (
                    <p className="text-xs text-muted-foreground mt-1">{caseData.dispute.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="evidence">
              <TabsList>
                <TabsTrigger value="evidence">Evidence ({caseData.evidence?.length || 0})</TabsTrigger>
                <TabsTrigger value="milestones">Milestones ({caseData.milestones?.length || 0})</TabsTrigger>
                <TabsTrigger value="blockchain">Proof Chain ({caseData.blockchain_proofs?.length || 0})</TabsTrigger>
                <TabsTrigger value="escrow">Escrow Mechanics</TabsTrigger>
              </TabsList>

              <TabsContent value="evidence" className="space-y-3 mt-4">
                {(caseData.evidence || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No evidence files on record.</p>
                ) : (
                  (caseData.evidence || []).map((ev: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ev.file_name || "Document"}</p>
                          <p className="text-[10px] text-muted-foreground">{ev.file_type} · {new Date(ev.created_at).toLocaleDateString()}</p>
                        </div>
                        {ev.file_url && (
                          <a href={ev.file_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">View</a>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="milestones" className="space-y-3 mt-4">
                {(caseData.milestones || []).map((m: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        m.status === "completed" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}>{m.milestone_index + 1}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.title}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="blockchain" className="space-y-3 mt-4">
                {(caseData.blockchain_proofs || []).map((p: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">{p.record_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
                      </div>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">Hash: {p.content_hash}</p>
                      {p.polygon_tx_hash && (
                        <p className="font-mono text-[10px] text-primary truncate">Polygon: {p.polygon_tx_hash}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="escrow" className="space-y-4 mt-4">
                {caseData.escrow_mechanics && Object.entries(caseData.escrow_mechanics).map(([key, value]) => (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-foreground uppercase mb-1">{key.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">{String(value)}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>

            {/* Upload Ruling */}
            <Card className={rulingUploaded ? "border-primary/30 bg-primary/5" : "border-destructive/20"}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="w-5 h-5" /> Submit Ruling Document
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {rulingUploaded ? (
                  <div className="flex items-center gap-3 text-primary">
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <p className="text-sm font-semibold">Ruling submitted successfully</p>
                      <p className="text-xs text-muted-foreground">Your ruling has been distributed to all parties and anchored to the blockchain proof chain.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload your binding ruling document (PDF or DOCX). This will be automatically:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Distributed to the buyer, vendor, and TrustLock admin</li>
                      <li>Archived for the mandatory 7-year retention period</li>
                      <li>Anchored to the Polygon blockchain as an immutable record</li>
                    </ul>
                    <Button onClick={handleRulingUpload} disabled={uploading} className="gap-2">
                      <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Ruling Document"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ArbitratorPortal;

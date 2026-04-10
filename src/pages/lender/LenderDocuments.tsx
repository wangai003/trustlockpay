import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LenderHeader from "@/components/lender/LenderHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Shield, Clock, CheckCircle, FolderArchive, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const LenderDocuments = () => {
  const { user } = useAuth();
  const isTestnet = localStorage.getItem("tl_lender_network") === "testnet";

  // Fetch signed liability contracts
  const { data: liabilityContracts, isLoading: lcLoading } = useQuery({
    queryKey: ["lender-liability-contracts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("liability_contracts")
        .select("*")
        .eq("lender_id", user.id)
        .order("contract_version", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch protection documents for this lender
  const { data: protectionDocs, isLoading: pdLoading } = useQuery({
    queryKey: ["lender-protection-docs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("protection_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch financing agreements
  const { data: financingDocs, isLoading: fdLoading } = useQuery({
    queryKey: ["lender-financing-docs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("protection_documents")
        .select("*")
        .eq("user_id", user.id)
        .eq("document_type", "financing_agreement")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getRetentionBadge = (createdAt: string, years: number) => {
    const expiry = new Date(createdAt);
    expiry.setFullYear(expiry.getFullYear() + years);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const y = Math.floor(diffDays / 365);
    const m = Math.floor((diffDays % 365) / 30);
    if (diffDays <= 0) return { label: "Expired", variant: "destructive" as const };
    if (y > 5) return { label: `${y}y ${m}m`, variant: "default" as const };
    return { label: `${y}y ${m}m`, variant: "secondary" as const };
  };

  // Testnet mock data
  const testnetContracts = [
    { id: "1", contract_version: 1, signed_at: "2026-03-15T10:00:00Z", signature_text: "James Mwangi", title_position: "Chief Investment Officer", ip_address: "41.80.x.x" },
  ];

  const contracts = isTestnet ? testnetContracts : (liabilityContracts || []);
  const docs = isTestnet ? [] : (protectionDocs || []);
  const loading = !isTestnet && (lcLoading || pdLoading || fdLoading);

  return (
    <div>
      <LenderHeader title="Documents" />
      <div className="p-4 sm:p-6 space-y-6">
        <Tabs defaultValue="liability" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="liability" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              Liability
            </TabsTrigger>
            <TabsTrigger value="agreements" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Agreements
            </TabsTrigger>
            <TabsTrigger value="archive" className="text-xs">
              <FolderArchive className="w-3 h-3 mr-1" />
              Archive
            </TabsTrigger>
          </TabsList>

          {/* Liability Contracts Tab */}
          <TabsContent value="liability" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-semibold text-foreground">Signed Liability Contracts</h3>
              <Badge variant="outline" className="text-[10px]">7-Year Retention</Badge>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : contracts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-3" />
                  <h4 className="font-medium text-foreground mb-1">No Liability Contract Found</h4>
                  <p className="text-xs text-muted-foreground">You must sign the Lender Liability Contract to access the platform.</p>
                </CardContent>
              </Card>
            ) : (
              contracts.map((contract: any) => (
                <Card key={contract.id} className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-medium text-sm text-foreground">
                            Lender Liability Contract — v{contract.contract_version}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Signed {new Date(contract.signed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Signatory:</span>
                        <p className="font-medium text-foreground">{contract.signature_text}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Title:</span>
                        <p className="font-medium text-foreground">{contract.title_position || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP Address:</span>
                        <p className="font-mono text-foreground">{contract.ip_address || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Retention:</span>
                        <p className="font-medium text-foreground">7 years from signing</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Financing Agreements Tab */}
          <TabsContent value="agreements" className="space-y-4 mt-4">
            <h3 className="text-sm font-heading font-semibold text-foreground">Financing Agreements</h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (financingDocs || []).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium text-foreground mb-1">No Agreements Yet</h4>
                  <p className="text-xs text-muted-foreground">Financing agreements will appear here once applications are approved.</p>
                </CardContent>
              </Card>
            ) : (
              (financingDocs || []).map((doc: any) => (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{doc.title}</h4>
                          <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {doc.file_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3 mr-1" /> View
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Archive Tab */}
          <TabsContent value="archive" className="space-y-4 mt-4">
            <h3 className="text-sm font-heading font-semibold text-foreground">Archived Documents</h3>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : docs.filter((d: any) => d.document_type !== "financing_agreement").length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderArchive className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <h4 className="font-medium text-foreground mb-1">Archive Empty</h4>
                  <p className="text-xs text-muted-foreground">Compliance certificates, receipts, and other archived documents will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              docs.filter((d: any) => d.document_type !== "financing_agreement").map((doc: any) => {
                const retention = getRetentionBadge(doc.created_at, doc.retention_years || 7);
                return (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FolderArchive className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <h4 className="text-sm font-medium text-foreground">{doc.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px]">{doc.document_type?.replace(/_/g, " ")}</Badge>
                              <Badge variant={retention.variant} className="text-[9px]">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                {retention.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {doc.file_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LenderDocuments;

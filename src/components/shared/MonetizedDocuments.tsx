import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Download, Clock, CheckCircle2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MonetizedDoc {
  key: string;
  title: string;
  description: string;
  price: number;
  icon?: React.ReactNode;
}

const VENDOR_PREMIUM_DOCS: MonetizedDoc[] = [
  { key: "tax_audit_report", title: "Tax Audit Report", description: "Complete tax breakdown, VAT/GST summary, and compliance audit trail for your transactions.", price: 2.00 },
  { key: "bill_payments_summary", title: "Bill Payments Summary", description: "Detailed history of all bill payments, OS Pay transactions, and platform fees.", price: 1.50 },
  { key: "transaction_history_export", title: "Transaction History Export", description: "Full CSV/PDF export of all orders with status, amounts, dates, and settlement details.", price: 1.00 },
  { key: "payout_reconciliation", title: "Payout Reconciliation Report", description: "Detailed payout settlement report with processor fees, net amounts, and confirmation codes.", price: 2.00 },
  { key: "revenue_statement", title: "Revenue Statement", description: "Monthly/quarterly revenue breakdown with escrow details, fees, and net payouts.", price: 1.50 },
  { key: "compliance_certificate", title: "Compliance Certificate", description: "AML/KYC compliance summary and sanctions screening status for audit purposes.", price: 2.50 },
];

const BUYER_PREMIUM_DOCS: MonetizedDoc[] = [
  { key: "tax_audit_report", title: "Tax Audit Report", description: "Complete tax breakdown and VAT/GST summary for all your purchases.", price: 2.00 },
  { key: "bill_payments_summary", title: "Bill Payments Summary", description: "Detailed history of all payments, escrow locks, and platform fees incurred.", price: 1.50 },
  { key: "purchase_history_export", title: "Purchase History Export", description: "Full CSV/PDF export of all orders with vendor details, amounts, and delivery status.", price: 1.00 },
  { key: "escrow_protection_summary", title: "Escrow Protection Summary", description: "Summary of all escrow protections, dispute outcomes, and fund release history.", price: 1.50 },
  { key: "compliance_certificate", title: "Compliance Certificate", description: "AML/KYC compliance summary and sanctions screening status for your records.", price: 2.50 },
];

interface MonetizedDocumentsProps {
  role: "vendor" | "buyer";
}

const MonetizedDocuments = ({ role }: MonetizedDocumentsProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const docs = role === "vendor" ? VENDOR_PREMIUM_DOCS : BUYER_PREMIUM_DOCS;
  const basePath = role === "vendor" ? "/trustlock/vendor" : "/trustlock/buyer";

  // Check for return from OS Pay with completed purchase
  useEffect(() => {
    const docPurchased = searchParams.get("doc_purchased");
    if (docPurchased) {
      const doc = docs.find(d => d.key === docPurchased);
      if (doc) {
        // Record access in document_access table
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("document_access" as any).insert({
                user_id: user.id,
                document_key: docPurchased,
                price: doc.price,
              } as any);
              queryClient.invalidateQueries({ queryKey: ["document-access", role] });
              toast.success(`📄 ${doc.title} is now available for 30 days!`);
              setSelectedDoc(docPurchased);
            }
          } catch { /* best effort */ }
        })();
        // Clean URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("doc_purchased");
        window.history.replaceState({}, "", `${window.location.pathname}${newParams.toString() ? `?${newParams}` : ""}`);
      }
    }
  }, [searchParams]);

  // Fetch active access records
  const { data: accessRecords = [] } = useQuery({
    queryKey: ["document-access", role],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await (supabase.from("document_access" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("purchased_at", { ascending: false });
      if (error) return [];
      return (data || []) as Array<{ document_key: string; expires_at: string; purchased_at: string }>;
    },
  });

  const getAccess = (key: string) => {
    return accessRecords.find((r: any) => r.document_key === key);
  };

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleDocClick = (doc: MonetizedDoc) => {
    const access = getAccess(doc.key);
    if (access) {
      // Already paid — open/download the document
      setSelectedDoc(doc.key);
      toast.success(`Opening ${doc.title}...`);
      return;
    }
    // Route to OS Pay with return URL
    const returnUrl = `${basePath}/analytics?doc_purchased=${doc.key}`;
    navigate(`${basePath}/os-pay?service=${encodeURIComponent(doc.title)}&amount=${doc.price}&return_url=${encodeURIComponent(returnUrl)}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Premium Reports & Documents
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Select a document to purchase. Access is valid for 30 days after payment. Documents update with latest data.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map(doc => {
          const access = getAccess(doc.key);
          const isUnlocked = !!access;
          const daysLeft = access ? getDaysRemaining(access.expires_at) : 0;
          const isSelected = selectedDoc === doc.key;

          return (
            <Card
              key={doc.key}
              className={cn(
                "relative cursor-pointer transition-all duration-200",
                isUnlocked
                  ? "border-primary/30 hover:border-primary/50"
                  : "border-border hover:border-muted-foreground/30",
                isSelected && isUnlocked && "ring-2 ring-primary/40"
              )}
              onClick={() => handleDocClick(doc)}
            >
              {/* Grayed-out overlay for locked docs */}
              {!isUnlocked && (
                <div className="absolute inset-0 bg-muted/60 backdrop-blur-[1px] rounded-lg z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1.5 text-center px-4">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Click to Purchase</span>
                    <Badge variant="secondary" className="text-xs font-bold">${doc.price.toFixed(2)}</Badge>
                  </div>
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    isUnlocked ? "bg-primary/10" : "bg-muted"
                  )}>
                    {isUnlocked
                      ? <CheckCircle2 className="w-5 h-5 text-primary" />
                      : <FileText className="w-5 h-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{doc.title}</p>
                      {isUnlocked && (
                        <Badge variant="outline" className="text-[9px] text-primary border-primary/30">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />{daysLeft}d left
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[9px]">${doc.price.toFixed(2)}</Badge>
                      <span className="text-[9px] text-muted-foreground">30-day access</span>
                    </div>
                  </div>
                </div>

                {/* Show download button when unlocked and selected */}
                {isUnlocked && isSelected && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        Access expires {new Date(access!.expires_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast.success(`📄 Downloading ${doc.title}...`);
                        }}
                      >
                        <Download className="w-3 h-3" /> Download PDF
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground text-center">
        Documents refresh with latest data on each access cycle. After 30 days, re-purchase to access updated reports.
      </p>
    </div>
  );
};

export default MonetizedDocuments;

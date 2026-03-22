import BuyerHeader from "@/components/buyer/BuyerHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Clock } from "lucide-react";
import DocumentUpload from "@/components/shared/DocumentUpload";

const docs = [
  { title: "Buyer Protection Policy", desc: "How TrustLock escrow protects your funds. Auto-release rules, dispute rights, and refund procedures.", updated: "Mar 2026" },
  { title: "How Escrow Works", desc: "Step-by-step guide: pay → funds locked → vendor ships → you confirm → funds released.", updated: "Mar 2026" },
  { title: "Dispute Filing Guide", desc: "How to file a dispute, what evidence to provide, and expected timelines for resolution.", updated: "Mar 2026" },
  { title: "Auto-Release Disclosure", desc: "If you don't confirm or dispute within 48 hours of delivery, funds auto-release to the vendor.", updated: "Mar 2026" },
  { title: "Fee Schedule", desc: "Buyer fees: 0% on most transactions. Premium insurance available for high-value purchases.", updated: "Feb 2026" },
];

const BuyerDocuments = () => {
  return (
    <div>
      <BuyerHeader title="Documents" />
      <div className="p-3 sm:p-6 space-y-6">
        {/* Upload Section */}
        <DocumentUpload label="Upload Documents (Receipts, Photos, Evidence)" />

        {/* Reference Library */}
        <div>
          <h2 className="font-heading text-lg font-bold">Buyer Reference Library</h2>
          <p className="text-sm text-muted-foreground">Policies, guides, and disclosures about your buyer protections</p>
        </div>
        <div className="space-y-3">
          {docs.map((doc) => (
            <Card key={doc.title}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold">{doc.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{doc.desc}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                    <Clock className="w-3 h-3" /> Updated {doc.updated}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm"><ExternalLink className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuyerDocuments;

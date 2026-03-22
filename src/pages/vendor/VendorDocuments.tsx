import VendorHeader from "@/components/vendor/VendorHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Clock } from "lucide-react";
import DocumentUpload from "@/components/shared/DocumentUpload";

const docs = [
  { title: "Vendor Terms of Service", desc: "Your agreement with TrustLock — escrow rules, fee schedule, dispute procedures.", updated: "Mar 2026" },
  { title: "Escrow Release Policy", desc: "How and when funds are released. Auto-release countdown: 48 hours after delivery confirmation.", updated: "Mar 2026" },
  { title: "Dispute Process Guide", desc: "What happens when a buyer opens a dispute. Evidence requirements, timelines, and outcomes.", updated: "Mar 2026" },
  { title: "Fee Schedule", desc: "Product vendors: 2.5% per transaction. Service vendors: 3%. Volume discounts available.", updated: "Mar 2026" },
  { title: "KYC Requirements by Tier", desc: "What documents you need for each verification tier and associated transaction limits.", updated: "Feb 2026" },
  { title: "Integration Guide", desc: "How to embed TrustLock on your website. Includes script tags, API docs, and webhook setup.", updated: "Mar 2026" },
];

const VendorDocuments = () => {
  return (
    <div>
      <VendorHeader title="Documents" />
      <div className="p-3 sm:p-6 space-y-6">
        {/* Upload Section */}
        <DocumentUpload label="Upload Documents (Receipts, Proof of Shipment, etc.)" />

        {/* Reference Library */}
        <div>
          <h2 className="font-heading text-lg font-bold">Vendor Reference Library</h2>
          <p className="text-sm text-muted-foreground">Policies, guides, and integration documentation</p>
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

export default VendorDocuments;
